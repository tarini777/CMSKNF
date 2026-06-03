import { NextRequest, NextResponse } from 'next/server'
import { generateCmsOpenPaymentsCsv } from '@/lib/cms-export-service'
import { buildCmsSubmissionPackage } from '@/lib/cms-submission-package'
import {
  generateFullGeneralPufCsv,
  generateFullOwnershipPufCsv,
  generateFullResearchPufCsv,
} from '@/lib/lineage/puf-export-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const type = searchParams.get('type') || 'general'
    const bundle = searchParams.get('bundle') === '1'

    if (bundle) {
      const pkg = await buildCmsSubmissionPackage(programYear)
      return NextResponse.json({
        success: true,
        data: {
          programYear: pkg.programYear,
          generatedAt: pkg.generatedAt,
          submissionWindow: pkg.submissionWindow,
          manifest: pkg.manifest,
          files: pkg.files.map((f) => ({
            filename: f.filename,
            fileType: f.fileType,
            rowCount: f.rowCount,
            fieldCount: f.fieldCount,
            sha256: f.sha256,
          })),
        },
      })
    }

    let csv: string
    let filename: string

    switch (type) {
      case 'research':
        csv = await generateFullResearchPufCsv(programYear)
        filename = `RSRCH${programYear}_research.csv`
        break
      case 'ownership':
        csv = await generateFullOwnershipPufCsv(programYear)
        filename = `OWNRSHP${programYear}_ownership.csv`
        break
      case 'general':
      default:
        csv = await generateCmsOpenPaymentsCsv(programYear)
        filename = `GNRL${programYear}_general.csv`
        break
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('CMS export error:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate CMS export' }, { status: 500 })
  }
}
