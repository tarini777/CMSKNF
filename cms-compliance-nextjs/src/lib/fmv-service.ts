/**
 * Fair Market Value (FMV) benchmarking — rate vs actual reconciliation.
 * Source system: `fmv_engine` (see database/SOURCE_SYSTEMS.md).
 * Rates are demo benchmarks; production would sync from CLM / FMV vendor feed.
 */

import type { CMSRecord } from '@/types/cms'

export type FmvComplianceStatus = 'within_range' | 'above_fmv' | 'below_fmv' | 'no_benchmark'

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

/** Hourly / per-event FMV benchmarks by payment nature (USD). */
const NATURE_BENCHMARKS: Record<string, { rate: number; unit: 'hour' | 'event' | 'meal' | 'day'; label: string }> = {
  consulting: { rate: 500, unit: 'hour', label: 'Consulting fee' },
  'consulting fee': { rate: 500, unit: 'hour', label: 'Consulting fee' },
  'consulting fees': { rate: 500, unit: 'hour', label: 'Consulting fee' },
  speaking: { rate: 2000, unit: 'event', label: 'Speaker / faculty' },
  'compensation for faculty/speaker at medical education programs': {
    rate: 2000,
    unit: 'event',
    label: 'Speaker / faculty',
  },
  honoraria: { rate: 1500, unit: 'event', label: 'Honoraria' },
  honorarium: { rate: 1500, unit: 'event', label: 'Honoraria' },
  'food and beverage': { rate: 75, unit: 'meal', label: 'Meals' },
  'food and beverages': { rate: 75, unit: 'meal', label: 'Meals' },
  entertainment: { rate: 150, unit: 'event', label: 'Entertainment' },
  travel: { rate: 800, unit: 'day', label: 'Travel & lodging (daily)' },
  'travel and lodging': { rate: 800, unit: 'day', label: 'Travel & lodging (daily)' },
  grant: { rate: 0, unit: 'event', label: 'Grant (no FMV cap)' },
  'charitable contribution': { rate: 0, unit: 'event', label: 'Charitable (no FMV cap)' },
}

const SPECIALTY_MULTIPLIERS: Record<string, number> = {
  default: 1,
  cardiology: 1.25,
  oncology: 1.3,
  neurology: 1.2,
  orthopedics: 1.15,
  'internal medicine': 1,
}

const TOLERANCE_PERCENT = 10

function normalizeNature(nature?: string | null): string {
  return (nature || '').toLowerCase().trim()
}

function specialtyTier(specialty?: string | null): string {
  const s = (specialty || '').toLowerCase()
  for (const key of Object.keys(SPECIALTY_MULTIPLIERS)) {
    if (key !== 'default' && s.includes(key)) return key
  }
  return 'default'
}

function lookupBenchmark(nature: string): (typeof NATURE_BENCHMARKS)[string] | null {
  if (NATURE_BENCHMARKS[nature]) return NATURE_BENCHMARKS[nature]
  for (const [key, val] of Object.entries(NATURE_BENCHMARKS)) {
    if (nature.includes(key) || key.includes(nature)) return val
  }
  return null
}

export function analyzeFmv(record: Pick<CMSRecord, 'totalAmountOfPaymentUsdollars' | 'natureOfPaymentOrTransferOfValue' | 'physicianSpecialty' | 'numberOfPaymentsIncludedInTotalAmount'>): FmvAnalysis {
  const actualUsd = record.totalAmountOfPaymentUsdollars ?? 0
  const nature = normalizeNature(record.natureOfPaymentOrTransferOfValue)
  const tier = specialtyTier(record.physicianSpecialty)
  const multiplier = SPECIALTY_MULTIPLIERS[tier] ?? 1
  const bench = lookupBenchmark(nature)

  if (!bench || bench.rate === 0) {
    return {
      benchmarkUsd: null,
      actualUsd,
      varianceUsd: null,
      variancePercent: null,
      status: 'no_benchmark',
      rateSource: 'fmv_engine',
      natureCategory: nature || 'unknown',
      specialtyTier: tier,
      message: bench?.rate === 0 ? 'No FMV cap for this payment category' : 'No FMV benchmark configured for this nature of payment',
    }
  }

  let benchmarkUsd = bench.rate * multiplier
  const paymentCount = parseInt(record.numberOfPaymentsIncludedInTotalAmount || '1', 10)
  if (bench.unit === 'meal' && paymentCount > 1) {
    benchmarkUsd = bench.rate * multiplier * paymentCount
  }

  const varianceUsd = actualUsd - benchmarkUsd
  const variancePercent = benchmarkUsd > 0 ? (varianceUsd / benchmarkUsd) * 100 : null

  let status: FmvComplianceStatus = 'within_range'
  if (variancePercent != null && variancePercent > TOLERANCE_PERCENT) status = 'above_fmv'
  if (variancePercent != null && variancePercent < -TOLERANCE_PERCENT) status = 'below_fmv'

  const message =
    status === 'within_range'
      ? `Within FMV tolerance (±${TOLERANCE_PERCENT}%) for ${bench.label}`
      : status === 'above_fmv'
        ? `Payment exceeds FMV benchmark by ${variancePercent?.toFixed(0)}% — review required`
        : `Payment below FMV benchmark by ${Math.abs(variancePercent ?? 0).toFixed(0)}%`

  return {
    benchmarkUsd,
    actualUsd,
    varianceUsd,
    variancePercent,
    status,
    rateSource: 'fmv_engine',
    natureCategory: bench.label,
    specialtyTier: tier,
    message,
  }
}

export function listFmvRateTable(): Array<{ nature: string; rateUsd: number; unit: string }> {
  return Object.entries(NATURE_BENCHMARKS)
    .filter(([, v]) => v.rate > 0)
    .map(([nature, v]) => ({ nature: v.label, rateUsd: v.rate, unit: v.unit }))
}
