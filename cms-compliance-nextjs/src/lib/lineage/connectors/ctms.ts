import type { ConnectorDefinition } from './types'

/** CTMS — clinical trial site payments → CMS Research PUF. */
export const CTMS_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'ctms',
  displayName: 'Clinical Trial Management System',
  category: 'clinical',
  mappingVersion: 'ctms-mapper-1.0',
  description:
    'Maps CTMS site/PI payments with protocol and NCT linkage to CMS research payment fields.',
  fieldMappings: [
    { sourceField: 'PaymentId', canonicalField: 'record_id', required: true },
    { sourceField: 'ProtocolNumber', canonicalField: 'name_of_study', required: true },
    { sourceField: 'NCTId', canonicalField: 'clinicaltrials_gov_identifier', required: true },
    { sourceField: 'PaymentDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'PaymentAmount', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'Currency', canonicalField: 'payment_currency' },
    { sourceField: 'PaymentCategory', canonicalField: 'expenditure_category1' },
    { sourceField: 'PIFirstName', canonicalField: 'covered_recipient_first_name', required: true },
    { sourceField: 'PILastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'PINPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'PISpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'SiteCity', canonicalField: 'recipient_city' },
    { sourceField: 'SiteState', canonicalField: 'recipient_state' },
    { sourceField: 'SiteCountry', canonicalField: 'recipient_country' },
    { sourceField: 'SponsorName', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'PreclinicalFlag', canonicalField: 'preclinical_research_indicator' },
    { sourceField: 'ResearchContext', canonicalField: 'context_of_research' },
  ],
  sampleUpstreamPayload: {
    PaymentId: 'CTMS-PAY-2025-441',
    ProtocolNumber: 'KNF-ONC-2024-01',
    NCTId: 'NCT01234567',
    PaymentDate: '2025-06-15',
    PaymentAmount: '12500',
    Currency: 'USD',
    PaymentCategory: 'Clinical Study Costs',
    PIFirstName: 'Maria',
    PILastName: 'Chen',
    PINPI: '1122334455',
    PISpecialty: 'Oncology',
    SiteCity: 'Houston',
    SiteState: 'TX',
    SiteCountry: 'United States',
    SponsorName: 'KNF Demo Manufacturer',
    PreclinicalFlag: 'N',
    ResearchContext: 'Site initiation visit — oncology phase III',
  },
}

export function enrichCtmsCanonical(row: Record<string, string>): Record<string, string> {
  const out = { ...row }
  out.nature_of_payment_or_transfer_of_value = out.nature_of_payment_or_transfer_of_value || 'Research'
  out.form_of_payment_or_transfer_of_value = out.form_of_payment_or_transfer_of_value || 'Cash or cash equivalent'
  out.covered_recipient_type = out.covered_recipient_type || 'Covered Recipient Physician'
  out.change_type = out.change_type || 'N'
  if (out.date_of_payment) out.program_year = out.date_of_payment.slice(0, 4)
  if (!out.record_id) out.record_id = `CTMS_${Date.now()}`
  return out
}
