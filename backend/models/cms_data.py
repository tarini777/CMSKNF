"""
CMS Data Models
Simple, modular data models for CMS compliance data
"""

from datetime import datetime
from typing import List, Dict, Optional
import pandas as pd

class CMSRecord:
    """Individual CMS record model"""
    
    def __init__(self, data: Dict):
        self.covered_recipient_id = data.get('covered_recipient_id', '')
        self.covered_recipient_name = data.get('covered_recipient_name', '')
        self.covered_recipient_type = data.get('covered_recipient_type', '')
        self.teaching_hospital_id = data.get('teaching_hospital_id', '')
        self.teaching_hospital_name = data.get('teaching_hospital_name', '')
        self.physician_profile_id = data.get('physician_profile_id', '')
        self.physician_first_name = data.get('physician_first_name', '')
        self.physician_middle_name = data.get('physician_middle_name', '')
        self.physician_last_name = data.get('physician_last_name', '')
        self.physician_name_suffix = data.get('physician_name_suffix', '')
        self.recipient_primary_business_street_address_line1 = data.get('recipient_primary_business_street_address_line1', '')
        self.recipient_city = data.get('recipient_city', '')
        self.recipient_state = data.get('recipient_state', '')
        self.recipient_zip_code = data.get('recipient_zip_code', '')
        self.recipient_country = data.get('recipient_country', '')
        self.recipient_province = data.get('recipient_province', '')
        self.recipient_postal_code = data.get('recipient_postal_code', '')
        self.physician_primary_type = data.get('physician_primary_type', '')
        self.physician_specialty = data.get('physician_specialty', '')
        self.physician_license_state_code1 = data.get('physician_license_state_code1', '')
        self.physician_license_state_code2 = data.get('physician_license_state_code2', '')
        self.physician_license_state_code3 = data.get('physician_license_state_code3', '')
        self.physician_license_state_code4 = data.get('physician_license_state_code4', '')
        self.physician_license_state_code5 = data.get('physician_license_state_code5', '')
        self.submitting_applicable_manufacturer_or_applicable_gpo_name = data.get('submitting_applicable_manufacturer_or_applicable_gpo_name', '')
        self.applicable_manufacturer_or_applicable_gpo_making_payment_id = data.get('applicable_manufacturer_or_applicable_gpo_making_payment_id', '')
        self.applicable_manufacturer_or_applicable_gpo_making_payment_name = data.get('applicable_manufacturer_or_applicable_gpo_making_payment_name', '')
        self.applicable_manufacturer_or_applicable_gpo_making_payment_state = data.get('applicable_manufacturer_or_applicable_gpo_making_payment_state', '')
        self.applicable_manufacturer_or_applicable_gpo_making_payment_country = data.get('applicable_manufacturer_or_applicable_gpo_making_payment_country', '')
        self.total_amount_of_payment_usdollars = float(data.get('total_amount_of_payment_usdollars', 0))
        self.date_of_payment = data.get('date_of_payment', '')
        self.number_of_payments_included_in_total_amount = int(data.get('number_of_payments_included_in_total_amount', 1))
        self.form_of_payment_or_transfer_of_value = data.get('form_of_payment_or_transfer_of_value', '')
        self.nature_of_payment_or_transfer_of_value = data.get('nature_of_payment_or_transfer_of_value', '')
        self.city_of_travel = data.get('city_of_travel', '')
        self.state_of_travel = data.get('state_of_travel', '')
        self.country_of_travel = data.get('country_of_travel', '')
        self.physician_ownership_indicator = data.get('physician_ownership_indicator', '')
        self.third_party_payment_recipient_indicator = data.get('third_party_payment_recipient_indicator', '')
        self.name_of_third_party_entity_receiving_payment_or_transfer_of_value = data.get('name_of_third_party_entity_receiving_payment_or_transfer_of_value', '')
        self.charity_indicator = data.get('charity_indicator', '')
        self.third_party_equals_covered_recipient_indicator = data.get('third_party_equals_covered_recipient_indicator', '')
        self.contextual_information = data.get('contextual_information', '')
        self.delay_in_publication_indicator = data.get('delay_in_publication_indicator', '')
        self.record_id = data.get('record_id', '')
        self.dispute_status_for_publication = data.get('dispute_status_for_publication', '')
        self.product_indicator = data.get('product_indicator', '')
        self.name_of_associated_covered_drug_or_biological1 = data.get('name_of_associated_covered_drug_or_biological1', '')
        self.name_of_associated_covered_drug_or_biological2 = data.get('name_of_associated_covered_drug_or_biological2', '')
        self.name_of_associated_covered_drug_or_biological3 = data.get('name_of_associated_covered_drug_or_biological3', '')
        self.name_of_associated_covered_drug_or_biological4 = data.get('name_of_associated_covered_drug_or_biological4', '')
        self.name_of_associated_covered_drug_or_biological5 = data.get('name_of_associated_covered_drug_or_biological5', '')
        self.ndc_of_associated_covered_drug_or_biological1 = data.get('ndc_of_associated_covered_drug_or_biological1', '')
        self.ndc_of_associated_covered_drug_or_biological2 = data.get('ndc_of_associated_covered_drug_or_biological2', '')
        self.ndc_of_associated_covered_drug_or_biological3 = data.get('ndc_of_associated_covered_drug_or_biological3', '')
        self.ndc_of_associated_covered_drug_or_biological4 = data.get('ndc_of_associated_covered_drug_or_biological4', '')
        self.ndc_of_associated_covered_drug_or_biological5 = data.get('ndc_of_associated_covered_drug_or_biological5', '')
        self.name_of_associated_covered_device_or_medical_supply1 = data.get('name_of_associated_covered_device_or_medical_supply1', '')
        self.name_of_associated_covered_device_or_medical_supply2 = data.get('name_of_associated_covered_device_or_medical_supply2', '')
        self.name_of_associated_covered_device_or_medical_supply3 = data.get('name_of_associated_covered_device_or_medical_supply3', '')
        self.name_of_associated_covered_device_or_medical_supply4 = data.get('name_of_associated_covered_device_or_medical_supply4', '')
        self.name_of_associated_covered_device_or_medical_supply5 = data.get('name_of_associated_covered_device_or_medical_supply5', '')
        self.program_year = data.get('program_year', '')
        self.payment_publication_date = data.get('payment_publication_date', '')
        
        # Processing metadata
        self.upload_timestamp = datetime.now().isoformat()
        self.is_reportable = None  # Will be determined by rules engine
        self.validation_errors = []
        self.processing_status = 'pending'
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        import math
        
        # Handle NaN values for numeric fields
        amount = self.total_amount_of_payment_usdollars
        if math.isnan(amount) if isinstance(amount, float) else False:
            amount = 0.0
        
        return {
            'covered_recipient_id': self.covered_recipient_id,
            'covered_recipient_name': self.covered_recipient_name,
            'covered_recipient_type': self.covered_recipient_type,
            'total_amount_of_payment_usdollars': amount,
            'date_of_payment': self.date_of_payment,
            'nature_of_payment_or_transfer_of_value': self.nature_of_payment_or_transfer_of_value,
            'form_of_payment_or_transfer_of_value': self.form_of_payment_or_transfer_of_value,
            'is_reportable': self.is_reportable,
            'reason': getattr(self, 'reason', ''),
            'applied_rules': getattr(self, 'applied_rules', []),
            'validation_errors': self.validation_errors,
            'processing_status': self.processing_status,
            'upload_timestamp': self.upload_timestamp
        }

class CompanyRule:
    """Company-specific rule for reportability decisions"""
    
    def __init__(self, data: Dict):
        self.rule_id = data.get('rule_id', '')
        self.rule_name = data.get('rule_name', '')
        self.rule_description = data.get('rule_description', '')
        self.rule_type = data.get('rule_type', '')  # 'reportable', 'non_reportable', 'conditional'
        self.conditions = data.get('conditions', [])  # List of conditions
        self.priority = int(data.get('priority', 100))
        self.is_active = data.get('is_active', True)
        self.created_date = data.get('created_date', datetime.now().isoformat())
        self.created_by = data.get('created_by', 'system')
        self.last_modified = data.get('last_modified', datetime.now().isoformat())
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'rule_description': self.rule_description,
            'rule_type': self.rule_type,
            'conditions': self.conditions,
            'priority': self.priority,
            'is_active': self.is_active,
            'created_date': self.created_date,
            'created_by': self.created_by,
            'last_modified': self.last_modified
        }

class DataUpload:
    """Data upload session model"""
    
    def __init__(self, filename: str, total_records: int):
        self.upload_id = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.filename = filename
        self.total_records = total_records
        self.processed_records = 0
        self.reportable_count = 0
        self.non_reportable_count = 0
        self.error_count = 0
        self.upload_timestamp = datetime.now().isoformat()
        self.status = 'processing'
        self.validation_summary = {}
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'upload_id': self.upload_id,
            'filename': self.filename,
            'total_records': self.total_records,
            'processed_records': self.processed_records,
            'reportable_count': self.reportable_count,
            'non_reportable_count': self.non_reportable_count,
            'error_count': self.error_count,
            'upload_timestamp': self.upload_timestamp,
            'status': self.status,
            'validation_summary': self.validation_summary
        }
