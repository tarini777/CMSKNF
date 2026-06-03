import { prisma } from '@/lib/prisma'
import { clearFmvConfigCache } from '@/lib/fmv-config-service'

export interface FmvRateSyncRow {
  natureKey: string
  natureLabel: string
  rateUsd: number
  unit?: string
  specialtyTier?: string
  sourceKey?: string
}

export interface FmvSpecialtyTierSyncRow {
  tierKey: string
  multiplier: number
  displayLabel?: string
}

export interface FmvSyncPayload {
  effectiveDate: string
  sourceKey?: string
  rates: FmvRateSyncRow[]
  specialtyTiers?: FmvSpecialtyTierSyncRow[]
  deactivatePrior?: boolean
}

export interface FmvSyncResult {
  ratesUpserted: number
  tiersUpserted: number
  effectiveDate: string
  sourceKey: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function syncFmvRatesFromConnector(payload: FmvSyncPayload): Promise<FmvSyncResult> {
  const effectiveDate = payload.effectiveDate || todayIso()
  const sourceKey = payload.sourceKey || 'fmv_engine'

  if (!payload.rates?.length) {
    throw new Error('FMV sync requires at least one rate row')
  }

  if (payload.deactivatePrior !== false) {
    await prisma.fmvRate.updateMany({
      where: { sourceKey, isActive: true },
      data: { isActive: false, expirationDate: effectiveDate },
    })
  }

  let ratesUpserted = 0
  for (const row of payload.rates) {
    const specialtyTier = row.specialtyTier || 'default'
    await prisma.fmvRate.upsert({
      where: {
        natureKey_specialtyTier_effectiveDate: {
          natureKey: row.natureKey.toLowerCase().trim(),
          specialtyTier,
          effectiveDate,
        },
      },
      create: {
        natureKey: row.natureKey.toLowerCase().trim(),
        natureLabel: row.natureLabel,
        specialtyTier,
        rateUsd: row.rateUsd,
        unit: row.unit || 'event',
        sourceKey: row.sourceKey || sourceKey,
        effectiveDate,
        isActive: true,
      },
      update: {
        natureLabel: row.natureLabel,
        rateUsd: row.rateUsd,
        unit: row.unit || 'event',
        sourceKey: row.sourceKey || sourceKey,
        isActive: true,
        expirationDate: null,
      },
    })
    ratesUpserted++
  }

  let tiersUpserted = 0
  for (const tier of payload.specialtyTiers || []) {
    await prisma.fmvSpecialtyTier.upsert({
      where: { tierKey: tier.tierKey.toLowerCase().trim() },
      create: {
        tierKey: tier.tierKey.toLowerCase().trim(),
        multiplier: tier.multiplier,
        displayLabel: tier.displayLabel || tier.tierKey,
        isActive: true,
      },
      update: {
        multiplier: tier.multiplier,
        displayLabel: tier.displayLabel || tier.tierKey,
        isActive: true,
      },
    })
    tiersUpserted++
  }

  clearFmvConfigCache()

  return { ratesUpserted, tiersUpserted, effectiveDate, sourceKey }
}

export async function listActiveFmvRates() {
  return prisma.fmvRate.findMany({
    where: { isActive: true },
    orderBy: [{ natureKey: 'asc' }, { specialtyTier: 'asc' }],
  })
}
