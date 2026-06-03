import { NextRequest, NextResponse } from 'next/server'
import {
  getSubmissionCalendar,
  getUsCalendarSummary,
  getUsSubmissionCalendar,
  OPEN_PAYMENTS_LINKS,
  getActiveProgramYear,
} from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(
    searchParams.get('programYear') || String(getActiveProgramYear())
  )
  const jurisdiction = searchParams.get('jurisdiction') || 'all'

  const data =
    jurisdiction === 'US' ? getUsSubmissionCalendar(year) : getSubmissionCalendar(year)

  return NextResponse.json({
    success: true,
    data,
    programYear: year,
    usSummary: getUsCalendarSummary(year),
    cmsLinks: OPEN_PAYMENTS_LINKS,
  })
}
