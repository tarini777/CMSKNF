/**
 * NPPES NPI Registry verification (REQ-007).
 * https://npiregistry.cms.hhs.gov/api/
 */

export interface NppesProvider {
  npi: string
  firstName?: string
  lastName?: string
  middleName?: string
  credential?: string
  specialty?: string
  primaryType?: string
  addressLine1?: string
  city?: string
  state?: string
  zip?: string
  status?: string
}

export interface NppesVerificationResult {
  valid: boolean
  npi: string
  provider: NppesProvider | null
  nameMatch: boolean | null
  matchScore: number
  message: string
  source: 'nppes_api' | 'demo_fallback'
}

function scoreNameMatch(
  expected: { first?: string; last?: string },
  actual: { first?: string; last?: string }
): { match: boolean; score: number } {
  const ef = (expected.first || '').toLowerCase().trim()
  const el = (expected.last || '').toLowerCase().trim()
  const af = (actual.first || '').toLowerCase().trim()
  const al = (actual.last || '').toLowerCase().trim()
  if (!ef && !el) return { match: true, score: 1 }
  if (!af && !al) return { match: false, score: 0 }
  const lastOk = !el || al.includes(el) || el.includes(al)
  const firstOk = !ef || af.startsWith(ef.slice(0, 1)) || af.includes(ef)
  const score = (lastOk ? 0.5 : 0) + (firstOk ? 0.5 : 0)
  return { match: score >= 0.5, score }
}

/** Demo providers when NPPES API is unreachable (offline dev). */
const DEMO_NPPES: Record<string, NppesProvider> = {
  '1234567890': {
    npi: '1234567890',
    firstName: 'Jane',
    lastName: 'Doe',
    specialty: 'Internal Medicine',
    primaryType: 'Physician',
    city: 'San Francisco',
    state: 'CA',
    status: 'Active',
  },
  '9876543210': {
    npi: '9876543210',
    firstName: 'John',
    lastName: 'Smith',
    specialty: 'Cardiology',
    primaryType: 'Physician',
    city: 'Boston',
    state: 'MA',
    status: 'Active',
  },
}

function parseNppesResponse(data: unknown, npi: string): NppesProvider | null {
  const root = data as { result_count?: number; results?: Array<Record<string, unknown>> }
  if (!root.results?.length) return null
  const r = root.results[0]
  const basic = (r.basic || {}) as Record<string, string>
  const taxonomies = (r.taxonomies || []) as Array<{ desc?: string; primary?: boolean }>
  const primaryTax = taxonomies.find((t) => t.primary) || taxonomies[0]
  const addresses = (r.addresses || []) as Array<Record<string, string>>
  const loc = addresses.find((a) => a.address_purpose === 'LOCATION') || addresses[0]

  return {
    npi,
    firstName: basic.first_name,
    lastName: basic.last_name,
    middleName: basic.middle_name,
    credential: basic.credential,
    specialty: primaryTax?.desc,
    primaryType: primaryTax?.desc,
    addressLine1: loc?.address_1,
    city: loc?.city,
    state: loc?.state,
    zip: loc?.postal_code,
    status: basic.status,
  }
}

export async function verifyNpi(
  npi: string,
  expectedName?: { firstName?: string; lastName?: string; coveredRecipientName?: string }
): Promise<NppesVerificationResult> {
  const cleaned = npi.replace(/\D/g, '')
  if (cleaned.length !== 10) {
    return {
      valid: false,
      npi: cleaned,
      provider: null,
      nameMatch: null,
      matchScore: 0,
      message: 'NPI must be 10 digits',
      source: 'nppes_api',
    }
  }

  let provider: NppesProvider | null = null
  let source: NppesVerificationResult['source'] = 'nppes_api'

  try {
    const res = await fetch(`https://npiregistry.cms.hhs.gov/api/?version=2.1&number=${cleaned}`, {
      next: { revalidate: 86400 },
    })
    if (res.ok) {
      const data = await res.json()
      provider = parseNppesResponse(data, cleaned)
    }
  } catch {
    /* fall through to demo */
  }

  if (!provider && DEMO_NPPES[cleaned]) {
    provider = DEMO_NPPES[cleaned]
    source = 'demo_fallback'
  }

  if (!provider) {
    return {
      valid: false,
      npi: cleaned,
      provider: null,
      nameMatch: false,
      matchScore: 0,
      message: 'NPI not found in NPPES registry',
      source,
    }
  }

  let first = expectedName?.firstName
  let last = expectedName?.lastName
  if (!first && !last && expectedName?.coveredRecipientName) {
    const parts = expectedName.coveredRecipientName.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/)
    if (parts.length >= 2) {
      first = parts[0]
      last = parts[parts.length - 1]
    }
  }

  const { match, score } = scoreNameMatch(
    { first, last },
    { first: provider.firstName, last: provider.lastName }
  )

  return {
    valid: true,
    npi: cleaned,
    provider,
    nameMatch: match,
    matchScore: score,
    message: match
      ? 'NPI verified — name matches NPPES record'
      : 'NPI found but name does not match NPPES — review identity',
    source,
  }
}
