import type { DashboardTab } from '@/config/personas'

/** Top rules shown in the fixed right pane per work surface (max 5, no scroll). */
export const TAB_RULE_FOCUS: Partial<Record<DashboardTab, string[]>> = {
  dashboard: ['rule_amount_threshold_10', 'rule_annual_aggregate_threshold_100', 'rule_support_act_covered_recipient'],
  review: ['rule_amount_threshold_10', 'rule_consulting_payment', 'rule_foreign_recipient_reportable', 'rule_indirect_payment_reportable'],
  transparency: ['rule_annual_aggregate_threshold_100', 'rule_ownership_investment_reportable', 'intl_fr_loi_bertrand_10_eur'],
  glossary: ['rule_discount_rebate_exempt', 'rule_sample_patient_use_exempt', 'rule_patient_education_exempt'],
  upload: ['rule_amount_threshold_10', 'rule_discount_rebate_exempt', 'rule_sample_patient_use_exempt'],
  lineage: ['rule_indirect_payment_reportable', 'rule_third_party_name_required', 'rule_foreign_recipient_enhanced_review'],
  rules: ['rule_support_act_covered_recipient', 'rule_ownership_investment_reportable'],
  analytics: ['rule_amount_threshold_10', 'rule_annual_aggregate_threshold_100'],
  'open-payments': ['rule_physician_recipient', 'rule_teaching_hospital_recipient', 'rule_amount_threshold_10'],
  'data-analysis': ['rule_foreign_recipient_reportable', 'rule_travel_outside_us_reportable'],
  monitoring: ['rule_manufacturer_foreign_country_info'],
  audit: ['rule_efpia_consent_individual', 'rule_rd_aggregate_only'],
  connectivity: ['intl_fr_loi_bertrand_10_eur', 'intl_gb_abpi_disclosure', 'rule_efpia_consent_individual'],
}

export const TAB_RULE_CONTEXT: Partial<Record<DashboardTab, string>> = {
  dashboard: 'US $10 / $100 aggregate baseline',
  review: 'Per-record reportability + human sign-off',
  transparency: 'CMS submission calendar & attestation',
  glossary: 'CMS Open Payments definitions',
  upload: 'Ingest exemptions before review queue',
  lineage: 'Indirect pay + cross-source dedup',
  rules: 'Company policy overlays',
  analytics: 'Threshold and trend monitoring',
  'open-payments': 'Covered recipient attribution',
  'data-analysis': 'Geographic & pattern flags',
  monitoring: 'Integration health (informational)',
  audit: 'EFPIA consent + R&D aggregate',
  connectivity: 'Multi-jurisdiction regimes',
}

export function ruleIdsForTab(tab: DashboardTab): string[] {
  return TAB_RULE_FOCUS[tab] ?? TAB_RULE_FOCUS.dashboard ?? []
}
