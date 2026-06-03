import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import type { TransparencyAnalysis } from '@/lib/transparency-rules-engine'
import type { CmsFileType } from '@/types/cms-puf'
import {
  buildRuleInputSnapshot,
  mapRawToGeneralPuf,
  mapRawToOwnershipPuf,
  mapRawToResearchPuf,
} from '@/lib/lineage/puf-field-mapper'
import {
  buildCrossSourceDedupKey,
  buildDedupKey,
  getDataSourceByKey,
  hashPayload,
  hcpInputFromGeneralPuf,
  resolveOrCreateHcpMaster,
} from '@/lib/lineage/hcp-master-service'
import { enrichHcpInputFromOpenData } from '@/lib/veeva-open-data-service'
import { assignDedupClusterForSpendEvent } from '@/lib/lineage/dedup-cluster-service'
import { extractCmsRecordFieldsFromCanonical } from '@/lib/lineage/record-view-service'
import { toInputJson } from '@/lib/prisma-json'

export const RULES_ENGINE_VERSION = 'transparency-rules-1.0'
export const NORMALIZATION_VERSION = 'cms-puf-mapper-2025-01'

export interface IngestRowInput {
  sourceKey: string
  rawRow: Record<string, string>
  reviewSessionId?: string
  rowNumber?: number
  externalTransactionId?: string
  analysis: TransparencyAnalysis
  cmsRecordId?: string
}

export interface IngestRowResult {
  sourceTransactionId: string
  spendEventId: string
  hcpMasterId: string | null
  pufLineId: string
  cmsCategory: CmsFileType
}

function resolveCategory(analysis: TransparencyAnalysis): CmsFileType {
  const cat = analysis.cmsReportCategory
  if (cat === 'research' || cat === 'ownership') return cat
  return 'general'
}

export async function ingestSourceRow(input: IngestRowInput): Promise<IngestRowResult> {
  const dataSource = await getDataSourceByKey(input.sourceKey)
  if (!dataSource) {
    throw new Error(`Unknown data source: ${input.sourceKey}`)
  }

  const payloadHash = hashPayload(input.rawRow)
  let sourceTransaction = await prisma.sourceTransaction.findUnique({
    where: {
      dataSourceId_payloadHash: {
        dataSourceId: dataSource.id,
        payloadHash,
      },
    },
  })

  if (!sourceTransaction) {
    sourceTransaction = await prisma.sourceTransaction.create({
      data: {
        dataSourceId: dataSource.id,
        externalTransactionId: input.externalTransactionId,
        reviewSessionId: input.reviewSessionId,
        rowNumber: input.rowNumber,
        rawPayload: input.rawRow,
        payloadHash,
        status: 'received',
      },
    })
  }

  const category = resolveCategory(input.analysis)
  const generalPuf = mapRawToGeneralPuf(input.rawRow)
  const amount =
    input.analysis.reportingCurrencyValue ??
    Number(generalPuf.total_amount_of_payment_usdollars) ??
    0
  const programYear =
    generalPuf.program_year ||
    String(new Date().getFullYear())

  const hcpMaster =
    category !== 'ownership'
      ? await resolveOrCreateHcpMaster(
          await enrichHcpInputFromOpenData(hcpInputFromGeneralPuf(generalPuf, input.sourceKey))
        )
      : null

  const dedupKey = buildDedupKey(
    input.sourceKey,
    generalPuf,
    amount,
    generalPuf.date_of_payment
  )
  const crossSourceDedupKey = buildCrossSourceDedupKey(
    generalPuf,
    amount,
    generalPuf.date_of_payment
  )

  const ruleSnapshot = buildRuleInputSnapshot(input.rawRow, input.analysis)

  const spendEvent = await prisma.spendEvent.create({
    data: {
      dataSourceId: dataSource.id,
      sourceTransactionId: sourceTransaction.id,
      hcpMasterId: hcpMaster?.id,
      dedupKey,
      crossSourceDedupKey,
      dedupClusterId: dedupKey,
      dedupReviewStatus: 'none',
      isPrimaryLine: true,
      amountUsd: amount,
      paymentCurrency: input.analysis.paymentCurrency || 'USD',
      exchangeRate: input.analysis.exchangeRate ?? 1,
      paymentDate: generalPuf.date_of_payment,
      programYear,
      natureOfPayment: generalPuf.nature_of_payment_or_transfer_of_value,
      formOfPayment: generalPuf.form_of_payment_or_transfer_of_value,
      cmsCategory: category,
      sourceSystem: dataSource.sourceKey,
      normalizationVersion: NORMALIZATION_VERSION,
      rulesEngineVersion: RULES_ENGINE_VERSION,
      ruleInputSnapshot: toInputJson(ruleSnapshot),
      status: input.analysis.isReportable ? 'ruled_reportable' : 'ruled_non_reportable',
    },
  })

  await assignDedupClusterForSpendEvent(
    spendEvent.id,
    crossSourceDedupKey,
    dataSource.sourceKey
  )

  if (input.cmsRecordId) {
    const pufSync = extractCmsRecordFieldsFromCanonical(input.rawRow, dataSource.sourceKey)
    if (category === 'general' && hcpMaster?.npi) {
      pufSync.coveredRecipientNpi = hcpMaster.npi
    }
    await prisma.cMSRecord.update({
      where: { id: input.cmsRecordId },
      data: {
        spendEventId: spendEvent.id,
        ...pufSync,
      } as Prisma.CMSRecordUpdateInput,
    })
  }

  let pufLineId: string

  if (category === 'research') {
    const researchPuf = mapRawToResearchPuf(input.rawRow)
    researchPuf.total_amount_of_payment_usdollars = amount
    researchPuf.program_year = programYear
    const line = await prisma.cmsResearchPaymentLine.create({
      data: {
        spendEventId: spendEvent.id,
        pufFields: toInputJson(researchPuf),
        recordId: researchPuf.record_id || generalPuf.record_id || spendEvent.id,
        programYear,
        totalAmount: amount,
        nameOfStudy: researchPuf.name_of_study,
        clinicalTrialsId: researchPuf.clinicaltrials_gov_identifier,
        preclinicalIndicator: researchPuf.preclinical_research_indicator,
        isReportable: input.analysis.isReportable,
        rulesEngineVersion: RULES_ENGINE_VERSION,
        ruleInputSnapshot: toInputJson(ruleSnapshot),
      },
    })
    pufLineId = line.id
  } else if (category === 'ownership') {
    const ownershipPuf = mapRawToOwnershipPuf(input.rawRow)
    ownershipPuf.program_year = programYear
    const line = await prisma.cmsOwnershipPaymentLine.create({
      data: {
        spendEventId: spendEvent.id,
        pufFields: toInputJson(ownershipPuf),
        recordId: ownershipPuf.record_id || spendEvent.id,
        programYear,
        physicianNpi: ownershipPuf.physician_npi,
        totalAmountInvested: Number(ownershipPuf.total_amount_invested_usdollars) || amount,
        valueOfInterest: Number(ownershipPuf.value_of_interest) || undefined,
        isReportable: input.analysis.isReportable,
        rulesEngineVersion: RULES_ENGINE_VERSION,
        ruleInputSnapshot: toInputJson(ruleSnapshot),
      },
    })
    pufLineId = line.id
  } else {
    generalPuf.total_amount_of_payment_usdollars = amount
    generalPuf.program_year = programYear
    if (hcpMaster?.npi) generalPuf.covered_recipient_npi = hcpMaster.npi
    const line = await prisma.cmsGeneralPaymentLine.create({
      data: {
        spendEventId: spendEvent.id,
        pufFields: toInputJson(generalPuf),
        recordId: generalPuf.record_id || spendEvent.id,
        programYear,
        coveredRecipientNpi: generalPuf.covered_recipient_npi,
        totalAmount: amount,
        dateOfPayment: generalPuf.date_of_payment,
        natureOfPayment: generalPuf.nature_of_payment_or_transfer_of_value,
        disputeStatus: generalPuf.dispute_status_for_publication || 'No',
        changeType: generalPuf.change_type || 'N',
        isReportable: input.analysis.isReportable,
        rulesEngineVersion: RULES_ENGINE_VERSION,
        ruleInputSnapshot: toInputJson(ruleSnapshot),
      },
    })
    pufLineId = line.id
  }

  return {
    sourceTransactionId: sourceTransaction.id,
    spendEventId: spendEvent.id,
    hcpMasterId: hcpMaster?.id ?? null,
    pufLineId,
    cmsCategory: category,
  }
}

export async function getLineageStats() {
  const [
    dataSources,
    hcpCount,
    sourceTxnCount,
    spendEventCount,
    generalCount,
    researchCount,
    ownershipCount,
    batchCount,
  ] = await Promise.all([
    prisma.dataSource.count({ where: { isActive: true } }),
    prisma.hcpMaster.count(),
    prisma.sourceTransaction.count(),
    prisma.spendEvent.count(),
    prisma.cmsGeneralPaymentLine.count(),
    prisma.cmsResearchPaymentLine.count(),
    prisma.cmsOwnershipPaymentLine.count(),
    prisma.cmsSubmissionBatch.count(),
  ])

  const bySource = await prisma.spendEvent.groupBy({
    by: ['sourceSystem'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  return {
    dataSources,
    hcpMasterRecords: hcpCount,
    sourceTransactions: sourceTxnCount,
    spendEvents: spendEventCount,
    generalPaymentLines: generalCount,
    researchPaymentLines: researchCount,
    ownershipPaymentLines: ownershipCount,
    submissionBatches: batchCount,
    spendBySource: bySource.map((row) => ({
      source: row.sourceSystem,
      count: row._count.id,
    })),
  }
}

export async function getLineageForSpendEvent(spendEventId: string) {
  return prisma.spendEvent.findUnique({
    where: { id: spendEventId },
    include: {
      dataSource: true,
      sourceTransaction: true,
      hcpMaster: true,
      cmsRecord: true,
      generalLine: true,
      researchLine: true,
      ownershipLine: true,
    },
  })
}

export async function createSubmissionBatch(programYear: string, fileType: CmsFileType | 'mixed') {
  const batchKey = `BATCH_${programYear}_${fileType}_${Date.now()}`
  return prisma.cmsSubmissionBatch.create({
    data: {
      batchKey,
      programYear,
      fileType,
      status: 'draft',
    },
  })
}
