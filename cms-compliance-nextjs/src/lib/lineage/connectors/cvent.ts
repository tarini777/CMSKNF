import type { ConnectorDefinition } from './types'

/** Cvent event registration — meal/travel allocations that often duplicate Concur T&E. */
export const CVENT_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'cvent',
  displayName: 'Cvent Events',
  category: 'crm',
  mappingVersion: 'cvent-mapper-1.0',
  description:
    'Maps Cvent attendee meal and travel cost allocations to CMS general payment fields. Collides with Concur when the same HCP dinner is expensed and event-registered.',
  fieldMappings: [
    { sourceField: 'RegistrationId', canonicalField: 'record_id', required: true },
    { sourceField: 'EventId', canonicalField: 'external_transaction_id' },
    { sourceField: 'EventDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'MealAllocationAmount', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'CurrencyCode', canonicalField: 'payment_currency' },
    { sourceField: 'CostCategory', canonicalField: 'nature_of_payment_or_transfer_of_value', required: true },
    { sourceField: 'PaymentMethod', canonicalField: 'form_of_payment_or_transfer_of_value' },
    { sourceField: 'EventName', canonicalField: 'contextual_information' },
    { sourceField: 'VenueName', canonicalField: 'vendor_name' },
    { sourceField: 'AttendeeFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'AttendeeLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'AttendeeNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'AttendeeType', canonicalField: 'covered_recipient_type' },
    { sourceField: 'AttendeeSpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'AttendeeCity', canonicalField: 'recipient_city' },
    { sourceField: 'AttendeeState', canonicalField: 'recipient_state' },
    { sourceField: 'VenueCity', canonicalField: 'city_of_travel' },
    { sourceField: 'VenueState', canonicalField: 'state_of_travel' },
    { sourceField: 'VenueCountry', canonicalField: 'country_of_travel' },
    { sourceField: 'CompanyName', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
  ],
  sampleUpstreamPayload: {
    RegistrationId: 'REG-2024-55102',
    EventId: 'EVT-CARDIO-NYC-0315',
    EventDate: '2024-03-15',
    MealAllocationAmount: '125.50',
    CurrencyCode: 'USD',
    CostCategory: 'Meal',
    PaymentMethod: 'In-kind',
    EventName: 'Cardiology Advisory Board Dinner',
    VenueName: 'Steakhouse NYC',
    AttendeeFirstName: 'Jane',
    AttendeeLastName: 'Doe',
    AttendeeNPI: '1234567890',
    AttendeeType: 'Covered Recipient Physician',
    AttendeeSpecialty: 'Cardiology',
    AttendeeCity: 'Boston',
    AttendeeState: 'MA',
    VenueCity: 'New York',
    VenueState: 'NY',
    VenueCountry: 'United States',
    CompanyName: 'Gilead Sciences, Inc.',
  },
}

const CVENT_NATURE_MAP: Record<string, string> = {
  meal: 'Food and Beverage',
  meals: 'Food and Beverage',
  'food and beverage': 'Food and Beverage',
  dinner: 'Food and Beverage',
  travel: 'Travel and Lodging',
  lodging: 'Travel and Lodging',
  registration: 'Registration Fee',
}

export function enrichCventCanonical(row: Record<string, string>): Record<string, string> {
  const enriched = { ...row }
  const rawNature = (enriched.nature_of_payment_or_transfer_of_value || '').toLowerCase()
  enriched.nature_of_payment_or_transfer_of_value =
    CVENT_NATURE_MAP[rawNature] || enriched.nature_of_payment_or_transfer_of_value || 'Food and Beverage'
  enriched.covered_recipient_type =
    enriched.covered_recipient_type || 'Covered Recipient Physician'
  enriched.form_of_payment_or_transfer_of_value =
    enriched.form_of_payment_or_transfer_of_value || 'In-kind items and services'
  enriched.change_type = enriched.change_type || 'N'
  enriched.program_year =
    enriched.program_year || (enriched.date_of_payment || '').slice(0, 4) || String(new Date().getFullYear())
  return enriched
}
