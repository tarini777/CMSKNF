import type { ConnectorDefinition } from './types'

/** Third-party med-ed vendor — indirect payment allocated to HCP. */
export const VENDOR_MED_ED_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'vendor_med_ed',
  displayName: 'Third-Party Med-Ed Vendor',
  category: 'vendor',
  mappingVersion: 'vendor-med-ed-mapper-1.0',
  description:
    'Maps vendor invoice lines with per-HCP allocation (indirect spend) including third-party entity fields.',
  fieldMappings: [
    { sourceField: 'InvoiceNumber', canonicalField: 'record_id', required: true },
    { sourceField: 'InvoiceLineId', canonicalField: 'external_transaction_id' },
    { sourceField: 'PaymentDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'AllocatedAmount', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'Currency', canonicalField: 'payment_currency' },
    { sourceField: 'VendorName', canonicalField: 'name_of_third_party_entity_receiving_payment_or_transfer_of_value', required: true },
    { sourceField: 'NatureOfPayment', canonicalField: 'nature_of_payment_or_transfer_of_value', required: true },
    { sourceField: 'PaymentForm', canonicalField: 'form_of_payment_or_transfer_of_value' },
    { sourceField: 'HCPFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'HCPLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'HCPNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'HCPSpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'HCPCity', canonicalField: 'recipient_city' },
    { sourceField: 'HCPState', canonicalField: 'recipient_state' },
    { sourceField: 'ProgramName', canonicalField: 'contextual_information' },
    { sourceField: 'ManufacturerName', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'EventCity', canonicalField: 'city_of_travel' },
    { sourceField: 'EventState', canonicalField: 'state_of_travel' },
  ],
  sampleUpstreamPayload: {
    InvoiceNumber: 'INV-MED-2024-4401',
    InvoiceLineId: 'LINE-12',
    PaymentDate: '2024-05-20',
    AllocatedAmount: '350.00',
    Currency: 'USD',
    VendorName: 'MedEd Partners LLC',
    NatureOfPayment: 'Speaker Program',
    PaymentForm: 'Cash or cash equivalent',
    HCPFirstName: 'Alice',
    HCPLastName: 'Nguyen',
    HCPNPI: '1122334455',
    HCPSpecialty: 'Endocrinology',
    HCPCity: 'Chicago',
    HCPState: 'IL',
    ProgramName: 'Diabetes Update Symposium — Speaker honorarium',
    ManufacturerName: 'Gilead Sciences, Inc.',
    EventCity: 'Chicago',
    EventState: 'IL',
  },
}

/** Travel Management Company — indirect travel paid by TMC on manufacturer behalf. */
export const TMC_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'tmc',
  displayName: 'Travel Management Company',
  category: 'vendor',
  mappingVersion: 'tmc-mapper-1.0',
  description: 'Maps TMC booking invoices with HCP traveler attribution and third-party indicators.',
  fieldMappings: [
    { sourceField: 'BookingReference', canonicalField: 'record_id', required: true },
    { sourceField: 'TicketNumber', canonicalField: 'external_transaction_id' },
    { sourceField: 'TravelDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'TotalFare', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'Currency', canonicalField: 'payment_currency' },
    { sourceField: 'TMCName', canonicalField: 'name_of_third_party_entity_receiving_payment_or_transfer_of_value', required: true },
    { sourceField: 'TravelType', canonicalField: 'nature_of_payment_or_transfer_of_value' },
    { sourceField: 'TravelerFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'TravelerLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'TravelerNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'OriginCity', canonicalField: 'city_of_travel' },
    { sourceField: 'OriginState', canonicalField: 'state_of_travel' },
    { sourceField: 'DestinationCountry', canonicalField: 'country_of_travel' },
    { sourceField: 'SponsorCompany', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'TripPurpose', canonicalField: 'contextual_information' },
  ],
  sampleUpstreamPayload: {
    BookingReference: 'TMC-BK-77821',
    TicketNumber: 'TK-445566',
    TravelDate: '2024-06-01',
    TotalFare: '892.40',
    Currency: 'USD',
    TMCName: 'Corporate Travel Inc.',
    TravelType: 'Airfare',
    TravelerFirstName: 'James',
    TravelerLastName: 'Wilson',
    TravelerNPI: '5566778899',
    OriginCity: 'Boston',
    OriginState: 'MA',
    DestinationCountry: 'United States',
    SponsorCompany: 'Gilead Sciences, Inc.',
    TripPurpose: 'Advisory board — Chicago',
  },
}

export function enrichVendorCanonical(
  row: Record<string, string>,
  sourceKey: 'vendor_med_ed' | 'tmc'
): Record<string, string> {
  const out = { ...row }
  out.third_party_payment_recipient_indicator = 'Y'
  out.third_party_equals_covered_recipient_indicator = out.third_party_equals_covered_recipient_indicator || 'N'

  const travel = (out.nature_of_payment_or_transfer_of_value || '').toLowerCase()
  if (travel.includes('air') || travel.includes('hotel') || travel.includes('fare')) {
    out.nature_of_payment_or_transfer_of_value = 'Travel and Lodging'
  } else if (!out.nature_of_payment_or_transfer_of_value) {
    out.nature_of_payment_or_transfer_of_value = 'Speaker Program'
  }

  if (!out.form_of_payment_or_transfer_of_value) {
    out.form_of_payment_or_transfer_of_value = 'Cash or cash equivalent'
  }
  out.covered_recipient_type = out.covered_recipient_type || 'Covered Recipient Physician'

  if (sourceKey === 'tmc' && !out.record_id) {
    out.record_id = `TMC_${out.external_transaction_id || Date.now()}`
  }
  if (out.date_of_payment) {
    out.program_year = out.date_of_payment.slice(0, 4)
  }
  return out
}
