import type {
  CmsGeneralPufFields,
  CmsOwnershipPufFields,
  CmsResearchPufFields,
} from '@/types/cms-puf'
import type { CMSRecord } from '@/types/cms'
import type { TransparencyAnalysis } from '@/lib/transparency-rules-engine'

function pick(raw: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const direct = raw[key]
    if (direct) return direct
    const lower = raw[key.toLowerCase()]
    if (lower) return lower
  }
  return ''
}

function toSnakeHeader(header: string): string {
  return header
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase()
}

/** Normalize CSV/upload keys to a lowercase snake lookup map. */
export function normalizeRawRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw)) {
    out[toSnakeHeader(key)] = value
  }
  return out
}

export function mapRawToGeneralPuf(raw: Record<string, string>): CmsGeneralPufFields {
  const r = normalizeRawRow(raw)
  const amount =
    parseFloat(pick(r, 'total_amount_of_payment_usdollars', 'total_amount_of_payment_usd')) || 0

  return {
    change_type: pick(r, 'change_type') || 'N',
    covered_recipient_type: pick(r, 'covered_recipient_type', 'covered_recipient_type'),
    teaching_hospital_ccn: pick(r, 'teaching_hospital_ccn'),
    teaching_hospital_id: pick(r, 'teaching_hospital_id'),
    teaching_hospital_name: pick(r, 'teaching_hospital_name'),
    covered_recipient_profile_id: pick(
      r,
      'covered_recipient_profile_id',
      'physician_profile_id',
      'covered_recipient_physician_profile_id'
    ),
    covered_recipient_npi: pick(r, 'covered_recipient_npi', 'physician_npi'),
    covered_recipient_first_name: pick(r, 'covered_recipient_first_name', 'physician_first_name'),
    covered_recipient_middle_name: pick(r, 'covered_recipient_middle_name', 'physician_middle_name'),
    covered_recipient_last_name: pick(r, 'covered_recipient_last_name', 'physician_last_name'),
    covered_recipient_name_suffix: pick(r, 'covered_recipient_name_suffix', 'physician_name_suffix'),
    recipient_primary_business_street_address_line1: pick(
      r,
      'recipient_primary_business_street_address_line1'
    ),
    recipient_primary_business_street_address_line2: pick(
      r,
      'recipient_primary_business_street_address_line2'
    ),
    recipient_city: pick(r, 'recipient_city'),
    recipient_state: pick(r, 'recipient_state'),
    recipient_zip_code: pick(r, 'recipient_zip_code'),
    recipient_country: pick(r, 'recipient_country'),
    recipient_province: pick(r, 'recipient_province'),
    recipient_postal_code: pick(r, 'recipient_postal_code'),
    covered_recipient_primary_type_1: pick(
      r,
      'covered_recipient_primary_type_1',
      'physician_primary_type'
    ),
    covered_recipient_primary_type_2: pick(r, 'covered_recipient_primary_type_2'),
    covered_recipient_primary_type_3: pick(r, 'covered_recipient_primary_type_3'),
    covered_recipient_primary_type_4: pick(r, 'covered_recipient_primary_type_4'),
    covered_recipient_primary_type_5: pick(r, 'covered_recipient_primary_type_5'),
    covered_recipient_primary_type_6: pick(r, 'covered_recipient_primary_type_6'),
    covered_recipient_specialty_1: pick(r, 'covered_recipient_specialty_1', 'physician_specialty'),
    covered_recipient_specialty_2: pick(r, 'covered_recipient_specialty_2'),
    covered_recipient_specialty_3: pick(r, 'covered_recipient_specialty_3'),
    covered_recipient_specialty_4: pick(r, 'covered_recipient_specialty_4'),
    covered_recipient_specialty_5: pick(r, 'covered_recipient_specialty_5'),
    covered_recipient_specialty_6: pick(r, 'covered_recipient_specialty_6'),
    covered_recipient_license_state_code1: pick(
      r,
      'covered_recipient_license_state_code1',
      'physician_license_state_code1'
    ),
    covered_recipient_license_state_code2: pick(
      r,
      'covered_recipient_license_state_code2',
      'physician_license_state_code2'
    ),
    covered_recipient_license_state_code3: pick(
      r,
      'covered_recipient_license_state_code3',
      'physician_license_state_code3'
    ),
    covered_recipient_license_state_code4: pick(
      r,
      'covered_recipient_license_state_code4',
      'physician_license_state_code4'
    ),
    covered_recipient_license_state_code5: pick(
      r,
      'covered_recipient_license_state_code5',
      'physician_license_state_code5'
    ),
    submitting_applicable_manufacturer_or_applicable_gpo_name: pick(
      r,
      'submitting_applicable_manufacturer_or_applicable_gpo_name'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_id: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_id'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_name: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_name'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_state: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_state'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_country: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_country'
    ),
    total_amount_of_payment_usdollars: amount,
    date_of_payment: pick(r, 'date_of_payment', 'payment_date'),
    number_of_payments_included_in_total_amount: pick(r, 'number_of_payments_included_in_total_amount') || '1',
    form_of_payment_or_transfer_of_value: pick(r, 'form_of_payment_or_transfer_of_value'),
    nature_of_payment_or_transfer_of_value: pick(r, 'nature_of_payment_or_transfer_of_value'),
    city_of_travel: pick(r, 'city_of_travel'),
    state_of_travel: pick(r, 'state_of_travel'),
    country_of_travel: pick(r, 'country_of_travel'),
    physician_ownership_indicator: pick(r, 'physician_ownership_indicator'),
    third_party_payment_recipient_indicator: pick(r, 'third_party_payment_recipient_indicator'),
    name_of_third_party_entity_receiving_payment_or_transfer_of_ccfc: pick(
      r,
      'name_of_third_party_entity_receiving_payment_or_transfer_of_ccfc',
      'name_of_third_party_entity_receiving_payment_or_transfer_of_value'
    ),
    charity_indicator: pick(r, 'charity_indicator'),
    third_party_equals_covered_recipient_indicator: pick(
      r,
      'third_party_equals_covered_recipient_indicator'
    ),
    contextual_information: pick(r, 'contextual_information'),
    delay_in_publication_indicator: pick(r, 'delay_in_publication_indicator'),
    dispute_status_for_publication: pick(r, 'dispute_status_for_publication') || 'No',
    related_product_indicator: pick(r, 'related_product_indicator', 'product_indicator'),
    covered_or_noncovered_indicator_1: pick(r, 'covered_or_noncovered_indicator_1'),
    covered_or_noncovered_indicator_2: pick(r, 'covered_or_noncovered_indicator_2'),
    covered_or_noncovered_indicator_3: pick(r, 'covered_or_noncovered_indicator_3'),
    covered_or_noncovered_indicator_4: pick(r, 'covered_or_noncovered_indicator_4'),
    covered_or_noncovered_indicator_5: pick(r, 'covered_or_noncovered_indicator_5'),
    indicate_drug_or_biological_or_device_or_medical_supply_1: pick(
      r,
      'indicate_drug_or_biological_or_device_or_medical_supply_1'
    ),
    indicate_drug_or_biological_or_device_or_medical_supply_2: pick(
      r,
      'indicate_drug_or_biological_or_device_or_medical_supply_2'
    ),
    indicate_drug_or_biological_or_device_or_medical_supply_3: pick(
      r,
      'indicate_drug_or_biological_or_device_or_medical_supply_3'
    ),
    indicate_drug_or_biological_or_device_or_medical_supply_4: pick(
      r,
      'indicate_drug_or_biological_or_device_or_medical_supply_4'
    ),
    indicate_drug_or_biological_or_device_or_medical_supply_5: pick(
      r,
      'indicate_drug_or_biological_or_device_or_medical_supply_5'
    ),
    product_category_or_therapeutic_area_1: pick(r, 'product_category_or_therapeutic_area_1'),
    product_category_or_therapeutic_area_2: pick(r, 'product_category_or_therapeutic_area_2'),
    product_category_or_therapeutic_area_3: pick(r, 'product_category_or_therapeutic_area_3'),
    product_category_or_therapeutic_area_4: pick(r, 'product_category_or_therapeutic_area_4'),
    product_category_or_therapeutic_area_5: pick(r, 'product_category_or_therapeutic_area_5'),
    name_of_drug_or_biological_or_device_or_medical_supply_1: pick(
      r,
      'name_of_drug_or_biological_or_device_or_medical_supply_1',
      'name_of_associated_covered_drug_or_biological1'
    ),
    name_of_drug_or_biological_or_device_or_medical_supply_2: pick(
      r,
      'name_of_drug_or_biological_or_device_or_medical_supply_2',
      'name_of_associated_covered_drug_or_biological2'
    ),
    name_of_drug_or_biological_or_device_or_medical_supply_3: pick(
      r,
      'name_of_drug_or_biological_or_device_or_medical_supply_3',
      'name_of_associated_covered_drug_or_biological3'
    ),
    name_of_drug_or_biological_or_device_or_medical_supply_4: pick(
      r,
      'name_of_drug_or_biological_or_device_or_medical_supply_4',
      'name_of_associated_covered_drug_or_biological4'
    ),
    name_of_drug_or_biological_or_device_or_medical_supply_5: pick(
      r,
      'name_of_drug_or_biological_or_device_or_medical_supply_5',
      'name_of_associated_covered_drug_or_biological5'
    ),
    associated_drug_or_biological_ndc_1: pick(
      r,
      'associated_drug_or_biological_ndc_1',
      'ndc_of_associated_covered_drug_or_biological1'
    ),
    associated_drug_or_biological_ndc_2: pick(
      r,
      'associated_drug_or_biological_ndc_2',
      'ndc_of_associated_covered_drug_or_biological2'
    ),
    associated_drug_or_biological_ndc_3: pick(
      r,
      'associated_drug_or_biological_ndc_3',
      'ndc_of_associated_covered_drug_or_biological3'
    ),
    associated_drug_or_biological_ndc_4: pick(
      r,
      'associated_drug_or_biological_ndc_4',
      'ndc_of_associated_covered_drug_or_biological4'
    ),
    associated_drug_or_biological_ndc_5: pick(
      r,
      'associated_drug_or_biological_ndc_5',
      'ndc_of_associated_covered_drug_or_biological5'
    ),
    associated_device_or_medical_supply_pdi_1: pick(
      r,
      'associated_device_or_medical_supply_pdi_1',
      'name_of_associated_covered_device_or_medical_supply1'
    ),
    associated_device_or_medical_supply_pdi_2: pick(r, 'associated_device_or_medical_supply_pdi_2'),
    associated_device_or_medical_supply_pdi_3: pick(r, 'associated_device_or_medical_supply_pdi_3'),
    associated_device_or_medical_supply_pdi_4: pick(r, 'associated_device_or_medical_supply_pdi_4'),
    associated_device_or_medical_supply_pdi_5: pick(r, 'associated_device_or_medical_supply_pdi_5'),
    record_id: pick(r, 'record_id') || `GEN_${Date.now()}`,
    program_year:
      pick(r, 'program_year') ||
      (pick(r, 'date_of_payment') ? pick(r, 'date_of_payment').slice(0, 4) : String(new Date().getFullYear())),
    payment_publication_date: pick(r, 'payment_publication_date'),
  }
}

export function mapRawToResearchPuf(raw: Record<string, string>): CmsResearchPufFields {
  const general = mapRawToGeneralPuf(raw)
  const r = normalizeRawRow(raw)
  return {
    ...general,
    ...Object.fromEntries(Object.entries(r).filter(([k]) => k.startsWith('principal_investigator'))),
    clinicaltrials_gov_identifier: pick(r, 'clinicaltrials_gov_identifier', 'clinicaltrials_gov_id'),
    name_of_study: pick(r, 'name_of_study'),
    context_of_research: pick(r, 'context_of_research', 'contextual_information'),
    preclinical_research_indicator: pick(r, 'preclinical_research_indicator'),
    research_information_link: pick(r, 'research_information_link'),
    noncovered_recipient_entity_name: pick(r, 'noncovered_recipient_entity_name'),
    expenditure_category1: pick(r, 'expenditure_category1'),
    expenditure_category2: pick(r, 'expenditure_category2'),
    expenditure_category3: pick(r, 'expenditure_category3'),
    expenditure_category4: pick(r, 'expenditure_category4'),
    expenditure_category5: pick(r, 'expenditure_category5'),
    expenditure_category6: pick(r, 'expenditure_category6'),
  }
}

export function mapRawToOwnershipPuf(raw: Record<string, string>): CmsOwnershipPufFields {
  const r = normalizeRawRow(raw)
  const invested =
    parseFloat(pick(r, 'total_amount_invested_usdollars', 'total_amount_of_payment_usdollars')) || 0
  const value = parseFloat(pick(r, 'value_of_interest')) || 0

  return {
    change_type: pick(r, 'change_type') || 'N',
    physician_profile_id: pick(r, 'physician_profile_id', 'covered_recipient_profile_id'),
    physician_npi: pick(r, 'physician_npi', 'covered_recipient_npi'),
    physician_first_name: pick(r, 'physician_first_name', 'covered_recipient_first_name'),
    physician_middle_name: pick(r, 'physician_middle_name', 'covered_recipient_middle_name'),
    physician_last_name: pick(r, 'physician_last_name', 'covered_recipient_last_name'),
    physician_name_suffix: pick(r, 'physician_name_suffix', 'covered_recipient_name_suffix'),
    recipient_primary_business_street_address_line1: pick(
      r,
      'recipient_primary_business_street_address_line1'
    ),
    recipient_primary_business_street_address_line2: pick(
      r,
      'recipient_primary_business_street_address_line2'
    ),
    recipient_city: pick(r, 'recipient_city'),
    recipient_state: pick(r, 'recipient_state'),
    recipient_zip_code: pick(r, 'recipient_zip_code'),
    recipient_country: pick(r, 'recipient_country'),
    recipient_province: pick(r, 'recipient_province'),
    recipient_postal_code: pick(r, 'recipient_postal_code'),
    physician_primary_type: pick(r, 'physician_primary_type', 'covered_recipient_primary_type_1'),
    physician_specialty: pick(r, 'physician_specialty', 'covered_recipient_specialty_1'),
    record_id: pick(r, 'record_id') || `OWN_${Date.now()}`,
    program_year: pick(r, 'program_year') || String(new Date().getFullYear()),
    total_amount_invested_usdollars: invested,
    value_of_interest: value,
    terms_of_interest: pick(r, 'terms_of_interest'),
    submitting_applicable_manufacturer_or_applicable_gpo_name: pick(
      r,
      'submitting_applicable_manufacturer_or_applicable_gpo_name'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_id: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_id'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_name: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_name'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_state: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_state'
    ),
    applicable_manufacturer_or_applicable_gpo_making_payment_country: pick(
      r,
      'applicable_manufacturer_or_applicable_gpo_making_payment_country'
    ),
    dispute_status_for_publication: pick(r, 'dispute_status_for_publication') || 'No',
    interest_held_by_physician_or_an_immediate_family_member: pick(
      r,
      'interest_held_by_physician_or_an_immediate_family_member'
    ),
    payment_publication_date: pick(r, 'payment_publication_date'),
  }
}

export function mapCmsRecordToGeneralPuf(record: CMSRecord): CmsGeneralPufFields {
  return {
    change_type: 'N',
    covered_recipient_type: record.coveredRecipientType,
    teaching_hospital_id: record.teachingHospitalId || undefined,
    teaching_hospital_name: record.teachingHospitalName || undefined,
    covered_recipient_profile_id: record.physicianProfileId || record.coveredRecipientId,
    covered_recipient_first_name: record.physicianFirstName || undefined,
    covered_recipient_middle_name: record.physicianMiddleName || undefined,
    covered_recipient_last_name: record.physicianLastName || undefined,
    covered_recipient_name_suffix: record.physicianNameSuffix || undefined,
    recipient_primary_business_street_address_line1:
      record.recipientPrimaryBusinessStreetAddressLine1 || undefined,
    recipient_primary_business_street_address_line2:
      record.recipientPrimaryBusinessStreetAddressLine2 || undefined,
    recipient_city: record.recipientCity || undefined,
    recipient_state: record.recipientState || undefined,
    recipient_zip_code: record.recipientZipCode || undefined,
    recipient_country: record.recipientCountry || undefined,
    recipient_province: record.recipientProvince || undefined,
    recipient_postal_code: record.recipientPostalCode || undefined,
    covered_recipient_primary_type_1: record.physicianPrimaryType || undefined,
    covered_recipient_specialty_1: record.physicianSpecialty || undefined,
    covered_recipient_license_state_code1: record.physicianLicenseStateCode1 || undefined,
    covered_recipient_license_state_code2: record.physicianLicenseStateCode2 || undefined,
    covered_recipient_license_state_code3: record.physicianLicenseStateCode3 || undefined,
    covered_recipient_license_state_code4: record.physicianLicenseStateCode4 || undefined,
    covered_recipient_license_state_code5: record.physicianLicenseStateCode5 || undefined,
    submitting_applicable_manufacturer_or_applicable_gpo_name:
      record.submittingApplicableManufacturerOrApplicableGpoName || undefined,
    applicable_manufacturer_or_applicable_gpo_making_payment_id:
      record.applicableManufacturerOrApplicableGpoMakingPaymentId || undefined,
    applicable_manufacturer_or_applicable_gpo_making_payment_name:
      record.applicableManufacturerOrApplicableGpoMakingPaymentName || undefined,
    applicable_manufacturer_or_applicable_gpo_making_payment_state:
      record.applicableManufacturerOrApplicableGpoMakingPaymentState || undefined,
    applicable_manufacturer_or_applicable_gpo_making_payment_country:
      record.applicableManufacturerOrApplicableGpoMakingPaymentCountry || undefined,
    total_amount_of_payment_usdollars: record.reportingCurrencyValue ?? record.totalAmountOfPaymentUsdollars,
    date_of_payment: record.dateOfPayment || undefined,
    number_of_payments_included_in_total_amount: record.numberOfPaymentsIncludedInTotalAmount || '1',
    form_of_payment_or_transfer_of_value: record.formOfPaymentOrTransferOfValue || undefined,
    nature_of_payment_or_transfer_of_value: record.natureOfPaymentOrTransferOfValue || undefined,
    city_of_travel: record.cityOfTravel || undefined,
    state_of_travel: record.stateOfTravel || undefined,
    country_of_travel: record.countryOfTravel || undefined,
    physician_ownership_indicator: record.physicianOwnershipIndicator || undefined,
    third_party_payment_recipient_indicator: record.thirdPartyPaymentRecipientIndicator || undefined,
    name_of_third_party_entity_receiving_payment_or_transfer_of_ccfc:
      record.nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue || undefined,
    charity_indicator: record.charityIndicator || undefined,
    third_party_equals_covered_recipient_indicator:
      record.thirdPartyEqualsCoveredRecipientIndicator || undefined,
    contextual_information: record.contextualInformation || undefined,
    delay_in_publication_indicator: record.delayInPublicationIndicator || undefined,
    dispute_status_for_publication: record.disputeStatusForPublication || 'No',
    related_product_indicator: record.productIndicator || undefined,
    name_of_drug_or_biological_or_device_or_medical_supply_1:
      record.nameOfAssociatedCoveredDrugOrBiological1 || undefined,
    name_of_drug_or_biological_or_device_or_medical_supply_2:
      record.nameOfAssociatedCoveredDrugOrBiological2 || undefined,
    name_of_drug_or_biological_or_device_or_medical_supply_3:
      record.nameOfAssociatedCoveredDrugOrBiological3 || undefined,
    name_of_drug_or_biological_or_device_or_medical_supply_4:
      record.nameOfAssociatedCoveredDrugOrBiological4 || undefined,
    name_of_drug_or_biological_or_device_or_medical_supply_5:
      record.nameOfAssociatedCoveredDrugOrBiological5 || undefined,
    associated_drug_or_biological_ndc_1: record.ndcOfAssociatedCoveredDrugOrBiological1 || undefined,
    associated_drug_or_biological_ndc_2: record.ndcOfAssociatedCoveredDrugOrBiological2 || undefined,
    associated_drug_or_biological_ndc_3: record.ndcOfAssociatedCoveredDrugOrBiological3 || undefined,
    associated_drug_or_biological_ndc_4: record.ndcOfAssociatedCoveredDrugOrBiological4 || undefined,
    associated_drug_or_biological_ndc_5: record.ndcOfAssociatedCoveredDrugOrBiological5 || undefined,
    associated_device_or_medical_supply_pdi_1:
      record.nameOfAssociatedCoveredDeviceOrMedicalSupply1 || undefined,
    associated_device_or_medical_supply_pdi_2:
      record.nameOfAssociatedCoveredDeviceOrMedicalSupply2 || undefined,
    associated_device_or_medical_supply_pdi_3:
      record.nameOfAssociatedCoveredDeviceOrMedicalSupply3 || undefined,
    associated_device_or_medical_supply_pdi_4:
      record.nameOfAssociatedCoveredDeviceOrMedicalSupply4 || undefined,
    associated_device_or_medical_supply_pdi_5:
      record.nameOfAssociatedCoveredDeviceOrMedicalSupply5 || undefined,
    record_id: record.recordId,
    program_year: record.programYear || undefined,
    payment_publication_date: record.paymentPublicationDate || undefined,
  }
}

export function buildRuleInputSnapshot(
  raw: Record<string, string>,
  analysis: TransparencyAnalysis
): Record<string, unknown> {
  return {
    rawRow: raw,
    isReportable: analysis.isReportable,
    cmsReportCategory: analysis.cmsReportCategory,
    reasoning: analysis.reasoning,
    applicableRules: analysis.applicableRules,
    aggregateStatus: analysis.aggregateStatus,
    disclosureType: analysis.disclosureType,
    paymentCurrency: analysis.paymentCurrency,
    exchangeRate: analysis.exchangeRate,
    reportingCurrencyValue: analysis.reportingCurrencyValue,
  }
}
