import type { ConnectorDefinition } from './types'

/** Greenphire — clinical trial participant/site payments → CMS Research PUF. */
export const GREENPHIRE_CONNECTOR: ConnectorDefinition = {
  sourceKey: 'greenphire',
  displayName: 'Greenphire Clinical Payments',
  category: 'clinical',
  mappingVersion: 'greenphire-mapper-1.0',
  description:
    'Maps Greenphire clinical payment records with study and PI attribution to CMS research payment fields.',
  fieldMappings: [
    { sourceField: 'TransactionID', canonicalField: 'record_id', required: true },
    { sourceField: 'StudyName', canonicalField: 'name_of_study', required: true },
    { sourceField: 'ClinicalTrialsGovID', canonicalField: 'clinicaltrials_gov_identifier' },
    { sourceField: 'PaymentDate', canonicalField: 'date_of_payment', required: true },
    { sourceField: 'Amount', canonicalField: 'total_amount_of_payment_usdollars', required: true },
    { sourceField: 'CurrencyCode', canonicalField: 'payment_currency' },
    { sourceField: 'ExpenseType', canonicalField: 'expenditure_category1' },
    { sourceField: 'InvestigatorFirstName', canonicalField: 'covered_recipient_first_name' },
    { sourceField: 'InvestigatorLastName', canonicalField: 'covered_recipient_last_name', required: true },
    { sourceField: 'InvestigatorNPI', canonicalField: 'covered_recipient_npi' },
    { sourceField: 'InvestigatorSpecialty', canonicalField: 'covered_recipient_specialty_1' },
    { sourceField: 'SiteName', canonicalField: 'noncovered_recipient_entity_name' },
    { sourceField: 'SiteCity', canonicalField: 'recipient_city' },
    { sourceField: 'SiteState', canonicalField: 'recipient_state' },
    { sourceField: 'Sponsor', canonicalField: 'applicable_manufacturer_or_applicable_gpo_making_payment_name' },
    { sourceField: 'StudyURL', canonicalField: 'research_information_link' },
  ],
  sampleUpstreamPayload: {
    TransactionID: 'GP-2025-7781',
    StudyName: 'Cardio outcomes study KNF-2024',
    ClinicalTrialsGovID: 'NCT09876543',
    PaymentDate: '2025-04-22',
    Amount: '8400',
    CurrencyCode: 'USD',
    ExpenseType: 'Site monitoring',
    InvestigatorFirstName: 'Robert',
    InvestigatorLastName: 'Nguyen',
    InvestigatorNPI: '9988776655',
    InvestigatorSpecialty: 'Cardiology',
    SiteName: 'Metro Cardiology Research Center',
    SiteCity: 'Chicago',
    SiteState: 'IL',
    Sponsor: 'KNF Demo Manufacturer',
    StudyURL: 'https://clinicaltrials.gov/study/NCT09876543',
  },
}

export function enrichGreenphireCanonical(row: Record<string, string>): Record<string, string> {
  const out = { ...row }
  out.nature_of_payment_or_transfer_of_value = out.nature_of_payment_or_transfer_of_value || 'Research'
  out.form_of_payment_or_transfer_of_value = out.form_of_payment_or_transfer_of_value || 'Cash or cash equivalent'
  out.covered_recipient_type = out.covered_recipient_type || 'Covered Recipient Physician'
  out.change_type = out.change_type || 'N'
  if (out.date_of_payment) out.program_year = out.date_of_payment.slice(0, 4)
  if (!out.record_id) out.record_id = `GP_${out.external_transaction_id || Date.now()}`
  return out
}
