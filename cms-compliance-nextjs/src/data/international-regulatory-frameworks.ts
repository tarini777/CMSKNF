/**
 * National HCP / transfer-of-value transparency regimes — Americas & Europe (+ UK).
 */

export type RegimeType =
  | 'mandatory_legal'
  | 'mandatory_industry_code'
  | 'voluntary_industry_code'
  | 'subnational_mandatory'
  | 'regional_harmonized'
  | 'monitoring_only'

export type ReportabilityResult = 'reportable' | 'non_reportable' | 'conditional' | 'not_applicable'

export interface ReportingThreshold {
  currency: string
  perTransferMin?: number
  annualAggregateMin?: number
  notes?: string
}

export interface NationalReportingRegime {
  countryCode: string
  countryName: string
  region:
    | 'north_america'
    | 'central_america'
    | 'caribbean'
    | 'south_america'
    | 'western_europe'
    | 'northern_europe'
    | 'southern_europe'
    | 'eastern_europe'
    | 'united_kingdom'
  regimeName: string
  regimeType: RegimeType
  sunshineActEquivalent: string
  legalBasis: string
  reportingThreshold?: ReportingThreshold
  coveredTransfers: string[]
  coveredRecipients: string[]
  reportingFrequency: string
  publicDisclosure: boolean
  cmsOpenPaymentsOverlap: string
  defaultReportability: ReportabilityResult
  nationalNotes: string[]
  nationalRuleIds: string[]
}

const EFPIA_BASE: Omit<
  NationalReportingRegime,
  'countryCode' | 'countryName' | 'region' | 'nationalNotes' | 'nationalRuleIds'
> = {
  regimeName: 'EFPIA Disclosure Code',
  regimeType: 'mandatory_industry_code',
  sunshineActEquivalent: 'EU Sunshine Act (EFPIA Disclosure Code)',
  legalBasis: 'EFPIA Disclosure Code; implemented via national industry associations',
  reportingThreshold: {
    currency: 'EUR',
    perTransferMin: 0,
    notes: 'Individual disclosure for identifiable HCP/HCO transfers',
  },
  coveredTransfers: [
    'Donations and grants',
    'Event sponsorship',
    'Fees for service and consultancy',
    'Research and development',
  ],
  coveredRecipients: ['Healthcare professionals', 'Healthcare organisations'],
  reportingFrequency: 'Annual (typically June for prior calendar year)',
  publicDisclosure: true,
  cmsOpenPaymentsOverlap: 'Parallel CMS reporting for U.S. applicable manufacturers',
  defaultReportability: 'reportable',
}

function efpiCountry(
  code: string,
  name: string,
  region: NationalReportingRegime['region'],
  association: string,
  notes: string[],
  overrides?: Partial<NationalReportingRegime>
): NationalReportingRegime {
  return {
    ...EFPIA_BASE,
    countryCode: code,
    countryName: name,
    region,
    legalBasis: `${EFPIA_BASE.legalBasis}; ${association}`,
    nationalNotes: notes,
    nationalRuleIds: [`intl_efpia_${code.toLowerCase()}`, `intl_${code.toLowerCase()}_tov`],
    ...overrides,
  }
}

function monitorCountry(
  code: string,
  name: string,
  region: NationalReportingRegime['region'],
  note: string
): NationalReportingRegime {
  return {
    countryCode: code,
    countryName: name,
    region,
    regimeName: 'Monitor national / industry disclosure',
    regimeType: 'monitoring_only',
    sunshineActEquivalent: 'No CMS/EFPIA equivalent catalogued',
    legalBasis: note,
    coveredTransfers: ['Industry promotional transfers where applicable'],
    coveredRecipients: ['Healthcare professionals'],
    reportingFrequency: 'N/A unless local law adopted',
    publicDisclosure: false,
    cmsOpenPaymentsOverlap: 'U.S. CMS applies to U.S. reporting entities only',
    defaultReportability: 'not_applicable',
    nationalNotes: [note],
    nationalRuleIds: [`intl_${code.toLowerCase()}_monitor`],
  }
}

export const INTERNATIONAL_REGULATORY_FRAMEWORKS: NationalReportingRegime[] = [
  {
    countryCode: 'US',
    countryName: 'United States',
    region: 'north_america',
    regimeName: 'CMS Open Payments (Sunshine Act)',
    regimeType: 'mandatory_legal',
    sunshineActEquivalent: 'CMS Open Payments / U.S. Sunshine Act',
    legalBasis: '42 CFR Part 403',
    reportingThreshold: { currency: 'USD', perTransferMin: 10, annualAggregateMin: 100 },
    coveredTransfers: ['Payment or transfer of value'],
    coveredRecipients: ['Physicians', 'Teaching hospitals', 'Advanced practice providers'],
    reportingFrequency: 'Annual',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Primary U.S. regime',
    defaultReportability: 'reportable',
    nationalNotes: ['International recipient addresses still reportable'],
    nationalRuleIds: ['intl_us_cms_open_payments'],
  },
  {
    countryCode: 'CA',
    countryName: 'Canada',
    region: 'north_america',
    regimeName: 'Provincial transparency + PATPA',
    regimeType: 'subnational_mandatory',
    sunshineActEquivalent: 'Quebec Bill 150 / Ontario HSPTA + voluntary PATPA',
    legalBasis: 'Quebec Loi 45; Ontario HSPTA; Innovative Medicines Canada PATPA',
    reportingThreshold: { currency: 'CAD', notes: 'Quebec aggregate >$100; Ontario $10+ payments' },
    coveredTransfers: ['Fees', 'Travel', 'Research', 'Educational support'],
    coveredRecipients: ['Healthcare professionals', 'Healthcare organisations'],
    reportingFrequency: 'Annual (province-dependent)',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Dual reporting with CMS for cross-border companies',
    defaultReportability: 'conditional',
    nationalNotes: ['Check recipient province for mandatory rules'],
    nationalRuleIds: ['intl_ca_quebec_bill150', 'intl_ca_ontario_hspta'],
  },
  {
    countryCode: 'MX',
    countryName: 'Mexico',
    region: 'north_america',
    regimeName: 'CANIFARMA Código de Ética',
    regimeType: 'voluntary_industry_code',
    sunshineActEquivalent: 'CANIFARMA ethics transparency (voluntary)',
    legalBasis: 'CANIFARMA; COFEPRIS oversight',
    coveredTransfers: ['Promotional activities', 'Research', 'Education'],
    coveredRecipients: ['Healthcare professionals', 'Institutions'],
    reportingFrequency: 'Annual where adopted',
    publicDisclosure: false,
    cmsOpenPaymentsOverlap: 'CMS separate for U.S. entities',
    defaultReportability: 'conditional',
    nationalNotes: ['Voluntary industry transparency'],
    nationalRuleIds: ['intl_mx_canifarma'],
  },
  monitorCountry('BZ', 'Belize', 'central_america', 'Monitor CARICOM / local association codes'),
  monitorCountry('CR', 'Costa Rica', 'central_america', 'CRIME industry ethics code'),
  monitorCountry('SV', 'El Salvador', 'central_america', 'ASIF voluntary transparency'),
  monitorCountry('GT', 'Guatemala', 'central_america', 'Regional industry ethics codes'),
  monitorCountry('HN', 'Honduras', 'central_america', 'Industry association codes'),
  monitorCountry('NI', 'Nicaragua', 'central_america', 'No mandatory national regime identified'),
  monitorCountry('PA', 'Panama', 'central_america', 'Monitor health ministry guidance'),
  ...['AG', 'BS', 'BB', 'CU', 'DM', 'DO', 'GD', 'HT', 'JM', 'KN', 'LC', 'VC', 'TT'].map((code) => {
    const names: Record<string, string> = {
      AG: 'Antigua and Barbuda',
      BS: 'Bahamas',
      BB: 'Barbados',
      CU: 'Cuba',
      DM: 'Dominica',
      DO: 'Dominican Republic',
      GD: 'Grenada',
      HT: 'Haiti',
      JM: 'Jamaica',
      KN: 'Saint Kitts and Nevis',
      LC: 'Saint Lucia',
      VC: 'Saint Vincent and the Grenadines',
      TT: 'Trinidad and Tobago',
    }
    return monitorCountry(code, names[code], 'caribbean', `${names[code]}: monitor local pharma association`)
  }),
  {
    countryCode: 'BR',
    countryName: 'Brazil',
    region: 'south_america',
    regimeName: 'Lei da Transparência (13.331/2016)',
    regimeType: 'mandatory_legal',
    sunshineActEquivalent: 'Brazil Transparency Law',
    legalBasis: 'Law 13.331/2016; ANVISA RDC 096/2022',
    reportingThreshold: { currency: 'BRL', notes: 'Disclose HCP/HCO transfers per law' },
    coveredTransfers: ['Patronage', 'Donations', 'Research', 'Events', 'Consulting'],
    coveredRecipients: ['Healthcare professionals', 'Institutions', 'Patient orgs'],
    reportingFrequency: 'Annual',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Mandatory Brazil reporting plus CMS where applicable',
    defaultReportability: 'reportable',
    nationalNotes: ['Public official interactions also covered'],
    nationalRuleIds: ['intl_br_lei_13331'],
  },
  {
    countryCode: 'CO',
    countryName: 'Colombia',
    region: 'south_america',
    regimeName: 'MOH Transparency Resolución 2886/2018',
    regimeType: 'mandatory_legal',
    sunshineActEquivalent: 'Colombia MOH transparency registry',
    legalBasis: 'Resolución 2886/2018; Ley 1952/2019',
    reportingThreshold: { currency: 'COP', notes: 'Health sector benefits registry' },
    coveredTransfers: ['Donations', 'Sponsorship', 'Consulting', 'Travel', 'Research'],
    coveredRecipients: ['Health sector professionals', 'Institutions'],
    reportingFrequency: 'Periodic registry updates',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Dual reporting for multinationals',
    defaultReportability: 'reportable',
    nationalNotes: ['MOH registry submission required'],
    nationalRuleIds: ['intl_co_res_2886'],
  },
  {
    countryCode: 'AR',
    countryName: 'Argentina',
    region: 'south_america',
    regimeName: 'CAEM Código de Conducta',
    regimeType: 'voluntary_industry_code',
    sunshineActEquivalent: 'CAEM industry code',
    legalBasis: 'CAEM self-regulation; Ley 25.649 public ethics',
    coveredTransfers: ['Promotional activities', 'Research', 'Events'],
    coveredRecipients: ['Healthcare professionals', 'Institutions'],
    reportingFrequency: 'Annual (members)',
    publicDisclosure: false,
    cmsOpenPaymentsOverlap: 'CMS separate obligation',
    defaultReportability: 'conditional',
    nationalNotes: ['Public sector interactions have extra rules'],
    nationalRuleIds: ['intl_ar_caem'],
  },
  {
    countryCode: 'CL',
    countryName: 'Chile',
    region: 'south_america',
    regimeName: 'Ley 20.724 + IFARMA',
    regimeType: 'mandatory_legal',
    sunshineActEquivalent: 'Chile lobby/transparency law + IFARMA',
    legalBasis: 'Ley 20.724; IFARMA Código de Conducta',
    coveredTransfers: ['Lobbying', 'Donations', 'Events', 'Consulting'],
    coveredRecipients: ['Public officials', 'Healthcare professionals'],
    reportingFrequency: 'Registry / annual',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Lobby registry distinct from CMS payments',
    defaultReportability: 'conditional',
    nationalNotes: ['Separate lobby vs HCP transfer tracks'],
    nationalRuleIds: ['intl_cl_ley_20724'],
  },
  monitorCountry('BO', 'Bolivia', 'south_america', 'No mandatory national regime identified'),
  monitorCountry('EC', 'Ecuador', 'south_america', 'Monitor ARCSA and association codes'),
  monitorCountry('GY', 'Guyana', 'south_america', 'No mandatory national regime identified'),
  {
    countryCode: 'PE',
    countryName: 'Peru',
    region: 'south_america',
    regimeName: 'ALAFARMA Código de Ética',
    regimeType: 'voluntary_industry_code',
    sunshineActEquivalent: 'ALAFARMA ethics disclosure',
    legalBasis: 'ALAFARMA; DIGEMID oversight',
    coveredTransfers: ['Promotional activities', 'Research', 'Samples'],
    coveredRecipients: ['Healthcare professionals'],
    reportingFrequency: 'Annual (members)',
    publicDisclosure: false,
    cmsOpenPaymentsOverlap: 'CMS separate',
    defaultReportability: 'conditional',
    nationalNotes: ['Member company disclosure'],
    nationalRuleIds: ['intl_pe_alafarma'],
  },
  monitorCountry('PY', 'Paraguay', 'south_america', 'No mandatory national regime identified'),
  monitorCountry('SR', 'Suriname', 'south_america', 'No mandatory national regime identified'),
  monitorCountry('UY', 'Uruguay', 'south_america', 'Monitor local association codes'),
  monitorCountry('VE', 'Venezuela', 'south_america', 'Monitor local regulatory environment'),
  {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    region: 'united_kingdom',
    regimeName: 'ABPI Disclosure UK',
    regimeType: 'mandatory_industry_code',
    sunshineActEquivalent: 'UK Disclosure (ABPI Code Clause 28)',
    legalBasis: 'ABPI Code of Practice 2024; PMCPA; Disclosure UK platform',
    reportingThreshold: { currency: 'GBP', perTransferMin: 0, notes: 'Individual ToV disclosure; aggregate R&D allowed' },
    coveredTransfers: ['Consulting', 'Speaker fees', 'Travel', 'Registration', 'R&D', 'Grants to HCOs'],
    coveredRecipients: ['Healthcare professionals', 'Healthcare organisations'],
    reportingFrequency: 'Annual (June, calendar year)',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'UK Disclosure UK required in addition to CMS for U.S. program',
    defaultReportability: 'reportable',
    nationalNotes: [
      'Post-Brexit: ABPI not EFPIA',
      'NHS England COI rules may apply',
      'Devolved nations may have NHS board requirements',
    ],
    nationalRuleIds: ['intl_gb_abpi_disclosure', 'intl_gb_nhs_coi'],
  },
  efpiCountry('AT', 'Austria', 'western_europe', 'Pharmig', ['Pharmig EFPIA portal']),
  efpiCountry('BE', 'Belgium', 'western_europe', 'Mdeon / beTransparent', ['beTransparent.be public portal']),
  efpiCountry('BG', 'Bulgaria', 'eastern_europe', 'BAPh', ['Bulgarian EFPIA disclosure']),
  efpiCountry('HR', 'Croatia', 'eastern_europe', 'CROPharm', ['Croatian EFPIA disclosure']),
  efpiCountry('CY', 'Cyprus', 'southern_europe', 'Cyprus pharma association', ['EFPIA-aligned']),
  efpiCountry('CZ', 'Czech Republic', 'eastern_europe', 'ČAFF', ['Czech EFPIA portal']),
  efpiCountry('DK', 'Denmark', 'northern_europe', 'LIF Denmark', ['LIF disclosure']),
  efpiCountry('EE', 'Estonia', 'northern_europe', 'EstPhA', ['EFPIA-aligned']),
  efpiCountry('FI', 'Finland', 'northern_europe', 'FiMMA', ['Finnish industry disclosure']),
  efpiCountry('FR', 'France', 'western_europe', 'LEEM / one-key', ['Loi Bertrand; BDPM one-key mandatory portal'], {
    regimeType: 'mandatory_legal',
    sunshineActEquivalent: 'France Loi Bertrand / one-key (EU Sunshine + national law)',
    legalBasis: 'Loi 2011-2012 (Bertrand); LEEM; EFPIA',
    reportingThreshold: {
      currency: 'EUR',
      perTransferMin: 10,
      notes: 'Benefits ≥ €10; all agreements registerable; commercial sales exempt',
    },
    coveredRecipients: [
      'Physicians',
      'Pharmacists',
      'Nurses',
      'Midwives',
      'Medical students',
      'Scientific societies',
      'Healthcare consulting firms',
    ],
    reportingFrequency: 'Semi-annual (Sep 1 H1; Mar 1 H2)',
    nationalRuleIds: ['intl_fr_loi_bertrand', 'intl_fr_loi_bertrand_10_eur', 'intl_fr_one_key'],
  }),
  efpiCountry('DE', 'Germany', 'western_europe', 'vfa FSA Code', ['Freiwillige Selbstverpflichtung — voluntary FSA disclosure'], {
    regimeType: 'voluntary_industry_code',
    sunshineActEquivalent: 'Germany FSA Code (voluntary)',
  }),
  efpiCountry('GR', 'Greece', 'southern_europe', 'SFEE', ['Greek EFPIA disclosure']),
  efpiCountry('HU', 'Hungary', 'eastern_europe', 'MAGYOSZ', ['Hungarian EFPIA disclosure']),
  efpiCountry('IE', 'Ireland', 'northern_europe', 'IPHA', ['IPHA disclosure']),
  efpiCountry('IT', 'Italy', 'southern_europe', 'Farmindustria', ['Farmindustria national disclosure portal'], {
    sunshineActEquivalent: 'Italy Farmindustria Disclosure (EFPIA national)',
  }),
  efpiCountry('LV', 'Latvia', 'northern_europe', 'Latvian pharma association', ['EFPIA-aligned']),
  efpiCountry('LT', 'Lithuania', 'northern_europe', 'Innovator Pharma Lithuania', ['EFPIA-aligned']),
  efpiCountry('LU', 'Luxembourg', 'western_europe', 'Luxembourg association', ['EFPIA-aligned']),
  efpiCountry('MT', 'Malta', 'southern_europe', 'Malta association', ['EFPIA-aligned']),
  efpiCountry('NL', 'Netherlands', 'western_europe', 'CGR Transparency Register', ['CGR register for HCP relationships'], {
    sunshineActEquivalent: 'Netherlands CGR Transparency Register',
  }),
  efpiCountry('PL', 'Poland', 'eastern_europe', 'INFARMA', ['Polish EFPIA disclosure']),
  efpiCountry('PT', 'Portugal', 'southern_europe', 'APIFARMA', ['Portuguese EFPIA disclosure']),
  efpiCountry('RO', 'Romania', 'eastern_europe', 'ARPIM', ['Romanian EFPIA disclosure']),
  efpiCountry('SK', 'Slovakia', 'eastern_europe', 'SAFS', ['Slovak EFPIA disclosure']),
  efpiCountry('SI', 'Slovenia', 'southern_europe', 'Slovenian association', ['EFPIA-aligned']),
  efpiCountry('ES', 'Spain', 'southern_europe', 'Farmindustria España', ['Codigo BPF; Farmindustria ToV disclosure'], {
    sunshineActEquivalent: 'Spain Farmindustria / Codigo BPF',
  }),
  efpiCountry('SE', 'Sweden', 'northern_europe', 'LIF Sweden', ['Swedish EFPIA disclosure']),
  {
    countryCode: 'NO',
    countryName: 'Norway',
    region: 'northern_europe',
    regimeName: 'LMI Norway transparency',
    regimeType: 'mandatory_industry_code',
    sunshineActEquivalent: 'Norway LMI (EFPIA-aligned, non-EU)',
    legalBasis: 'Legemiddelindustriforbundet disclosure rules',
    reportingThreshold: { currency: 'NOK', notes: 'Individual HCP/HCO ToV disclosure' },
    coveredTransfers: EFPIA_BASE.coveredTransfers,
    coveredRecipients: EFPIA_BASE.coveredRecipients,
    reportingFrequency: 'Annual',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Parallel CMS reporting',
    defaultReportability: 'reportable',
    nationalNotes: ['EFPIA-equivalent though not EU member'],
    nationalRuleIds: ['intl_no_lmi'],
  },
  {
    countryCode: 'CH',
    countryName: 'Switzerland',
    region: 'western_europe',
    regimeName: 'scienceindustries pharma code',
    regimeType: 'voluntary_industry_code',
    sunshineActEquivalent: 'Swiss pharma code transparency',
    legalBasis: 'scienceindustries Code of Conduct; Swissmedic',
    reportingThreshold: { currency: 'CHF', notes: 'Industry self-regulatory disclosure' },
    coveredTransfers: ['Consulting', 'Research', 'Event support'],
    coveredRecipients: ['Healthcare professionals', 'Institutions'],
    reportingFrequency: 'Annual (members)',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'CMS separate; Swiss code for local ToV',
    defaultReportability: 'reportable',
    nationalNotes: ['Not EU/EFPIA but similar expectations'],
    nationalRuleIds: ['intl_ch_scienceindustries'],
  },
  {
    countryCode: 'IS',
    countryName: 'Iceland',
    region: 'northern_europe',
    regimeName: 'EFPIA-aligned (EEA)',
    regimeType: 'mandatory_industry_code',
    sunshineActEquivalent: 'EFPIA-aligned (EEA)',
    legalBasis: 'Icelandic association EFPIA implementation',
    coveredTransfers: EFPIA_BASE.coveredTransfers,
    coveredRecipients: EFPIA_BASE.coveredRecipients,
    reportingFrequency: EFPIA_BASE.reportingFrequency,
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Parallel CMS',
    defaultReportability: 'reportable',
    nationalNotes: ['EEA member'],
    nationalRuleIds: ['intl_is_efpia'],
  },
  {
    countryCode: 'LI',
    countryName: 'Liechtenstein',
    region: 'western_europe',
    regimeName: 'EFPIA-aligned (EEA)',
    regimeType: 'mandatory_industry_code',
    sunshineActEquivalent: 'EFPIA-aligned (EEA)',
    legalBasis: 'EEA alignment',
    coveredTransfers: EFPIA_BASE.coveredTransfers,
    coveredRecipients: EFPIA_BASE.coveredRecipients,
    reportingFrequency: EFPIA_BASE.reportingFrequency,
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'Parallel CMS',
    defaultReportability: 'reportable',
    nationalNotes: ['Small market EFPIA implementation'],
    nationalRuleIds: ['intl_li_efpia'],
  },
  monitorCountry('AL', 'Albania', 'eastern_europe', 'Monitor local association codes'),
  monitorCountry('AD', 'Andorra', 'western_europe', 'Small market — EU-aligned practices'),
  monitorCountry('BA', 'Bosnia and Herzegovina', 'eastern_europe', 'Industry codes; no federal mandatory regime'),
  monitorCountry('BY', 'Belarus', 'eastern_europe', 'Sanctions environment — monitor separately'),
  monitorCountry('MD', 'Moldova', 'eastern_europe', 'Monitor health ministry guidance'),
  monitorCountry('ME', 'Montenegro', 'eastern_europe', 'Monitor association codes'),
  monitorCountry('MK', 'North Macedonia', 'eastern_europe', 'Monitor association codes'),
  monitorCountry('RS', 'Serbia', 'eastern_europe', 'ALIMS oversight; industry ethics'),
  monitorCountry('UA', 'Ukraine', 'eastern_europe', 'Monitor national association; regulatory changes'),
  monitorCountry('RU', 'Russia', 'eastern_europe', 'Separate regulatory environment'),
  {
    countryCode: 'TR',
    countryName: 'Turkey',
    region: 'eastern_europe',
    regimeName: 'IEIS / TISD transparency',
    regimeType: 'voluntary_industry_code',
    sunshineActEquivalent: 'Turkey IEIS industry transparency',
    legalBasis: 'IEIS; TISD initiatives',
    coveredTransfers: ['Promotional support', 'Research', 'Events'],
    coveredRecipients: ['Healthcare professionals'],
    reportingFrequency: 'Annual (members)',
    publicDisclosure: true,
    cmsOpenPaymentsOverlap: 'CMS separate for U.S. entities',
    defaultReportability: 'conditional',
    nationalNotes: ['Not EFPIA member state'],
    nationalRuleIds: ['intl_tr_ieis'],
  },
]

export const COUNTRY_NAME_ALIASES: Record<string, string> = {
  'UNITED STATES': 'US',
  'UNITED STATES OF AMERICA': 'US',
  USA: 'US',
  'U.S.': 'US',
  US: 'US',
  CANADA: 'CA',
  CA: 'CA',
  'UNITED KINGDOM': 'GB',
  UK: 'GB',
  'GREAT BRITAIN': 'GB',
  ENGLAND: 'GB',
  SCOTLAND: 'GB',
  WALES: 'GB',
  BRITAIN: 'GB',
  FRANCE: 'FR',
  GERMANY: 'DE',
  ITALY: 'IT',
  SPAIN: 'ES',
  NETHERLANDS: 'NL',
  BELGIUM: 'BE',
  SWITZERLAND: 'CH',
  NORWAY: 'NO',
  SWEDEN: 'SE',
  DENMARK: 'DK',
  FINLAND: 'FI',
  IRELAND: 'IE',
  PORTUGAL: 'PT',
  POLAND: 'PL',
  AUSTRIA: 'AT',
  GREECE: 'GR',
  CZECHIA: 'CZ',
  'CZECH REPUBLIC': 'CZ',
  ROMANIA: 'RO',
  HUNGARY: 'HU',
  BRAZIL: 'BR',
  BRASIL: 'BR',
  MEXICO: 'MX',
  COLOMBIA: 'CO',
  ARGENTINA: 'AR',
  CHILE: 'CL',
  PERU: 'PE',
  ECUADOR: 'EC',
  URUGUAY: 'UY',
  VENEZUELA: 'VE',
  TURKEY: 'TR',
  TÜRKIYE: 'TR',
}

export function resolveCountryCode(country?: string | null): string | null {
  if (!country?.trim()) return null
  const upper = country.trim().toUpperCase()
  if (upper.length === 2 && INTERNATIONAL_REGULATORY_FRAMEWORKS.some((r) => r.countryCode === upper)) {
    return upper
  }
  return COUNTRY_NAME_ALIASES[upper] ?? null
}

export function getRegimeByCountryCode(code: string): NationalReportingRegime | undefined {
  return INTERNATIONAL_REGULATORY_FRAMEWORKS.find((r) => r.countryCode === code.toUpperCase())
}

export function getRegimeByCountryName(country?: string | null): NationalReportingRegime | undefined {
  const code = resolveCountryCode(country)
  if (code) return getRegimeByCountryCode(code)
  if (!country) return undefined
  return INTERNATIONAL_REGULATORY_FRAMEWORKS.find(
    (r) => r.countryName.toLowerCase() === country.trim().toLowerCase()
  )
}

export function getRegimesByRegion(region: NationalReportingRegime['region']): NationalReportingRegime[] {
  return INTERNATIONAL_REGULATORY_FRAMEWORKS.filter((r) => r.region === region)
}

export function getAllInternationalRegimes(): NationalReportingRegime[] {
  return INTERNATIONAL_REGULATORY_FRAMEWORKS
}

export const REGION_LABELS: Record<NationalReportingRegime['region'], string> = {
  north_america: 'North America',
  central_america: 'Central America',
  caribbean: 'Caribbean',
  south_america: 'South America',
  western_europe: 'Western Europe',
  northern_europe: 'Northern Europe',
  southern_europe: 'Southern Europe',
  eastern_europe: 'Eastern Europe & Balkans',
  united_kingdom: 'United Kingdom',
}
