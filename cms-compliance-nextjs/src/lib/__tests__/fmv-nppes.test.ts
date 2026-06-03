import { analyzeFmvFromConfig, type FmvAnalysisConfig } from '@/lib/fmv-config-service'
import { verifyNpi } from '@/lib/nppes-service'

const TEST_FMV_CONFIG: FmvAnalysisConfig = {
  tolerancePercent: 10,
  specialtyMultipliers: { default: 1, cardiology: 1.25 },
  rates: [
    { natureKey: 'consulting', natureLabel: 'Consulting fee', specialtyTier: 'default', rateUsd: 500, unit: 'hour', sourceKey: 'fmv_engine' },
    { natureKey: 'consulting fee', natureLabel: 'Consulting fee', specialtyTier: 'default', rateUsd: 500, unit: 'hour', sourceKey: 'fmv_engine' },
    { natureKey: 'food and beverage', natureLabel: 'Meals', specialtyTier: 'default', rateUsd: 75, unit: 'meal', sourceKey: 'fmv_engine' },
    { natureKey: 'grant', natureLabel: 'Grant', specialtyTier: 'default', rateUsd: 0, unit: 'event', sourceKey: 'fmv_engine' },
  ],
}

describe('fmv-config-service', () => {
  it('flags consulting above benchmark', () => {
    const result = analyzeFmvFromConfig(
      {
        totalAmountOfPaymentUsdollars: 8000,
        natureOfPaymentOrTransferOfValue: 'Consulting Fee',
        physicianSpecialty: 'Cardiology',
        numberOfPaymentsIncludedInTotalAmount: '1',
      },
      TEST_FMV_CONFIG
    )
    expect(result.status).toBe('above_fmv')
    expect(result.benchmarkUsd).toBeGreaterThan(0)
  })

  it('returns no_benchmark for grants', () => {
    const result = analyzeFmvFromConfig(
      {
        totalAmountOfPaymentUsdollars: 50000,
        natureOfPaymentOrTransferOfValue: 'Grant',
        physicianSpecialty: 'Oncology',
      },
      TEST_FMV_CONFIG
    )
    expect(result.status).toBe('no_benchmark')
  })

  it('accepts meals within tolerance', () => {
    const result = analyzeFmvFromConfig(
      {
        totalAmountOfPaymentUsdollars: 72,
        natureOfPaymentOrTransferOfValue: 'Food and Beverage',
        physicianSpecialty: 'Internal Medicine',
      },
      TEST_FMV_CONFIG
    )
    expect(result.status).toBe('within_range')
  })
})

describe('nppes-service demo', () => {
  it('verifies demo NPI', async () => {
    const { verifyNpi } = await import('@/lib/nppes-service')
    const result = await verifyNpi('1234567890', { firstName: 'Jane', lastName: 'Doe' })
    expect(result.valid).toBe(true)
    expect(result.nameMatch).toBe(true)
  })
})
