import type { GlossaryTerm } from '@/lib/glossary-service'
import {
  CMS_OPEN_PAYMENTS_GLOSSARY,
  type CmsGlossaryCategory,
  type CmsOpenPaymentsGlossaryEntry,
} from '@/data/cms-open-payments-glossary'

function mapCmsCategory(category: CmsGlossaryCategory): GlossaryTerm['category'] {
  switch (category) {
    case 'Nature of Payment':
      return 'payment_type'
    case 'Type of Payment':
      return 'compliance_term'
    case 'General definitions':
      return 'regulatory_term'
  }
}

function inferReportability(entry: CmsOpenPaymentsGlossaryEntry): GlossaryTerm['reportability'] {
  if (entry.id === 'cms_natures_of_payment') return 'conditional'
  if (entry.cmsCategory === 'Nature of Payment' || entry.cmsCategory === 'Type of Payment') {
    return 'reportable'
  }
  return 'reportable'
}

export function buildCmsOfficialGlossaryTerms(): GlossaryTerm[] {
  const now = new Date().toISOString()
  return CMS_OPEN_PAYMENTS_GLOSSARY.map((entry) => ({
    id: entry.id,
    term: entry.term,
    definition: entry.definition,
    category: mapCmsCategory(entry.cmsCategory),
    reportability: inferReportability(entry),
    conditions: entry.conditions,
    examples: entry.examples,
    regulatoryBasis: entry.regulatoryBasis ?? 'CMS Open Payments — openpaymentsdata.cms.gov/about',
    cmsCategory: entry.cmsCategory,
    programYearNote: entry.programYearNote,
    sortLetter: entry.letter,
    source: 'cms_official' as const,
    lastUpdated: now,
    version: '2025-01',
  }))
}

/** Platform-specific glossary supplements (products, international fields) — not duplicated in CMS A–T glossary. */
export function buildPlatformSupplementGlossaryTerms(): GlossaryTerm[] {
  const now = new Date().toISOString()
  const v = '1.0'
  return [
    {
      id: 'product_drug',
      term: 'Covered Drug',
      definition: 'Prescription drug that is covered by Medicare, Medicaid, or CHIP',
      category: 'product_type',
      reportability: 'reportable',
      conditions: ['Prescription drug', 'Covered by government programs'],
      examples: ['Prescription medications', 'Brand name drugs', 'Generic drugs'],
      regulatoryBasis: '42 CFR 403.902',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'product_device',
      term: 'Covered Device',
      definition: 'Medical device that is covered by Medicare, Medicaid, or CHIP',
      category: 'product_type',
      reportability: 'reportable',
      conditions: ['Medical device', 'Covered by government programs'],
      examples: ['Surgical instruments', 'Diagnostic equipment', 'Therapeutic devices'],
      regulatoryBasis: '42 CFR 403.902',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'product_biological',
      term: 'Covered Biological',
      definition: 'Biological product that is covered by Medicare, Medicaid, or CHIP',
      category: 'product_type',
      reportability: 'reportable',
      conditions: ['Biological product', 'Covered by government programs'],
      examples: ['Vaccines', 'Blood products', 'Gene therapies'],
      regulatoryBasis: '42 CFR 403.902',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'compliance_reportable',
      term: 'Reportable Payment',
      definition: 'Payment that must be reported to CMS under the Open Payments program',
      category: 'compliance_term',
      reportability: 'reportable',
      conditions: ['Meets reporting requirements', 'Above threshold amounts'],
      examples: ['Payments > $10', 'Research payments', 'Consulting fees'],
      regulatoryBasis: '42 CFR 403.904',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'compliance_non_reportable',
      term: 'Non-Reportable Payment',
      definition: 'Payment that is exempt from CMS reporting requirements',
      category: 'compliance_term',
      reportability: 'non_reportable',
      conditions: ['Below threshold amounts', 'Exempt categories'],
      examples: ['Payments < $10 aggregate', 'Excluded transfer categories'],
      regulatoryBasis: '42 CFR 403.904',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'compliance_threshold',
      term: 'Reporting Threshold',
      definition: 'Minimum amount that triggers reporting requirements ($10 per payment; $100 annual aggregate)',
      category: 'compliance_term',
      reportability: 'conditional',
      conditions: ['Amount > $10', 'Annual aggregate > $100'],
      examples: ['$10 per payment', '$100 annual aggregate'],
      regulatoryBasis: '42 CFR 403.904',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'international_recipient_reporting',
      term: 'International Recipient Reporting',
      definition:
        'Payments to covered recipients located outside the United States remain reportable when made by an applicable manufacturer or applicable GPO operating in the United States.',
      category: 'compliance_term',
      reportability: 'reportable',
      conditions: ['Covered recipient', 'U.S. reporting entity', 'Thresholds met'],
      examples: ['Consulting fee to U.S.-licensed physician abroad'],
      regulatoryBasis: '42 CFR 403.904; CMS Open Payments Program Guidance',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'country_of_travel',
      term: 'Country of Travel',
      definition:
        'For travel and lodging payments, CMS requires city, state/province, and country where travel occurred.',
      category: 'compliance_term',
      reportability: 'reportable',
      conditions: ['Travel/lodging nature of payment', 'Destination captured in PUF'],
      examples: ['International conference airfare'],
      regulatoryBasis: 'CMS Open Payments data dictionary — Country_of_Travel',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'recipient_country_field',
      term: 'Recipient Country',
      definition:
        'Country where the covered recipient\'s primary business address is located. Non-U.S. values require province and postal code fields.',
      category: 'compliance_term',
      reportability: 'conditional',
      conditions: ['Required for international addresses'],
      examples: ['Recipient_Country = Canada'],
      regulatoryBasis: 'CMS Open Payments data dictionary — Recipient_Country',
      lastUpdated: now,
      version: v,
    },
    {
      id: 'us_territory_recipient',
      term: 'U.S. Territory Recipient',
      definition:
        'Recipients in U.S. territories (PR, GU, VI, AS, MP) follow U.S. state/territory coding and remain fully reportable.',
      category: 'regulatory_term',
      reportability: 'reportable',
      conditions: ['Valid territory state code'],
      examples: ['Physician in Puerto Rico (PR)'],
      regulatoryBasis: 'CMS Open Payments — U.S. state/territory codes',
      lastUpdated: now,
      version: v,
    },
  ]
}
