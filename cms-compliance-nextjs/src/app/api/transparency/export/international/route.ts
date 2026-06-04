import { NextRequest, NextResponse } from 'next/server'
import {
  generateInternationalCsv,
  getInternationalExportStats,
} from '@/lib/jurisdiction-export-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const jurisdiction = (searchParams.get('jurisdiction') || 'fr').toLowerCase()
    const format = searchParams.get('format')

    if (format === 'json' && (jurisdiction === 'all' || jurisdiction === '*')) {
      const stats = await getInternationalExportStats(programYear)
      return NextResponse.json({ success: true, data: stats })
    }

    const { csv, filename, rowCount, template } = await generateInternationalCsv(jurisdiction, programYear)

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          programYear,
          jurisdiction: jurisdiction.toUpperCase(),
          template,
          rowCount,
          downloadUrl: `/api/transparency/export/international?programYear=${programYear}&jurisdiction=${jurisdiction}`,
        },
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
    const message = error instanceof Error ? error.message : 'International export failed'
    const status = message.startsWith('Unknown jurisdiction') ? 400 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}
