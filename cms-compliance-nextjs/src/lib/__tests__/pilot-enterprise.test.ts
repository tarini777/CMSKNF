import { checkRateLimit, resetRateLimitBuckets } from '@/lib/rate-limit-service'
import { validateOpsTestFileCsv } from '@/lib/puf-validation-service'
import { CMS_RESEARCH_PUF_FIELD_COUNT, CMS_GENERAL_PUF_HEADERS } from '@/types/cms-puf'
import { mapConnectorPayload } from '@/lib/lineage/connectors'
import { SAP_AP_CONNECTOR } from '@/lib/lineage/connectors/sap-ap'
import { CLM_CONNECTOR } from '@/lib/lineage/connectors/clm'
import { lookupVeevaOpenDataByNpi } from '@/lib/veeva-open-data-service'
import { getNppesIngestPolicy, isAuthEnabledForEnvironment, isPilotMode } from '@/lib/app-config'

describe('pilot readiness', () => {
  beforeEach(() => resetRateLimitBuckets())

  it('blocks requests over HCP portal rate limit', () => {
    const config = { windowMs: 60_000, maxRequests: 2 }
    expect(checkRateLimit('test:1', config).allowed).toBe(true)
    expect(checkRateLimit('test:1', config).allowed).toBe(true)
    expect(checkRateLimit('test:1', config).allowed).toBe(false)
  })

  it('defaults NPPES policy to block in pilot mode', () => {
    const prev = { pilot: process.env.PILOT_MODE, nppes: process.env.NPPES_INGEST_POLICY }
    process.env.PILOT_MODE = 'true'
    delete process.env.NPPES_INGEST_POLICY
    expect(getNppesIngestPolicy()).toBe('block')
    process.env.PILOT_MODE = prev.pilot
    if (prev.nppes) process.env.NPPES_INGEST_POLICY = prev.nppes
  })

  it('enables auth in pilot mode when AUTH_ENABLED unset', () => {
    const prev = { pilot: process.env.PILOT_MODE, auth: process.env.AUTH_ENABLED }
    process.env.PILOT_MODE = 'true'
    delete process.env.AUTH_ENABLED
    expect(isAuthEnabledForEnvironment()).toBe(true)
    process.env.PILOT_MODE = prev.pilot
    if (prev.auth) process.env.AUTH_ENABLED = prev.auth
  })
})

describe('CMS PUF validation', () => {
  it('defines ordered research export columns (~252 fields)', () => {
    expect(CMS_RESEARCH_PUF_FIELD_COUNT).toBeGreaterThan(200)
  })

  it('validates OPS general test file headers', () => {
    const header = CMS_GENERAL_PUF_HEADERS.join(',').toUpperCase()
    const csv = `${header}\n`
    const result = validateOpsTestFileCsv('general', csv)
    expect(result.headerMatch).toBe(true)
  })
})

describe('enterprise connectors', () => {
  it('maps SAP AP invoice sample', () => {
    const result = mapConnectorPayload('sap_ap', SAP_AP_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.covered_recipient_last_name).toBe('Reyes')
    expect(result.canonicalRow.nature_of_payment_or_transfer_of_value).toBe('Consulting Fee')
  })

  it('maps CLM contract payment sample', () => {
    const result = mapConnectorPayload('clm', CLM_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.related_product_indicator).toBe('Y')
  })

  it('enriches HCP from Veeva OpenData demo fallback', async () => {
    process.env.DEMO_MODE = 'true'
    const match = await lookupVeevaOpenDataByNpi('1234567890')
    expect(match?.lastName).toBe('Doe')
    expect(match?.source).toBe('demo_fallback')
  })
})

describe('pilot mode flag', () => {
  it('is false by default in tests', () => {
    expect(isPilotMode()).toBe(false)
  })
})
