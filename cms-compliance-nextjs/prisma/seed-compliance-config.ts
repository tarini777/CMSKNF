import type { PrismaClient } from '@prisma/client'
import { syncJurisdictionRulesFromFrameworks } from '../src/lib/jurisdiction-seed-service'

const EFFECTIVE = '2025-01-01'

const FMV_SPECIALTY_TIERS = [
  { tierKey: 'default', multiplier: 1, displayLabel: 'Default' },
  { tierKey: 'cardiology', multiplier: 1.25, displayLabel: 'Cardiology' },
  { tierKey: 'oncology', multiplier: 1.3, displayLabel: 'Oncology' },
  { tierKey: 'neurology', multiplier: 1.2, displayLabel: 'Neurology' },
  { tierKey: 'orthopedics', multiplier: 1.15, displayLabel: 'Orthopedics' },
  { tierKey: 'internal medicine', multiplier: 1, displayLabel: 'Internal Medicine' },
]

/** Base FMV rates — sync target for fmv_engine / CLM connector. */
const FMV_RATES = [
  { natureKey: 'consulting', natureLabel: 'Consulting fee', rateUsd: 500, unit: 'hour' },
  { natureKey: 'consulting fee', natureLabel: 'Consulting fee', rateUsd: 500, unit: 'hour' },
  { natureKey: 'speaking', natureLabel: 'Speaker / faculty', rateUsd: 2000, unit: 'event' },
  {
    natureKey: 'compensation for faculty/speaker at medical education programs',
    natureLabel: 'Speaker / faculty',
    rateUsd: 2000,
    unit: 'event',
  },
  { natureKey: 'honoraria', natureLabel: 'Honoraria', rateUsd: 1500, unit: 'event' },
  { natureKey: 'honorarium', natureLabel: 'Honoraria', rateUsd: 1500, unit: 'event' },
  { natureKey: 'food and beverage', natureLabel: 'Meals', rateUsd: 75, unit: 'meal' },
  { natureKey: 'food and beverages', natureLabel: 'Meals', rateUsd: 75, unit: 'meal' },
  { natureKey: 'entertainment', natureLabel: 'Entertainment', rateUsd: 150, unit: 'event' },
  { natureKey: 'travel', natureLabel: 'Travel & lodging (daily)', rateUsd: 800, unit: 'day' },
  { natureKey: 'travel and lodging', natureLabel: 'Travel & lodging (daily)', rateUsd: 800, unit: 'day' },
  { natureKey: 'grant', natureLabel: 'Grant (no FMV cap)', rateUsd: 0, unit: 'event' },
  { natureKey: 'charitable contribution', natureLabel: 'Charitable (no FMV cap)', rateUsd: 0, unit: 'event' },
]

export async function seedComplianceConfig(prisma: PrismaClient): Promise<void> {
  const jurisdictionCount = await syncJurisdictionRulesFromFrameworks(prisma)
  console.log(`Jurisdiction rules synced: ${jurisdictionCount} national regimes`)

  const fmvExisting = await prisma.fmvSpecialtyTier.count()
  if (fmvExisting > 0) {
    console.log(`FMV config already seeded (${fmvExisting} specialty tiers) — skipping FMV rates`)
    return
  }

  for (const tier of FMV_SPECIALTY_TIERS) {
    await prisma.fmvSpecialtyTier.create({ data: { ...tier, isActive: true } })
  }

  for (const rate of FMV_RATES) {
    await prisma.fmvRate.create({
      data: {
        ...rate,
        specialtyTier: 'default',
        sourceKey: 'fmv_engine',
        effectiveDate: EFFECTIVE,
        isActive: true,
      },
    })
  }

  console.log(
    `Compliance config seeded: ${jurisdictionCount} jurisdictions, ${FMV_RATES.length} FMV rates, ${FMV_SPECIALTY_TIERS.length} specialty tiers`
  )
}
