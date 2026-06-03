import { NextRequest, NextResponse } from 'next/server'
import {
  generateFranceTransparenceCsv,
  generateUkDisclosureCsv,
  getInternationalExportStats,
} from '@/lib/jurisdiction-export-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const jurisdiction = (searchParams.get('jurisdiction') || 'fr').toLowerCase()

    let csv: string
    let filename: string

    if (jurisdiction === 'uk' || jurisdiction === 'gb') {
      csv = await generateUkDisclosureCsv(programYear)
      filename = `DISCLOSURE_UK_${programYear}.csv`
    } else {
      csv = await generateFranceTransparenceCsv(programYear)
      filename = `TRANSPARENCE_FR_${programYear}.csv`
    }

    if (searchParams.get('format') === 'json') {
      const stats = await getInternationalExportStats(programYear)
      return NextResponse.json({
        success: true,
        data: { programYear, jurisdiction, stats, rowCount: Math.max(0, csv.split('\n').length - 1) },
      })
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('International export error:', error)
    return NextResponse.json({ success: false, error: 'International export failed' }, { status: 500 })
  }
}
