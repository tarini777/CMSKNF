#!/usr/bin/env npx tsx
/**
 * Cron entrypoint — recalculate annual aggregate thresholds for active program year.
 *
 * Usage:
 *   CRON_SECRET=your-secret npx tsx scripts/run-aggregate-job.ts
 *   CRON_SECRET=your-secret npx tsx scripts/run-aggregate-job.ts 2025
 */
import { runAggregateRecalculationJob } from '../src/lib/aggregate-job-service'
import { getActiveProgramYear } from '../src/lib/submission-calendar'

async function main() {
  const programYear = process.argv[2] || String(getActiveProgramYear())
  const result = await runAggregateRecalculationJob({
    programYear,
    triggeredBy: 'cron',
  })
  console.log(
    JSON.stringify(
      {
        ok: true,
        programYear: result.programYear,
        recipientGroups: result.recipientGroups,
        reportableGroups: result.reportableGroups,
        jobRunId: result.jobRunId,
      },
      null,
      2
    )
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
