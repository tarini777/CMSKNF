import { CMSRecord } from '@/types/cms'

export type CmsReportCategory = 'general' | 'research' | 'ownership'
export type DisclosureType = 'individual' | 'aggregate'
export type AggregateStatus = 'not_applicable' | 'pending' | 'reportable' | 'non_reportable'

export interface StatutoryExemptionResult {
  exempt: boolean
  ruleId?: string
  reason?: string
}

const SUPPORT_ACT_RECIPIENT_TYPES = [
  'physician',
  'physician assistant',
  'nurse practitioner',
  'clinical nurse specialist',
  'certified registered nurse anesthetist',
  'certified nurse midwife',
  'teaching hospital',
  'advanced practice provider',
  'pa',
  'np',
  'cns',
  'crna',
  'cnm',
]

export function normalizeNature(record: CMSRecord): string {
  return (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
}

export function isDiscountOrRebate(record: CMSRecord): StatutoryExemptionResult {
  const nature = normalizeNature(record)
  const contextual = (record.contextualInformation || '').toLowerCase()
  const combined = `${nature} ${contextual}`

  if (
    combined.includes('discount') ||
    combined.includes('rebate') ||
    combined.includes('price concession')
  ) {
    return {
      exempt: true,
      ruleId: 'rule_discount_rebate_exempt',
      reason: 'Discounts and rebates on covered products are not reportable under 42 CFR 403.904',
    }
  }
  return { exempt: false }
}

export function isProductSampleExempt(record: CMSRecord): StatutoryExemptionResult {
  const nature = normalizeNature(record)
  const productIndicator = (record.productIndicator || '').toLowerCase()
  const combined = `${nature} ${productIndicator}`

  if (
    combined.includes('sample') ||
    combined.includes('drug sample') ||
    combined.includes('product sample')
  ) {
    return {
      exempt: true,
      ruleId: 'rule_sample_patient_use_exempt',
      reason: 'Product samples intended for patient use are not reportable',
    }
  }
  return { exempt: false }
}

export function isPatientEducationExempt(record: CMSRecord): StatutoryExemptionResult {
  const nature = normalizeNature(record)
  const contextual = (record.contextualInformation || '').toLowerCase()

  const patientFacing =
    (nature.includes('educational') || nature.includes('education')) &&
    (nature.includes('patient') ||
      contextual.includes('patient use') ||
      contextual.includes('patient-facing') ||
      nature.includes('patient education'))

  const isCmeOrSpeaker =
    nature.includes('continuing education') ||
    nature.includes('cme') ||
    nature.includes('faculty') ||
    nature.includes('speaker') ||
    nature.includes('speaking')

  if (patientFacing && !isCmeOrSpeaker) {
    return {
      exempt: true,
      ruleId: 'rule_patient_education_exempt',
      reason: 'Educational materials directly for patient use are not reportable',
    }
  }
  return { exempt: false }
}

export function applyStatutoryExemptions(record: CMSRecord): StatutoryExemptionResult {
  for (const check of [isDiscountOrRebate, isProductSampleExempt, isPatientEducationExempt]) {
    const result = check(record)
    if (result.exempt) return result
  }
  return { exempt: false }
}

export function isSupportActCoveredRecipient(record: CMSRecord): {
  covered: boolean
  ruleId?: string
  reason?: string
  warning?: string
} {
  const type = (record.coveredRecipientType || '').toLowerCase().trim()
  const primaryType = (record.physicianPrimaryType || '').toLowerCase().trim()

  if (!type && !primaryType) {
    return {
      covered: true,
      warning: 'Missing covered recipient type — verify SUPPORT Act eligibility (PA, NP, CNS, CRNA, CNM, physician, teaching hospital)',
    }
  }

  const normalized = `${type} ${primaryType}`
  const matched = SUPPORT_ACT_RECIPIENT_TYPES.some((t) => normalized.includes(t))

  if (matched || type.includes('hospital')) {
    return {
      covered: true,
      ruleId: 'rule_support_act_covered_recipient',
      reason: `Covered recipient type "${record.coveredRecipientType || record.physicianPrimaryType}" is reportable under SUPPORT Act expanded definitions`,
    }
  }

  return {
    covered: false,
    warning: `Recipient type "${record.coveredRecipientType}" may not be a CMS covered recipient — verify against SUPPORT Act list`,
  }
}

export function evaluateOwnershipIndicator(record: CMSRecord): {
  applies: boolean
  ruleId: string
  category: CmsReportCategory
  reason: string
} | null {
  const indicator = (record.physicianOwnershipIndicator || '').toLowerCase()
  if (indicator === 'yes' || indicator === 'y' || indicator === 'true') {
    return {
      applies: true,
      ruleId: 'rule_ownership_investment_reportable',
      category: 'ownership',
      reason: 'Ownership or investment interest is reportable under CMS Open Payments (any amount)',
    }
  }
  const nature = normalizeNature(record)
  if (
    nature.includes('ownership') ||
    nature.includes('investment interest') ||
    nature.includes('equity') ||
    nature.includes('stock option')
  ) {
    return {
      applies: true,
      ruleId: 'rule_ownership_investment_reportable',
      category: 'ownership',
      reason: 'Payment nature indicates ownership/investment interest — report under Ownership category',
    }
  }
  return null
}

export function evaluateThirdPartyPayment(record: CMSRecord): {
  ruleIds: string[]
  isReportable: boolean
  warnings: string[]
  recommendations: string[]
} {
  const indicator = (record.thirdPartyPaymentRecipientIndicator || '').toLowerCase()
  const ruleIds: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []
  let isReportable = false

  if (indicator === 'yes' || indicator === 'y') {
    ruleIds.push('rule_indirect_payment_reportable')
    isReportable = true
    warnings.push('Indirect payment via third party — verify ultimate covered recipient attribution')

    if (!record.nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue?.trim()) {
      ruleIds.push('rule_third_party_name_required')
      warnings.push('Third-party entity name is required for indirect payments')
      recommendations.push('Complete Name_of_Third_Party_Entity_Receiving_Payment_or_Transfer_of_Value')
    }

    if (record.thirdPartyEqualsCoveredRecipientIndicator?.toLowerCase() === 'no') {
      recommendations.push('Link indirect payment to the intended covered recipient NPI/profile ID')
    }
  }

  return { ruleIds, isReportable, warnings, recommendations }
}

export function assignCmsReportCategory(record: CMSRecord): CmsReportCategory {
  const ownership = evaluateOwnershipIndicator(record)
  if (ownership) return 'ownership'

  const nature = normalizeNature(record)
  if (
    nature.includes('research') ||
    nature.includes('clinical trial') ||
    nature.includes('study') ||
    nature.includes('grant') ||
    record.charityIndicator?.toLowerCase() === 'yes'
  ) {
    return 'research'
  }
  return 'general'
}

export function resolveDisclosureType(
  record: CMSRecord,
  category: CmsReportCategory
): { disclosureType: DisclosureType; ruleIds: string[]; reasoning: string[] } {
  const ruleIds: string[] = []
  const reasoning: string[] = []

  if (category === 'research') {
    ruleIds.push('rule_rd_aggregate_only')
    reasoning.push('R&D/research payments default to aggregate disclosure (EFPIA/CMS)')
    return { disclosureType: 'aggregate', ruleIds, reasoning }
  }

  const country = (record.recipientCountry || '').toLowerCase()
  const isEuOrUk =
    country &&
    !country.includes('united states') &&
    !country.includes('usa') &&
    (country.includes('france') ||
      country.includes('germany') ||
      country.includes('uk') ||
      country.includes('united kingdom') ||
      country.length === 2)

  if (isEuOrUk || record.consentForDisclosure !== undefined) {
    if (record.consentForDisclosure === true) {
      ruleIds.push('rule_efpia_consent_individual')
      reasoning.push('HCP consent granted — individual disclosure (EFPIA/UK Disclosure UK)')
      return { disclosureType: 'individual', ruleIds, reasoning }
    }
    if (record.consentForDisclosure === false) {
      ruleIds.push('rule_efpia_no_consent_aggregate')
      reasoning.push('HCP consent not granted — aggregate disclosure only (EFPIA/GDPR)')
      return { disclosureType: 'aggregate', ruleIds, reasoning }
    }
    ruleIds.push('rule_efpia_consent_required')
    reasoning.push('EU/UK recipient — obtain consent to determine individual vs aggregate disclosure')
  }

  return { disclosureType: 'individual', ruleIds, reasoning }
}

export const SUPPORT_ACT_RECIPIENT_TYPES_EXPORT = SUPPORT_ACT_RECIPIENT_TYPES
