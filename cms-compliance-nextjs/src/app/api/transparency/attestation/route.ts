import { NextRequest, NextResponse } from 'next/server'
import { buildAttestationChecklist } from '@/lib/submission-calendar'
import { getCmsExportStats } from '@/lib/cms-export-service'
import { validateExportReadiness } from '@/lib/export-guard-service'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const programYear = searchParams.get('programYear') || undefined
  const stats = await getCmsExportStats(programYear || undefined)
  const exportGuard = await validateExportReadiness(programYear || undefined)
  const checklist = buildAttestationChecklist({
    ...stats,
    exportGenerated: stats.reportableRecords > 0,
    nppesVerified: exportGuard.nppesFailures === 0 || exportGuard.nppesPolicy !== 'block',
    aggregatesCurrent: exportGuard.pendingAggregates === 0,
    pufValidated: exportGuard.pufValidation?.valid ?? false,
  })

  const allRequiredComplete = checklist.filter((c) => c.required).every((c) => c.completed)

  return NextResponse.json({
    success: true,
    data: { stats, checklist, readyForAttestation: allRequiredComplete, exportGuard },
  })
}
