/**
 * In-memory sliding-window rate limiter for public-facing endpoints (HCP portal, disclosure).
 * Resets on process restart; suitable for pilot / single-instance deployments.
 */

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSec?: number
}

interface BucketEntry {
  timestamps: number[]
}

const buckets = new Map<string, BucketEntry>()

function prune(timestamps: number[], windowMs: number, now: number): number[] {
  const cutoff = now - windowMs
  return timestamps.filter((t) => t >= cutoff)
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const entry = buckets.get(key) ?? { timestamps: [] }
  entry.timestamps = prune(entry.timestamps, config.windowMs, now)

  if (entry.timestamps.length >= config.maxRequests) {
    const oldest = entry.timestamps[0] ?? now
    const resetAt = oldest + config.windowMs
    buckets.set(key, entry)
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt,
      retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    }
  }

  entry.timestamps.push(now)
  buckets.set(key, entry)

  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.timestamps.length),
    resetAt: now + config.windowMs,
  }
}

export function clientRateLimitKey(request: Request, namespace: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return `${namespace}:${ip}`
}

export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }
  if (result.retryAfterSec != null) {
    headers['Retry-After'] = String(result.retryAfterSec)
  }
  return headers
}

/** Reset buckets — for unit tests only. */
export function resetRateLimitBuckets(): void {
  buckets.clear()
}
