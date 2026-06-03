import { NextRequest, NextResponse } from 'next/server'
import { runAggregateRecalculationJob, getLastAggregateJobRun } from '@/lib/aggregate-job-service'
import { getCronSecret } from '@/lib/app-config'

function authorizeCron(request: NextRequest, bodySecret?: string): boolean {
  const configured = getCronSecret()
  if (!configured) return true
  const header = request.headers.get('x-cron-secret')
  return header === configured || bodySecret === configured
}

export async function GET() {
  const lastRun = await getLastAggregateJobRun()
  return NextResponse.json({
    success: true,
    data: lastRun
      ? {
          id: lastRun.id,
          status: lastRun.status,
          programYear: lastRun.programYear,
          triggeredBy: lastRun.triggeredBy,
          startedAt: lastRun.startedAt,
          completedAt: lastRun.completedAt,
          resultSummary: lastRun.resultSummary,
        }
      : null,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { reviewSessionId, programYear, cronSecret } = body as {
      reviewSessionId?: string
      programYear?: string
      cronSecret?: string
    }

    if (!authorizeCron(request, cronSecret)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const triggeredBy = cronSecret || request.headers.get('x-cron-secret') ? 'cron' : 'manual'
    const result = await runAggregateRecalculationJob({
      reviewSessionId,
      programYear,
      triggeredBy,
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Recalculated ${result.recipientGroups} recipient aggregate group(s)`,
    })
  } catch (error) {
    console.error('Aggregate job error:', error)
    return NextResponse.json({ success: false, error: 'Failed to run aggregate job' }, { status: 500 })
  }
}
