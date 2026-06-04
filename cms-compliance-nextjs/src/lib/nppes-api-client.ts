/**
 * CMS NPPES Read API v2.1 client (read-only).
 * @see https://npiregistry.cms.hhs.gov/api/?version=2.1
 */

const DEFAULT_BASE = 'https://npiregistry.cms.hhs.gov/api/'
const API_VERSION = '2.1'

export type NppesEnumerationType = 'NPI-1' | 'NPI-2'
export type NppesNamePurpose = 'AO' | 'Provider'
export type NppesAddressPurpose = 'LOCATION' | 'MAILING' | 'PRIMARY' | 'SECONDARY'

export interface NppesSearchCriteria {
  number?: string
  enumeration_type?: NppesEnumerationType
  taxonomy_description?: string
  name_purpose?: NppesNamePurpose
  first_name?: string
  last_name?: string
  organization_name?: string
  use_first_name_alias?: boolean
  address_purpose?: NppesAddressPurpose
  city?: string
  state?: string
  postal_code?: string
  country_code?: string
  limit?: number
  skip?: number
}

export interface NppesTaxonomy {
  code?: string
  desc?: string
  primary?: boolean
  state?: string
  license?: string
}

export interface NppesAddress {
  address_purpose?: string
  address_1?: string
  address_2?: string
  city?: string
  state?: string
  postal_code?: string
  country_code?: string
  telephone_number?: string
}

export interface NppesBasic {
  first_name?: string
  last_name?: string
  middle_name?: string
  credential?: string
  organization_name?: string
  organizational_subpart?: string
  authorized_official_first_name?: string
  authorized_official_last_name?: string
  authorized_official_title_or_position?: string
  status?: string
  enumeration_date?: string
  last_updated?: string
  name_prefix?: string
  name_suffix?: string
}

export interface NppesRecord {
  number: string
  enumeration_type?: NppesEnumerationType
  created_epoch?: string
  last_updated_epoch?: string
  basic?: NppesBasic
  taxonomies?: NppesTaxonomy[]
  addresses?: NppesAddress[]
  other_names?: Array<{ type?: string; organization_name?: string; code?: string }>
}

export interface NppesApiResponse {
  result_count: number
  results: NppesRecord[]
}

export interface NppesHealthStatus {
  ok: boolean
  apiVersion: string
  endpoint: string
  message: string
  sampleResultCount?: number
}

export function getNppesApiBaseUrl(): string {
  return (process.env.NPPES_API_BASE_URL || DEFAULT_BASE).replace(/\/?$/, '/')
}

export function buildNppesApiUrl(criteria: NppesSearchCriteria = {}): string {
  const params = new URLSearchParams({ version: API_VERSION })
  for (const [key, value] of Object.entries(criteria)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  return `${getNppesApiBaseUrl()}?${params.toString()}`
}

export async function nppesSearch(criteria: NppesSearchCriteria): Promise<NppesApiResponse> {
  const url = buildNppesApiUrl(criteria)
  const res = await fetch(url, { next: { revalidate: 86400 } })
  if (!res.ok) {
    throw new Error(`NPPES API HTTP ${res.status}`)
  }
  const data = (await res.json()) as NppesApiResponse
  return {
    result_count: data.result_count ?? 0,
    results: data.results ?? [],
  }
}

export async function nppesLookupByNumber(npi: string): Promise<NppesRecord | null> {
  const cleaned = npi.replace(/\D/g, '')
  if (cleaned.length !== 10) return null
  const { results } = await nppesSearch({ number: cleaned, limit: 1 })
  return results[0] ?? null
}

/** Lightweight connectivity probe — lookup by NPI number only (no auth required). */
export async function nppesHealthCheck(probeNpi = '1003000126'): Promise<NppesHealthStatus> {
  const endpoint = `${getNppesApiBaseUrl()}?version=${API_VERSION}`
  try {
    const { result_count } = await nppesSearch({ number: probeNpi, limit: 1 })
    return {
      ok: true,
      apiVersion: API_VERSION,
      endpoint,
      message: 'NPPES Read API v2.1 reachable — no authentication required',
      sampleResultCount: result_count,
    }
  } catch (error) {
    return {
      ok: false,
      apiVersion: API_VERSION,
      endpoint,
      message: error instanceof Error ? error.message : 'NPPES API unreachable',
    }
  }
}

export function parseNppesRecord(record: NppesRecord): {
  npi: string
  enumerationType?: NppesEnumerationType
  recipientType: 'individual' | 'organization'
  firstName?: string
  lastName?: string
  middleName?: string
  credential?: string
  organizationName?: string
  specialty?: string
  primaryType?: string
  addressLine1?: string
  city?: string
  state?: string
  zip?: string
  status?: string
} {
  const basic = record.basic || {}
  const taxonomies = record.taxonomies || []
  const primaryTax = taxonomies.find((t) => t.primary) || taxonomies[0]
  const addresses = record.addresses || []
  const loc =
    addresses.find((a) => a.address_purpose === 'LOCATION') ||
    addresses.find((a) => a.address_purpose === 'PRIMARY') ||
    addresses[0]

  const isOrg = record.enumeration_type === 'NPI-2'

  return {
    npi: record.number,
    enumerationType: record.enumeration_type,
    recipientType: isOrg ? 'organization' : 'individual',
    firstName: basic.first_name,
    lastName: basic.last_name,
    middleName: basic.middle_name,
    credential: basic.credential,
    organizationName: basic.organization_name,
    specialty: primaryTax?.desc,
    primaryType: primaryTax?.desc,
    addressLine1: loc?.address_1,
    city: loc?.city,
    state: loc?.state,
    zip: loc?.postal_code,
    status: basic.status,
  }
}
