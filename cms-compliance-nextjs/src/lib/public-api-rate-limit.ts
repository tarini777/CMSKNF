import { NextRequest, NextResponse } from 'next/server'
import {
  checkRateLimit,
  clientRateLimitKey,
  rateLimitHeaders,
  type RateLimitConfig,
  type RateLimitResult,
} from '@/lib/rate-limit-service'
import { getDisclosureRateLimit, getHcpPortalRateLimit } from '@/lib/app-config'

export type PublicRateLimitNamespace = 'hcp_portal' | 'disclosure'

function configFor(namespace: PublicRateLimitNamespace): RateLimitConfig {
  return namespace === 'hcp_portal' ? getHcpPortalRateLimit() : getDisclosureRateLimit()
}

export interface PublicRateLimitOutcome {
  blocked: NextResponse | null
  headers: Record<string, string>
  result: RateLimitResult | null
}

/** Consume one request token; return 429 payload when over limit. */
export function applyPublicRateLimit(
  request: NextRequest,
  namespace: PublicRateLimitNamespace
): PublicRateLimitOutcome {
  const config = configFor(namespace)
  if (config.maxRequests <= 0) {
    return { blocked: null, headers: {}, result: null }
  }

  const key = clientRateLimitKey(request, namespace)
  const result = checkRateLimit(key, config)
  const headers = rateLimitHeaders(result)

  if (!result.allowed) {
    return {
      blocked: NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfterSec: result.retryAfterSec,
        },
        { status: 429, headers }
      ),
      headers,
      result,
    }
  }

  return { blocked: null, headers, result }
}
