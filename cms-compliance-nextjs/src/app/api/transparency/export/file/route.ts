import { NextRequest, NextResponse } from 'next/server'
import { buildCmsSubmissionPackage } from '@/lib/cms-submission-package'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import { assertExportReady, ExportBlockedError } from '@/lib/export-guard-service'

/** Download individual PUF file from submission package. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const fileType = searchParams.get('file') || 'general'

    try {
      await assertExportReady(programYear)
    } catch (error) {
      if (error instanceof ExportBlockedError) {
        return NextResponse.json(
          { success: false, error: error.message, data: error.guard },
          { status: 422 }
        )
      }
      throw error
    }

    const pkg = await buildCmsSubmissionPackage(programYear)
    const file = pkg.files.find((f) => f.fileType === fileType) || pkg.files[0]

    return new NextResponse(file.content, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${file.filename}"`,
      },
    })
  } catch (error) {
    console.error('PUF file download error:', error)
    return NextResponse.json({ success: false, error: 'Failed to download PUF file' }, { status: 500 })
  }
}
