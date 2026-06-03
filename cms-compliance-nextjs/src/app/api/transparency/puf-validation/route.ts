import { NextRequest, NextResponse } from 'next/server'
import { validatePufExports } from '@/lib/puf-validation-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const report = await validatePufExports(programYear)
    return NextResponse.json({ success: true, data: report })
  } catch (error) {
    console.error('PUF validation error:', error)
    return NextResponse.json({ success: false, error: 'PUF validation failed' }, { status: 500 })
  }
}
