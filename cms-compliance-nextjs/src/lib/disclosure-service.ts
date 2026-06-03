/**
 * Public disclosure data — individual vs aggregate splits (REQ-020/021).
 */

import { prisma } from '@/lib/prisma'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export interface DisclosureIndividualRow {
  recordId: string
  recipientName: string
  npi?: string
  amountUsd: number
  dateOfPayment?: string
  natureOfPayment?: string
  jurisdiction: string
  disclosureType: 'individual'
}

export interface DisclosureAggregateBucket {
  jurisdiction: string
  label: string
  recipientCount: number
  totalUsd: number
  disclosureType: 'aggregate'
}

export interface PublicDisclosureReport {
  programYear: string
  generatedAt: string
  individual: DisclosureIndividualRow[]
  aggregate: DisclosureAggregateBucket[]
  summary: {
    individualCount: number
    individualTotalUsd: number
    aggregateBucketCount: number
    aggregateTotalUsd: number
    researchAggregateUsd: number
  }
}

function isEuOrUk(country?: string | null): boolean {
  const c = (country || '').toLowerCase()
  if (!c || c === 'united states' || c === 'us' || c === 'usa') return false
  const euUk = ['united kingdom', 'uk', 'france', 'germany', 'spain', 'italy', 'netherlands', 'belgium', 'ireland']
  return euUk.some((x) => c.includes(x)) || c.length === 2
}

export async function buildPublicDisclosureReport(programYear?: string): Promise<PublicDisclosureReport> {
  const year = programYear || String(getActiveProgramYear())
  const records = await prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      NOT: { disputeWorkflowStatus: 'disputed' },
    },
    orderBy: { totalAmountOfPaymentUsdollars: 'desc' },
  })

  const individual: DisclosureIndividualRow[] = []
  const aggregateMap = new Map<string, { count: number; total: number; label: string }>()
  let researchAggregateUsd = 0

  for (const r of records) {
    const eu = isEuOrUk(r.recipientCountry)
    const isResearch = r.cmsReportCategory === 'research' || r.disclosureType === 'aggregate'

    if (isResearch) {
      researchAggregateUsd += r.totalAmountOfPaymentUsdollars
      const key = 'research_rd'
      const cur = aggregateMap.get(key) || { count: 0, total: 0, label: 'R&D payments (aggregate)' }
      cur.count += 1
      cur.total += r.totalAmountOfPaymentUsdollars
      aggregateMap.set(key, cur)
      continue
    }

    if (eu && r.consentForDisclosure !== true) {
      const j = r.recipientCountry || 'EU/UK'
      const key = `agg_${j}`
      const cur = aggregateMap.get(key) || { count: 0, total: 0, label: `EFPIA aggregate — ${j}` }
      cur.count += 1
      cur.total += r.totalAmountOfPaymentUsdollars
      aggregateMap.set(key, cur)
      continue
    }

    individual.push({
      recordId: r.recordId,
      recipientName: r.coveredRecipientName,
      npi: r.coveredRecipientNpi || undefined,
      amountUsd: r.totalAmountOfPaymentUsdollars,
      dateOfPayment: r.dateOfPayment || undefined,
      natureOfPayment: r.natureOfPaymentOrTransferOfValue || undefined,
      jurisdiction: eu ? r.recipientCountry || 'EU/UK' : 'US',
      disclosureType: 'individual',
    })
  }

  const aggregate: DisclosureAggregateBucket[] = [...aggregateMap.entries()].map(([jurisdiction, v]) => ({
    jurisdiction,
    label: v.label,
    recipientCount: v.count,
    totalUsd: v.total,
    disclosureType: 'aggregate' as const,
  }))

  const individualTotalUsd = individual.reduce((s, r) => s + r.amountUsd, 0)
  const aggregateTotalUsd = aggregate.reduce((s, b) => s + b.totalUsd, 0)

  return {
    programYear: year,
    generatedAt: new Date().toISOString(),
    individual,
    aggregate,
    summary: {
      individualCount: individual.length,
      individualTotalUsd,
      aggregateBucketCount: aggregate.length,
      aggregateTotalUsd,
      researchAggregateUsd,
    },
  }
}
