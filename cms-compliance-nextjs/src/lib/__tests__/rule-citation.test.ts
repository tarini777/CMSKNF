import { resolveRuleEntry, getImplementedTransparencyRuleIds } from '@/lib/rule-registry'
import {
  buildGlossaryMatchesForRecord,
  resolveRuleCitations,
} from '@/lib/rule-citation-service'
import { runTransparencyAnalysis } from '@/lib/transparency-rules-engine'
import { CMSRecord } from '@/types/cms'

jest.mock('@/lib/jurisdiction-config-service', () => ({
  getJurisdictionThresholds: jest.fn(async (code: string) => ({
    jurisdictionCode: code,
    jurisdictionName: code === 'FR' ? 'France' : 'United States',
    perPaymentMin: code === 'FR' ? 10 : 10,
    aggregateAnnualMin: code === 'FR' ? 0 : 100,
    currency: code === 'FR' ? 'EUR' : 'USD',
    fmvTolerancePercent: 10,
  })),
  getUsJurisdictionThresholds: jest.fn(async () => ({
    jurisdictionCode: 'US',
    jurisdictionName: 'United States',
    perPaymentMin: 10,
    aggregateAnnualMin: 100,
    currency: 'USD',
    fmvTolerancePercent: 10,
  })),
}))

const baseRecord: CMSRecord = {
  id: '1',
  recordId: 'R1',
  coveredRecipientId: 'C1',
  coveredRecipientName: 'Dr Smith',
  coveredRecipientType: 'Physician',
  totalAmountOfPaymentUsdollars: 500,
  natureOfPaymentOrTransferOfValue: 'Consulting fee',
  isReportable: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('rule registry', () => {
  it('resolves supplemental international rules without CMS catalog', () => {
    const entry = resolveRuleEntry('intl_fr_loi_bertrand_10_eur')
    expect(entry?.name).toContain('France')
    expect(entry?.jurisdiction).toBe('FR')
  })

  it('lists implemented transparency rule ids', () => {
    expect(getImplementedTransparencyRuleIds()).toContain('rule_discount_rebate_exempt')
    expect(getImplementedTransparencyRuleIds()).toContain('intl_fr_loi_bertrand_10_eur')
  })
})

describe('rule citations', () => {
  it('builds glossary matches for consulting payments', () => {
    const matches = buildGlossaryMatchesForRecord(baseRecord)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches.some((m) => m.term.length > 0)).toBe(true)
  })

  it('resolves applied rule ids to named citations', async () => {
    const { resolved, unresolved } = await resolveRuleCitations([
      'rule_consulting_payment',
      'rule_amount_threshold_10',
      'intl_fr_loi_bertrand_10_eur',
    ])
    expect(resolved.length).toBeGreaterThanOrEqual(2)
    expect(resolved.find((r) => r.ruleId === 'intl_fr_loi_bertrand_10_eur')?.jurisdiction).toBe('FR')
    expect(unresolved.length).toBeLessThanOrEqual(1)
  })

  it('populates glossaryMatches in transparency analysis', async () => {
    const analysis = await runTransparencyAnalysis({
      ...baseRecord,
      recipientCountry: 'France',
      totalAmountOfPaymentUsdollars: 50,
    })
    expect(analysis.glossaryMatches.length).toBeGreaterThan(0)
    expect(analysis.applicableRules).toContain('intl_fr_loi_bertrand_10_eur')
  })
})
