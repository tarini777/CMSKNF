import { prisma } from '@/lib/prisma'
import {
  recalculateAllAggregates,
  recalculateAggregatesForSession,
  type AggregateResult,
} from '@/lib/aggregate-threshold-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export const AGGREGATE_JOB_KEY = 'aggregate_recalc'

export interface AggregateJobOptions {
  programYear?: string
  reviewSessionId?: string
  triggeredBy?: string
}

export interface AggregateJobResult {
  jobRunId: string
  programYear: string
  recipientGroups: number
  reportableGroups: number
  results: AggregateResult[]
}

export async function getLastAggregateJobRun() {
  return prisma.jobRun.findFirst({
    where: { jobKey: AGGREGATE_JOB_KEY, status: 'completed' },
    orderBy: { startedAt: 'desc' },
  })
}

export async function runAggregateRecalculationJob(
  options: AggregateJobOptions = {}
): Promise<AggregateJobResult> {
  const programYear = options.programYear || String(getActiveProgramYear())
  const triggeredBy = options.triggeredBy || 'manual'

  const jobRun = await prisma.jobRun.create({
    data: {
      jobKey: AGGREGATE_JOB_KEY,
      programYear,
      status: 'running',
      triggeredBy,
    },
  })

  try {
    const results = options.reviewSessionId
      ? await recalculateAggregatesForSession(options.reviewSessionId)
      : await recalculateAllAggregates(programYear)

    const reportableGroups = results.filter((r) => r.aggregateReportable).length

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        resultSummary: {
          recipientGroups: results.length,
          reportableGroups,
          perPaymentMin: results[0]?.perPaymentMin,
          aggregateAnnualMin: results[0]?.aggregateAnnualMin,
        },
      },
    })

    return {
      jobRunId: jobRun.id,
      programYear,
      recipientGroups: results.length,
      reportableGroups,
      results,
    }
  } catch (error) {
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Aggregate job failed',
      },
    })
    throw error
  }
}

export async function countPendingAggregateRecords(programYear?: string): Promise<number> {
  const year = programYear || String(getActiveProgramYear())
  return prisma.cMSRecord.count({
    where: {
      aggregateStatus: 'pending',
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
    },
  })
}
