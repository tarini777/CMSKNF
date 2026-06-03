/**
 * Veeva OpenData MDM enrichment — augments HCP master / canonical rows from OpenData API.
 */

import { isDemoMode } from '@/lib/app-config'
import type { HcpResolutionInput } from '@/lib/lineage/hcp-master-service'

export interface VeevaOpenDataMatch {
  veevaId?: string
  npi: string
  firstName?: string
  lastName?: string
  middleName?: string
  specialty?: string
  primaryType?: string
  addressLine1?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  licenseStateCodes?: string[]
  status?: string
  source: 'veeva_open_data_api' | 'demo_fallback'
}

const DEMO_OPEN_DATA: Record<string, VeevaOpenDataMatch> = {
  '1234567890': {
    veevaId: 'VOD-10001',
    npi: '1234567890',
    firstName: 'Jane',
    lastName: 'Doe',
    specialty: 'Internal Medicine',
    primaryType: 'Physician',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'United States',
    status: 'Active',
    source: 'demo_fallback',
  },
  '9876543210': {
    veevaId: 'VOD-10002',
    npi: '9876543210',
    firstName: 'John',
    lastName: 'Smith',
    specialty: 'Cardiology',
    primaryType: 'Physician',
    city: 'Boston',
    state: 'MA',
    zipCode: '02108',
    country: 'United States',
    status: 'Active',
    source: 'demo_fallback',
  },
}

function getBaseUrl(): string {
  return (
    process.env.VEEVA_OPEN_DATA_BASE_URL?.replace(/\/$/, '') ||
    'https://opendata.veevanetwork.com/api'
  )
}

export async function lookupVeevaOpenDataByNpi(npi: string): Promise<VeevaOpenDataMatch | null> {
  const cleaned = npi.replace(/\D/g, '')
  if (cleaned.length !== 10) return null

  if (isDemoMode() && DEMO_OPEN_DATA[cleaned]) {
    return DEMO_OPEN_DATA[cleaned]
  }

  const apiKey = process.env.VEEVA_OPEN_DATA_API_KEY?.trim()
  if (!apiKey) return isDemoMode() ? DEMO_OPEN_DATA[cleaned] ?? null : null

  try {
    const url = `${getBaseUrl()}/v1/hcp/npi/${cleaned}`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null

    const data = (await response.json()) as Record<string, unknown>
    const licenses = (data.licenses as Array<{ state?: string }> | undefined) ?? []

    return {
      veevaId: data.veeva_id ? String(data.veeva_id) : undefined,
      npi: cleaned,
      firstName: data.first_name ? String(data.first_name) : undefined,
      lastName: data.last_name ? String(data.last_name) : undefined,
      middleName: data.middle_name ? String(data.middle_name) : undefined,
      specialty: data.specialty ? String(data.specialty) : undefined,
      primaryType: data.primary_type ? String(data.primary_type) : undefined,
      addressLine1: data.address_line1 ? String(data.address_line1) : undefined,
      city: data.city ? String(data.city) : undefined,
      state: data.state ? String(data.state) : undefined,
      zipCode: data.zip ? String(data.zip) : undefined,
      country: data.country ? String(data.country) : undefined,
      licenseStateCodes: licenses.map((l) => l.state).filter(Boolean) as string[],
      status: data.status ? String(data.status) : undefined,
      source: 'veeva_open_data_api',
    }
  } catch {
    return isDemoMode() ? DEMO_OPEN_DATA[cleaned] ?? null : null
  }
}

/** Merge OpenData attributes into HCP resolution input (upstream wins when present). */
export function mergeOpenDataIntoHcpInput(
  input: HcpResolutionInput,
  match: VeevaOpenDataMatch
): HcpResolutionInput {
  return {
    ...input,
    npi: input.npi || match.npi,
    firstName: input.firstName || match.firstName,
    middleName: input.middleName || match.middleName,
    lastName: input.lastName || match.lastName,
    specialty: input.specialty || match.specialty,
    primaryType: input.primaryType || match.primaryType,
    addressLine1: input.addressLine1 || match.addressLine1,
    city: input.city || match.city,
    state: input.state || match.state,
    zipCode: input.zipCode || match.zipCode,
    country: input.country || match.country,
    licenseStateCodes: input.licenseStateCodes?.length ? input.licenseStateCodes : match.licenseStateCodes,
    sourceCrosswalk: {
      ...(input.sourceCrosswalk || {}),
      veeva_open_data: match.veevaId || match.npi,
    },
  }
}

export async function enrichHcpInputFromOpenData(input: HcpResolutionInput): Promise<HcpResolutionInput> {
  const npi = input.npi?.replace(/\D/g, '')
  if (!npi || npi.length !== 10) return input

  const match = await lookupVeevaOpenDataByNpi(npi)
  if (!match) return input

  return mergeOpenDataIntoHcpInput(input, match)
}
