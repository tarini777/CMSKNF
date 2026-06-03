import { getNppesIngestPolicy } from '@/lib/app-config'
import { countNppesExportBlockers, listNppesExportBlockers } from '@/lib/nppes-ingest-service'
import { countPendingAggregateRecords, getLastAggregateJobRun } from '@/lib/aggregate-job-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import { validatePufExports } from '@/lib/puf-validation-service'

export interface ExportGuardResult {
  ready: boolean
  programYear: string
  blockers: Array<{ code: string; message: string; count: number }>
  nppesPolicy: string
  nppesFailures: number
  pendingAggregates: number
  lastAggregateJobAt: string | null
  pufValidation: Awaited<ReturnType<typeof validatePufExports>> | null
  sampleNppesFailures: Awaited<ReturnType<typeof listNppesExportBlockers>>
}

export async function validateExportReadiness(programYear?: string): Promise<ExportGuardResult> {
  const year = programYear || String(getActiveProgramYear())
  const policy = getNppesIngestPolicy()
  const [nppesFailures, pendingAggregates, lastJob, sampleNppesFailures, pufValidation] = await Promise.all([
    countNppesExportBlockers(year),
    countPendingAggregateRecords(year),
    getLastAggregateJobRun(),
    listNppesExportBlockers(year, 5),
    validatePufExports(year),
  ])

  const blockers: ExportGuardResult['blockers'] = []

  if (policy === 'block' && nppesFailures > 0) {
    blockers.push({
      code: 'nppes_verification',
      message: `${nppesFailures} reportable record(s) failed NPPES verification`,
      count: nppesFailures,
    })
  }

  if (pendingAggregates > 0) {
    blockers.push({
      code: 'aggregate_pending',
      message: `${pendingAggregates} sub-threshold payment(s) pending annual aggregate recalculation`,
      count: pendingAggregates,
    })
  }

  if (!pufValidation.valid && pufValidation.totalErrors > 0) {
    blockers.push({
      code: 'puf_validation',
      message: `PUF validation failed: ${pufValidation.totalErrors} error(s) against Jan 2025 data dictionary`,
      count: pufValidation.totalErrors,
    })
  }

  return {
    ready: blockers.length === 0,
    programYear: year,
    blockers,
    nppesPolicy: policy,
    nppesFailures,
    pendingAggregates,
    lastAggregateJobAt: lastJob?.completedAt?.toISOString() ?? null,
    pufValidation,
    sampleNppesFailures,
  }
}

export class ExportBlockedError extends Error {
  constructor(public guard: ExportGuardResult) {
    super(guard.blockers.map((b) => b.message).join('; ') || 'Export blocked')
    this.name = 'ExportBlockedError'
  }
}

export async function assertExportReady(programYear?: string): Promise<ExportGuardResult> {
  const guard = await validateExportReadiness(programYear)
  if (!guard.ready) throw new ExportBlockedError(guard)
  return guard
}
