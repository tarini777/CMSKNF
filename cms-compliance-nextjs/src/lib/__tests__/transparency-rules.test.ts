import {
  applyStatutoryExemptions,
  assignCmsReportCategory,
  evaluateOwnershipIndicator,
  evaluateThirdPartyPayment,
  isDiscountOrRebate,
  isProductSampleExempt,
  isPatientEducationExempt,
  isSupportActCoveredRecipient,
} from '@/lib/transparency-exemptions'
import { normalizePaymentAmount } from '@/lib/currency-service'
import { CMSRecord } from '@/types/cms'

const baseRecord: CMSRecord = {
  id: '1',
  recordId: 'R1',
  coveredRecipientId: 'C1',
  coveredRecipientName: 'Dr Smith',
  coveredRecipientType: 'Physician',
  totalAmountOfPaymentUsdollars: 500,
  isReportable: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('transparency exemptions', () => {
  it('exempts discounts and rebates', () => {
    const r = { ...baseRecord, natureOfPaymentOrTransferOfValue: 'Product discount rebate' }
    expect(isDiscountOrRebate(r).exempt).toBe(true)
    expect(applyStatutoryExemptions(r).ruleId).toBe('rule_discount_rebate_exempt')
  })

  it('exempts product samples', () => {
    const r = { ...baseRecord, natureOfPaymentOrTransferOfValue: 'Drug sample for patient', totalAmountOfPaymentUsdollars: 25 }
    expect(isProductSampleExempt(r).exempt).toBe(true)
  })

  it('exempts patient education not CME', () => {
    const r = {
      ...baseRecord,
      natureOfPaymentOrTransferOfValue: 'Patient education material',
      contextualInformation: 'For patient use',
    }
    expect(isPatientEducationExempt(r).exempt).toBe(true)
  })

  it('does not exempt CME speaker fees as patient education', () => {
    const r = {
      ...baseRecord,
      natureOfPaymentOrTransferOfValue: 'Compensation for serving as faculty for continuing education program',
    }
    expect(isPatientEducationExempt(r).exempt).toBe(false)
  })
})

describe('SUPPORT Act and ownership', () => {
  it('recognizes nurse practitioner as covered', () => {
    const r = { ...baseRecord, coveredRecipientType: 'Nurse Practitioner' }
    expect(isSupportActCoveredRecipient(r).covered).toBe(true)
  })

  it('flags ownership as reportable category', () => {
    const r = { ...baseRecord, physicianOwnershipIndicator: 'Yes' }
    const o = evaluateOwnershipIndicator(r)
    expect(o?.category).toBe('ownership')
    expect(assignCmsReportCategory(r)).toBe('ownership')
  })
})

describe('third-party payments', () => {
  it('flags indirect payments', () => {
    const r = {
      ...baseRecord,
      thirdPartyPaymentRecipientIndicator: 'Yes',
      nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue: 'MedEd Co',
    }
    const t = evaluateThirdPartyPayment(r)
    expect(t.isReportable).toBe(true)
    expect(t.ruleIds).toContain('rule_indirect_payment_reportable')
  })
})

describe('multi-currency', () => {
  it('converts EUR to USD for threshold checks', () => {
    const n = normalizePaymentAmount(10, 'EUR')
    expect(n.amountUsd).toBeGreaterThan(10)
    expect(n.paymentCurrency).toBe('EUR')
  })
})
