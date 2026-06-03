import { mapConnectorPayload } from '@/lib/lineage/connectors'
import { CONCUR_CONNECTOR } from '@/lib/lineage/connectors/concur'
import { VEEVA_CRM_CONNECTOR } from '@/lib/lineage/connectors/veeva-crm'
import { TMC_CONNECTOR, VENDOR_MED_ED_CONNECTOR } from '@/lib/lineage/connectors/vendor'

describe('connector field mappings', () => {
  it('maps Concur sample to CMS canonical row', () => {
    const result = mapConnectorPayload('concur', CONCUR_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.covered_recipient_last_name).toBe('Doe')
    expect(result.canonicalRow.covered_recipient_npi).toBe('1234567890')
    expect(result.canonicalRow.nature_of_payment_or_transfer_of_value).toBe('Food and Beverage')
    expect(result.canonicalRow.third_party_payment_recipient_indicator).toBeUndefined()
  })

  it('maps Veeva CRM sample with product indicator', () => {
    const result = mapConnectorPayload('veeva_crm', VEEVA_CRM_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.covered_recipient_last_name).toBe('Chen')
    expect(result.canonicalRow.related_product_indicator).toBe('Y')
    expect(result.canonicalRow.nature_of_payment_or_transfer_of_value).toBe('Food and Beverage')
  })

  it('maps vendor med-ed with third-party fields', () => {
    const result = mapConnectorPayload('vendor_med_ed', VENDOR_MED_ED_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.third_party_payment_recipient_indicator).toBe('Y')
    expect(result.canonicalRow.name_of_third_party_entity_receiving_payment_or_transfer_of_value).toBe(
      'MedEd Partners LLC'
    )
    expect(result.canonicalRow.nature_of_payment_or_transfer_of_value).toBe('Speaker Program')
  })

  it('maps TMC travel with third-party entity', () => {
    const result = mapConnectorPayload('tmc', TMC_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.nature_of_payment_or_transfer_of_value).toBe('Travel and Lodging')
    expect(result.canonicalRow.name_of_third_party_entity_receiving_payment_or_transfer_of_value).toBe(
      'Corporate Travel Inc.'
    )
  })
})
