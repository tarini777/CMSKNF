import { prisma } from '@/lib/prisma'
import { CMSRecord } from '@/types/cms'
import { AggregateStatus } from '@/lib/transparency-exemptions'
import { getJurisdictionThresholds } from '@/lib/jurisdiction-config-service'

function programYearFromRecord(record: CMSRecord): string {
  if (record.programYear) return record.programYear
  if (record.dateOfPayment) {
    const year = record.dateOfPayment.slice(0, 4)
    if (/^\d{4}$/.test(year)) return year
  }
  return String(new Date().getFullYear())
}

export interface AggregateResult {
  recipientId: string
  programYear: string
  subThresholdTotal: number
  recordCount: number
  aggregateReportable: boolean
  updatedRecordIds: string[]
  perPaymentMin: number
  aggregateAnnualMin: number
}

export async function computeRecipientAggregate(
  coveredRecipientId: string,
  programYear: string,
  jurisdictionCode = 'US'
): Promise<AggregateResult> {
  const thresholds = await getJurisdictionThresholds(jurisdictionCode)
  const { perPaymentMin, aggregateAnnualMin } = thresholds

  const records = await prisma.cMSRecord.findMany({
    where: {
      coveredRecipientId,
      OR: [{ programYear }, { dateOfPayment: { startsWith: programYear } }],
    },
  })

  const subThreshold = records.filter((r) => r.totalAmountOfPaymentUsdollars < perPaymentMin)
  const subThresholdTotal = subThreshold.reduce((sum, r) => sum + r.totalAmountOfPaymentUsdollars, 0)
  const aggregateReportable = subThresholdTotal >= aggregateAnnualMin

  const updatedRecordIds: string[] = []
  const aggregateStatus: AggregateStatus = aggregateReportable ? 'reportable' : 'non_reportable'

  for (const record of subThreshold) {
    await prisma.cMSRecord.update({
      where: { id: record.id },
      data: {
        recipientAnnualAggregate: subThresholdTotal,
        aggregateStatus,
        isReportable: aggregateReportable,
        reason: aggregateReportable
          ? `Annual aggregate $${subThresholdTotal.toFixed(2)} exceeds $${aggregateAnnualMin} ${thresholds.currency} threshold — sub-$${perPaymentMin} payments now reportable (rule_annual_aggregate_threshold_100)`
          : `Annual aggregate $${subThresholdTotal.toFixed(2)} below $${aggregateAnnualMin} — sub-$${perPaymentMin} payments non-reportable`,
        appliedRules: Array.isArray(record.appliedRules)
          ? [...(record.appliedRules as string[]), 'rule_annual_aggregate_threshold_100']
          : ['rule_annual_aggregate_threshold_100'],
      },
    })
    updatedRecordIds.push(record.id)
  }

  return {
    recipientId: coveredRecipientId,
    programYear,
    subThresholdTotal,
    recordCount: subThreshold.length,
    aggregateReportable,
    updatedRecordIds,
    perPaymentMin,
    aggregateAnnualMin,
  }
}

export async function recalculateAggregatesForSession(reviewSessionId: string): Promise<AggregateResult[]> {
  const records = await prisma.cMSRecord.findMany({ where: { reviewSessionId } })
  const groups = new Map<string, string>()

  for (const record of records) {
    const year = programYearFromRecord(record as CMSRecord)
    groups.set(`${record.coveredRecipientId}:${year}`, record.coveredRecipientId)
  }

  const results: AggregateResult[] = []
  for (const [key, recipientId] of groups) {
    const year = key.split(':')[1]
    results.push(await computeRecipientAggregate(recipientId, year))
  }
  return results
}

export async function recalculateAllAggregates(programYear?: string): Promise<AggregateResult[]> {
  const year = programYear || String(new Date().getFullYear())
  const recipients = await prisma.cMSRecord.findMany({
    where: {
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
    },
    select: { coveredRecipientId: true },
    distinct: ['coveredRecipientId'],
  })

  const results: AggregateResult[] = []
  for (const { coveredRecipientId } of recipients) {
    results.push(await computeRecipientAggregate(coveredRecipientId, year))
  }
  return results
}
