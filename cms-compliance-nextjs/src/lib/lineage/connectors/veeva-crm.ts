import type { ConnectorDefinition } from './types'

/** Veeva CRM — call / meeting / meal logged at point of contact. */
export const VEEVA_CRM_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'veeva_crm',
  displayName: 'Veeva CRM',
  category: 'crm',
  mappingVersion: 'veeva-crm-mapper-1.0',
  description:
    'Maps Veeva call and meal expense records with HCP account attribution to CMS general payment fields.',
  fieldMappings: [
    { sourceField: 'Call_ID', canonicalField: 'record_id', required: true },
    { sourceField: 'Call_Date', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'Expense_Amount', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'Currency', canonicalField: 'payment_currency' },
    { sourceField: 'Expense_Type', canonicalField: 'nature_of_payment_or_transfer_of_value', required: true },
    { sourceField: 'Payment_Method', canonicalField: 'form_of_payment_or_transfer_of_value' },
    { sourceField: 'Account_Name', canonicalField: 'covered_recipient_full_name' },
    { sourceField: 'HCP_First_Name', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'HCP_Last_Name', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'HCP_NPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'Specialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'Primary_City', canonicalField: 'recipient_city' },
    { sourceField: 'Primary_State', canonicalField: 'recipient_state' },
    { sourceField: 'Call_Location', canonicalField: 'city_of_travel' },
    { sourceField: 'Product_Name', canonicalField: 'name_of_drug_or_biological_or_device_or_medical_supply_1' },
    { sourceField: 'Call_Notes', canonicalField: 'contextual_information' },
    { sourceField: 'Company', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'Attendee_Count', canonicalField: 'number_of_payments_included_in_total_amount' },
  ],
  sampleUpstreamPayload: {
    Call_ID: 'CALL-2024-5521',
    Call_Date: '2024-04-10',
    Expense_Amount: '85.00',
    Currency: 'USD',
    Expense_Type: 'Meal',
    Payment_Method: 'In-kind items and services',
    HCP_First_Name: 'Robert',
    HCP_Last_Name: 'Chen',
    HCP_NPI: '9876543210',
    Specialty: 'Oncology',
    Primary_City: 'San Francisco',
    Primary_State: 'CA',
    Call_Location: 'San Francisco',
    Product_Name: 'Drug X',
    Call_Notes: 'Lunch meeting — efficacy data review',
    Company: 'Gilead Sciences, Inc.',
    Attendee_Count: '1',
  },
}

const VEEVA_NATURE_MAP: Record<string, string> = {
  meal: 'Food and Beverage',
  lunch: 'Food and Beverage',
  dinner: 'Food and Beverage',
  sample: 'Gift',
  gift: 'Gift',
  speaking: 'Speaker Program',
  speaker: 'Speaker Program',
  consulting: 'Consulting Fee',
  education: 'Education',
}

export function enrichVeevaCanonical(row: Record<string, string>): Record<string, string> {
  const out = { ...row }
  if (out.covered_recipient_full_name && !out.covered_recipient_last_name) {
    const parts = out.covered_recipient_full_name.trim().split(/\s+/)
    if (parts.length >= 2) {
      out.covered_recipient_first_name = parts[0]
      out.covered_recipient_last_name = parts.slice(1).join(' ')
    }
  }
  const expenseType = (out.nature_of_payment_or_transfer_of_value || '').toLowerCase()
  for (const [key, cmsNature] of Object.entries(VEEVA_NATURE_MAP)) {
    if (expenseType.includes(key)) {
      out.nature_of_payment_or_transfer_of_value = cmsNature
      break
    }
  }
  out.covered_recipient_type = out.covered_recipient_type || 'Covered Recipient Physician'
  if (!out.form_of_payment_or_transfer_of_value) {
    out.form_of_payment_or_transfer_of_value = 'In-kind items and services'
  }
  if (out.name_of_drug_or_biological_or_device_or_medical_supply_1) {
    out.related_product_indicator = 'Y'
  }
  if (out.date_of_payment) {
    out.program_year = out.date_of_payment.slice(0, 4)
  }
  return out
}
