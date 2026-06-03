import { CMSRecord } from '@/types/cms'
import { amountMeetsEurThreshold } from '@/lib/currency-service'
import {
  getAllInternationalRegimes,
  getRegimeByCountryCode,
  getRegimeByCountryName,
  getRegimesByRegion,
  NationalReportingRegime,
  REGION_LABELS,
  ReportabilityResult,
  resolveCountryCode,
} from '@/data/international-regulatory-frameworks'
import { isUnitedStatesCountry } from '@/lib/geographic-rules'

export interface JurisdictionAnalysis {
  countryCode: string
  countryName: string
  region: string
  regimeName: string
  sunshineActEquivalent: string
  regimeType: string
  isReportable: boolean
  reportability: ReportabilityResult
  legalBasis: string
  reportingThreshold?: string
  publicDisclosure: boolean
  applicableRuleIds: string[]
  reasoning: string[]
  warnings: string[]
  recommendations: string[]
  cmsOverlap: string
}

export interface MultiJurisdictionReport {
  primaryJurisdiction?: JurisdictionAnalysis
  applicableJurisdictions: JurisdictionAnalysis[]
  usCmsRequired: boolean
  additionalRegimesRequired: number
  summary: string
  allWarnings: string[]
  allRecommendations: string[]
}

function formatThreshold(regime: NationalReportingRegime): string | undefined {
  if (!regime.reportingThreshold) return undefined
  const t = regime.reportingThreshold
  const parts: string[] = []
  if (t.perTransferMin !== undefined) parts.push(`min ${t.currency} ${t.perTransferMin}/transfer`)
  if (t.annualAggregateMin !== undefined) parts.push(`min ${t.currency} ${t.annualAggregateMin}/year aggregate`)
  if (t.notes) parts.push(t.notes)
  return parts.join('; ')
}

function analyzeJurisdiction(
  regime: NationalReportingRegime,
  record: CMSRecord,
  context: 'recipient' | 'travel' | 'manufacturer'
): JurisdictionAnalysis {
  const amount = record.totalAmountOfPaymentUsdollars ?? 0
  const reasoning: string[] = []
  const warnings: string[] = []
  const recommendations: string[] = []
  let isReportable = regime.defaultReportability === 'reportable'
  let reportability = regime.defaultReportability

  reasoning.push(`${regime.sunshineActEquivalent} applies (${context} location: ${regime.countryName})`)

  if (regime.countryCode === 'US') {
    isReportable = amount >= 10
    reportability = isReportable ? 'reportable' : 'non_reportable'
    if (!isReportable) reasoning.push('Below U.S. $10 CMS threshold')
  }

  if (regime.regimeType === 'mandatory_legal' || regime.regimeType === 'mandatory_industry_code') {
    if (reportability !== 'non_reportable' && reportability !== 'not_applicable') {
      isReportable = true
      reportability = 'reportable'
      reasoning.push(`Mandatory disclosure under ${regime.regimeName}`)
    }
  }

  if (regime.regimeType === 'voluntary_industry_code') {
    reportability = 'conditional'
    isReportable = amount > 0
    recommendations.push(`Confirm company membership in ${regime.legalBasis.split(';')[0]}`)
  }

  if (regime.regimeType === 'subnational_mandatory') {
    reportability = 'conditional'
    isReportable = true
    warnings.push('Check subnational rules (e.g. Quebec vs Ontario vs federal PATPA)')
    recommendations.push('Identify recipient province for Canada reporting path')
  }

  if (regime.regimeType === 'monitoring_only') {
    isReportable = false
    reportability = 'not_applicable'
    reasoning.push('No mandatory national Sunshine equivalent — monitor local codes')
  }

  if (regime.countryCode === 'FR') {
    const usdAmount = record.totalAmountOfPaymentUsdollars ?? 0
    if (amountMeetsEurThreshold(usdAmount, 10)) {
      isReportable = true
      reportability = 'reportable'
      reasoning.push('Meets France Loi Bertrand €10 benefit threshold (intl_fr_loi_bertrand_10_eur)')
    } else {
      reportability = 'conditional'
      recommendations.push('Register agreements on Transparence Santé even if benefit < €10')
    }
    warnings.push('France: semi-annual deadlines — Sep 1 (H1) and Mar 1 (H2)')
  }

  if (regime.countryCode === 'GB') {
    isReportable = true
    reportability = 'reportable'
    recommendations.push('Publish via ABPI Disclosure UK platform (June cycle)')
    recommendations.push('Check NHS COI rules for NHS-employed HCPs')
  }

  if (regime.sunshineActEquivalent.includes('EFPIA')) {
    isReportable = true
    reportability = 'reportable'
    recommendations.push('Disclose individual ToV via national EFPIA portal')
  }

  regime.nationalNotes.forEach((n) => {
    if (n.toLowerCase().includes('monitor') || n.toLowerCase().includes('sanction')) {
      warnings.push(n)
    } else {
      recommendations.push(n)
    }
  })

  return {
    countryCode: regime.countryCode,
    countryName: regime.countryName,
    region: REGION_LABELS[regime.region],
    regimeName: regime.regimeName,
    sunshineActEquivalent: regime.sunshineActEquivalent,
    regimeType: regime.regimeType,
    isReportable,
    reportability,
    legalBasis: regime.legalBasis,
    reportingThreshold: formatThreshold(regime),
    publicDisclosure: regime.publicDisclosure,
    applicableRuleIds: regime.nationalRuleIds,
    reasoning,
    warnings,
    recommendations,
    cmsOverlap: regime.cmsOpenPaymentsOverlap,
  }
}

export class InternationalComplianceService {
  getAllCountries(): NationalReportingRegime[] {
    return getAllInternationalRegimes()
  }

  getCountriesByRegion(region: NationalReportingRegime['region']): NationalReportingRegime[] {
    return getRegimesByRegion(region)
  }

  getRegime(country: string): NationalReportingRegime | undefined {
    return getRegimeByCountryName(country) ?? getRegimeByCountryCode(country)
  }

  analyzeMultiJurisdiction(record: CMSRecord): MultiJurisdictionReport {
    const jurisdictions: JurisdictionAnalysis[] = []
    const seen = new Set<string>()

    const addRegime = (regime: NationalReportingRegime | undefined, context: 'recipient' | 'travel' | 'manufacturer') => {
      if (!regime || seen.has(`${regime.countryCode}-${context}`)) return
      seen.add(`${regime.countryCode}-${context}`)
      jurisdictions.push(analyzeJurisdiction(regime, record, context))
    }

    // U.S. CMS always evaluated for platform baseline
    addRegime(getRegimeByCountryCode('US'), 'recipient')

    const recipientRegime = getRegimeByCountryName(record.recipientCountry)
    if (recipientRegime && recipientRegime.countryCode !== 'US') {
      addRegime(recipientRegime, 'recipient')
    } else if (record.recipientCountry && !isUnitedStatesCountry(record.recipientCountry)) {
      const code = resolveCountryCode(record.recipientCountry)
      if (code) addRegime(getRegimeByCountryCode(code), 'recipient')
    }

    if (record.countryOfTravel) {
      const travelRegime = getRegimeByCountryName(record.countryOfTravel)
      if (travelRegime) addRegime(travelRegime, 'travel')
    }

    if (record.applicableManufacturerOrApplicableGpoMakingPaymentCountry) {
      const mfrRegime = getRegimeByCountryName(record.applicableManufacturerOrApplicableGpoMakingPaymentCountry)
      if (mfrRegime && mfrRegime.countryCode !== 'US') {
        addRegime(mfrRegime, 'manufacturer')
      }
    }

    const primary =
      jurisdictions.find((j) => j.countryCode === resolveCountryCode(record.recipientCountry)) ??
      jurisdictions.find((j) => j.countryCode !== 'US') ??
      jurisdictions[0]

    const additional = jurisdictions.filter(
      (j) => j.isReportable && j.reportability === 'reportable' && j.countryCode !== 'US'
    ).length

    const allWarnings = [...new Set(jurisdictions.flatMap((j) => j.warnings))]
    const allRecommendations = [...new Set(jurisdictions.flatMap((j) => j.recommendations))]

    let summary = 'U.S. CMS Open Payments baseline evaluated.'
    if (primary && primary.countryCode !== 'US') {
      summary = `Primary non-U.S. regime: ${primary.sunshineActEquivalent} (${primary.countryName}).`
    }
    if (additional > 0) {
      summary += ` ${additional} additional mandatory/conditional national regime(s) may apply.`
    }

    return {
      primaryJurisdiction: primary,
      applicableJurisdictions: jurisdictions,
      usCmsRequired: true,
      additionalRegimesRequired: additional,
      summary,
      allWarnings,
      allRecommendations,
    }
  }

  getStats() {
    const all = getAllInternationalRegimes()
    return {
      totalCountries: all.length,
      americas: all.filter((r) =>
        ['north_america', 'central_america', 'caribbean', 'south_america'].includes(r.region)
      ).length,
      europeAndUk: all.filter((r) =>
        ['western_europe', 'northern_europe', 'southern_europe', 'eastern_europe', 'united_kingdom'].includes(r.region)
      ).length,
      mandatoryLegal: all.filter((r) => r.regimeType === 'mandatory_legal').length,
      efpiaAligned: all.filter((r) => r.sunshineActEquivalent.includes('EFPIA')).length,
      ukDisclosure: all.filter((r) => r.countryCode === 'GB').length,
      monitoringOnly: all.filter((r) => r.regimeType === 'monitoring_only').length,
      regions: Object.entries(REGION_LABELS).map(([key, label]) => ({
        region: key,
        label,
        count: getRegimesByRegion(key as NationalReportingRegime['region']).length,
      })),
    }
  }
}

export const internationalComplianceService = new InternationalComplianceService()
