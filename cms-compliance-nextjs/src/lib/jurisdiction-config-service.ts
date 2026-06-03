import { prisma } from '@/lib/prisma'
import { getFmvToleranceOverride } from '@/lib/app-config'

export interface JurisdictionThresholds {
  jurisdictionCode: string
  jurisdictionName: string
  perPaymentMin: number
  aggregateAnnualMin: number
  currency: string
  fmvTolerancePercent: number
  regulatoryBasis?: string | null
}

let cache = new Map<string, { value: JurisdictionThresholds; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function isEffective(effectiveDate: string, expirationDate: string | null | undefined, asOf: string): boolean {
  if (effectiveDate > asOf) return false
  if (expirationDate && expirationDate < asOf) return false
  return true
}

export async function getJurisdictionThresholds(
  jurisdictionCode: string,
  asOfDate?: string
): Promise<JurisdictionThresholds> {
  const code = jurisdictionCode.toUpperCase()
  const asOf = asOfDate || todayIso()
  const cached = cache.get(`${code}:${asOf}`)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  const rows = await prisma.jurisdictionRule.findMany({
    where: { jurisdictionCode: code, isActive: true },
    orderBy: { effectiveDate: 'desc' },
  })

  const row = rows.find((r) => isEffective(r.effectiveDate, r.expirationDate, asOf))
  if (!row) {
    throw new Error(
      `No active jurisdiction rule for ${code} as of ${asOf}. Run: npx prisma db seed`
    )
  }

  const toleranceOverride = getFmvToleranceOverride()
  const value: JurisdictionThresholds = {
    jurisdictionCode: row.jurisdictionCode,
    jurisdictionName: row.jurisdictionName,
    perPaymentMin: row.perPaymentMin ?? 0,
    aggregateAnnualMin: row.aggregateAnnualMin ?? 0,
    currency: row.currency,
    fmvTolerancePercent: toleranceOverride ?? row.fmvTolerancePercent,
    regulatoryBasis: row.regulatoryBasis,
  }

  cache.set(`${code}:${asOf}`, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  return value
}

export async function getUsJurisdictionThresholds(asOfDate?: string): Promise<JurisdictionThresholds> {
  return getJurisdictionThresholds('US', asOfDate)
}

export function clearJurisdictionConfigCache(): void {
  cache = new Map()
}
