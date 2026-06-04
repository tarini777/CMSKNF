import { isDemoMode } from '@/lib/app-config'
import { nppesLookupByNumber, parseNppesRecord } from '@/lib/nppes-api-client'

export interface NppesProvider {
  npi: string
  enumerationType?: 'NPI-1' | 'NPI-2'
  recipientType?: 'individual' | 'organization'
  firstName?: string
  lastName?: string
  middleName?: string
  organizationName?: string
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
  expected: { first?: string; last?: string; organization?: string },
  actual: { first?: string; last?: string; organization?: string },
  recipientType: 'individual' | 'organization' = 'individual'
): { match: boolean; score: number } {
  if (recipientType === 'organization') {
    const eo = (expected.organization || '').toLowerCase().trim()
    const ao = (actual.organization || '').toLowerCase().trim()
    if (!eo) return { match: true, score: 1 }
    if (!ao) return { match: false, score: 0 }
    const match = ao.includes(eo) || eo.includes(ao)
    return { match, score: match ? 1 : 0 }
  }

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
    enumerationType: 'NPI-1',
    recipientType: 'individual',
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
    enumerationType: 'NPI-1',
    recipientType: 'individual',
    firstName: 'John',
    lastName: 'Smith',
    specialty: 'Cardiology',
    primaryType: 'Physician',
    city: 'Boston',
    state: 'MA',
    status: 'Active',
  },
}

export async function verifyNpi(
  npi: string,
  expectedName?: {
    firstName?: string
    lastName?: string
    coveredRecipientName?: string
    organizationName?: string
  }
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
    const record = await nppesLookupByNumber(cleaned)
    if (record) provider = parseNppesRecord(record)
  } catch {
    /* fall through to demo */
  }

  if (!provider && isDemoMode() && DEMO_NPPES[cleaned]) {
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
  let organization = expectedName?.organizationName
  if (!first && !last && !organization && expectedName?.coveredRecipientName) {
    const parts = expectedName.coveredRecipientName.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/)
    if (parts.length >= 2) {
      first = parts[0]
      last = parts[parts.length - 1]
    } else if (parts.length === 1) {
      organization = parts[0]
    }
  }

  const recipientType = provider.recipientType || 'individual'
  const { match, score } = scoreNameMatch(
    { first, last, organization },
    {
      first: provider.firstName,
      last: provider.lastName,
      organization: provider.organizationName,
    },
    recipientType
  )

  return {
    valid: true,
    npi: cleaned,
    provider,
    nameMatch: match,
    matchScore: score,
    message: match
      ? 'NPI verified — identity matches NPPES record'
      : recipientType === 'organization'
        ? 'NPI found but organization name does not match NPPES — review identity'
        : 'NPI found but name does not match NPPES — review identity',
    source,
  }
}
