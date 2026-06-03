import { buildContainsSearch } from '@/lib/sqlite-search'
import { evaluateCompanyRule } from '@/lib/company-rules-engine'
import { CMSRecord, CompanyRule } from '@/types/cms'

describe('buildContainsSearch', () => {
  it('returns OR conditions for search variants', () => {
    const result = buildContainsSearch(['name'], 'Test')
    expect(result.OR.length).toBeGreaterThan(0)
    expect(result.OR[0]).toHaveProperty('name')
  })

  it('returns empty OR for blank search', () => {
    expect(buildContainsSearch(['name'], '   ').OR).toEqual([])
  })
})

describe('evaluateCompanyRule', () => {
  const baseRecord: CMSRecord = {
    id: '1',
    recordId: 'R1',
    coveredRecipientId: 'C1',
    coveredRecipientName: 'Dr Smith',
    coveredRecipientType: 'Physician',
    totalAmountOfPaymentUsdollars: 15000,
    isReportable: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('matches threshold rules', () => {
    const rule: CompanyRule = {
      id: 'r1',
      name: 'High value',
      description: 'Over 10k',
      ruleType: 'threshold',
      conditions: { field: 'totalAmountOfPaymentUsdollars', operator: 'greater_than', value: 10000 },
      isActive: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const { matched, effect } = evaluateCompanyRule(rule, baseRecord)
    expect(matched).toBe(true)
    expect(effect).toBe('reportable')
  })

  it('matches exclusion rules below threshold', () => {
    const rule: CompanyRule = {
      id: 'r2',
      name: 'Small gift',
      description: 'Under 10',
      ruleType: 'exclusion',
      conditions: { field: 'totalAmountOfPaymentUsdollars', operator: 'less_than', value: 10 },
      isActive: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const { matched } = evaluateCompanyRule(rule, { ...baseRecord, totalAmountOfPaymentUsdollars: 5 })
    expect(matched).toBe(true)
  })
})
