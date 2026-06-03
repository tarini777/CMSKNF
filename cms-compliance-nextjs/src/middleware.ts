import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { canAccessRoute } from '@/lib/rbac'
import { COOKIE_NAME, isAuthEnabled, verifySessionToken } from '@/lib/auth'

const PUBLIC_API_PREFIXES = [
  '/api/health',
  '/api/auth',
  '/api/connectivity',
  '/api/lineage',
  '/api/metrics',
  '/api/monitoring',
  '/api/cms/fhir',
  '/api/pubmed',
  '/api/clinicaltrials',
  '/api/open-payments',
  '/api/glossary',
  '/api/openapi',
  '/api/hcp-portal',
  '/api/disclosure',
  '/api/nppes',
]

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next()
  }

  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const user = await verifySessionToken(token)
  if (!user) {
    return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
  }

  if (!canAccessRoute(user.role, pathname, request.method)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-user-role', user.role)
  requestHeaders.set('x-user-email', user.email)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/api/:path*'],
}
