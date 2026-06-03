import { analyzeFmv } from '@/lib/fmv-service'

describe('fmv-service', () => {
  it('flags consulting above benchmark', () => {
    const result = analyzeFmv({
      totalAmountOfPaymentUsdollars: 8000,
      natureOfPaymentOrTransferOfValue: 'Consulting Fee',
      physicianSpecialty: 'Cardiology',
      numberOfPaymentsIncludedInTotalAmount: '1',
    })
    expect(result.status).toBe('above_fmv')
    expect(result.benchmarkUsd).toBeGreaterThan(0)
  })

  it('returns no_benchmark for grants', () => {
    const result = analyzeFmv({
      totalAmountOfPaymentUsdollars: 50000,
      natureOfPaymentOrTransferOfValue: 'Grant',
      physicianSpecialty: 'Oncology',
    })
    expect(result.status).toBe('no_benchmark')
  })

  it('accepts meals within tolerance', () => {
    const result = analyzeFmv({
      totalAmountOfPaymentUsdollars: 72,
      natureOfPaymentOrTransferOfValue: 'Food and Beverage',
      physicianSpecialty: 'Internal Medicine',
    })
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
