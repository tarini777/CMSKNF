import { NextRequest, NextResponse } from 'next/server'
import { buildAttestationChecklist } from '@/lib/submission-calendar'
import { getCmsExportStats } from '@/lib/cms-export-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const programYear = searchParams.get('programYear') || undefined
  const stats = await getCmsExportStats(programYear || undefined)
  const checklist = buildAttestationChecklist({ ...stats, exportGenerated: stats.reportableRecords > 0 })

  const allRequiredComplete = checklist.filter((c) => c.required).every((c) => c.completed)

  return NextResponse.json({
    success: true,
    data: { stats, checklist, readyForAttestation: allRequiredComplete },
  })
}
