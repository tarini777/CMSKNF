import type { PrismaClient } from '@prisma/client'
import { getAllInternationalRegimes } from '@/data/international-regulatory-frameworks'

export const JURISDICTION_RULES_EFFECTIVE_DATE = '2025-01-01'

export function buildJurisdictionRulesFromFrameworks() {
  return getAllInternationalRegimes().map((regime) => ({
    jurisdictionCode: regime.countryCode,
    jurisdictionName: `${regime.countryName} — ${regime.regimeName}`,
    perPaymentMin: regime.reportingThreshold?.perTransferMin ?? 0,
    aggregateAnnualMin: regime.reportingThreshold?.annualAggregateMin ?? 0,
    currency: regime.reportingThreshold?.currency ?? 'USD',
    fmvTolerancePercent: 10,
    regulatoryBasis: regime.legalBasis,
    effectiveDate: JURISDICTION_RULES_EFFECTIVE_DATE,
  }))
}

/** Idempotently upsert all 78 national regimes into jurisdiction_rules. */
export async function syncJurisdictionRulesFromFrameworks(prisma: PrismaClient): Promise<number> {
  const rules = buildJurisdictionRulesFromFrameworks()

  for (const rule of rules) {
    await prisma.jurisdictionRule.upsert({
      where: {
        jurisdictionCode_effectiveDate: {
          jurisdictionCode: rule.jurisdictionCode,
          effectiveDate: rule.effectiveDate,
        },
      },
      create: { ...rule, isActive: true },
      update: {
        jurisdictionName: rule.jurisdictionName,
        perPaymentMin: rule.perPaymentMin,
        aggregateAnnualMin: rule.aggregateAnnualMin,
        currency: rule.currency,
        fmvTolerancePercent: rule.fmvTolerancePercent,
        regulatoryBasis: rule.regulatoryBasis,
        isActive: true,
      },
    })
  }

  return rules.length
}
