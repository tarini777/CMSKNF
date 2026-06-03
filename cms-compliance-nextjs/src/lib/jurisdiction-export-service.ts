import { prisma } from '@/lib/prisma'
import { getActiveProgramYear } from '@/lib/submission-calendar'

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function recipientMatchesCountry(country: string | null | undefined, codes: string[]): boolean {
  const c = (country || '').toLowerCase()
  return codes.some((code) => c.includes(code))
}

/** France — Transparence Santé / Loi Bertrand disclosure template (CSV). */
export async function generateFranceTransparenceCsv(programYear?: string): Promise<string> {
  const year = programYear || String(getActiveProgramYear())
  const records = await prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
    },
    orderBy: { dateOfPayment: 'asc' },
  })

  const headers = [
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

  const rows = records
    .filter((r) => recipientMatchesCountry(r.recipientCountry, ['france', 'fr']))
    .map((r) => {
      const amountEur = (r.reportingCurrencyValue ?? r.totalAmountOfPaymentUsdollars).toFixed(2)
      const consent =
        r.consentForDisclosure === true ? 'Oui' : r.consentForDisclosure === false ? 'Non' : 'En attente'
      const disclosure =
        r.disclosureType === 'individual'
          ? 'Individuel'
          : r.disclosureType === 'aggregate'
            ? 'Agregat'
            : 'A determiner'

      return [
        r.dateOfPayment || '',
        r.physicianLastName || r.coveredRecipientName.split(' ').slice(-1)[0] || '',
        r.physicianFirstName || r.coveredRecipientName.split(' ')[0] || '',
        r.coveredRecipientType || 'Professionnel de sante',
        amountEur,
        r.natureOfPaymentOrTransferOfValue || '',
        r.applicableManufacturerOrApplicableGpoMakingPaymentName || '',
        consent,
        disclosure,
        r.recordId,
      ]
        .map(escapeCsv)
        .join(',')
    })

  return [headers.join(','), ...rows].join('\n')
}

/** UK — Disclosure UK / EFPIA template (CSV). */
export async function generateUkDisclosureCsv(programYear?: string): Promise<string> {
  const year = programYear || String(getActiveProgramYear())
  const records = await prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
    },
    orderBy: { dateOfPayment: 'asc' },
  })

  const headers = [
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

  const rows = records
    .filter((r) =>
      recipientMatchesCountry(r.recipientCountry, [
        'united kingdom',
        'uk',
        'great britain',
        'england',
        'scotland',
        'wales',
      ])
    )
    .map((r) => {
      const consent =
        r.consentForDisclosure === true ? 'Yes' : r.consentForDisclosure === false ? 'No' : 'Pending'
      const method =
        r.disclosureType === 'individual'
          ? 'Individual'
          : r.disclosureType === 'aggregate'
            ? 'Aggregate'
            : 'TBD'

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
        consent,
        method,
        r.recordId,
      ]
        .map(escapeCsv)
        .join(',')
    })

  return [headers.join(','), ...rows].join('\n')
}

export async function getInternationalExportStats(programYear?: string) {
  const year = programYear || String(getActiveProgramYear())
  const records = await prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
    },
    select: { recipientCountry: true },
  })

  const fr = records.filter((r) => recipientMatchesCountry(r.recipientCountry, ['france', 'fr'])).length
  const uk = records.filter((r) =>
    recipientMatchesCountry(r.recipientCountry, ['united kingdom', 'uk', 'great britain', 'england'])
  ).length

  return { programYear: year, franceReportable: fr, ukReportable: uk }
}
