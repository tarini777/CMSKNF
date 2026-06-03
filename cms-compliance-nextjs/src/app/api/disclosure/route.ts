import { NextRequest, NextResponse } from 'next/server'
import { buildPublicDisclosureReport } from '@/lib/disclosure-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const report = await buildPublicDisclosureReport(programYear)
    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error('Disclosure report error:', error)
    return NextResponse.json({ success: false, error: 'Failed to build disclosure report' }, { status: 500 })
  }
}
