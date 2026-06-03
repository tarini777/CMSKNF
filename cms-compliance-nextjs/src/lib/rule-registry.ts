import type { ReportabilityRule } from '@/lib/glossary-service'

/** Unified rule metadata for PromoCX-style explainability (ComplianceIQ L1–L5 citations). */
export interface RuleRegistryEntry {
  id: string
  name: string
  description: string
  category: ReportabilityRule['category'] | 'international' | 'company'
  result: ReportabilityRule['result'] | 'informational'
  regulatoryBasis: string
  cfrSection?: string
  cmsUrl?: string
  glossaryTermId?: string
  jurisdiction?: string
  source: 'cms' | 'international' | 'company' | 'platform'
}

export const CMS_OPEN_PAYMENTS_ABOUT_URL = 'https://openpaymentsdata.cms.gov/about'
export const CMS_CFR_403_902_URL =
  'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-403/subpart-I/section-403.902'
export const CMS_CFR_403_904_URL =
  'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-403/subpart-I/section-403.904'

function extractCfrSection(regulatoryBasis: string): string | undefined {
  const match = regulatoryBasis.match(/42 CFR [\d.]+(?:\([^)]+\))?/)
  return match?.[0]
}

function ruleToEntry(rule: ReportabilityRule): RuleRegistryEntry {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    category: rule.category,
    result: rule.result,
    regulatoryBasis: rule.regulatoryBasis,
    cfrSection: extractCfrSection(rule.regulatoryBasis),
    cmsUrl: rule.regulatoryBasis.includes('42 CFR') ? CMS_CFR_403_904_URL : CMS_OPEN_PAYMENTS_ABOUT_URL,
    source: 'cms',
  }
}

/** International and supplemental rules not in the CMS reportability catalog. */
const SUPPLEMENTAL_RULES: RuleRegistryEntry[] = [
  {
    id: 'rule_efpia_consent_required',
    name: 'EFPIA Consent Required',
    description: 'EU/UK recipient — obtain HCP consent to determine individual vs aggregate disclosure',
    category: 'regulatory_term',
    result: 'conditional',
    regulatoryBasis: 'EFPIA Disclosure Code; UK ABPI Disclosure UK',
    source: 'international',
    jurisdiction: 'EU/UK',
  },
  {
    id: 'intl_us_cms_open_payments',
    name: 'U.S. CMS Open Payments',
    description: 'Baseline U.S. Sunshine Act reporting for applicable manufacturers and GPOs',
    category: 'international',
    result: 'reportable',
    regulatoryBasis: '42 CFR 403.904; Physician Payments Sunshine Act',
    cfrSection: '42 CFR 403.904',
    cmsUrl: CMS_CFR_403_904_URL,
    source: 'international',
    jurisdiction: 'US',
  },
  {
    id: 'intl_fr_loi_bertrand',
    name: 'France Loi Bertrand',
    description: 'Mandatory disclosure of agreements and benefits with healthcare professionals in France',
    category: 'international',
    result: 'reportable',
    regulatoryBasis: 'Loi Bertrand (France); Transparence Santé',
    source: 'international',
    jurisdiction: 'FR',
  },
  {
    id: 'intl_fr_loi_bertrand_10_eur',
    name: 'France Loi Bertrand €10 Threshold',
    description: 'Benefits at or above €10 equivalent require disclosure on Transparence Santé',
    category: 'international',
    result: 'reportable',
    regulatoryBasis: 'Loi Bertrand (France) — €10 benefit threshold',
    source: 'international',
    jurisdiction: 'FR',
  },
  {
    id: 'intl_fr_one_key',
    name: 'France One Key HCP Identifier',
    description: 'Use One Key identifier for French HCP attribution where available',
    category: 'international',
    result: 'informational',
    regulatoryBasis: 'Transparence Santé data requirements',
    source: 'international',
    jurisdiction: 'FR',
  },
  {
    id: 'intl_gb_abpi_disclosure',
    name: 'UK ABPI Disclosure UK',
    description: 'Industry disclosure of transfers of value to UK HCPs and organizations',
    category: 'international',
    result: 'reportable',
    regulatoryBasis: 'ABPI Code of Practice; Disclosure UK platform',
    source: 'international',
    jurisdiction: 'GB',
  },
  {
    id: 'intl_gb_nhs_coi',
    name: 'UK NHS Conflicts of Interest',
    description: 'NHS-employed HCPs may have additional COI rules beyond industry disclosure',
    category: 'international',
    result: 'conditional',
    regulatoryBasis: 'NHS Managing Conflicts of Interest guidance',
    source: 'international',
    jurisdiction: 'GB',
  },
]

const INTL_PREFIX_RULES: RuleRegistryEntry[] = [
  {
    id: 'intl_efpia_*',
    name: 'EFPIA National Disclosure',
    description: 'EFPIA member company disclosure via national portal',
    category: 'international',
    result: 'reportable',
    regulatoryBasis: 'EFPIA Disclosure Code',
    source: 'international',
    jurisdiction: 'EU',
  },
]

let cmsRulesCache: Map<string, RuleRegistryEntry> | null = null
let supplementalCache: Map<string, RuleRegistryEntry> | null = null

export function seedCmsRuleRegistry(cmsRules: ReportabilityRule[]): void {
  cmsRulesCache = new Map(cmsRules.map((r) => [r.id, ruleToEntry(r)]))
}

function getSupplementalMap(): Map<string, RuleRegistryEntry> {
  if (!supplementalCache) {
    supplementalCache = new Map(SUPPLEMENTAL_RULES.map((r) => [r.id, r]))
  }
  return supplementalCache
}

export function resolveRuleEntry(
  ruleId: string,
  cmsCatalog?: Map<string, RuleRegistryEntry>
): RuleRegistryEntry | undefined {
  const catalog = cmsCatalog ?? cmsRulesCache
  if (catalog?.has(ruleId)) return catalog.get(ruleId)

  const supplemental = getSupplementalMap()
  if (supplemental.has(ruleId)) return supplemental.get(ruleId)

  if (ruleId.startsWith('intl_efpia_')) {
    return {
      ...INTL_PREFIX_RULES[0],
      id: ruleId,
      jurisdiction: ruleId.replace('intl_efpia_', '').toUpperCase(),
    }
  }

  if (ruleId.startsWith('intl_') && ruleId.endsWith('_tov')) {
    const code = ruleId.replace('intl_', '').replace('_tov', '').toUpperCase()
    return {
      id: ruleId,
      name: `${code} Transfer of Value Disclosure`,
      description: `National transfer-of-value disclosure regime for ${code}`,
      category: 'international',
      result: 'reportable',
      regulatoryBasis: 'National Sunshine-equivalent regime',
      source: 'international',
      jurisdiction: code,
    }
  }

  if (ruleId.startsWith('intl_') && ruleId.endsWith('_monitor')) {
    const code = ruleId.replace('intl_', '').replace('_monitor', '').toUpperCase()
    return {
      id: ruleId,
      name: `${code} Monitoring Regime`,
      description: 'No mandatory national disclosure — monitor local codes of conduct',
      category: 'international',
      result: 'informational',
      regulatoryBasis: 'Voluntary / monitoring-only regime',
      source: 'international',
      jurisdiction: code,
    }
  }

  if (ruleId.startsWith('company_rule:')) {
    return {
      id: ruleId,
      name: 'Company Policy Rule',
      description: 'Organization-specific overlay rule applied during ingest',
      category: 'company',
      result: 'conditional',
      regulatoryBasis: 'Internal compliance policy',
      source: 'company',
    }
  }

  return undefined
}

export function listRegistryEntries(cmsCatalog?: Map<string, RuleRegistryEntry>): RuleRegistryEntry[] {
  const catalog = cmsCatalog ?? cmsRulesCache
  const ids = new Set<string>()
  const entries: RuleRegistryEntry[] = []

  if (catalog) {
    for (const entry of catalog.values()) {
      if (!ids.has(entry.id)) {
        ids.add(entry.id)
        entries.push(entry)
      }
    }
  }

  for (const entry of SUPPLEMENTAL_RULES) {
    if (!ids.has(entry.id)) {
      ids.add(entry.id)
      entries.push(entry)
    }
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

export function getImplementedTransparencyRuleIds(): string[] {
  return [
    'rule_discount_rebate_exempt',
    'rule_sample_patient_use_exempt',
    'rule_patient_education_exempt',
    'rule_support_act_covered_recipient',
    'rule_ownership_investment_reportable',
    'rule_indirect_payment_reportable',
    'rule_amount_threshold_10',
    'rule_annual_aggregate_threshold_100',
    'intl_fr_loi_bertrand_10_eur',
    'rule_foreign_recipient_reportable',
    'rule_travel_outside_us_reportable',
  ]
}
