/**
 * Runtime configuration — demo vs production behavior via environment.
 */

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production'
}

export function getFmvToleranceOverride(): number | null {
  const raw = process.env.FMV_TOLERANCE_PERCENT
  if (!raw) return null
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}
