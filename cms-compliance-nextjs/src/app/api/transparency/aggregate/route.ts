import { NextRequest, NextResponse } from 'next/server'
import { runAggregateRecalculationJob, getLastAggregateJobRun } from '@/lib/aggregate-job-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { reviewSessionId, programYear } = body

    const result = reviewSessionId
      ? await runAggregateRecalculationJob({ reviewSessionId, programYear, triggeredBy: 'manual' })
      : await runAggregateRecalculationJob({ programYear, triggeredBy: 'manual' })

    const lastRun = await getLastAggregateJobRun()

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        lastRun: lastRun
          ? { completedAt: lastRun.completedAt, resultSummary: lastRun.resultSummary }
          : null,
      },
      message: `Recalculated ${result.recipientGroups} recipient aggregate group(s)`,
    })
  } catch (error) {
    console.error('Aggregate recalculation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to recalculate aggregates' }, { status: 500 })
  }
}
