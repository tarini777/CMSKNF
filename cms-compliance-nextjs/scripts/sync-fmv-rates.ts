#!/usr/bin/env npx tsx
/**
 * Sync FMV rates from JSON file (CLM / fmv_engine export shape).
 *
 * Usage:
 *   npx tsx scripts/sync-fmv-rates.ts prisma/sample-fmv-sync.json
 */
import { readFileSync } from 'fs'
import { syncFmvRatesFromConnector, type FmvSyncPayload } from '../src/lib/fmv-sync-service'

async function main() {
  const path = process.argv[2] || 'prisma/sample-fmv-sync.json'
  const raw = readFileSync(path, 'utf-8')
  const payload = JSON.parse(raw) as FmvSyncPayload
  const result = await syncFmvRatesFromConnector(payload)
  console.log(JSON.stringify({ ok: true, ...result }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
