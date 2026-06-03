import { NextRequest, NextResponse } from 'next/server'
import { getSubmissionCalendar } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('programYear') || String(new Date().getFullYear()))
  return NextResponse.json({
    success: true,
    data: getSubmissionCalendar(year),
    programYear: year,
  })
}
