import { prisma } from '@/lib/prisma'
import type { CMSRecord } from '@/types/cms'
import { getUsJurisdictionThresholds } from '@/lib/jurisdiction-config-service'

export type FmvComplianceStatus = 'within_range' | 'above_fmv' | 'below_fmv' | 'no_benchmark'

export interface FmvRateRow {
  natureKey: string
  natureLabel: string
  specialtyTier: string
  rateUsd: number
  unit: string
  sourceKey: string
}

export interface FmvAnalysisConfig {
  rates: FmvRateRow[]
  specialtyMultipliers: Record<string, number>
  tolerancePercent: number
}

export interface FmvAnalysis {
  benchmarkUsd: number | null
  actualUsd: number
  varianceUsd: number | null
  variancePercent: number | null
  status: FmvComplianceStatus
  rateSource: string
  natureCategory: string
  specialtyTier: string
  message: string
}

let configCache: { config: FmvAnalysisConfig; expiresAt: number } | null = null
const CACHE_TTL_MS = 60_000

function normalizeNature(nature?: string | null): string {
  return (nature || '').toLowerCase().trim()
}

function resolveSpecialtyTier(
  specialty: string | null | undefined,
  multipliers: Record<string, number>
): string {
  const s = (specialty || '').toLowerCase()
  for (const key of Object.keys(multipliers)) {
    if (key !== 'default' && s.includes(key)) return key
  }
  return 'default'
}

function lookupRate(
  nature: string,
  tier: string,
  rates: FmvRateRow[]
): FmvRateRow | null {
  const tierRates = rates.filter((r) => r.specialtyTier === tier || r.specialtyTier === 'default')
  const exact = tierRates.find((r) => r.natureKey === nature)
  if (exact) return exact

  for (const rate of tierRates) {
    if (nature.includes(rate.natureKey) || rate.natureKey.includes(nature)) {
      return rate
    }
  }
  return null
}

export async function loadFmvConfig(): Promise<FmvAnalysisConfig> {
  if (configCache && configCache.expiresAt > Date.now()) {
    return configCache.config
  }

  const [rates, tiers, usJurisdiction] = await Promise.all([
    prisma.fmvRate.findMany({ where: { isActive: true }, orderBy: { natureKey: 'asc' } }),
    prisma.fmvSpecialtyTier.findMany({ where: { isActive: true } }),
    getUsJurisdictionThresholds(),
  ])

  if (rates.length === 0) {
    throw new Error('No FMV rates configured. Run: npx prisma db seed')
  }

  const specialtyMultipliers: Record<string, number> = { default: 1 }
  for (const t of tiers) {
    specialtyMultipliers[t.tierKey] = t.multiplier
  }

  const config: FmvAnalysisConfig = {
    rates: rates.map((r) => ({
      natureKey: r.natureKey,
      natureLabel: r.natureLabel,
      specialtyTier: r.specialtyTier,
      rateUsd: r.rateUsd,
      unit: r.unit,
      sourceKey: r.sourceKey,
    })),
    specialtyMultipliers,
    tolerancePercent: usJurisdiction.fmvTolerancePercent,
  }

  configCache = { config, expiresAt: Date.now() + CACHE_TTL_MS }
  return config
}

export function analyzeFmvFromConfig(
  record: Pick<
    CMSRecord,
    | 'totalAmountOfPaymentUsdollars'
    | 'natureOfPaymentOrTransferOfValue'
    | 'physicianSpecialty'
    | 'numberOfPaymentsIncludedInTotalAmount'
  >,
  config: FmvAnalysisConfig
): FmvAnalysis {
  const actualUsd = record.totalAmountOfPaymentUsdollars ?? 0
  const nature = normalizeNature(record.natureOfPaymentOrTransferOfValue)
  const tier = resolveSpecialtyTier(record.physicianSpecialty, config.specialtyMultipliers)
  const multiplier = config.specialtyMultipliers[tier] ?? 1
  const rateRow = lookupRate(nature, tier, config.rates) || lookupRate(nature, 'default', config.rates)

  if (!rateRow || rateRow.rateUsd === 0) {
    return {
      benchmarkUsd: null,
      actualUsd,
      varianceUsd: null,
      variancePercent: null,
      status: 'no_benchmark',
      rateSource: rateRow?.sourceKey ?? 'fmv_engine',
      natureCategory: nature || 'unknown',
      specialtyTier: tier,
      message:
        rateRow?.rateUsd === 0
          ? 'No FMV cap for this payment category'
          : 'No FMV benchmark configured for this nature of payment',
    }
  }

  let benchmarkUsd = rateRow.rateUsd * multiplier
  const paymentCount = parseInt(record.numberOfPaymentsIncludedInTotalAmount || '1', 10)
  if (rateRow.unit === 'meal' && paymentCount > 1) {
    benchmarkUsd = rateRow.rateUsd * multiplier * paymentCount
  }

  const varianceUsd = actualUsd - benchmarkUsd
  const variancePercent = benchmarkUsd > 0 ? (varianceUsd / benchmarkUsd) * 100 : null

  let status: FmvComplianceStatus = 'within_range'
  if (variancePercent != null && variancePercent > config.tolerancePercent) status = 'above_fmv'
  if (variancePercent != null && variancePercent < -config.tolerancePercent) status = 'below_fmv'

  const message =
    status === 'within_range'
      ? `Within FMV tolerance (±${config.tolerancePercent}%) for ${rateRow.natureLabel}`
      : status === 'above_fmv'
        ? `Payment exceeds FMV benchmark by ${variancePercent?.toFixed(0)}% — review required`
        : `Payment below FMV benchmark by ${Math.abs(variancePercent ?? 0).toFixed(0)}%`

  return {
    benchmarkUsd,
    actualUsd,
    varianceUsd,
    variancePercent,
    status,
    rateSource: rateRow.sourceKey,
    natureCategory: rateRow.natureLabel,
    specialtyTier: tier,
    message,
  }
}

export async function analyzeFmv(
  record: Pick<
    CMSRecord,
    | 'totalAmountOfPaymentUsdollars'
    | 'natureOfPaymentOrTransferOfValue'
    | 'physicianSpecialty'
    | 'numberOfPaymentsIncludedInTotalAmount'
  >
): Promise<FmvAnalysis> {
  const config = await loadFmvConfig()
  return analyzeFmvFromConfig(record, config)
}

export async function listFmvRateTable(): Promise<
  Array<{ nature: string; rateUsd: number; unit: string; specialtyTier: string; sourceKey: string }>
> {
  const config = await loadFmvConfig()
  return config.rates
    .filter((r) => r.rateUsd > 0)
    .map((r) => ({
      nature: r.natureLabel,
      rateUsd: r.rateUsd,
      unit: r.unit,
      specialtyTier: r.specialtyTier,
      sourceKey: r.sourceKey,
    }))
}

export function clearFmvConfigCache(): void {
  configCache = null
}
