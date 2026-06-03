import { CMSRecord } from '@/types/cms'
import {
  describeRecipientLocation,
  isOutsideUnitedStates,
  isUnitedStatesCountry,
  isValidUsStateOrTerritory,
} from '@/lib/geographic-rules'
import { internationalComplianceService } from '@/lib/international-compliance-service'
import {
  buildCmsOfficialGlossaryTerms,
  buildPlatformSupplementGlossaryTerms,
} from '@/lib/cms-glossary-mapper'
import {
  CMS_GLOSSARY_LETTERS,
  CMS_OPEN_PAYMENTS_GLOSSARY,
  type CmsGlossaryCategory,
} from '@/data/cms-open-payments-glossary'

export interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category: 'payment_type' | 'recipient_type' | 'product_type' | 'compliance_term' | 'regulatory_term'
  reportability: 'reportable' | 'non_reportable' | 'conditional' | 'exempt'
  conditions?: string[]
  examples?: string[]
  regulatoryBasis?: string
  /** CMS Open Payments glossary grouping from openpaymentsdata.cms.gov/about */
  cmsCategory?: CmsGlossaryCategory
  programYearNote?: string
  sortLetter?: string
  source?: 'cms_official' | 'platform'
  lastUpdated: string
  version: string
}

export interface ReportabilityRule {
  id: string
  name: string
  description: string
  category: 'amount_threshold' | 'payment_type' | 'recipient_type' | 'product_type' | 'geographic' | 'temporal' | 'regulatory_term'
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in'
    value: any
    logicalOperator?: 'AND' | 'OR'
  }[]
  result: 'reportable' | 'non_reportable' | 'conditional'
  priority: number
  effectiveDate: string
  expirationDate?: string
  regulatoryBasis: string
  lastUpdated: string
}

export interface ReportabilityAnalysis {
  isReportable: boolean
  confidence: number
  applicableRules: string[]
  reasoning: string[]
  warnings: string[]
  recommendations: string[]
  glossaryMatches: {
    term: string
    definition: string
    reportability: string
  }[]
  jurisdictionAnalysis?: import('@/lib/international-compliance-service').MultiJurisdictionReport
}

export interface ComplianceCheck {
  record: CMSRecord
  analysis: ReportabilityAnalysis
  timestamp: string
  checkedBy: string
}

export class GlossaryService {
  private readonly API_BASE = '/api/glossary'
  private glossaryTerms: GlossaryTerm[] = []
  private reportabilityRules: ReportabilityRule[] = []

  constructor() {
    this.initializeDefaultGlossary()
    this.initializeDefaultRules()
  }

  /**
   * Initialize official CMS Open Payments glossary terms based on 21 CFR and CMS definitions
   */
  private initializeDefaultGlossary(): void {
    this.glossaryTerms = [
      ...buildCmsOfficialGlossaryTerms(),
      ...buildPlatformSupplementGlossaryTerms(),
    ]
  }

  /**
   * Initialize official CMS Open Payments reportability rules based on 21 CFR
   */
  private initializeDefaultRules(): void {
    this.reportabilityRules = [
      // Official CMS Amount Threshold Rules
      {
        id: 'rule_amount_threshold_10',
        name: 'Minimum Amount Threshold - $10',
        description: 'Payments below $10 are not reportable under CMS Open Payments program',
        category: 'amount_threshold',
        conditions: [
          {
            field: 'amount',
            operator: 'less_than',
            value: 10
          }
        ],
        result: 'non_reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904(c)(1)',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_annual_aggregate_threshold_100',
        name: 'Annual Aggregate Threshold - $100',
        description: 'Annual aggregate payments below $100 are not reportable under CMS Open Payments program',
        category: 'amount_threshold',
        conditions: [
          {
            field: 'annualAggregate',
            operator: 'less_than',
            value: 100
          }
        ],
        result: 'non_reportable',
        priority: 2,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904(c)(1)',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_annual_aggregate',
        name: 'Annual Aggregate Threshold',
        description: 'Annual aggregate payments below $100 are not reportable',
        category: 'amount_threshold',
        conditions: [
          {
            field: 'annualAggregate',
            operator: 'less_than',
            value: 100
          }
        ],
        result: 'non_reportable',
        priority: 2,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Payment Type Rules
      {
        id: 'rule_research_payment',
        name: 'Research Payment Reportability',
        description: 'Research payments are reportable if above threshold',
        category: 'payment_type',
        conditions: [
          {
            field: 'natureOfPayment',
            operator: 'contains',
            value: 'research'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_consulting_payment',
        name: 'Consulting Payment Reportability',
        description: 'Consulting payments are reportable if above threshold',
        category: 'payment_type',
        conditions: [
          {
            field: 'natureOfPayment',
            operator: 'contains',
            value: 'consulting'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Recipient Type Rules
      {
        id: 'rule_physician_recipient',
        name: 'Physician Recipient Reportability',
        description: 'Payments to physicians are reportable if above threshold',
        category: 'recipient_type',
        conditions: [
          {
            field: 'recipientType',
            operator: 'equals',
            value: 'physician'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_teaching_hospital_recipient',
        name: 'Teaching Hospital Recipient Reportability',
        description: 'Payments to teaching hospitals are reportable if above threshold',
        category: 'recipient_type',
        conditions: [
          {
            field: 'recipientType',
            operator: 'equals',
            value: 'teaching_hospital'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Product Type Rules
      {
        id: 'rule_covered_drug',
        name: 'Covered Drug Reportability',
        description: 'Payments related to covered drugs are reportable',
        category: 'product_type',
        conditions: [
          {
            field: 'productType',
            operator: 'equals',
            value: 'covered_drug'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 5,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_covered_device',
        name: 'Covered Device Reportability',
        description: 'Payments related to covered devices are reportable',
        category: 'product_type',
        conditions: [
          {
            field: 'productType',
            operator: 'equals',
            value: 'covered_device'
          },
          {
            field: 'amount',
            operator: 'greater_than',
            value: 10,
            logicalOperator: 'AND'
          }
        ],
        result: 'reportable',
        priority: 5,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Exemptions (COM-TRANSP-001 — evaluated in transparency-rules-engine.ts)
      {
        id: 'rule_discount_rebate_exempt',
        name: 'Discount/Rebate Exemption',
        description: 'Discounts and rebates on covered products are not reportable',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'rebate' }],
        result: 'non_reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — excluded transfers',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_sample_patient_use_exempt',
        name: 'Product Sample Exemption',
        description: 'Product samples intended for patient use are not reportable',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'sample' }],
        result: 'non_reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — product samples for patients',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_patient_education_exempt',
        name: 'Patient Education Materials Exemption',
        description: 'Educational materials directly for patient use are not reportable (not CME/speaker fees)',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'patient education' }],
        result: 'non_reportable',
        priority: 2,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — patient-use materials',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_support_act_covered_recipient',
        name: 'SUPPORT Act Covered Recipient',
        description: 'Physicians, PAs, NPs, CNSs, CRNAs, CNMs, and teaching hospitals are covered recipients',
        category: 'recipient_type',
        conditions: [{ field: 'recipientType', operator: 'contains', value: 'physician' }],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2019-01-01',
        regulatoryBasis: 'SUPPORT Act; 42 CFR 403.904',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_ownership_investment_reportable',
        name: 'Ownership/Investment Interest',
        description: 'Ownership or investment interests are reportable at any amount under separate CMS category',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'ownership' }],
        result: 'reportable',
        priority: 1,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — Ownership/Investment Interest',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_indirect_payment_reportable',
        name: 'Indirect Third-Party Payment',
        description: 'Payments to third parties intended for a covered recipient are reportable',
        category: 'payment_type',
        conditions: [{ field: 'thirdPartyIndicator', operator: 'equals', value: 'yes' }],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904 — indirect payments',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_third_party_name_required',
        name: 'Third-Party Entity Name Required',
        description: 'Third-party entity name must be populated for indirect payments',
        category: 'payment_type',
        conditions: [],
        result: 'conditional',
        priority: 4,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments data dictionary',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_efpia_consent_individual',
        name: 'EFPIA Individual Disclosure (Consent Given)',
        description: 'Named HCP disclosure when consent is granted',
        category: 'regulatory_term',
        conditions: [],
        result: 'reportable',
        priority: 5,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code; GDPR',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_efpia_no_consent_aggregate',
        name: 'EFPIA Aggregate Disclosure (No Consent)',
        description: 'Aggregate disclosure when HCP consent is not granted',
        category: 'regulatory_term',
        conditions: [],
        result: 'conditional',
        priority: 5,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_efpia_consent_required',
        name: 'EFPIA Consent Required',
        description: 'EU/UK recipient — obtain HCP consent to determine individual vs aggregate disclosure',
        category: 'regulatory_term',
        conditions: [],
        result: 'conditional',
        priority: 5,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code; UK ABPI Disclosure UK',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_rd_aggregate_only',
        name: 'R&D Aggregate Disclosure',
        description: 'Research payments disclosed on aggregate basis regardless of consent',
        category: 'payment_type',
        conditions: [{ field: 'natureOfPayment', operator: 'contains', value: 'research' }],
        result: 'conditional',
        priority: 4,
        effectiveDate: '2016-01-01',
        regulatoryBasis: 'EFPIA Disclosure Code; CMS Research Payment category',
        lastUpdated: new Date().toISOString(),
      },
      {
        id: 'rule_patient_care_items',
        name: 'Patient Care Items Exemption',
        description: 'Items for patient care are generally not reportable',
        category: 'payment_type',
        conditions: [
          {
            field: 'natureOfPayment',
            operator: 'contains',
            value: 'patient care'
          }
        ],
        result: 'non_reportable',
        priority: 7,
        effectiveDate: '2020-01-01',
        regulatoryBasis: '42 CFR 403.904',
        lastUpdated: new Date().toISOString()
      },

      // Geographic & International Reporting Rules
      {
        id: 'rule_foreign_recipient_reportable',
        name: 'Foreign Recipient — Still Reportable',
        description: 'Payments to covered recipients outside the United States remain reportable when thresholds are met. Non-U.S. location is not an exemption.',
        category: 'geographic',
        conditions: [
          { field: 'recipientCountry', operator: 'not_equals', value: 'United States' },
          { field: 'amount', operator: 'greater_than', value: 10, logicalOperator: 'AND' }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904; CMS Open Payments international guidance',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_travel_outside_us_reportable',
        name: 'Travel Outside U.S. — Reportable',
        description: 'Travel and lodging payments where Country of Travel is outside the United States are reportable when amount exceeds threshold.',
        category: 'geographic',
        conditions: [
          { field: 'countryOfTravel', operator: 'not_equals', value: 'United States' },
          { field: 'natureOfPayment', operator: 'contains', value: 'travel', logicalOperator: 'AND' }
        ],
        result: 'reportable',
        priority: 3,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments — Country_of_Travel, State_of_Travel, City_of_Travel fields',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_international_conference_travel',
        name: 'International Conference Travel',
        description: 'Educational or speaking travel to international locations is reportable; capture travel city, state/province, and country in the submission.',
        category: 'geographic',
        conditions: [
          { field: 'natureOfPayment', operator: 'contains', value: 'travel' },
          { field: 'countryOfTravel', operator: 'not_equals', value: 'United States', logicalOperator: 'AND' }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2013-01-01',
        regulatoryBasis: '42 CFR 403.904(e)(2) — Travel and Lodging',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_foreign_recipient_enhanced_review',
        name: 'Foreign Recipient — Enhanced Review',
        description: 'International recipient payments require enhanced manual review for address completeness (country, province, postal code) and covered recipient eligibility.',
        category: 'geographic',
        conditions: [
          { field: 'recipientCountry', operator: 'not_equals', value: 'United States' }
        ],
        result: 'conditional',
        priority: 5,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments data validation — international addresses',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_us_state_required_domestic',
        name: 'U.S. Recipient — State Required',
        description: 'For U.S. recipients, a valid 2-letter state or territory code is required for data quality (does not affect reportability if payment is otherwise reportable).',
        category: 'geographic',
        conditions: [
          { field: 'recipientCountry', operator: 'equals', value: 'United States' },
          { field: 'recipientState', operator: 'equals', value: '', logicalOperator: 'AND' }
        ],
        result: 'conditional',
        priority: 6,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments — Recipient_State validation',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_us_territory_recipient',
        name: 'U.S. Territory Recipient',
        description: 'Recipients in U.S. territories use territory codes (PR, GU, VI, AS, MP) and follow standard reportability rules.',
        category: 'geographic',
        conditions: [
          { field: 'recipientState', operator: 'in', value: ['PR', 'GU', 'VI', 'AS', 'MP'] }
        ],
        result: 'reportable',
        priority: 4,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments state/territory codes',
        lastUpdated: new Date().toISOString()
      },
      {
        id: 'rule_manufacturer_foreign_country_info',
        name: 'Manufacturer Foreign Location — Informational',
        description: 'Applicable manufacturer country of location is reported but does not exempt U.S. operating entities from Open Payments reporting obligations.',
        category: 'geographic',
        conditions: [
          { field: 'manufacturerCountry', operator: 'not_equals', value: 'United States' }
        ],
        result: 'conditional',
        priority: 8,
        effectiveDate: '2013-01-01',
        regulatoryBasis: 'CMS Open Payments — Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Country',
        lastUpdated: new Date().toISOString()
      }
    ]
  }

  /**
   * Analyze payment record for reportability (COM-TRANSP-001 transparency engine).
   */
  async analyzeReportability(record: CMSRecord): Promise<ReportabilityAnalysis> {
    const { runTransparencyAnalysis } = await import('@/lib/transparency-rules-engine')
    return runTransparencyAnalysis(record)
  }

  /** @deprecated Logic moved to transparency-rules-engine.ts — kept for reference */
  private async _legacyAnalyzeReportability(record: CMSRecord): Promise<ReportabilityAnalysis> {
    const applicableRules: string[] = []
    const reasoning: string[] = []
    const warnings: string[] = []
    const recommendations: string[] = []
    const glossaryMatches: { term: string; definition: string; reportability: string }[] = []

    const amount = record.totalAmountOfPaymentUsdollars ?? 0
    const natureOfPayment = (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
    const location = describeRecipientLocation(record)

    let isReportable = false
    let confidence = 0.5

    // Amount threshold
    const amountThresholdRule = this.reportabilityRules.find((r) => r.id === 'rule_amount_threshold_10')
    if (amount < 10) {
      if (amountThresholdRule) applicableRules.push(amountThresholdRule.id)
      reasoning.push(`Payment amount ($${amount.toFixed(2)}) is below the $10 CMS reporting threshold`)
      return {
        isReportable: false,
        confidence: 0.95,
        applicableRules,
        reasoning,
        warnings,
        recommendations,
        glossaryMatches,
      }
    }

    reasoning.push(`Payment amount ($${amount.toFixed(2)}) meets the $10 minimum threshold`)

    // Geographic / international rules
    if (location.isForeignRecipient) {
      applicableRules.push('rule_foreign_recipient_reportable')
      reasoning.push(
        `Recipient located outside the U.S. (${record.recipientCountry}) — payment remains reportable under CMS Open Payments`
      )
      isReportable = true
      confidence = 0.85
      applicableRules.push('rule_foreign_recipient_enhanced_review')
      warnings.push('International recipient — verify province/postal code and covered recipient eligibility')
      recommendations.push('Confirm physician is U.S.-licensed covered recipient or teaching hospital is on CMS list')
    }

    if (location.isTravelOutsideUs) {
      applicableRules.push('rule_travel_outside_us_reportable', 'rule_international_conference_travel')
      reasoning.push(
        `Travel outside U.S. (${record.countryOfTravel}) is reportable — capture city, state/province, and country`
      )
      isReportable = true
      confidence = Math.max(confidence, 0.88)
    }

    if (isUnitedStatesCountry(record.recipientCountry) && record.recipientState && !isValidUsStateOrTerritory(record.recipientState)) {
      warnings.push(`Recipient state "${record.recipientState}" may not be a valid U.S. state/territory code`)
      recommendations.push('Correct Recipient_State or use Recipient_Country + Province for international addresses')
    }

    if (isUnitedStatesCountry(record.recipientCountry) && !record.recipientState?.trim()) {
      applicableRules.push('rule_us_state_required_domestic')
      warnings.push('U.S. recipient missing state code — data quality issue')
    }

    if (record.recipientState && ['PR', 'GU', 'VI', 'AS', 'MP'].includes(record.recipientState.toUpperCase())) {
      applicableRules.push('rule_us_territory_recipient')
      reasoning.push(`U.S. territory recipient (${record.recipientState}) — standard reportability applies`)
      isReportable = true
    }

    if (isOutsideUnitedStates(record.applicableManufacturerOrApplicableGpoMakingPaymentCountry)) {
      applicableRules.push('rule_manufacturer_foreign_country_info')
      reasoning.push('Manufacturer located outside U.S. — location is informational; U.S. reporting entity must still report')
    }

    // Payment type rules
    const paymentType = this.determinePaymentType(record)
    const paymentTypeRule = this.reportabilityRules.find(
      (rule) =>
        rule.category === 'payment_type' &&
        rule.result === 'reportable' &&
        rule.conditions.some(
          (condition) =>
            condition.field === 'natureOfPayment' &&
            natureOfPayment.includes(String(condition.value).toLowerCase())
        )
    )
    if (paymentTypeRule) {
      applicableRules.push(paymentTypeRule.id)
      reasoning.push(`Payment type "${paymentType}" matches: ${paymentTypeRule.description}`)
      isReportable = true
      confidence = Math.max(confidence, 0.82)
    }

    // Exemptions
    const exemptionRule = this.reportabilityRules.find(
      (rule) =>
        rule.result === 'non_reportable' &&
        rule.conditions.every((condition) => {
          if (condition.field === 'natureOfPayment') {
            return natureOfPayment.includes(String(condition.value).toLowerCase())
          }
          if (condition.field === 'amount') {
            return amount < Number(condition.value)
          }
          return false
        })
    )
    if (exemptionRule) {
      applicableRules.push(exemptionRule.id)
      reasoning.push(`Exemption applied: ${exemptionRule.description}`)
      isReportable = false
      confidence = 0.85
    }

    // Default: above threshold with no exemption
    if (!exemptionRule && amount >= 10 && !isReportable) {
      isReportable = true
      confidence = 0.75
      reasoning.push('Payment exceeds $10 threshold with no applicable exemption')
    }

    // Glossary matches
    const searchText = [
      natureOfPayment,
      record.coveredRecipientName,
      record.coveredRecipientType,
      record.recipientCountry,
      record.countryOfTravel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const relevantTermIds = new Set<string>()
    if (location.isForeignRecipient) {
      relevantTermIds.add('international_recipient_reporting')
      relevantTermIds.add('recipient_country_field')
    }
    if (location.isTravelOutsideUs) relevantTermIds.add('country_of_travel')
    if (record.recipientState && ['PR', 'GU', 'VI', 'AS', 'MP'].includes(record.recipientState.toUpperCase())) {
      relevantTermIds.add('us_territory_recipient')
    }

    this.glossaryTerms
      .filter(
        (term) =>
          relevantTermIds.has(term.id) ||
          searchText.includes(term.term.toLowerCase())
      )
      .slice(0, 6)
      .forEach((term) => {
        glossaryMatches.push({
          term: term.term,
          definition: term.definition,
          reportability: term.reportability,
        })
      })

    if (amount >= 10 && amount < 100) {
      warnings.push('Payment is above per-payment threshold but may fall below annual $100 aggregate')
      recommendations.push('Track toward annual aggregate reporting threshold per recipient')
    }

    if (isReportable && location.isForeignRecipient) {
      recommendations.push('Include Recipient_Country, Recipient_Province, and Recipient_Postal_Code in CMS submission')
    }

    const jurisdictionAnalysis = internationalComplianceService.analyzeMultiJurisdiction(record)
    jurisdictionAnalysis.applicableJurisdictions.forEach((j) => {
      applicableRules.push(...j.applicableRuleIds)
      if (j.countryCode !== 'US' && j.isReportable) {
        reasoning.push(`${j.countryName}: ${j.sunshineActEquivalent} — ${j.reportability}`)
      }
    })
    warnings.push(...jurisdictionAnalysis.allWarnings)
    recommendations.push(...jurisdictionAnalysis.allRecommendations)

    return {
      isReportable,
      confidence,
      applicableRules: [...new Set(applicableRules)],
      reasoning,
      warnings: [...new Set(warnings)],
      recommendations: [...new Set(recommendations)],
      glossaryMatches,
      jurisdictionAnalysis,
    }
  }

  /**
   * Determine payment type from record description
   */
  private determinePaymentType(record: CMSRecord): string {
    const description = (record.natureOfPaymentOrTransferOfValue || '').toLowerCase()
    
    if (description.includes('research') || description.includes('study') || description.includes('trial')) {
      return 'research'
    }
    if (description.includes('consulting') || description.includes('advisory')) {
      return 'consulting'
    }
    if (description.includes('speaking') || description.includes('lecture') || description.includes('presentation')) {
      return 'speaking'
    }
    if (description.includes('travel') || description.includes('lodging') || description.includes('transportation')) {
      return 'travel'
    }
    if (description.includes('food') || description.includes('meal') || description.includes('beverage')) {
      return 'food'
    }
    if (description.includes('gift') || description.includes('item')) {
      return 'gift'
    }
    if (description.includes('education') || description.includes('training') || description.includes('cme')) {
      return 'education'
    }
    if (description.includes('royalty') || description.includes('license')) {
      return 'royalty'
    }
    if (description.includes('ownership') || description.includes('investment') || description.includes('equity')) {
      return 'ownership'
    }
    
    return 'other'
  }

  /**
   * Determine recipient type from record
   */
  private determineRecipientType(record: CMSRecord): string {
    const providerName = (record.coveredRecipientName || record.teachingHospitalName || '').toLowerCase()
    const recipientType = (record.coveredRecipientType || '').toLowerCase()
    
    if (providerName.includes('hospital') || providerName.includes('medical center') || recipientType.includes('teaching hospital')) {
      return 'teaching_hospital'
    }
    
    // Check if it's a physician (simplified check)
    if (providerName.includes('dr.') || providerName.includes('doctor') || providerName.includes('md') || providerName.includes('do')) {
      return 'physician'
    }
    
    return 'physician' // Default assumption for CMS records
  }

  /**
   * Get all glossary terms
   */
  async getGlossaryTerms(category?: string): Promise<GlossaryTerm[]> {
    if (category && category !== 'all') {
      return this.glossaryTerms.filter((term) => term.category === category)
    }
    return this.glossaryTerms
  }

  /** CMS Open Payments official glossary (A–T) from openpaymentsdata.cms.gov/about */
  async getCmsOfficialGlossary(options?: {
    cmsCategory?: CmsGlossaryCategory
    letter?: string
  }): Promise<GlossaryTerm[]> {
    let terms = this.glossaryTerms.filter((t) => t.source === 'cms_official')
    if (options?.cmsCategory) {
      terms = terms.filter((t) => t.cmsCategory === options.cmsCategory)
    }
    if (options?.letter) {
      terms = terms.filter((t) => t.sortLetter === options.letter.toUpperCase())
    }
    return terms.sort((a, b) => a.term.localeCompare(b.term))
  }

  getCmsGlossaryMeta() {
    return {
      letters: CMS_GLOSSARY_LETTERS,
      categories: ['Nature of Payment', 'Type of Payment', 'General definitions'] as CmsGlossaryCategory[],
      totalOfficialTerms: CMS_OPEN_PAYMENTS_GLOSSARY.length,
      sourceUrl: 'https://openpaymentsdata.cms.gov/about',
    }
  }

  /**
   * Get all reportability rules
   */
  async getReportabilityRules(category?: string): Promise<ReportabilityRule[]> {
    if (category) {
      return this.reportabilityRules.filter(rule => rule.category === category)
    }
    return this.reportabilityRules
  }

  /**
   * Search glossary terms
   */
  async searchGlossaryTerms(query: string): Promise<GlossaryTerm[]> {
    const searchQuery = query.toLowerCase()
    return this.glossaryTerms.filter(
      (term) =>
        term.term.toLowerCase().includes(searchQuery) ||
        term.definition.toLowerCase().includes(searchQuery) ||
        term.programYearNote?.toLowerCase().includes(searchQuery) ||
        term.cmsCategory?.toLowerCase().includes(searchQuery) ||
        term.examples?.some((example) => example.toLowerCase().includes(searchQuery))
    )
  }

  /**
   * Add new glossary term
   */
  async addGlossaryTerm(term: Omit<GlossaryTerm, 'id' | 'lastUpdated' | 'version'>): Promise<GlossaryTerm> {
    const newTerm: GlossaryTerm = {
      ...term,
      id: `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    }
    
    this.glossaryTerms.push(newTerm)
    return newTerm
  }

  /**
   * Add new reportability rule
   */
  async addReportabilityRule(rule: Omit<ReportabilityRule, 'id' | 'lastUpdated'>): Promise<ReportabilityRule> {
    const newRule: ReportabilityRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastUpdated: new Date().toISOString()
    }
    
    this.reportabilityRules.push(newRule)
    return newRule
  }

  /**
   * Update glossary term
   */
  async updateGlossaryTerm(id: string, updates: Partial<GlossaryTerm>): Promise<GlossaryTerm | null> {
    const index = this.glossaryTerms.findIndex(term => term.id === id)
    if (index === -1) return null
    
    this.glossaryTerms[index] = {
      ...this.glossaryTerms[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    }
    
    return this.glossaryTerms[index]
  }

  /**
   * Update reportability rule
   */
  async updateReportabilityRule(id: string, updates: Partial<ReportabilityRule>): Promise<ReportabilityRule | null> {
    const index = this.reportabilityRules.findIndex(rule => rule.id === id)
    if (index === -1) return null
    
    this.reportabilityRules[index] = {
      ...this.reportabilityRules[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    }
    
    return this.reportabilityRules[index]
  }

  /**
   * Delete glossary term
   */
  async deleteGlossaryTerm(id: string): Promise<boolean> {
    const index = this.glossaryTerms.findIndex(term => term.id === id)
    if (index === -1) return false
    
    this.glossaryTerms.splice(index, 1)
    return true
  }

  /**
   * Delete reportability rule
   */
  async deleteReportabilityRule(id: string): Promise<boolean> {
    const index = this.reportabilityRules.findIndex(rule => rule.id === id)
    if (index === -1) return false
    
    this.reportabilityRules.splice(index, 1)
    return true
  }

  /**
   * Get reportability statistics
   */
  async getReportabilityStats(): Promise<{
    totalTerms: number
    totalRules: number
    reportableTerms: number
    nonReportableTerms: number
    conditionalTerms: number
    exemptTerms: number
    cmsOfficialTerms: number
    ruleCategories: Record<string, number>
  }> {
    const reportableTerms = this.glossaryTerms.filter(term => term.reportability === 'reportable').length
    const nonReportableTerms = this.glossaryTerms.filter(term => term.reportability === 'non_reportable').length
    const conditionalTerms = this.glossaryTerms.filter(term => term.reportability === 'conditional').length
    const exemptTerms = this.glossaryTerms.filter(term => term.reportability === 'exempt').length

    const ruleCategories = this.reportabilityRules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalTerms: this.glossaryTerms.length,
      totalRules: this.reportabilityRules.length,
      reportableTerms,
      nonReportableTerms,
      conditionalTerms,
      exemptTerms,
      cmsOfficialTerms: this.glossaryTerms.filter((t) => t.source === 'cms_official').length,
      ruleCategories,
    }
  }
}

// Export singleton instance
export const glossaryService = new GlossaryService()
