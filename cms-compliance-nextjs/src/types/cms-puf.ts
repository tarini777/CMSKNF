/** CMS Open Payments PUF field shapes — Jan 2025 data dictionary (PY 2016+). */

export type CmsFileType = 'general' | 'research' | 'ownership'

/** All 91 General Payment PUF attributes (PY 2016+, live CMS API schema). */
export interface CmsGeneralPufFields {
  change_type?: string
  covered_recipient_type?: string
  teaching_hospital_ccn?: string
  teaching_hospital_id?: string
  teaching_hospital_name?: string
  covered_recipient_profile_id?: string
  covered_recipient_npi?: string
  covered_recipient_first_name?: string
  covered_recipient_middle_name?: string
  covered_recipient_last_name?: string
  covered_recipient_name_suffix?: string
  recipient_primary_business_street_address_line1?: string
  recipient_primary_business_street_address_line2?: string
  recipient_city?: string
  recipient_state?: string
  recipient_zip_code?: string
  recipient_country?: string
  recipient_province?: string
  recipient_postal_code?: string
  covered_recipient_primary_type_1?: string
  covered_recipient_primary_type_2?: string
  covered_recipient_primary_type_3?: string
  covered_recipient_primary_type_4?: string
  covered_recipient_primary_type_5?: string
  covered_recipient_primary_type_6?: string
  covered_recipient_specialty_1?: string
  covered_recipient_specialty_2?: string
  covered_recipient_specialty_3?: string
  covered_recipient_specialty_4?: string
  covered_recipient_specialty_5?: string
  covered_recipient_specialty_6?: string
  covered_recipient_license_state_code1?: string
  covered_recipient_license_state_code2?: string
  covered_recipient_license_state_code3?: string
  covered_recipient_license_state_code4?: string
  covered_recipient_license_state_code5?: string
  submitting_applicable_manufacturer_or_applicable_gpo_name?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_id?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_name?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_state?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_country?: string
  total_amount_of_payment_usdollars?: number | string
  date_of_payment?: string
  number_of_payments_included_in_total_amount?: number | string
  form_of_payment_or_transfer_of_value?: string
  nature_of_payment_or_transfer_of_value?: string
  city_of_travel?: string
  state_of_travel?: string
  country_of_travel?: string
  physician_ownership_indicator?: string
  third_party_payment_recipient_indicator?: string
  name_of_third_party_entity_receiving_payment_or_transfer_of_ccfc?: string
  charity_indicator?: string
  third_party_equals_covered_recipient_indicator?: string
  contextual_information?: string
  delay_in_publication_indicator?: string
  dispute_status_for_publication?: string
  related_product_indicator?: string
  covered_or_noncovered_indicator_1?: string
  covered_or_noncovered_indicator_2?: string
  covered_or_noncovered_indicator_3?: string
  covered_or_noncovered_indicator_4?: string
  covered_or_noncovered_indicator_5?: string
  indicate_drug_or_biological_or_device_or_medical_supply_1?: string
  indicate_drug_or_biological_or_device_or_medical_supply_2?: string
  indicate_drug_or_biological_or_device_or_medical_supply_3?: string
  indicate_drug_or_biological_or_device_or_medical_supply_4?: string
  indicate_drug_or_biological_or_device_or_medical_supply_5?: string
  product_category_or_therapeutic_area_1?: string
  product_category_or_therapeutic_area_2?: string
  product_category_or_therapeutic_area_3?: string
  product_category_or_therapeutic_area_4?: string
  product_category_or_therapeutic_area_5?: string
  name_of_drug_or_biological_or_device_or_medical_supply_1?: string
  name_of_drug_or_biological_or_device_or_medical_supply_2?: string
  name_of_drug_or_biological_or_device_or_medical_supply_3?: string
  name_of_drug_or_biological_or_device_or_medical_supply_4?: string
  name_of_drug_or_biological_or_device_or_medical_supply_5?: string
  associated_drug_or_biological_ndc_1?: string
  associated_drug_or_biological_ndc_2?: string
  associated_drug_or_biological_ndc_3?: string
  associated_drug_or_biological_ndc_4?: string
  associated_drug_or_biological_ndc_5?: string
  associated_device_or_medical_supply_pdi_1?: string
  associated_device_or_medical_supply_pdi_2?: string
  associated_device_or_medical_supply_pdi_3?: string
  associated_device_or_medical_supply_pdi_4?: string
  associated_device_or_medical_supply_pdi_5?: string
  record_id?: string
  program_year?: string
  payment_publication_date?: string
}

/** Research PUF — core + extended (252 fields stored in pufFields JSON). */
export interface CmsResearchPufFields extends Partial<CmsGeneralPufFields> {
  clinicaltrials_gov_identifier?: string
  name_of_study?: string
  context_of_research?: string
  preclinical_research_indicator?: string
  research_information_link?: string
  noncovered_recipient_entity_name?: string
  expenditure_category1?: string
  expenditure_category2?: string
  expenditure_category3?: string
  expenditure_category4?: string
  expenditure_category5?: string
  expenditure_category6?: string
  [key: string]: string | number | undefined
}

/** Ownership PUF — Jan 2025 dictionary (all program years). */
export interface CmsOwnershipPufFields {
  change_type?: string
  physician_profile_id?: string
  physician_npi?: string
  physician_first_name?: string
  physician_middle_name?: string
  physician_last_name?: string
  physician_name_suffix?: string
  recipient_primary_business_street_address_line1?: string
  recipient_primary_business_street_address_line2?: string
  recipient_city?: string
  recipient_state?: string
  recipient_zip_code?: string
  recipient_country?: string
  recipient_province?: string
  recipient_postal_code?: string
  physician_primary_type?: string
  physician_specialty?: string
  record_id?: string
  program_year?: string
  total_amount_invested_usdollars?: number | string
  value_of_interest?: number | string
  terms_of_interest?: string
  submitting_applicable_manufacturer_or_applicable_gpo_name?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_id?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_name?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_state?: string
  applicable_manufacturer_or_applicable_gpo_making_payment_country?: string
  dispute_status_for_publication?: string
  interest_held_by_physician_or_an_immediate_family_member?: string
  payment_publication_date?: string
}

/** CMS CSV export header order for general payments (91 columns). */
export const CMS_GENERAL_PUF_HEADERS: (keyof CmsGeneralPufFields)[] = [
  'change_type',
  'covered_recipient_type',
  'teaching_hospital_ccn',
  'teaching_hospital_id',
  'teaching_hospital_name',
  'covered_recipient_profile_id',
  'covered_recipient_npi',
  'covered_recipient_first_name',
  'covered_recipient_middle_name',
  'covered_recipient_last_name',
  'covered_recipient_name_suffix',
  'recipient_primary_business_street_address_line1',
  'recipient_primary_business_street_address_line2',
  'recipient_city',
  'recipient_state',
  'recipient_zip_code',
  'recipient_country',
  'recipient_province',
  'recipient_postal_code',
  'covered_recipient_primary_type_1',
  'covered_recipient_primary_type_2',
  'covered_recipient_primary_type_3',
  'covered_recipient_primary_type_4',
  'covered_recipient_primary_type_5',
  'covered_recipient_primary_type_6',
  'covered_recipient_specialty_1',
  'covered_recipient_specialty_2',
  'covered_recipient_specialty_3',
  'covered_recipient_specialty_4',
  'covered_recipient_specialty_5',
  'covered_recipient_specialty_6',
  'covered_recipient_license_state_code1',
  'covered_recipient_license_state_code2',
  'covered_recipient_license_state_code3',
  'covered_recipient_license_state_code4',
  'covered_recipient_license_state_code5',
  'submitting_applicable_manufacturer_or_applicable_gpo_name',
  'applicable_manufacturer_or_applicable_gpo_making_payment_id',
  'applicable_manufacturer_or_applicable_gpo_making_payment_name',
  'applicable_manufacturer_or_applicable_gpo_making_payment_state',
  'applicable_manufacturer_or_applicable_gpo_making_payment_country',
  'total_amount_of_payment_usdollars',
  'date_of_payment',
  'number_of_payments_included_in_total_amount',
  'form_of_payment_or_transfer_of_value',
  'nature_of_payment_or_transfer_of_value',
  'city_of_travel',
  'state_of_travel',
  'country_of_travel',
  'physician_ownership_indicator',
  'third_party_payment_recipient_indicator',
  'name_of_third_party_entity_receiving_payment_or_transfer_of_ccfc',
  'charity_indicator',
  'third_party_equals_covered_recipient_indicator',
  'contextual_information',
  'delay_in_publication_indicator',
  'dispute_status_for_publication',
  'related_product_indicator',
  'covered_or_noncovered_indicator_1',
  'covered_or_noncovered_indicator_2',
  'covered_or_noncovered_indicator_3',
  'covered_or_noncovered_indicator_4',
  'covered_or_noncovered_indicator_5',
  'indicate_drug_or_biological_or_device_or_medical_supply_1',
  'indicate_drug_or_biological_or_device_or_medical_supply_2',
  'indicate_drug_or_biological_or_device_or_medical_supply_3',
  'indicate_drug_or_biological_or_device_or_medical_supply_4',
  'indicate_drug_or_biological_or_device_or_medical_supply_5',
  'product_category_or_therapeutic_area_1',
  'product_category_or_therapeutic_area_2',
  'product_category_or_therapeutic_area_3',
  'product_category_or_therapeutic_area_4',
  'product_category_or_therapeutic_area_5',
  'name_of_drug_or_biological_or_device_or_medical_supply_1',
  'name_of_drug_or_biological_or_device_or_medical_supply_2',
  'name_of_drug_or_biological_or_device_or_medical_supply_3',
  'name_of_drug_or_biological_or_device_or_medical_supply_4',
  'name_of_drug_or_biological_or_device_or_medical_supply_5',
  'associated_drug_or_biological_ndc_1',
  'associated_drug_or_biological_ndc_2',
  'associated_drug_or_biological_ndc_3',
  'associated_drug_or_biological_ndc_4',
  'associated_drug_or_biological_ndc_5',
  'associated_device_or_medical_supply_pdi_1',
  'associated_device_or_medical_supply_pdi_2',
  'associated_device_or_medical_supply_pdi_3',
  'associated_device_or_medical_supply_pdi_4',
  'associated_device_or_medical_supply_pdi_5',
  'record_id',
  'program_year',
  'payment_publication_date',
]

/** Core research PUF fields required per Jan 2025 Appendix D (subset for validation). */
export const CMS_RESEARCH_PUF_REQUIRED_FIELDS: (keyof CmsResearchPufFields)[] = [
  'record_id',
  'program_year',
  'total_amount_of_payment_usdollars',
  'name_of_study',
  'clinicaltrials_gov_identifier',
  'covered_recipient_npi',
  'covered_recipient_first_name',
  'covered_recipient_last_name',
  'applicable_manufacturer_or_applicable_gpo_making_payment_name',
  'nature_of_payment_or_transfer_of_value',
]

export const CMS_OWNERSHIP_PUF_HEADERS: (keyof CmsOwnershipPufFields)[] = [
  'change_type',
  'physician_profile_id',
  'physician_npi',
  'physician_first_name',
  'physician_middle_name',
  'physician_last_name',
  'physician_name_suffix',
  'recipient_primary_business_street_address_line1',
  'recipient_primary_business_street_address_line2',
  'recipient_city',
  'recipient_state',
  'recipient_zip_code',
  'recipient_country',
  'recipient_province',
  'recipient_postal_code',
  'physician_primary_type',
  'physician_specialty',
  'record_id',
  'program_year',
  'total_amount_invested_usdollars',
  'value_of_interest',
  'terms_of_interest',
  'submitting_applicable_manufacturer_or_applicable_gpo_name',
  'applicable_manufacturer_or_applicable_gpo_making_payment_id',
  'applicable_manufacturer_or_applicable_gpo_making_payment_name',
  'applicable_manufacturer_or_applicable_gpo_making_payment_state',
  'applicable_manufacturer_or_applicable_gpo_making_payment_country',
  'dispute_status_for_publication',
  'interest_held_by_physician_or_an_immediate_family_member',
  'payment_publication_date',
]
