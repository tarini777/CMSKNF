import { cmsFHIRAPIService } from './cms-fhir-api'
import { openPaymentsAPIService } from './open-payments-api'
import { pubmedAPIService } from './pubmed-api'
import { clinicalTrialsAPIService } from './clinicaltrials-api'
import { prisma } from './prisma'
import { glossaryService } from './glossary-service'
import { internationalComplianceService } from './international-compliance-service'

export interface ConnectivityCheck {
  service: string
  endpoint: string
  status: 'connected' | 'degraded' | 'disconnected' | 'demo'
  responseTimeMs?: number
  message?: string
  mode?: 'live' | 'demo' | 'mock'
}

export interface ConnectivityReport {
  overall: 'healthy' | 'degraded' | 'offline'
  checks: ConnectivityCheck[]
  rulesSummary: {
    totalRules: number
    geographicRules: number
    includesInternationalReporting: boolean
    internationalCountries: number
    efpiaCountries: number
    ukDisclosure: boolean
  }
  timestamp: string
}

async function timedCheck(
  service: string,
  endpoint: string,
  fn: () => Promise<{ ok: boolean; mode?: 'live' | 'demo' | 'mock'; message?: string }>
): Promise<ConnectivityCheck> {
  const start = Date.now()
  try {
    const result = await fn()
    const responseTimeMs = Date.now() - start
    return {
      service,
      endpoint,
      status: result.ok ? (result.mode === 'demo' || result.mode === 'mock' ? 'demo' : 'connected') : 'degraded',
      responseTimeMs,
      message: result.message,
      mode: result.mode,
    }
  } catch (error) {
    return {
      service,
      endpoint,
      status: 'disconnected',
      responseTimeMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Connection failed',
    }
  }
}

export async function runConnectivityChecks(): Promise<ConnectivityReport> {
  const checks = await Promise.all([
    timedCheck('Database (Prisma/SQLite)', '/api/health', async () => {
      await prisma.$queryRaw`SELECT 1`
      return { ok: true, mode: 'live', message: 'Database reachable' }
    }),
    timedCheck('CMS FHIR API', '/api/cms/fhir?action=health', async () => {
      const health = await cmsFHIRAPIService.getHealthStatus()
      const hasCredentials = !!(process.env.CMS_FHIR_CLIENT_ID && process.env.CMS_FHIR_CLIENT_SECRET)
      return {
        ok: health.isHealthy,
        mode: hasCredentials ? 'live' : 'demo',
        message: hasCredentials
          ? 'FHIR credentials configured'
          : 'Demo mode — set CMS_FHIR_CLIENT_ID/SECRET in .env.local',
      }
    }),
    timedCheck('CMS Open Payments API', 'https://openpaymentsdata.cms.gov/api/1', async () => {
      const health = await openPaymentsAPIService.getHealthStatus()
      const recordLabel =
        health.sampleRecordCount !== undefined
          ? `${health.sampleRecordCount.toLocaleString()} general payment records (${health.latestProgramYear})`
          : 'Open Payments API reachable'

      return {
        ok: health.isHealthy,
        mode: 'live' as const,
        message: health.isHealthy
          ? `${health.datasetCount} datasets · ${recordLabel} · no auth required`
          : health.error || 'Open Payments API unreachable',
      }
    }),
    timedCheck('PubMed (NCBI E-utilities)', '/api/pubmed?action=health', async () => {
      const health = await pubmedAPIService.getHealthStatus()
      return {
        ok: health.isHealthy,
        mode: 'live',
        message: health.error || 'PubMed E-utilities reachable',
      }
    }),
    timedCheck('ClinicalTrials.gov API', '/api/clinicaltrials?action=health', async () => {
      const health = await clinicalTrialsAPIService.getHealthStatus()
      return {
        ok: health.isHealthy,
        mode: 'live',
        message: health.error || 'ClinicalTrials.gov API reachable',
      }
    }),
    timedCheck('International regimes (Americas/Europe/UK)', '/api/glossary?action=countries', async () => {
      const stats = internationalComplianceService.getStats()
      return {
        ok: true,
        mode: 'live' as const,
        message: `${stats.totalCountries} countries — EFPIA: ${stats.efpiaAligned}, UK ABPI: ${stats.ukDisclosure}, mandatory legal: ${stats.mandatoryLegal}`,
      }
    }),
    timedCheck('Glossary & CMS rules', '/api/glossary?action=rules', async () => {
      const rules = await glossaryService.getReportabilityRules('geographic')
      return {
        ok: true,
        mode: 'live' as const,
        message: `${rules.length} CMS geographic rules loaded`,
      }
    }),
  ])

  const disconnected = checks.filter((c) => c.status === 'disconnected').length
  const degraded = checks.filter((c) => c.status === 'degraded' || c.status === 'demo').length
  const geographicRules = await glossaryService.getReportabilityRules('geographic')
  const intlStats = internationalComplianceService.getStats()

  return {
    overall: disconnected > 0 ? 'offline' : degraded > 0 ? 'degraded' : 'healthy',
    checks,
    rulesSummary: {
      totalRules: (await glossaryService.getReportabilityRules()).length,
      geographicRules: geographicRules.length,
      includesInternationalReporting: intlStats.totalCountries > 0,
      internationalCountries: intlStats.totalCountries,
      efpiaCountries: intlStats.efpiaAligned,
      ukDisclosure: intlStats.ukDisclosure > 0,
    },
    timestamp: new Date().toISOString(),
  }
}
