/**
 * Runtime configuration — demo vs production behavior via environment.
 */

export type NppesIngestPolicy = 'off' | 'warn' | 'block'

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production'
}

export function getFmvToleranceOverride(): number | null {
  const raw = process.env.FMV_TOLERANCE_PERCENT
  if (!raw) return null
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

/** When to verify NPI at ingest: off | warn (flag only) | block (block CMS export). */
export function getNppesIngestPolicy(): NppesIngestPolicy {
  const raw = (process.env.NPPES_INGEST_POLICY || 'warn').toLowerCase()
  if (raw === 'off' || raw === 'warn' || raw === 'block') return raw
  return 'warn'
}

export function getCronSecret(): string | null {
  const s = process.env.CRON_SECRET?.trim()
  return s || null
}

export function isPostgresDatabase(): boolean {
  return (process.env.DATABASE_URL || '').startsWith('postgresql')
}
