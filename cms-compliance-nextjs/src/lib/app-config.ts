/**
 * Runtime configuration — demo vs production behavior via environment.
 */

import type { RateLimitConfig } from '@/lib/rate-limit-service'

export type NppesIngestPolicy = 'off' | 'warn' | 'block'

/** Pilot / production profile — auth on, NPPES block, no demo NPPES fallback. */
export function isPilotMode(): boolean {
  return process.env.PILOT_MODE === 'true'
}

export function isDemoMode(): boolean {
  if (isPilotMode()) return false
  return process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production'
}

export function isAuthEnabledForEnvironment(): boolean {
  if (process.env.AUTH_ENABLED === 'true') return true
  if (process.env.AUTH_ENABLED === 'false') return false
  return isPilotMode() || process.env.NODE_ENV === 'production'
}

export function getFmvToleranceOverride(): number | null {
  const raw = process.env.FMV_TOLERANCE_PERCENT
  if (!raw) return null
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : null
}

/** When to verify NPI at ingest: off | warn (flag only) | block (block CMS export). */
export function getNppesIngestPolicy(): NppesIngestPolicy {
  if (isPilotMode() && !process.env.NPPES_INGEST_POLICY) return 'block'
  const raw = (process.env.NPPES_INGEST_POLICY || 'warn').toLowerCase()
  if (raw === 'off' || raw === 'warn' || raw === 'block') return raw
  return 'warn'
}

function parseRateLimit(prefix: string, defaults: RateLimitConfig): RateLimitConfig {
  const windowMs = parseInt(process.env[`${prefix}_WINDOW_MS`] || String(defaults.windowMs), 10)
  const maxRequests = parseInt(process.env[`${prefix}_MAX_REQUESTS`] || String(defaults.maxRequests), 10)
  return {
    windowMs: Number.isFinite(windowMs) ? windowMs : defaults.windowMs,
    maxRequests: Number.isFinite(maxRequests) ? maxRequests : defaults.maxRequests,
  }
}

/** HCP portal GET/POST — default 30 req / 15 min per IP. Set max to 0 to disable. */
export function getHcpPortalRateLimit(): RateLimitConfig {
  return parseRateLimit('HCP_PORTAL_RATE_LIMIT', { windowMs: 15 * 60 * 1000, maxRequests: 30 })
}

/** Public disclosure report — default 60 req / 15 min per IP. */
export function getDisclosureRateLimit(): RateLimitConfig {
  return parseRateLimit('DISCLOSURE_RATE_LIMIT', { windowMs: 15 * 60 * 1000, maxRequests: 60 })
}

export function getCronSecret(): string | null {
  const s = process.env.CRON_SECRET?.trim()
  return s || null
}

export function isPostgresDatabase(): boolean {
  return (process.env.DATABASE_URL || '').startsWith('postgresql')
}
