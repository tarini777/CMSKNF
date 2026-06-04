/** CMS NPPES Read API — MDM / identity verification connector (read-only, not spend ingest). */

export interface ReferenceConnectorDefinition {
  sourceKey: string
  displayName: string
  category: 'mdm' | 'reference' | 'config'
  apiVersion: string
  apiUrl: string
  readOnly: true
  description: string
  endpoints: Array<{ method: string; path: string; purpose: string }>
  searchParameters: Array<{ field: string; required?: boolean; notes: string }>
  disclaimer: string
}

export const NPPES_MDM_CONNECTOR: ReferenceConnectorDefinition = {
  sourceKey: 'nppes',
  displayName: 'CMS NPPES Read API',
  category: 'mdm',
  apiVersion: '2.1',
  apiUrl: 'https://npiregistry.cms.hhs.gov/api/?version=2.1',
  readOnly: true,
  description:
    'Real-time lookup of National Provider Identifier (NPI) records for HCP identity verification at ingest and MDM enrichment. Replaces batched NPPES CSV downloads.',
  endpoints: [
    { method: 'GET', path: '/api/connectors/nppes', purpose: 'Connector metadata + health' },
    { method: 'POST', path: '/api/connectors/nppes', purpose: 'Verify NPI or search providers' },
    { method: 'POST', path: '/api/nppes/verify', purpose: 'Verify NPI against CMS record' },
  ],
  searchParameters: [
    { field: 'number', notes: '10-digit NPI — primary verification field' },
    { field: 'enumeration_type', notes: 'NPI-1 (individual) or NPI-2 (organization); requires additional criteria when used alone' },
    { field: 'first_name', notes: 'Individual provider; trailing wildcard (min 2 chars)' },
    { field: 'last_name', notes: 'Individual provider; trailing wildcard (min 2 chars)' },
    { field: 'organization_name', notes: 'Organizational provider; trailing wildcard (min 2 chars)' },
    { field: 'taxonomy_description', notes: 'Provider specialty taxonomy' },
    { field: 'city', notes: 'Address city (LOCATION or MAILING per address_purpose)' },
    { field: 'state', notes: 'State abbreviation; cannot be sole criterion' },
    { field: 'postal_code', notes: '5- or 9-digit ZIP; trailing wildcard allowed' },
    { field: 'limit', notes: 'Results per request (1–200, default 10)' },
    { field: 'skip', notes: 'Pagination offset (max 1000)' },
  ],
  disclaimer:
    'Issuance of an NPI does not ensure or validate that the Health Care Provider is licensed or credentialed.',
}

export const REFERENCE_CONNECTORS = [NPPES_MDM_CONNECTOR] as const
