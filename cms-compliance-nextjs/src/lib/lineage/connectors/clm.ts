import type { ConnectorDefinition } from './types'

/** Contract Lifecycle Management — contracted HCP engagements (speaking, consulting). */
export const CLM_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'clm',
  displayName: 'Contract Lifecycle Management',
  category: 'contracting',
  mappingVersion: 'clm-mapper-1.0',
  description:
    'Maps CLM executed contracts and payment schedules with FMV tier linkage to CMS general payment fields.',
  fieldMappings: [
    { sourceField: 'ContractId', canonicalField: 'record_id', required: true },
    { sourceField: 'PaymentScheduleId', canonicalField: 'external_transaction_id' },
    { sourceField: 'PaymentDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'ContractValueUSD', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'Currency', canonicalField: 'payment_currency' },
    { sourceField: 'ServiceType', canonicalField: 'nature_of_payment_or_transfer_of_value', required: true },
    { sourceField: 'PaymentForm', canonicalField: 'form_of_payment_or_transfer_of_value' },
    { sourceField: 'ContractTitle', canonicalField: 'contextual_information' },
    { sourceField: 'HCPFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'HCPLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'HCPNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'HCPSpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'HCPCity', canonicalField: 'recipient_city' },
    { sourceField: 'HCPState', canonicalField: 'recipient_state' },
    { sourceField: 'ManufacturerName', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'FMVTier', canonicalField: 'product_category_or_therapeutic_area_1' },
    { sourceField: 'TherapeuticArea', canonicalField: 'product_category_or_therapeutic_area_2' },
    { sourceField: 'ProductName', canonicalField: 'name_of_drug_or_biological_or_device_or_medical_supply_1' },
    { sourceField: 'RelatedProductFlag', canonicalField: 'related_product_indicator' },
  ],
  sampleUpstreamPayload: {
    ContractId: 'CLM-2025-7781',
    PaymentScheduleId: 'PAY-003',
    PaymentDate: '2025-05-01',
    ContractValueUSD: '12000',
    Currency: 'USD',
    ServiceType: 'Speaker Program',
    PaymentForm: 'Cash or cash equivalent',
    ContractTitle: 'National speaker bureau — Q2 oncology series',
    HCPFirstName: 'Lisa',
    HCPLastName: 'Nguyen',
    HCPNPI: '9876543210',
    HCPSpecialty: 'Oncology',
    HCPCity: 'Seattle',
    HCPState: 'WA',
    ManufacturerName: 'KNF Demo Manufacturer',
    FMVTier: 'Tier 2',
    TherapeuticArea: 'Oncology',
    ProductName: 'Oncology Drug A',
    RelatedProductFlag: 'Y',
  },
}

export function enrichClmCanonical(row: Record<string, string>): Record<string, string> {
  const out = { ...row }
  const service = (out.nature_of_payment_or_transfer_of_value || '').toLowerCase()
  if (service.includes('speaker')) out.nature_of_payment_or_transfer_of_value = 'Speaker Program'
  else if (service.includes('consult')) out.nature_of_payment_or_transfer_of_value = 'Consulting Fee'
  else if (service.includes('advisory')) out.nature_of_payment_or_transfer_of_value = 'Consulting Fee'

  out.form_of_payment_or_transfer_of_value =
    out.form_of_payment_or_transfer_of_value || 'Cash or cash equivalent'
  out.covered_recipient_type = out.covered_recipient_type || 'Covered Recipient Physician'
  out.change_type = out.change_type || 'N'
  out.related_product_indicator = out.related_product_indicator || 'N'
  if (!out.record_id) out.record_id = `CLM_${Date.now()}`
  if (out.date_of_payment) out.program_year = out.date_of_payment.slice(0, 4)
  return out
}
