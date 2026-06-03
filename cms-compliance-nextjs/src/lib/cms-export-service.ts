import { prisma } from '@/lib/prisma'

/** CMS Open Payments general payment CSV columns (subset for export). */
const CMS_EXPORT_HEADERS = [
  'Covered_Recipient_Type',
  'Teaching_Hospital_ID',
  'Teaching_Hospital_Name',
  'Covered_Recipient_Physician_Profile_ID',
  'Covered_Recipient_First_Name',
  'Covered_Recipient_Last_Name',
  'Covered_Recipient_Specialty',
  'Covered_Recipient_License_State_code1',
  'Recipient_Primary_Business_Street_Address_Line1',
  'Recipient_City',
  'Recipient_State',
  'Recipient_Zip_Code',
  'Recipient_Country',
  'Recipient_Province',
  'Recipient_Postal_Code',
  'Total_Amount_of_Payment_USDollars',
  'Date_of_Payment',
  'Form_of_Payment_or_Transfer_of_Value',
  'Nature_of_Payment_or_Transfer_of_Value',
  'City_of_Travel',
  'State_of_Travel',
  'Country_of_Travel',
  'Physician_Ownership_Indicator',
  'Third_Party_Payment_Recipient_Indicator',
  'Name_of_Third_Party_Entity_Receiving_Payment_or_Transfer_of_Value',
  'Dispute_Status_for_Publication',
  'Program_Year',
  'Payment_Publication_Date',
]

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function recordToCsvRow(record: Awaited<ReturnType<typeof fetchReportableRecords>>[0]): string {
  const cols = [
    record.coveredRecipientType,
    record.teachingHospitalId,
    record.teachingHospitalName,
    record.physicianProfileId,
    record.physicianFirstName,
    record.physicianLastName,
    record.physicianSpecialty,
    record.physicianLicenseStateCode1,
    record.recipientPrimaryBusinessStreetAddressLine1,
    record.recipientCity,
    record.recipientState,
    record.recipientZipCode,
    record.recipientCountry,
    record.recipientProvince,
    record.recipientPostalCode,
    record.totalAmountOfPaymentUsdollars,
    record.dateOfPayment,
    record.formOfPaymentOrTransferOfValue,
    record.natureOfPaymentOrTransferOfValue,
    record.cityOfTravel,
    record.stateOfTravel,
    record.countryOfTravel,
    record.physicianOwnershipIndicator,
    record.thirdPartyPaymentRecipientIndicator,
    record.nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue,
    record.disputeStatusForPublication || 'No',
    record.programYear,
    record.paymentPublicationDate,
  ]
  return cols.map(escapeCsv).join(',')
}

async function fetchReportableRecords(programYear?: string) {
  const year = programYear || String(new Date().getFullYear())
  return prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      NOT: { disputeWorkflowStatus: 'disputed' },
    },
    orderBy: { dateOfPayment: 'asc' },
  })
}

export async function generateCmsOpenPaymentsCsv(programYear?: string): Promise<string> {
  const records = await fetchReportableRecords(programYear)
  const header = CMS_EXPORT_HEADERS.join(',')
  const rows = records.map(recordToCsvRow)
  return [header, ...rows].join('\n')
}

export async function getCmsExportStats(programYear?: string) {
  const year = programYear || String(new Date().getFullYear())
  const [total, reportable, disputed, unresolved] = await Promise.all([
    prisma.cMSRecord.count({
      where: { OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }] },
    }),
    prisma.cMSRecord.count({
      where: {
        isReportable: true,
        OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      },
    }),
    prisma.cMSRecord.count({
      where: {
        disputeWorkflowStatus: 'disputed',
        OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      },
    }),
    prisma.cMSRecord.count({
      where: {
        disputeWorkflowStatus: { in: ['disputed', 'under_review'] },
        OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      },
    }),
  ])
  return { totalRecords: total, reportableRecords: reportable, disputedRecords: disputed, unresolvedDisputes: unresolved, programYear: year }
}

export { CMS_EXPORT_HEADERS }
