import { NextRequest, NextResponse } from 'next/server'
import { recalculateAggregatesForSession, recalculateAllAggregates } from '@/lib/aggregate-threshold-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { reviewSessionId, programYear } = body

    const results = reviewSessionId
      ? await recalculateAggregatesForSession(reviewSessionId)
      : await recalculateAllAggregates(programYear)

    return NextResponse.json({
      success: true,
      data: results,
      message: `Recalculated ${results.length} recipient aggregate group(s)`,
    })
  } catch (error) {
    console.error('Aggregate recalculation error:', error)
    return NextResponse.json({ success: false, error: 'Failed to recalculate aggregates' }, { status: 500 })
  }
}
