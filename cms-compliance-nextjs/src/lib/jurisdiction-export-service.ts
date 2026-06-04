import { prisma } from '@/lib/prisma'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import {
  getAllInternationalRegimes,
  getRegimeByCountryCode,
  NationalReportingRegime,
  resolveCountryCode,
} from '@/data/international-regulatory-frameworks'

export type ExportTemplate = 'fr_transparence' | 'uk_disclosure' | 'efpia_standard' | 'national_standard'

export interface JurisdictionExportSummary {
  countryCode: string
  countryName: string
  regimeName: string
  regimeType: string
  exportTemplate: ExportTemplate
  reportableRecords: number
  exportUrl: string
}

export interface InternationalExportStats {
  programYear: string
  totalJurisdictions: number
  jurisdictionsWithRecords: number
  totalReportableRecords: number
  jurisdictions: JurisdictionExportSummary[]
}

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function recordMatchesJurisdiction(
  record: { recipientCountry?: string | null },
  countryCode: string
): boolean {
  const code = countryCode.toUpperCase()
  const resolved = resolveCountryCode(record.recipientCountry)
  if (resolved === code) return true

  const regime = getRegimeByCountryCode(code)
  if (!regime) return false

  const raw = (record.recipientCountry || '').trim().toLowerCase()
  if (!raw) return false

  return raw === regime.countryName.toLowerCase() || raw.includes(regime.countryName.toLowerCase())
}

export function resolveExportTemplate(countryCode: string): ExportTemplate {
  const code = countryCode.toUpperCase()
  if (code === 'FR') return 'fr_transparence'
  if (code === 'GB' || code === 'UK') return 'uk_disclosure'

  const regime = getRegimeByCountryCode(code)
  if (!regime) return 'national_standard'

  const isEfpia =
    regime.nationalRuleIds.some((id) => id.startsWith('intl_efpia_')) ||
    regime.regimeName.includes('EFPIA') ||
    regime.sunshineActEquivalent.includes('EFPIA') ||
    regime.legalBasis.includes('EFPIA')

  if (isEfpia) return 'efpia_standard'
  return 'national_standard'
}

function normalizeJurisdictionCode(jurisdiction: string): string {
  const code = jurisdiction.trim().toUpperCase()
  if (code === 'UK') return 'GB'
  return code
}

async function getReportableRecordsForYear(programYear?: string) {
  const year = programYear || String(getActiveProgramYear())
  return prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
    },
    orderBy: { dateOfPayment: 'asc' },
  })
}

function consentLabel(
  consent: boolean | null | undefined,
  locale: 'fr' | 'en'
): string {
  if (locale === 'fr') {
    return consent === true ? 'Oui' : consent === false ? 'Non' : 'En attente'
  }
  return consent === true ? 'Yes' : consent === false ? 'No' : 'Pending'
}

function disclosureLabel(
  disclosureType: string | null | undefined,
  locale: 'fr' | 'en'
): string {
  if (locale === 'fr') {
    return disclosureType === 'individual'
      ? 'Individuel'
      : disclosureType === 'aggregate'
        ? 'Agregat'
        : 'A determiner'
  }
  return disclosureType === 'individual'
    ? 'Individual'
    : disclosureType === 'aggregate'
      ? 'Aggregate'
      : 'TBD'
}

function splitRecipientName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { first: parts[0] || '', last: '' }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function formatFranceRow(r: Awaited<ReturnType<typeof getReportableRecordsForYear>>[number]): string {
  const amountEur = (r.reportingCurrencyValue ?? r.totalAmountOfPaymentUsdollars).toFixed(2)
  const { first, last } = splitRecipientName(r.coveredRecipientName)

  return [
    r.dateOfPayment || '',
    r.physicianLastName || last,
    r.physicianFirstName || first,
    r.coveredRecipientType || 'Professionnel de sante',
    amountEur,
    r.natureOfPaymentOrTransferOfValue || '',
    r.applicableManufacturerOrApplicableGpoMakingPaymentName || '',
    consentLabel(r.consentForDisclosure, 'fr'),
    disclosureLabel(r.disclosureType, 'fr'),
    r.recordId,
  ]
    .map(escapeCsv)
    .join(',')
}

function formatUkRow(r: Awaited<ReturnType<typeof getReportableRecordsForYear>>[number]): string {
  return [
    r.dateOfPayment || '',
    r.coveredRecipientName,
    r.physicianSpecialty || '',
    [r.recipientCity, r.recipientCountry].filter(Boolean).join(', '),
    (r.reportingCurrencyValue ?? r.totalAmountOfPaymentUsdollars).toFixed(2),
    r.paymentCurrency || 'GBP',
    r.natureOfPaymentOrTransferOfValue || '',
    r.contextualInformation || '',
    r.applicableManufacturerOrApplicableGpoMakingPaymentName || '',
    consentLabel(r.consentForDisclosure, 'en'),
    disclosureLabel(r.disclosureType, 'en'),
    r.recordId,
  ]
    .map(escapeCsv)
    .join(',')
}

function formatStandardRow(
  r: Awaited<ReturnType<typeof getReportableRecordsForYear>>[number],
  regime: NationalReportingRegime
): string {
  return [
    r.dateOfPayment || '',
    r.coveredRecipientName,
    r.coveredRecipientType || '',
    r.recipientCity || '',
    r.recipientProvince || '',
    r.recipientCountry || regime.countryName,
    (r.reportingCurrencyValue ?? r.totalAmountOfPaymentUsdollars).toFixed(2),
    r.paymentCurrency || regime.reportingThreshold?.currency || 'USD',
    r.natureOfPaymentOrTransferOfValue || '',
    r.contextualInformation || '',
    r.applicableManufacturerOrApplicableGpoMakingPaymentName || '',
    regime.regimeName,
    regime.sunshineActEquivalent,
    regime.legalBasis,
    consentLabel(r.consentForDisclosure, 'en'),
    disclosureLabel(r.disclosureType, 'en'),
    r.recordId,
  ]
    .map(escapeCsv)
    .join(',')
}

const FRANCE_HEADERS = [
  'Date_Avantage',
  'Nom_Beneficiaire',
  'Prenom_Beneficiaire',
  'Qualite_Beneficiaire',
  'Montant_EUR',
  'Nature_Avantage',
  'Raison_Sociale_Entreprise',
  'Consentement_Individuel',
  'Mode_Divulgation',
  'Identifiant_Interne',
]

const UK_HEADERS = [
  'RecordDate',
  'HCPName',
  'HCPSpecialty',
  'PracticeLocation',
  'PaymentAmount',
  'PaymentCurrency',
  'PaymentNature',
  'PaymentContext',
  'CompanyName',
  'IndividualConsent',
  'DisclosureMethod',
  'InternalRecordId',
]

const STANDARD_HEADERS = [
  'PaymentDate',
  'RecipientName',
  'RecipientType',
  'RecipientCity',
  'RecipientProvince',
  'RecipientCountry',
  'PaymentAmount',
  'PaymentCurrency',
  'NatureOfPayment',
  'PaymentContext',
  'CompanyName',
  'RegimeName',
  'SunshineActEquivalent',
  'LegalBasis',
  'IndividualConsent',
  'DisclosureMethod',
  'InternalRecordId',
]

export async function generateInternationalCsv(
  jurisdiction: string,
  programYear?: string
): Promise<{ csv: string; filename: string; rowCount: number; template: ExportTemplate }> {
  const countryCode = normalizeJurisdictionCode(jurisdiction)
  const regime = getRegimeByCountryCode(countryCode)
  if (!regime) {
    throw new Error(`Unknown jurisdiction: ${jurisdiction}`)
  }

  const year = programYear || String(getActiveProgramYear())
  const records = await getReportableRecordsForYear(year)
  const filtered = records.filter((r) => recordMatchesJurisdiction(r, countryCode))
  const template = resolveExportTemplate(countryCode)

  let headers: string[]
  let rows: string[]

  if (template === 'fr_transparence') {
    headers = FRANCE_HEADERS
    rows = filtered.map(formatFranceRow)
  } else if (template === 'uk_disclosure') {
    headers = UK_HEADERS
    rows = filtered.map(formatUkRow)
  } else {
    headers = STANDARD_HEADERS
    rows = filtered.map((r) => formatStandardRow(r, regime))
  }

  const csv = [headers.join(','), ...rows].join('\n')
  const filename = `TRANSPARENCY_${countryCode}_${year}.csv`

  return { csv, filename, rowCount: rows.length, template }
}

/** @deprecated Use generateInternationalCsv('FR', programYear) */
export async function generateFranceTransparenceCsv(programYear?: string): Promise<string> {
  const { csv } = await generateInternationalCsv('FR', programYear)
  return csv
}

/** @deprecated Use generateInternationalCsv('GB', programYear) */
export async function generateUkDisclosureCsv(programYear?: string): Promise<string> {
  const { csv } = await generateInternationalCsv('GB', programYear)
  return csv
}

export async function getInternationalExportStats(programYear?: string): Promise<InternationalExportStats> {
  const year = programYear || String(getActiveProgramYear())
  const records = await getReportableRecordsForYear(year)
  const regimes = getAllInternationalRegimes()

  const jurisdictions: JurisdictionExportSummary[] = regimes.map((regime) => {
    const reportableRecords = records.filter((r) => recordMatchesJurisdiction(r, regime.countryCode)).length
    const exportTemplate = resolveExportTemplate(regime.countryCode)

    return {
      countryCode: regime.countryCode,
      countryName: regime.countryName,
      regimeName: regime.regimeName,
      regimeType: regime.regimeType,
      exportTemplate,
      reportableRecords,
      exportUrl: `/api/transparency/export/international?programYear=${year}&jurisdiction=${regime.countryCode.toLowerCase()}`,
    }
  })

  return {
    programYear: year,
    totalJurisdictions: jurisdictions.length,
    jurisdictionsWithRecords: jurisdictions.filter((j) => j.reportableRecords > 0).length,
    totalReportableRecords: records.length,
    jurisdictions,
  }
}
