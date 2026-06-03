import {
  resolveNppesStatus,
  blocksExportForStatus,
  verifyRecordNpiAtIngest,
} from '@/lib/nppes-ingest-service'
import { analyzeFmvFromConfig, type FmvAnalysisConfig } from '@/lib/fmv-config-service'

jest.mock('@/lib/nppes-service', () => ({
  verifyNpi: jest.fn(async (npi: string) => ({
    valid: npi === '1234567890',
    npi,
    provider: npi === '1234567890' ? { npi, firstName: 'Jane', lastName: 'Doe' } : null,
    nameMatch: true,
    matchScore: 1,
    message: npi === '1234567890' ? 'ok' : 'not found',
    source: 'nppes_api',
  })),
}))

describe('nppes-ingest-service', () => {
  const originalPolicy = process.env.NPPES_INGEST_POLICY

  afterEach(() => {
    process.env.NPPES_INGEST_POLICY = originalPolicy
  })

  it('skips when policy is off', async () => {
    process.env.NPPES_INGEST_POLICY = 'off'
    const result = await verifyRecordNpiAtIngest({
      coveredRecipientNpi: '1234567890',
      coveredRecipientType: 'Physician',
    })
    expect(result.status).toBe('skipped')
    expect(result.blocksExport).toBe(false)
  })

  it('verifies valid NPI when policy is warn', async () => {
    process.env.NPPES_INGEST_POLICY = 'warn'
    const result = await verifyRecordNpiAtIngest({
      coveredRecipientNpi: '1234567890',
      coveredRecipientType: 'Covered Recipient Physician',
      physicianFirstName: 'Jane',
      physicianLastName: 'Doe',
    })
    expect(result.status).toBe('verified')
    expect(result.blocksExport).toBe(false)
  })

  it('blocks export for not_found when policy is block', () => {
    expect(blocksExportForStatus('not_found', 'block')).toBe(true)
    expect(blocksExportForStatus('not_found', 'warn')).toBe(false)
  })

  it('maps invalid format status', () => {
    expect(
      resolveNppesStatus({
        valid: false,
        npi: '123',
        provider: null,
        nameMatch: null,
        matchScore: 0,
        message: 'NPI must be 10 digits',
        source: 'nppes_api',
      })
    ).toBe('invalid_format')
  })
})

describe('fmv-sync payload shape', () => {
  it('still analyzes synced consulting rate', () => {
    const config: FmvAnalysisConfig = {
      tolerancePercent: 10,
      specialtyMultipliers: { default: 1, cardiology: 1.25 },
      rates: [
        {
          natureKey: 'consulting',
          natureLabel: 'Consulting fee',
          specialtyTier: 'default',
          rateUsd: 600,
          unit: 'hour',
          sourceKey: 'fmv_engine',
        },
      ],
    }
    const result = analyzeFmvFromConfig(
      {
        totalAmountOfPaymentUsdollars: 9000,
        natureOfPaymentOrTransferOfValue: 'Consulting',
        physicianSpecialty: 'Cardiology',
      },
      config
    )
    expect(result.status).toBe('above_fmv')
    expect(result.rateSource).toBe('fmv_engine')
  })
})
