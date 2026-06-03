import type { CmsGeneralPufFields, CmsFileType } from '@/types/cms-puf'
import type { CMSRecord } from '@/types/cms'
import { CMS_GENERAL_PUF_HEADERS } from '@/types/cms-puf'
import { normalizeRawRow } from '@/lib/lineage/puf-field-mapper'

/** CMS record merged with PUF submission line for UI/API. */
export interface RecordPufSummary {
  fileType: CmsFileType
  fieldCount: number
  totalFields: number
  recordId: string
  changeType?: string
  coveredRecipientNpi?: string
  teachingHospitalCcn?: string
  hasLineage: boolean
  spendEventId?: string
  sourceSystem?: string
  sourceTransactionId?: string
  pufLineId?: string
}

import type { RecordRuleCitations } from '@/lib/rule-citation-service'

export interface RecordWithPuf extends CMSRecord {
  spendEventId?: string | null
  pufSummary?: RecordPufSummary
  pufFields?: CmsGeneralPufFields | Record<string, unknown>
  lineage?: {
    dataSourceName?: string
    dataSourceKey?: string
    dedupKey?: string
  }
  ruleCitations?: RecordRuleCitations
}

export function extractCmsRecordFieldsFromCanonical(
  canonicalRow: Record<string, string>,
  sourceKey?: string
): Partial<CMSRecord> {
  const r = normalizeRawRow(canonicalRow)
  return {
    coveredRecipientNpi: r.covered_recipient_npi || undefined,
    teachingHospitalCcn: r.teaching_hospital_ccn || undefined,
    teachingHospitalId: r.teaching_hospital_id || undefined,
    physicianProfileId: r.covered_recipient_profile_id || undefined,
    changeType: r.change_type || 'N',
    relatedProductIndicator: r.related_product_indicator || undefined,
    productIndicator: r.related_product_indicator || r.product_indicator || undefined,
    sourceSystem: sourceKey,
    nameOfAssociatedCoveredDrugOrBiological1:
      r.name_of_drug_or_biological_or_device_or_medical_supply_1 || undefined,
    ndcOfAssociatedCoveredDrugOrBiological1: r.associated_drug_or_biological_ndc_1 || undefined,
  }
}

export function countPopulatedPufFields(pufFields: Record<string, unknown> | null | undefined): number {
  if (!pufFields) return 0
  return Object.values(pufFields).filter((v) => v !== undefined && v !== null && v !== '').length
}

type SpendInclude = {
  sourceSystem: string
  dedupKey: string
  sourceTransactionId: string
  rulesEngineVersion?: string | null
  ruleInputSnapshot?: unknown
  dataSource?: { sourceKey: string; sourceName: string } | null
  generalLine?: { id: string; pufFields: unknown; changeType: string; coveredRecipientNpi: string | null } | null
  researchLine?: { id: string; pufFields: unknown } | null
  ownershipLine?: { id: string; pufFields: unknown } | null
} | null

export function buildRecordWithPuf(
  record: CMSRecord & { spendEventId?: string | null },
  spendEvent?: SpendInclude
): RecordWithPuf {
  if (!spendEvent) {
    return {
      ...record,
      pufSummary: record.spendEventId
        ? { fileType: (record.cmsReportCategory as CmsFileType) || 'general', fieldCount: 0, totalFields: 91, recordId: record.recordId, hasLineage: true, spendEventId: record.spendEventId || undefined }
        : undefined,
    }
  }

  const category = (record.cmsReportCategory || spendEvent.generalLine ? 'general' : spendEvent.researchLine ? 'research' : spendEvent.ownershipLine ? 'ownership' : 'general') as CmsFileType

  let pufFields: Record<string, unknown> | undefined
  let pufLineId: string | undefined
  let totalFields = 91

  if (spendEvent.generalLine) {
    pufFields = spendEvent.generalLine.pufFields as Record<string, unknown>
    pufLineId = spendEvent.generalLine.id
    totalFields = CMS_GENERAL_PUF_HEADERS.length
  } else if (spendEvent.researchLine) {
    pufFields = spendEvent.researchLine.pufFields as Record<string, unknown>
    pufLineId = spendEvent.researchLine.id
    totalFields = Object.keys(pufFields || {}).length
  } else if (spendEvent.ownershipLine) {
    pufFields = spendEvent.ownershipLine.pufFields as Record<string, unknown>
    pufLineId = spendEvent.ownershipLine.id
    totalFields = 30
  }

  const fieldCount = countPopulatedPufFields(pufFields)

  return {
    ...record,
    coveredRecipientNpi: record.coveredRecipientNpi || spendEvent.generalLine?.coveredRecipientNpi || undefined,
    changeType: record.changeType || spendEvent.generalLine?.changeType || 'N',
    sourceSystem: record.sourceSystem || spendEvent.sourceSystem,
    pufFields: pufFields as CmsGeneralPufFields | undefined,
    pufSummary: {
      fileType: category,
      fieldCount,
      totalFields,
      recordId: record.recordId,
      changeType: record.changeType || spendEvent.generalLine?.changeType || 'N',
      coveredRecipientNpi: record.coveredRecipientNpi || spendEvent.generalLine?.coveredRecipientNpi || undefined,
      teachingHospitalCcn: record.teachingHospitalCcn,
      hasLineage: true,
      spendEventId: record.spendEventId || undefined,
      sourceSystem: spendEvent.sourceSystem,
      sourceTransactionId: spendEvent.sourceTransactionId,
      pufLineId,
    },
    lineage: {
      dataSourceKey: spendEvent.dataSource?.sourceKey,
      dataSourceName: spendEvent.dataSource?.sourceName,
      dedupKey: spendEvent.dedupKey,
    },
  }
}

export const RECORD_SPEND_INCLUDE = {
  dataSource: { select: { sourceKey: true, sourceName: true } },
  generalLine: {
    select: {
      id: true,
      pufFields: true,
      changeType: true,
      coveredRecipientNpi: true,
    },
  },
  researchLine: { select: { id: true, pufFields: true } },
  ownershipLine: { select: { id: true, pufFields: true } },
} as const
