/**
 * Demo workflow seed — EU consent, disputes, HCP portal NPI, PUF lineage.
 * Idempotent: skips when SEED-DEMO-* records already exist.
 */

import type { PrismaClient } from '@prisma/client'
import { ingestConnectorPayload } from '../src/lib/lineage/connector-ingest-service'
import { getActiveProgramYear } from '../src/lib/submission-calendar'

function concurPayload(
  reportId: string,
  overrides: Record<string, string>
): Record<string, unknown> {
  const py = String(getActiveProgramYear())
  return {
    ReportId: reportId,
    ExpenseId: `${reportId}-EXP`,
    TransactionDate: `${py}-08-12`,
    PostedAmount: '2500',
    CurrencyCode: 'USD',
    ExpenseType: 'Business Meal',
    PaymentType: 'Cash',
    AttendeeFirstName: 'Alex',
    AttendeeLastName: 'Rivera',
    AttendeeNPI: '9876543210',
    AttendeeType: 'Covered Recipient Physician',
    AttendeeSpecialty: 'Internal Medicine',
    AttendeeCity: 'Chicago',
    AttendeeState: 'IL',
    CompanyCode: 'KNF Demo Manufacturer',
    ...overrides,
  }
}

export async function seedDemoWorkflows(prisma: PrismaClient): Promise<void> {
  const existing = await prisma.cMSRecord.count({
    where: { recordId: { startsWith: 'SEED-DEMO-' } },
  })
  if (existing > 0) {
    console.log(`Demo workflows already seeded (${existing} records) — skipping`)
    return
  }

  const py = String(getActiveProgramYear())

  // 1) Jane Doe — HCP portal (NPI 1234567890), FMV above benchmark
  const jane = await ingestConnectorPayload(
    'concur',
    concurPayload('SEED-DEMO-JDOE', {
      ExpenseType: 'Consulting',
      PostedAmount: '7500',
      AttendeeFirstName: 'Jane',
      AttendeeLastName: 'Doe',
      AttendeeNPI: '1234567890',
      AttendeeSpecialty: 'Cardiology',
      AttendeeCity: 'Boston',
      AttendeeState: 'MA',
    })
  )
  if (jane.cmsRecordId) {
    await prisma.cMSRecord.update({
      where: { id: jane.cmsRecordId },
      data: {
        recordId: 'SEED-DEMO-JDOE',
        programYear: py,
        humanDecision: 'pending',
        isReportable: true,
      },
    })
  }

  // 2) US approved reportable — fills review queue / export
  const usApproved = await ingestConnectorPayload(
    'concur',
    concurPayload('SEED-DEMO-US-OK', {
      PostedAmount: '450',
      ExpenseType: 'Honorarium',
      AttendeeFirstName: 'Sarah',
      AttendeeLastName: 'Kim',
      AttendeeNPI: '1122334455',
    })
  )
  if (usApproved.cmsRecordId) {
    await prisma.cMSRecord.update({
      where: { id: usApproved.cmsRecordId },
      data: {
        recordId: 'SEED-DEMO-US-OK',
        programYear: py,
        humanDecision: 'approve',
        isReportable: true,
      },
    })
  }

  // 3) EU/UK — consent pending
  const euPending = await ingestConnectorPayload(
    'concur',
    concurPayload('SEED-DEMO-EU-PENDING', {
      PostedAmount: '1800',
      ExpenseType: 'Consulting',
      AttendeeFirstName: 'Pierre',
      AttendeeLastName: 'Laurent',
      AttendeeNPI: '5544332211',
      AttendeeCity: 'Paris',
      AttendeeState: '',
    })
  )
  if (euPending.cmsRecordId) {
    await prisma.cMSRecord.update({
      where: { id: euPending.cmsRecordId },
      data: {
        recordId: 'SEED-DEMO-EU-PENDING',
        programYear: py,
        recipientCountry: 'France',
        recipientCity: 'Paris',
        consentForDisclosure: null,
        isReportable: true,
        humanDecision: 'pending',
      },
    })
  }

  // 4) EU/UK — consent granted (individual disclosure)
  const euYes = await ingestConnectorPayload(
    'concur',
    concurPayload('SEED-DEMO-EU-YES', {
      PostedAmount: '3200',
      ExpenseType: 'Consulting',
      AttendeeFirstName: 'Emma',
      AttendeeLastName: 'Walsh',
      AttendeeCity: 'London',
    })
  )
  if (euYes.cmsRecordId) {
    await prisma.cMSRecord.update({
      where: { id: euYes.cmsRecordId },
      data: {
        recordId: 'SEED-DEMO-EU-YES',
        programYear: py,
        recipientCountry: 'United Kingdom',
        recipientCity: 'London',
        consentForDisclosure: true,
        disclosureType: 'individual',
        isReportable: true,
      },
    })
  }

  // 5) EU — consent denied (aggregate)
  const euNo = await ingestConnectorPayload(
    'concur',
    concurPayload('SEED-DEMO-EU-NO', {
      PostedAmount: '950',
      ExpenseType: 'Food and Beverage',
      AttendeeFirstName: 'Hans',
      AttendeeLastName: 'Weber',
      AttendeeCity: 'Berlin',
    })
  )
  if (euNo.cmsRecordId) {
    await prisma.cMSRecord.update({
      where: { id: euNo.cmsRecordId },
      data: {
        recordId: 'SEED-DEMO-EU-NO',
        programYear: py,
        recipientCountry: 'Germany',
        recipientCity: 'Berlin',
        consentForDisclosure: false,
        disclosureType: 'aggregate',
        isReportable: true,
      },
    })
  }

  // 6) Open dispute — compliance resolves in Submit → Disputes
  const dispute = await ingestConnectorPayload(
    'concur',
    concurPayload('SEED-DEMO-DISPUTE', {
      PostedAmount: '1200',
      ExpenseType: 'Consulting',
      AttendeeFirstName: 'Michael',
      AttendeeLastName: 'Torres',
      AttendeeNPI: '6677889900',
    })
  )
  if (dispute.cmsRecordId) {
    await prisma.cMSRecord.update({
      where: { id: dispute.cmsRecordId },
      data: {
        recordId: 'SEED-DEMO-DISPUTE',
        programYear: py,
        disputeWorkflowStatus: 'under_review',
        disputeNotes: 'HCP reports duplicate consulting entry from med-ed vendor',
        disputeOpenedAt: new Date(),
        isReportable: true,
        humanDecision: 'pending',
      },
    })
  }

  console.log(`Demo workflows seeded for program year ${py} (6 scenarios + PUF lineage)`)
}
