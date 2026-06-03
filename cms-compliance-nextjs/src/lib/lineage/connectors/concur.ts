import type { ConnectorDefinition } from './types'

/** SAP Concur T&E — attendee-level expense allocation (Meals, Travel, Lodging). */
export const CONCUR_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'concur',
  displayName: 'SAP Concur T&E',
  category: 'travel',
  mappingVersion: 'concur-mapper-1.0',
  description:
    'Maps Concur expense report lines with HCP attendee attribution to CMS general payment fields.',
  fieldMappings: [
    { sourceField: 'ReportId', canonicalField: 'record_id', required: true },
    { sourceField: 'ExpenseId', canonicalField: 'external_transaction_id' },
    { sourceField: 'TransactionDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'PostedAmount', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'ApprovedAmount', canonicalField: 'total_amount_of_payment_usdollars' },
    { sourceField: 'CurrencyCode', canonicalField: 'payment_currency' },
    { sourceField: 'ExpenseType', canonicalField: 'nature_of_payment_or_transfer_of_value', required: true },
    { sourceField: 'PaymentType', canonicalField: 'form_of_payment_or_transfer_of_value' },
    { sourceField: 'VendorName', canonicalField: 'vendor_name' },
    { sourceField: 'BusinessPurpose', canonicalField: 'contextual_information' },
    { sourceField: 'AttendeeFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'AttendeeLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'AttendeeNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'AttendeeType', canonicalField: 'covered_recipient_type' },
    { sourceField: 'AttendeeSpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'AttendeeCity', canonicalField: 'recipient_city' },
    { sourceField: 'AttendeeState', canonicalField: 'recipient_state' },
    { sourceField: 'LocationCity', canonicalField: 'city_of_travel' },
    { sourceField: 'LocationState', canonicalField: 'state_of_travel' },
    { sourceField: 'LocationCountry', canonicalField: 'country_of_travel' },
    { sourceField: 'CompanyCode', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
  ],
  sampleUpstreamPayload: {
    ReportId: 'RPT-2024-88421',
    ExpenseId: 'EXP-99182',
    TransactionDate: '2024-03-15',
    PostedAmount: '125.50',
    CurrencyCode: 'USD',
    ExpenseType: 'Business Meal',
    PaymentType: 'Cash',
    VendorName: 'Steakhouse NYC',
    BusinessPurpose: 'Product discussion — Cardiology',
    AttendeeFirstName: 'Jane',
    AttendeeLastName: 'Doe',
    AttendeeNPI: '1234567890',
    AttendeeType: 'Covered Recipient Physician',
    AttendeeSpecialty: 'Cardiology',
    AttendeeCity: 'Boston',
    AttendeeState: 'MA',
    LocationCity: 'New York',
    LocationState: 'NY',
    LocationCountry: 'United States',
    CompanyCode: 'Gilead Sciences, Inc.',
  },
}

const CONCUR_NATURE_MAP: Record<string, string> = {
  'business meal': 'Food and Beverage',
  meals: 'Food and Beverage',
  'food and beverage': 'Food and Beverage',
  entertainment: 'Entertainment',
  airfare: 'Travel and Lodging',
  air: 'Travel and Lodging',
  hotel: 'Travel and Lodging',
  lodging: 'Travel and Lodging',
  ground: 'Travel and Lodging',
  taxi: 'Travel and Lodging',
  consulting: 'Consulting Fee',
  honorarium: 'Honoraria',
  grant: 'Grant',
}

export function enrichConcurCanonical(row: Record<string, string>): Record<string, string> {
  const out = { ...row }
  const expenseType = (out.nature_of_payment_or_transfer_of_value || '').toLowerCase()
  for (const [key, cmsNature] of Object.entries(CONCUR_NATURE_MAP)) {
    if (expenseType.includes(key)) {
      out.nature_of_payment_or_transfer_of_value = cmsNature
      break
    }
  }
  if (!out.form_of_payment_or_transfer_of_value) {
    out.form_of_payment_or_transfer_of_value = 'Cash or cash equivalent'
  }
  if (!out.covered_recipient_type) {
    out.covered_recipient_type = 'Covered Recipient Physician'
  }
  if (!out.record_id && out.external_transaction_id) {
    out.record_id = `CONCUR_${out.external_transaction_id}`
  } else if (!out.record_id) {
    out.record_id = `CONCUR_${Date.now()}`
  }
  if (out.date_of_payment) {
    out.program_year = out.date_of_payment.slice(0, 4)
  }
  return out
}
