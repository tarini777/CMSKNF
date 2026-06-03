import {
  buildRecordWithPuf,
  countPopulatedPufFields,
  extractCmsRecordFieldsFromCanonical,
} from '@/lib/lineage/record-view-service'

describe('record-view-service', () => {
  describe('extractCmsRecordFieldsFromCanonical', () => {
    it('maps NPI, CCN, change type, and source from canonical row', () => {
      const fields = extractCmsRecordFieldsFromCanonical(
        {
          covered_recipient_npi: '1234567890',
          teaching_hospital_ccn: 'CCN001',
          change_type: 'C',
          related_product_indicator: 'Y',
          name_of_drug_or_biological_or_device_or_medical_supply_1: 'Drug A',
        },
        'concur'
      )

      expect(fields.coveredRecipientNpi).toBe('1234567890')
      expect(fields.teachingHospitalCcn).toBe('CCN001')
      expect(fields.changeType).toBe('C')
      expect(fields.relatedProductIndicator).toBe('Y')
      expect(fields.sourceSystem).toBe('concur')
      expect(fields.nameOfAssociatedCoveredDrugOrBiological1).toBe('Drug A')
    })
  })

  describe('countPopulatedPufFields', () => {
    it('counts non-empty PUF values', () => {
      expect(
        countPopulatedPufFields({
          a: 'x',
          b: '',
          c: null,
          d: undefined,
          e: 'y',
        })
      ).toBe(2)
    })
  })

  describe('buildRecordWithPuf', () => {
    it('merges spend event PUF line into record view', () => {
      const record = {
        id: 'rec1',
        recordId: 'R001',
        coveredRecipientId: '1234567890',
        coveredRecipientName: 'Dr. Smith',
        coveredRecipientType: 'Physician',
        totalAmountOfPaymentUsdollars: 100,
        isReportable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        spendEventId: 'se1',
        cmsReportCategory: 'general',
      }

      const enriched = buildRecordWithPuf(record, {
        sourceSystem: 'concur',
        dedupKey: 'dedup-abc',
        sourceTransactionId: 'st1',
        dataSource: { sourceKey: 'concur', sourceName: 'SAP Concur' },
        generalLine: {
          id: 'gl1',
          changeType: 'N',
          coveredRecipientNpi: '1234567890',
          pufFields: {
            covered_recipient_npi: '1234567890',
            change_type: 'N',
            nature_of_payment_or_transfer_of_value: 'Food and Beverage',
          },
        },
      })

      expect(enriched.pufSummary?.fieldCount).toBe(3)
      expect(enriched.pufSummary?.totalFields).toBe(91)
      expect(enriched.lineage?.dataSourceName).toBe('SAP Concur')
      expect(enriched.pufFields?.nature_of_payment_or_transfer_of_value).toBe('Food and Beverage')
    })
  })
})
