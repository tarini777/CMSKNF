import type { ConnectorDefinition } from './types'

/** SAP Accounts Payable — vendor invoice lines with HCP payee attribution. */
export const SAP_AP_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'sap_ap',
  displayName: 'SAP Accounts Payable',
  category: 'financial',
  mappingVersion: 'sap-ap-mapper-1.0',
  description:
    'Maps SAP FI/AP invoice items (BAPI/Fiori export) with physician vendor master to CMS general payment fields.',
  fieldMappings: [
    { sourceField: 'InvoiceNumber', canonicalField: 'record_id', required: true },
    { sourceField: 'InvoiceItem', canonicalField: 'external_transaction_id' },
    { sourceField: 'PostingDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'AmountInUSD', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'DocumentCurrency', canonicalField: 'payment_currency' },
    { sourceField: 'ExpenseCategory', canonicalField: 'nature_of_payment_or_transfer_of_value', required: true },
    { sourceField: 'PaymentMethod', canonicalField: 'form_of_payment_or_transfer_of_value' },
    { sourceField: 'VendorName', canonicalField: 'name_of_third_party_entity_receiving_payment_or_transfer_of_value' },
    { sourceField: 'ThirdPartyIndicator', canonicalField: 'third_party_payment_recipient_indicator' },
    { sourceField: 'ItemText', canonicalField: 'contextual_information' },
    { sourceField: 'PhysicianFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'PhysicianLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'PhysicianNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'PhysicianSpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'PhysicianCity', canonicalField: 'recipient_city' },
    { sourceField: 'PhysicianState', canonicalField: 'recipient_state' },
    { sourceField: 'CompanyCodeName', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'CostCenter', canonicalField: 'product_category_or_therapeutic_area_1' },
  ],
  sampleUpstreamPayload: {
    InvoiceNumber: 'SAP-INV-45001234',
    InvoiceItem: '00010',
    PostingDate: '2025-02-18',
    AmountInUSD: '3500.00',
    DocumentCurrency: 'USD',
    ExpenseCategory: 'Consulting Services',
    PaymentMethod: 'Check',
    VendorName: 'Clinical Advisory Group LLC',
    ThirdPartyIndicator: 'Y',
    ItemText: 'Q1 advisory board — cardiology',
    PhysicianFirstName: 'Alan',
    PhysicianLastName: 'Reyes',
    PhysicianNPI: '1234567890',
    PhysicianSpecialty: 'Cardiology',
    PhysicianCity: 'Chicago',
    PhysicianState: 'IL',
    CompanyCodeName: 'KNF Demo Manufacturer',
    CostCenter: 'Cardiology',
  },
}

const SAP_AP_NATURE_MAP: Record<string, string> = {
  consulting: 'Consulting Fee',
  advisory: 'Consulting Fee',
  honorarium: 'Honoraria',
  speaker: 'Speaker Program',
  grant: 'Grant',
  research: 'Research',
  royalty: 'Royalty or License',
}

export function enrichSapApCanonical(row: Record<string, string>): Record<string, string> {
  const out = { ...row }
  const category = (out.nature_of_payment_or_transfer_of_value || '').toLowerCase()
  for (const [key, cmsNature] of Object.entries(SAP_AP_NATURE_MAP)) {
    if (category.includes(key)) {
      out.nature_of_payment_or_transfer_of_value = cmsNature
      break
    }
  }
  out.form_of_payment_or_transfer_of_value =
    out.form_of_payment_or_transfer_of_value || 'Cash or cash equivalent'
  out.covered_recipient_type = out.covered_recipient_type || 'Covered Recipient Physician'
  out.change_type = out.change_type || 'N'
  if (!out.record_id) out.record_id = `SAPAP_${Date.now()}`
  if (out.date_of_payment) out.program_year = out.date_of_payment.slice(0, 4)
  if (out.third_party_payment_recipient_indicator === 'Y' && !out.name_of_third_party_entity_receiving_payment_or_transfer_of_value) {
    out.name_of_third_party_entity_receiving_payment_or_transfer_of_value = out.vendor_name || ''
  }
  return out
}
