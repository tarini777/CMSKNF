import { createHash, randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import type { CmsFileType } from '@/types/cms-puf'
import {
  mapRawToGeneralPuf,
  mapRawToOwnershipPuf,
  mapRawToResearchPuf,
  normalizeRawRow,
} from '@/lib/lineage/puf-field-mapper'
import { batchAsync, pickField, streamCsvRecordsFromDataset } from '@/lib/lineage/csv-stream'
import { ensureDefaultDataSources } from '@/lib/lineage/hcp-master-service'
import { NORMALIZATION_VERSION, RULES_ENGINE_VERSION } from '@/lib/lineage/ingest-pipeline'
import { toInputJson } from '@/lib/prisma-json'
import type { CmsPufDatasetSources, ResolvedDatasetSource } from '@/types/dataset-manifest'
import { describeDatasetSource } from '@/lib/storage/dataset-resolver'
import { resolveCmsPufDatasetSources } from '@/lib/storage/dataset-manifest-service'

export const CMS_PUF_SOURCE_KEY = 'cms_open_payments_puf'

/** @deprecated Use CmsPufDatasetSources from manifest resolver */
export interface CmsPufDatasetPaths {
  profiles: string
  years: Record<
    string,
    {
      general: string
      research: string
      ownership: string
      removed?: string
    }
  >
}

export type { CmsPufDatasetSources }

export interface BulkImportOptions {
  batchSize?: number
  resume?: boolean
  onProgress?: (message: string) => void
}

export interface BulkImportSummary {
  profilesImported: number
  profilesSkipped: number
  generalImported: number
  researchImported: number
  ownershipImported: number
  removedApplied: number
  skippedExisting: number
  errors: number
}

function logProgress(options: BulkImportOptions | undefined, message: string) {
  options?.onProgress?.(message)
}

function buildMasterKey(npi?: string, profileId?: string): string {
  if (npi) return `npi:${npi}`
  if (profileId) return `profile:${profileId}`
  return `profile:unknown:${randomUUID()}`
}

function profileFromRow(row: Record<string, string>) {
  const profileId = pickField(row, 'Covered_Recipient_Profile_ID', 'covered_recipient_profile_id')
  const npi = pickField(row, 'Covered_Recipient_NPI', 'covered_recipient_npi')
  const licenseCodes = [
    pickField(row, 'Covered_Recipient_Profile_License_State_Code_1'),
    pickField(row, 'Covered_Recipient_Profile_License_State_Code_2'),
    pickField(row, 'Covered_Recipient_Profile_License_State_Code_3'),
    pickField(row, 'Covered_Recipient_Profile_License_State_Code_4'),
    pickField(row, 'Covered_Recipient_Profile_License_State_Code_5'),
  ].filter(Boolean)

  const firstName = pickField(row, 'Covered_Recipient_Profile_First_Name')
  const middleName = pickField(row, 'Covered_Recipient_Profile_Middle_Name')
  const lastName = pickField(row, 'Covered_Recipient_Profile_Last_Name')
  const suffix = pickField(row, 'Covered_Recipient_Profile_Suffix')

  return {
    masterKey: buildMasterKey(npi || undefined, profileId || undefined),
    npi: npi || null,
    cmsProfileId: profileId || null,
    firstName: firstName || null,
    middleName: middleName || null,
    lastName: lastName || null,
    nameSuffix: suffix || null,
    fullName: [firstName, middleName, lastName, suffix].filter(Boolean).join(' ').trim() || null,
    specialty: pickField(row, 'Covered_Recipient_Profile_Primary_Specialty') || null,
    primaryType: pickField(row, 'Covered_Recipient_Profile_Type') || null,
    coveredRecipientType: pickField(row, 'Covered_Recipient_Profile_Type') || null,
    addressLine1: pickField(row, 'Covered_Recipient_Profile_Address_Line_1') || null,
    addressLine2: pickField(row, 'Covered_Recipient_Profile_Address_Line_2') || null,
    city: pickField(row, 'Covered_Recipient_Profile_City') || null,
    state: pickField(row, 'Covered_Recipient_Profile_State') || null,
    zipCode: pickField(row, 'Covered_Recipient_Profile_Zipcode') || null,
    country: pickField(row, 'Covered_Recipient_Profile_Country_Name') || null,
    province: pickField(row, 'Covered_Recipient_Profile_Province_Name') || null,
    licenseStateCodes: licenseCodes.length ? licenseCodes : undefined,
    matchStatus: npi ? 'verified_nppes' : profileId ? 'verified_cms' : 'pending',
    sourceCrosswalk: { cms_open_payments_puf: profileId || npi || '' },
  }
}

function buildResearchPufFields(raw: Record<string, string>) {
  const normalized = normalizeRawRow(raw)
  return {
    ...mapRawToResearchPuf(raw),
    ...normalized,
  }
}

function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

function buildDedupKey(recordId: string, programYear: string, category: CmsFileType): string {
  return createHash('sha256').update(`${recordId}|${programYear}|${category}`).digest('hex').slice(0, 32)
}

async function loadHcpLookup(prisma: PrismaClient) {
  const npiMap = new Map<string, string>()
  const profileMap = new Map<string, string>()
  const batchSize = 50_000
  let lastId: string | undefined

  for (;;) {
    const rows = await prisma.hcpMaster.findMany({
      take: batchSize,
      ...(lastId ? { where: { id: { gt: lastId } } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, npi: true, cmsProfileId: true },
    })
    if (rows.length === 0) break
    for (const row of rows) {
      if (row.npi) npiMap.set(row.npi, row.id)
      if (row.cmsProfileId) profileMap.set(row.cmsProfileId, row.id)
    }
    lastId = rows[rows.length - 1]?.id
    if (rows.length < batchSize) break
  }

  return { npiMap, profileMap }
}

async function getExistingRecordIds(
  prisma: PrismaClient,
  category: CmsFileType,
  recordIds: string[]
): Promise<Set<string>> {
  if (recordIds.length === 0) return new Set()

  if (category === 'general') {
    const rows = await prisma.cmsGeneralPaymentLine.findMany({
      where: { recordId: { in: recordIds } },
      select: { recordId: true },
    })
    return new Set(rows.map((r) => r.recordId))
  }
  if (category === 'research') {
    const rows = await prisma.cmsResearchPaymentLine.findMany({
      where: { recordId: { in: recordIds } },
      select: { recordId: true },
    })
    return new Set(rows.map((r) => r.recordId))
  }
  const rows = await prisma.cmsOwnershipPaymentLine.findMany({
    where: { recordId: { in: recordIds } },
    select: { recordId: true },
  })
  return new Set(rows.map((r) => r.recordId))
}

async function ensureCmsPufDataSource(prisma: PrismaClient) {
  await ensureDefaultDataSources()
  return prisma.dataSource.upsert({
    where: { sourceKey: CMS_PUF_SOURCE_KEY },
    update: {
      sourceName: 'CMS Open Payments PUF',
      sourceCategory: 'mdm',
      isActive: true,
    },
    create: {
      sourceKey: CMS_PUF_SOURCE_KEY,
      sourceName: 'CMS Open Payments PUF',
      sourceCategory: 'mdm',
      isActive: true,
    },
  })
}

export async function importCmsRecipientProfiles(
  prisma: PrismaClient,
  source: ResolvedDatasetSource,
  options: BulkImportOptions = {}
): Promise<{ imported: number; skipped: number }> {
  const batchSize = options.batchSize ?? 250
  let imported = 0
  let skipped = 0
  let batchNumber = 0

  logProgress(options, `Importing recipient profiles from ${describeDatasetSource(source)}`)

  for await (const batch of batchAsync(streamCsvRecordsFromDataset(source), batchSize)) {
    batchNumber += 1
    const records = batch.map(profileFromRow).filter((r) => r.npi || r.cmsProfileId)

    if (records.length === 0) {
      skipped += batch.length
      continue
    }

    await prisma.$transaction(
      records.map((record) =>
        prisma.hcpMaster.upsert({
          where: { masterKey: record.masterKey },
          create: record,
          update: {
            npi: record.npi ?? undefined,
            cmsProfileId: record.cmsProfileId ?? undefined,
            firstName: record.firstName ?? undefined,
            middleName: record.middleName ?? undefined,
            lastName: record.lastName ?? undefined,
            nameSuffix: record.nameSuffix ?? undefined,
            fullName: record.fullName ?? undefined,
            specialty: record.specialty ?? undefined,
            primaryType: record.primaryType ?? undefined,
            coveredRecipientType: record.coveredRecipientType ?? undefined,
            addressLine1: record.addressLine1 ?? undefined,
            addressLine2: record.addressLine2 ?? undefined,
            city: record.city ?? undefined,
            state: record.state ?? undefined,
            zipCode: record.zipCode ?? undefined,
            country: record.country ?? undefined,
            province: record.province ?? undefined,
            licenseStateCodes: record.licenseStateCodes,
            matchStatus: record.matchStatus,
            sourceCrosswalk: record.sourceCrosswalk,
          },
        })
      )
    )

    imported += records.length
    if (batchNumber % 20 === 0) {
      logProgress(options, `Profiles: ${imported.toLocaleString()} upserted (batch ${batchNumber})`)
    }
  }

  return { imported, skipped }
}

async function importPaymentFile(
  prisma: PrismaClient,
  source: ResolvedDatasetSource,
  category: CmsFileType,
  dataSourceId: string,
  hcpLookup: { npiMap: Map<string, string>; profileMap: Map<string, string> },
  options: BulkImportOptions,
  counters: Pick<BulkImportSummary, 'skippedExisting' | 'errors'>
): Promise<number> {
  const batchSize = options.batchSize ?? 200
  let imported = 0
  let batchNumber = 0

  logProgress(options, `Importing ${category} payments from ${describeDatasetSource(source)}`)

  for await (const batch of batchAsync(streamCsvRecordsFromDataset(source), batchSize)) {
    batchNumber += 1
    const recordIds = batch
      .map((row) => pickField(row, 'Record_ID', 'record_id'))
      .filter(Boolean)

    const existingIds = options.resume
      ? await getExistingRecordIds(prisma, category, recordIds)
      : new Set<string>()

    const sourceTransactions: Array<{
      id: string
      dataSourceId: string
      rowNumber: number
      rawPayload: object
      payloadHash: string
      status: string
    }> = []
    const spendEvents: Array<{
      id: string
      dataSourceId: string
      sourceTransactionId: string
      hcpMasterId?: string
      dedupKey: string
      crossSourceDedupKey: string
      dedupClusterId: string
      amountUsd: number
      paymentDate?: string
      programYear: string
      natureOfPayment?: string
      formOfPayment?: string
      cmsCategory: string
      sourceSystem: string
      normalizationVersion: string
      rulesEngineVersion: string
      status: string
    }> = []
    const generalLines: Array<Record<string, unknown>> = []
    const researchLines: Array<Record<string, unknown>> = []
    const ownershipLines: Array<Record<string, unknown>> = []

    batch.forEach((row, index) => {
      try {
        const recordId = pickField(row, 'Record_ID', 'record_id')
        if (!recordId) {
          counters.errors += 1
          return
        }
        if (existingIds.has(recordId)) {
          counters.skippedExisting += 1
          return
        }

        const programYear =
          pickField(row, 'Program_Year', 'program_year') ||
          pickField(row, 'Date_of_Payment', 'date_of_payment').slice(0, 4) ||
          '2024'

        let amount = 0
        let paymentDate: string | undefined
        let natureOfPayment: string | undefined
        let formOfPayment: string | undefined
        let pufFields: Record<string, unknown>
        let coveredRecipientNpi: string | undefined
        let physicianNpi: string | undefined
        let changeType = pickField(row, 'Change_Type', 'change_type') || 'N'

        if (category === 'ownership') {
          const ownership = mapRawToOwnershipPuf(row)
          pufFields = ownership as unknown as Record<string, unknown>
          amount = Number(ownership.total_amount_invested_usdollars) || 0
          physicianNpi = ownership.physician_npi
          changeType = ownership.change_type || changeType
        } else if (category === 'research') {
          pufFields = buildResearchPufFields(row)
          amount = Number(pufFields.total_amount_of_payment_usdollars) || 0
          paymentDate = String(pufFields.date_of_payment || '')
          natureOfPayment = String(pufFields.nature_of_payment_or_transfer_of_value || '')
          formOfPayment = String(pufFields.form_of_payment_or_transfer_of_value || '')
          coveredRecipientNpi = String(pufFields.covered_recipient_npi || '')
        } else {
          const general = mapRawToGeneralPuf(row)
          pufFields = general as unknown as Record<string, unknown>
          amount = Number(general.total_amount_of_payment_usdollars) || 0
          paymentDate = general.date_of_payment
          natureOfPayment = general.nature_of_payment_or_transfer_of_value
          formOfPayment = general.form_of_payment_or_transfer_of_value
          coveredRecipientNpi = general.covered_recipient_npi
          changeType = general.change_type || changeType
        }

        const profileId = pickField(
          row,
          'Covered_Recipient_Profile_ID',
          'Physician_Profile_ID',
          'covered_recipient_profile_id',
          'physician_profile_id'
        )
        const hcpMasterId =
          (coveredRecipientNpi && hcpLookup.npiMap.get(coveredRecipientNpi)) ||
          (physicianNpi && hcpLookup.npiMap.get(physicianNpi)) ||
          (profileId && hcpLookup.profileMap.get(profileId)) ||
          undefined

        const sourceTransactionId = randomUUID()
        const spendEventId = randomUUID()
        const dedupKey = buildDedupKey(recordId, programYear, category)

        sourceTransactions.push({
          id: sourceTransactionId,
          dataSourceId,
          rowNumber: index + 1,
          rawPayload: row,
          payloadHash: hashPayload({ recordId, programYear, category }),
          status: 'imported',
        })

        spendEvents.push({
          id: spendEventId,
          dataSourceId,
          sourceTransactionId,
          hcpMasterId,
          dedupKey,
          crossSourceDedupKey: dedupKey,
          dedupClusterId: dedupKey,
          amountUsd: amount,
          paymentDate,
          programYear,
          natureOfPayment,
          formOfPayment,
          cmsCategory: category,
          sourceSystem: CMS_PUF_SOURCE_KEY,
          normalizationVersion: NORMALIZATION_VERSION,
          rulesEngineVersion: RULES_ENGINE_VERSION,
          status: 'ruled_reportable',
        })

        const lineBase = {
          id: randomUUID(),
          spendEventId,
          recordId,
          programYear,
          isReportable: changeType !== 'D',
          rulesEngineVersion: RULES_ENGINE_VERSION,
          changeType,
          pufFields: toInputJson(pufFields),
        }

        if (category === 'general') {
          generalLines.push({
            ...lineBase,
            coveredRecipientNpi,
            totalAmount: amount,
            dateOfPayment: paymentDate,
            natureOfPayment,
            disputeStatus: pickField(row, 'Dispute_Status_for_Publication', 'dispute_status_for_publication') || 'No',
          })
        } else if (category === 'research') {
          researchLines.push({
            ...lineBase,
            totalAmount: amount,
            nameOfStudy: pickField(row, 'Name_of_Study', 'name_of_study') || null,
            clinicalTrialsId:
              pickField(row, 'ClinicalTrials_Gov_Identifier', 'clinicaltrials_gov_identifier') || null,
            preclinicalIndicator:
              pickField(row, 'Preclinical_Research_Indicator', 'preclinical_research_indicator') || null,
          })
        } else {
          ownershipLines.push({
            ...lineBase,
            physicianNpi,
            totalAmountInvested: amount,
            valueOfInterest: Number(pickField(row, 'Value_of_Interest', 'value_of_interest')) || null,
          })
        }

        imported += 1
      } catch {
        counters.errors += 1
      }
    })

    if (sourceTransactions.length === 0) continue

    await prisma.$transaction([
      prisma.sourceTransaction.createMany({ data: sourceTransactions }),
      prisma.spendEvent.createMany({ data: spendEvents }),
      ...(generalLines.length
        ? [prisma.cmsGeneralPaymentLine.createMany({ data: generalLines as never })]
        : []),
      ...(researchLines.length
        ? [prisma.cmsResearchPaymentLine.createMany({ data: researchLines as never })]
        : []),
      ...(ownershipLines.length
        ? [prisma.cmsOwnershipPaymentLine.createMany({ data: ownershipLines as never })]
        : []),
    ])

    if (batchNumber % 25 === 0) {
      logProgress(
        options,
        `${category}: ${imported.toLocaleString()} rows imported (batch ${batchNumber})`
      )
    }
  }

  return imported
}

export async function applyRemovedDeletedRecords(
  prisma: PrismaClient,
  source: ResolvedDatasetSource,
  options: BulkImportOptions = {}
): Promise<number> {
  let applied = 0
  logProgress(options, `Applying removed/deleted markers from ${describeDatasetSource(source)}`)

  for await (const batch of batchAsync(streamCsvRecordsFromDataset(source), 500)) {
    for (const row of batch) {
      const recordId = pickField(row, 'Record_ID', 'record_id')
      if (!recordId) continue

      const [general, research, ownership] = await Promise.all([
        prisma.cmsGeneralPaymentLine.updateMany({
          where: { recordId },
          data: { changeType: 'D', isReportable: false },
        }),
        prisma.cmsResearchPaymentLine.updateMany({
          where: { recordId },
          data: { isReportable: false },
        }),
        prisma.cmsOwnershipPaymentLine.updateMany({
          where: { recordId },
          data: { isReportable: false },
        }),
      ])

      applied += general.count + research.count + ownership.count
    }
  }

  return applied
}

export async function importCmsPufDataset(
  prisma: PrismaClient,
  sources: CmsPufDatasetSources,
  options: BulkImportOptions = {}
): Promise<BulkImportSummary> {
  const summary: BulkImportSummary = {
    profilesImported: 0,
    profilesSkipped: 0,
    generalImported: 0,
    researchImported: 0,
    ownershipImported: 0,
    removedApplied: 0,
    skippedExisting: 0,
    errors: 0,
  }

  const dataSource = await ensureCmsPufDataSource(prisma)

  const profileResult = await importCmsRecipientProfiles(prisma, sources.profiles, options)
  summary.profilesImported = profileResult.imported
  summary.profilesSkipped = profileResult.skipped

  const hcpLookup = await loadHcpLookup(prisma)
  logProgress(
    options,
    `HCP lookup ready: ${hcpLookup.npiMap.size.toLocaleString()} NPIs, ${hcpLookup.profileMap.size.toLocaleString()} CMS profiles`
  )

  for (const [year, files] of Object.entries(sources.years)) {
    logProgress(options, `Starting program year ${year}`)

    summary.generalImported += await importPaymentFile(
      prisma,
      files.general,
      'general',
      dataSource.id,
      hcpLookup,
      options,
      summary
    )
    summary.researchImported += await importPaymentFile(
      prisma,
      files.research,
      'research',
      dataSource.id,
      hcpLookup,
      options,
      summary
    )
    summary.ownershipImported += await importPaymentFile(
      prisma,
      files.ownership,
      'ownership',
      dataSource.id,
      hcpLookup,
      options,
      summary
    )

    if (files.removed) {
      summary.removedApplied += await applyRemovedDeletedRecords(prisma, files.removed, options)
    }
  }

  return summary
}

export function loadCmsPufDatasetSources(manifestPath?: string, backendOverride?: 'local' | 'gdrive') {
  return resolveCmsPufDatasetSources(manifestPath, backendOverride)
}

/** Legacy local-path helper when manifest is unavailable. */
export function defaultCmsPufPaths(databaseRoot: string): CmsPufDatasetSources {
  const local = (relativePath: string, fileName: string, key: string, bytes = 0, approxRows?: number) => ({
    key,
    fileName,
    backend: 'local' as const,
    localPath: `${databaseRoot}/${relativePath}`,
    bytes,
    approxRows,
  })

  return {
    profiles: local(
      'PHPRFL_P01232026_01102026/OP_CVRD_RCPNT_PRFL_SPLMTL_P01232026_01102026.csv',
      'OP_CVRD_RCPNT_PRFL_SPLMTL_P01232026_01102026.csv',
      'profiles',
      383886605,
      1618298
    ),
    years: {
      '2023': {
        general: local(
          'PGYR2023_P01232026_01102026/OP_DTL_GNRL_PGYR2023_P01232026_01102026.csv',
          'OP_DTL_GNRL_PGYR2023_P01232026_01102026.csv',
          'py2023_general',
          8213429301,
          14701069
        ),
        research: local(
          'PGYR2023_P01232026_01102026/OP_DTL_RSRCH_PGYR2023_P01232026_01102026.csv',
          'OP_DTL_RSRCH_PGYR2023_P01232026_01102026.csv',
          'py2023_research',
          1034644732,
          1080157
        ),
        ownership: local(
          'PGYR2023_P01232026_01102026/OP_DTL_OWNRSHP_PGYR2023_P01232026_01102026.csv',
          'OP_DTL_OWNRSHP_PGYR2023_P01232026_01102026.csv',
          'py2023_ownership',
          1950074,
          4448
        ),
        removed: local(
          'PGYR2023_P01232026_01102026/OP_REMOVED_DELETED_PGYR2023_P01232026_01102026.csv',
          'OP_REMOVED_DELETED_PGYR2023_P01232026_01102026.csv',
          'py2023_removed',
          157263,
          3824
        ),
      },
      '2024': {
        general: local(
          'PGYR2024_P01232026_01102026 (1)/OP_DTL_GNRL_PGYR2024_P01232026_01102026.csv',
          'OP_DTL_GNRL_PGYR2024_P01232026_01102026.csv',
          'py2024_general',
          8907261207,
          15385047
        ),
        research: local(
          'PGYR2024_P01232026_01102026 (1)/OP_DTL_RSRCH_PGYR2024_P01232026_01102026.csv',
          'OP_DTL_RSRCH_PGYR2024_P01232026_01102026.csv',
          'py2024_research',
          726777532,
          756906
        ),
        ownership: local(
          'PGYR2024_P01232026_01102026 (1)/OP_DTL_OWNRSHP_PGYR2024_P01232026_01102026.csv',
          'OP_DTL_OWNRSHP_PGYR2024_P01232026_01102026.csv',
          'py2024_ownership',
          2112404,
          4593
        ),
        removed: local(
          'PGYR2024_P01232026_01102026 (1)/OP_REMOVED_DELETED_PGYR2024_P01232026_01102026.csv',
          'OP_REMOVED_DELETED_PGYR2024_P01232026_01102026.csv',
          'py2024_removed',
          614104,
          14939
        ),
      },
    },
  }
}
