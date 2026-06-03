import { CMSRecord } from '@/types/cms'
import { normalizePaymentAmount } from '@/lib/currency-service'
import {
  AggregateStatus,
  applyStatutoryExemptions,
  assignCmsReportCategory,
  CmsReportCategory,
  DisclosureType,
  evaluateOwnershipIndicator,
  evaluateThirdPartyPayment,
  isSupportActCoveredRecipient,
  resolveDisclosureType,
} from '@/lib/transparency-exemptions'
import { ReportabilityAnalysis } from '@/lib/glossary-service'
import { describeRecipientLocation, isOutsideUnitedStates, isUnitedStatesCountry, isValidUsStateOrTerritory } from '@/lib/geographic-rules'
import { internationalComplianceService } from '@/lib/international-compliance-service'
import { amountMeetsEurThreshold } from '@/lib/currency-service'
import { US_PER_PAYMENT_MIN } from '@/lib/aggregate-threshold-service'

export interface TransparencyAnalysis extends ReportabilityAnalysis {
  cmsReportCategory: CmsReportCategory
  disclosureType: DisclosureType
  aggregateStatus: AggregateStatus
  paymentCurrency: string
  exchangeRate: number
  reportingCurrencyValue: number
}

export async function runTransparencyAnalysis(record: CMSRecord): Promise<TransparencyAnalysis> {
  const applicableRules: string[] = []
  const reasoning: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []
  const glossaryMatches: ReportabilityAnalysis['glossaryMatches'] = []

  const normalized = normalizePaymentAmount(
    record.totalAmountOfPaymentUsdollars ?? 0,
    (record as CMSRecord & { paymentCurrency?: string }).paymentCurrency
  )
  const amount = normalized.amountUsd

  let isReportable = false
  let confidence = 0.5
  let aggregateStatus: AggregateStatus = 'not_applicable'

  // 1. Statutory exemptions (discount, sample, patient education)
  const exemption = applyStatutoryExemptions(record)
  if (exemption.exempt) {
    applicableRules.push(exemption.ruleId!)
    reasoning.push(exemption.reason!)
    return buildResult(record, {
      isReportable: false,
      confidence: 0.95,
      applicableRules,
      reasoning,
      warnings,
      recommendations,
      glossaryMatches,
      cmsReportCategory: assignCmsReportCategory(record),
      disclosureType: 'aggregate',
      aggregateStatus: 'not_applicable',
      normalized,
    })
  }

  // 2. Ownership → always reportable, ownership category
  const ownership = evaluateOwnershipIndicator(record)
  if (ownership) {
    applicableRules.push(ownership.ruleId)
    reasoning.push(ownership.reason)
    isReportable = true
    confidence = 0.98
    const disclosure = resolveDisclosureType(record, 'ownership')
    applicableRules.push(...disclosure.ruleIds)
    reasoning.push(...disclosure.reasoning)
    return buildResult(record, {
      isReportable: true,
      confidence,
      applicableRules,
      reasoning,
      warnings,
      recommendations,
      glossaryMatches,
      cmsReportCategory: 'ownership',
      disclosureType: disclosure.disclosureType,
      aggregateStatus: 'not_applicable',
      normalized,
    })
  }

  // 3. SUPPORT Act covered recipient validation
  const supportAct = isSupportActCoveredRecipient(record)
  if (supportAct.ruleId) {
    applicableRules.push(supportAct.ruleId)
    reasoning.push(supportAct.reason!)
  }
  if (supportAct.warning) warnings.push(supportAct.warning)

  // 4. Third-party / indirect payments
  const thirdParty = evaluateThirdPartyPayment(record)
  applicableRules.push(...thirdParty.ruleIds)
  warnings.push(...thirdParty.warnings)
  recommendations.push(...thirdParty.recommendations)
  if (thirdParty.isReportable) {
    isReportable = true
    confidence = Math.max(confidence, 0.9)
    reasoning.push('Indirect/third-party payment directed to covered recipient — reportable')
  }

  const cmsReportCategory = assignCmsReportCategory(record)
  const disclosure = resolveDisclosureType(record, cmsReportCategory)
  applicableRules.push(...disclosure.ruleIds)
  reasoning.push(...disclosure.reasoning)

  const natureOfPayment = (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
  const location = describeRecipientLocation(record)

  // 5. Per-payment threshold (USD $10)
  if (amount < US_PER_PAYMENT_MIN) {
    applicableRules.push('rule_amount_threshold_10')
    reasoning.push(
      `Payment ($${amount.toFixed(2)} USD equivalent) is below $${US_PER_PAYMENT_MIN} per-payment threshold — pending annual aggregate check`
    )
    aggregateStatus = 'pending'
    isReportable = false
    confidence = 0.7
    recommendations.push('Run aggregate recalculation — reportable if recipient annual sub-$10 total ≥ $100')
  } else {
    reasoning.push(`Payment ($${amount.toFixed(2)} USD equivalent) meets $${US_PER_PAYMENT_MIN} minimum threshold`)
    isReportable = true
    confidence = Math.max(confidence, 0.82)
  }

  // 6. France Loi Bertrand €10 (recipient in France)
  const recipientCountry = (record.recipientCountry || '').toLowerCase()
  if (recipientCountry.includes('france') || recipientCountry === 'fr') {
    applicableRules.push('intl_fr_loi_bertrand_10_eur')
    if (!amountMeetsEurThreshold(amount, 10)) {
      reasoning.push('Below France Loi Bertrand €10 equivalent threshold')
      warnings.push('France mandatory disclosure may still require agreement registration on Transparence Santé')
    } else {
      reasoning.push('Meets France Loi Bertrand €10 benefit threshold')
      isReportable = true
    }
  }

  // Geographic rules (existing logic)
  if (location.isForeignRecipient && amount >= US_PER_PAYMENT_MIN) {
    applicableRules.push('rule_foreign_recipient_reportable', 'rule_foreign_recipient_enhanced_review')
    reasoning.push(`Foreign recipient (${record.recipientCountry}) — reportable under CMS Open Payments`)
    isReportable = true
    warnings.push('International recipient — verify province/postal code')
  }

  if (location.isTravelOutsideUs) {
    applicableRules.push('rule_travel_outside_us_reportable')
    isReportable = true
  }

  if (isUnitedStatesCountry(record.recipientCountry) && record.recipientState && !isValidUsStateOrTerritory(record.recipientState)) {
    warnings.push(`Invalid U.S. state code: ${record.recipientState}`)
  }

  if (isOutsideUnitedStates(record.applicableManufacturerOrApplicableGpoMakingPaymentCountry)) {
    applicableRules.push('rule_manufacturer_foreign_country_info')
  }

  // Payment type reportability
  if (natureOfPayment.includes('consulting') && amount >= US_PER_PAYMENT_MIN) {
    applicableRules.push('rule_consulting_payment')
    isReportable = true
  }
  if (natureOfPayment.includes('research') && amount >= US_PER_PAYMENT_MIN) {
    applicableRules.push('rule_research_payment')
    isReportable = true
  }

  if (!isReportable && amount >= US_PER_PAYMENT_MIN) {
    isReportable = true
    reasoning.push('Payment exceeds threshold with no exemption')
  }

  if (amount >= US_PER_PAYMENT_MIN && amount < 100) {
    warnings.push('Above per-payment threshold; confirm annual aggregate for other sub-$10 payments to same recipient')
  }

  const jurisdictionAnalysis = internationalComplianceService.analyzeMultiJurisdiction(record)
  jurisdictionAnalysis.applicableJurisdictions.forEach((j) => {
    applicableRules.push(...j.applicableRuleIds)
    if (j.countryCode !== 'US' && j.isReportable) {
      reasoning.push(`${j.countryName}: ${j.reportability}`)
    }
  })
  warnings.push(...jurisdictionAnalysis.allWarnings)
  recommendations.push(...jurisdictionAnalysis.allRecommendations)

  return buildResult(record, {
    isReportable,
    confidence,
    applicableRules: [...new Set(applicableRules)],
    reasoning,
    warnings: [...new Set(warnings)],
    recommendations: [...new Set(recommendations)],
    glossaryMatches,
    cmsReportCategory,
    disclosureType: disclosure.disclosureType,
    aggregateStatus,
    normalized,
    jurisdictionAnalysis,
  })
}

function buildResult(
  record: CMSRecord,
  ctx: {
    isReportable: boolean
    confidence: number
    applicableRules: string[]
    reasoning: string[]
    warnings: string[]
    recommendations: string[]
    glossaryMatches: ReportabilityAnalysis['glossaryMatches']
    cmsReportCategory: CmsReportCategory
    disclosureType: DisclosureType
    aggregateStatus: AggregateStatus
    normalized: ReturnType<typeof normalizePaymentAmount>
    jurisdictionAnalysis?: ReportabilityAnalysis['jurisdictionAnalysis']
  }
): TransparencyAnalysis {
  return {
    isReportable: ctx.isReportable,
    confidence: ctx.confidence,
    applicableRules: ctx.applicableRules,
    reasoning: ctx.reasoning,
    warnings: ctx.warnings,
    recommendations: ctx.recommendations,
    glossaryMatches: ctx.glossaryMatches,
    jurisdictionAnalysis: ctx.jurisdictionAnalysis,
    cmsReportCategory: ctx.cmsReportCategory,
    disclosureType: ctx.disclosureType,
    aggregateStatus: ctx.aggregateStatus,
    paymentCurrency: ctx.normalized.paymentCurrency,
    exchangeRate: ctx.normalized.exchangeRate,
    reportingCurrencyValue: ctx.normalized.amountUsd,
  }
}
