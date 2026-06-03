"""
Data Processor - Fixed Version
Simple, modular data processing service for CMS data
"""

import pandas as pd
import io
import uuid
import os
import math
import gc
from typing import List, Dict, Tuple
from datetime import datetime
from models.cms_data import CMSRecord, DataUpload
from services.rules_engine import RulesEngine
import logging

logger = logging.getLogger(__name__)

class DataProcessor:
    """Data processor for CMS compliance data"""
    
    def __init__(self):
        self.rules_engine = RulesEngine()
        self.processing_stats = {
            'total_processed': 0,
            'reportable_count': 0,
            'non_reportable_count': 0,
            'error_count': 0
        }
        # Review sessions storage
        self.review_sessions = {}
        self.upload_history = []
    
    def process_csv_file(self, file_content: bytes, filename: str) -> Dict:
        """Process uploaded CSV file"""
        try:
            # Read CSV file
            df = pd.read_csv(io.BytesIO(file_content))
            logger.info(f"Processing CSV file: {filename} with {len(df)} records")
            
            # Create upload session
            upload = DataUpload(filename, len(df))
            
            # Create review session
            session_id = str(uuid.uuid4())
            review_session = {
                'session_id': session_id,
                'filename': filename,
                'upload_time': datetime.now().isoformat(),
                'total_records': len(df),
                'status': 'pending_review',
                'records': []
            }
            
            # Process each record
            processed_records = []
            for index, row in df.iterrows():
                try:
                    # Convert row to dictionary and clean data
                    record_data = row.to_dict()
                    
                    # Clean all data to remove NaN values
                    for key, value in record_data.items():
                        if pd.isna(value) or value == '' or str(value).lower() == 'nan':
                            record_data[key] = None
                        elif isinstance(value, (int, float)) and math.isnan(value):
                            record_data[key] = None
                    
                    # Create CMS record
                    record = CMSRecord(
                        covered_recipient_id=record_data.get('covered_recipient_id', ''),
                        covered_recipient_name=record_data.get('covered_recipient_name', ''),
                        covered_recipient_type=record_data.get('covered_recipient_type', ''),
                        teaching_hospital_id=record_data.get('teaching_hospital_id', ''),
                        teaching_hospital_name=record_data.get('teaching_hospital_name', ''),
                        physician_profile_id=record_data.get('physician_profile_id', ''),
                        physician_first_name=record_data.get('physician_first_name', ''),
                        physician_middle_name=record_data.get('physician_middle_name', ''),
                        physician_last_name=record_data.get('physician_last_name', ''),
                        physician_name_suffix=record_data.get('physician_name_suffix', ''),
                        recipient_primary_business_street_address_line1=record_data.get('recipient_primary_business_street_address_line1', ''),
                        recipient_primary_business_street_address_line2=record_data.get('recipient_primary_business_street_address_line2', ''),
                        recipient_city=record_data.get('recipient_city', ''),
                        recipient_state=record_data.get('recipient_state', ''),
                        recipient_zip_code=record_data.get('recipient_zip_code', ''),
                        recipient_country=record_data.get('recipient_country', ''),
                        recipient_province=record_data.get('recipient_province', ''),
                        recipient_postal_code=record_data.get('recipient_postal_code', ''),
                        physician_primary_type=record_data.get('physician_primary_type', ''),
                        physician_specialty=record_data.get('physician_specialty', ''),
                        physician_license_state_code1=record_data.get('physician_license_state_code1', ''),
                        physician_license_state_code2=record_data.get('physician_license_state_code2', ''),
                        physician_license_state_code3=record_data.get('physician_license_state_code3', ''),
                        physician_license_state_code4=record_data.get('physician_license_state_code4', ''),
                        physician_license_state_code5=record_data.get('physician_license_state_code5', ''),
                        submitting_applicable_manufacturer_or_applicable_gpo_name=record_data.get('submitting_applicable_manufacturer_or_applicable_gpo_name', ''),
                        applicable_manufacturer_or_applicable_gpo_making_payment_id=record_data.get('applicable_manufacturer_or_applicable_gpo_making_payment_id', ''),
                        applicable_manufacturer_or_applicable_gpo_making_payment_name=record_data.get('applicable_manufacturer_or_applicable_gpo_making_payment_name', ''),
                        applicable_manufacturer_or_applicable_gpo_making_payment_state=record_data.get('applicable_manufacturer_or_applicable_gpo_making_payment_state', ''),
                        applicable_manufacturer_or_applicable_gpo_making_payment_country=record_data.get('applicable_manufacturer_or_applicable_gpo_making_payment_country', ''),
                        total_amount_of_payment_usdollars=float(record_data.get('total_amount_of_payment_usdollars', 0)) if record_data.get('total_amount_of_payment_usdollars') is not None else 0.0,
                        date_of_payment=record_data.get('date_of_payment', ''),
                        number_of_payments_included_in_total_amount=record_data.get('number_of_payments_included_in_total_amount', ''),
                        form_of_payment_or_transfer_of_value=record_data.get('form_of_payment_or_transfer_of_value', ''),
                        nature_of_payment_or_transfer_of_value=record_data.get('nature_of_payment_or_transfer_of_value', ''),
                        city_of_travel=record_data.get('city_of_travel', ''),
                        state_of_travel=record_data.get('state_of_travel', ''),
                        country_of_travel=record_data.get('country_of_travel', ''),
                        physician_ownership_indicator=record_data.get('physician_ownership_indicator', ''),
                        third_party_payment_recipient_indicator=record_data.get('third_party_payment_recipient_indicator', ''),
                        name_of_third_party_entity_receiving_payment_or_transfer_of_value=record_data.get('name_of_third_party_entity_receiving_payment_or_transfer_of_value', ''),
                        charity_indicator=record_data.get('charity_indicator', ''),
                        third_party_equals_covered_recipient_indicator=record_data.get('third_party_equals_covered_recipient_indicator', ''),
                        contextual_information=record_data.get('contextual_information', ''),
                        delay_in_publication_indicator=record_data.get('delay_in_publication_indicator', ''),
                        record_id=record_data.get('record_id', ''),
                        dispute_status_for_publication=record_data.get('dispute_status_for_publication', ''),
                        product_indicator=record_data.get('product_indicator', ''),
                        name_of_associated_covered_drug_or_biological1=record_data.get('name_of_associated_covered_drug_or_biological1', ''),
                        name_of_associated_covered_drug_or_biological2=record_data.get('name_of_associated_covered_drug_or_biological2', ''),
                        name_of_associated_covered_drug_or_biological3=record_data.get('name_of_associated_covered_drug_or_biological3', ''),
                        name_of_associated_covered_drug_or_biological4=record_data.get('name_of_associated_covered_drug_or_biological4', ''),
                        name_of_associated_covered_drug_or_biological5=record_data.get('name_of_associated_covered_drug_or_biological5', ''),
                        ndc_of_associated_covered_drug_or_biological1=record_data.get('ndc_of_associated_covered_drug_or_biological1', ''),
                        ndc_of_associated_covered_drug_or_biological2=record_data.get('ndc_of_associated_covered_drug_or_biological2', ''),
                        ndc_of_associated_covered_drug_or_biological3=record_data.get('ndc_of_associated_covered_drug_or_biological3', ''),
                        ndc_of_associated_covered_drug_or_biological4=record_data.get('ndc_of_associated_covered_drug_or_biological4', ''),
                        ndc_of_associated_covered_drug_or_biological5=record_data.get('ndc_of_associated_covered_drug_or_biological5', ''),
                        name_of_associated_covered_device_or_medical_supply1=record_data.get('name_of_associated_covered_device_or_medical_supply1', ''),
                        name_of_associated_covered_device_or_medical_supply2=record_data.get('name_of_associated_covered_device_or_medical_supply2', ''),
                        name_of_associated_covered_device_or_medical_supply3=record_data.get('name_of_associated_covered_device_or_medical_supply3', ''),
                        name_of_associated_covered_device_or_medical_supply4=record_data.get('name_of_associated_covered_device_or_medical_supply4', ''),
                        name_of_associated_covered_device_or_medical_supply5=record_data.get('name_of_associated_covered_device_or_medical_supply5', ''),
                        program_year=record_data.get('program_year', ''),
                        payment_publication_date=record_data.get('payment_publication_date', '')
                    )
                    
                    # Set unique record ID
                    record.record_id = str(uuid.uuid4())
                    
                    # Apply rules to determine reportability
                    is_reportable = self.rules_engine.apply_rules(record)
                    record.is_reportable = is_reportable
                    
                    # Convert to dictionary for storage
                    record_dict = record.to_dict()
                    record_dict['human_decision'] = 'pending'
                    record_dict['human_reason'] = ''
                    record_dict['decision_time'] = None
                    record_dict['final_reportable'] = record.is_reportable
                    
                    processed_records.append(record_dict)
                    review_session['records'].append(record_dict)
                    upload.processed_records += 1
                    
                    # Update counters
                    if is_reportable:
                        upload.reportable_count += 1
                    else:
                        upload.non_reportable_count += 1
                        
                except Exception as e:
                    logger.error(f"Error processing record {index}: {str(e)}")
                    upload.error_count += 1
                    processed_records.append({
                        'row_index': index,
                        'error': str(e),
                        'processing_status': 'error'
                    })
            
            # Update upload status
            upload.status = 'completed'
            upload.validation_summary = self._generate_validation_summary(processed_records)
            
            # Update processing stats
            self.processing_stats['total_processed'] += upload.processed_records
            self.processing_stats['reportable_count'] += upload.reportable_count
            self.processing_stats['non_reportable_count'] += upload.non_reportable_count
            self.processing_stats['error_count'] += upload.error_count
            
            # Store review session
            self.review_sessions[session_id] = review_session
            
            # Add to upload history
            self.upload_history.append(upload)
            
            return {
                'success': True,
                'upload': upload.to_dict(),
                'session_id': session_id,
                'processed_records': processed_records,
                'summary': {
                    'total_records': upload.total_records,
                    'processed_records': upload.processed_records,
                    'reportable_count': upload.reportable_count,
                    'non_reportable_count': upload.non_reportable_count,
                    'error_count': upload.error_count,
                    'success_rate': (upload.processed_records / upload.total_records * 100) if upload.total_records > 0 else 0
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing CSV file: {e}")
            return {
                'success': False,
                'error': str(e),
                'upload': None,
                'processed_records': []
            }
        finally:
            # Memory cleanup
            if 'df' in locals():
                del df
            gc.collect()
    
    def _generate_validation_summary(self, records: List[Dict]) -> Dict:
        """Generate validation summary for processed records"""
        reportable_count = sum(1 for r in records if r.get('is_reportable', False))
        non_reportable_count = sum(1 for r in records if not r.get('is_reportable', True))
        error_count = sum(1 for r in records if r.get('processing_status') == 'error')
        
        return {
            'total_records': len(records),
            'reportable_count': reportable_count,
            'non_reportable_count': non_reportable_count,
            'error_count': error_count,
            'success_rate': ((len(records) - error_count) / len(records) * 100) if records else 0
        }
    
    def get_review_session(self, session_id: str) -> Dict:
        """Get review session by ID"""
        return self.review_sessions.get(session_id, {})
    
    def get_all_review_sessions(self) -> Dict:
        """Get all review sessions"""
        return self.review_sessions
    
    def make_decision(self, session_id: str, record_id: str, decision: str, reason: str = '') -> Dict:
        """Make human decision on a record"""
        try:
            if session_id not in self.review_sessions:
                return {'success': False, 'error': 'Session not found'}
            
            session = self.review_sessions[session_id]
            for record in session['records']:
                if record['record_id'] == record_id:
                    record['human_decision'] = decision
                    record['human_reason'] = reason
                    record['decision_time'] = datetime.now().isoformat()
                    
                    # Update final reportable status
                    if decision == 'approve':
                        record['final_reportable'] = record['is_reportable']
                    elif decision == 'reject':
                        record['final_reportable'] = not record['is_reportable']
                    
                    return {'success': True, 'message': f'Decision {decision} applied successfully'}
            
            return {'success': False, 'error': 'Record not found'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def make_global_bulk_decisions(self, decisions: List[Dict]) -> Dict:
        """Make bulk decisions across all sessions"""
        try:
            results = []
            for decision in decisions:
                record_id = decision['record_id']
                decision_type = decision['decision']
                reason = decision.get('reason', '')
                
                # Find the record across all sessions
                found = False
                for session_id, session in self.review_sessions.items():
                    for record in session['records']:
                        if record['record_id'] == record_id:
                            record['human_decision'] = decision_type
                            record['human_reason'] = reason
                            record['decision_time'] = datetime.now().isoformat()
                            
                            # Update final reportable status
                            if decision_type == 'approve':
                                record['final_reportable'] = record['is_reportable']
                            elif decision_type == 'reject':
                                record['final_reportable'] = not record['is_reportable']
                            
                            results.append({
                                'record_id': record_id,
                                'success': True,
                                'decision': decision_type
                            })
                            found = True
                            break
                    if found:
                        break
                
                if not found:
                    results.append({
                        'record_id': record_id,
                        'success': False,
                        'error': 'Record not found'
                    })
            
            success_count = sum(1 for r in results if r['success'])
            return {
                'success': True,
                'processed': len(decisions),
                'successful': success_count,
                'failed': len(decisions) - success_count,
                'results': results
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def export_all_records(self, format_type: str = 'csv', include_audit: bool = False, filter_type: str = 'all') -> Dict:
        """Export all records from all sessions"""
        try:
            all_records = []
            session_info = []
            
            for session_id, session in self.review_sessions.items():
                records = session['records']
                
                # Apply filter
                if filter_type == 'approved':
                    filtered_records = [r for r in records if r['human_decision'] == 'approve']
                elif filter_type == 'pending':
                    filtered_records = [r for r in records if r['human_decision'] == 'pending']
                else:  # all
                    filtered_records = records
                
                # Add session info to each record
                for record in filtered_records:
                    record_with_session = record.copy()
                    record_with_session['session_id'] = session_id
                    record_with_session['session_filename'] = session['filename']
                    record_with_session['session_upload_time'] = session['upload_time']
                    all_records.append(record_with_session)
                
                session_info.append({
                    'session_id': session_id,
                    'filename': session['filename'],
                    'upload_time': session['upload_time'],
                    'total_records': len(records),
                    'exported_records': len(filtered_records)
                })
            
            if format_type == 'json':
                export_data = {
                    'export_info': {
                        'export_time': datetime.now().isoformat(),
                        'total_sessions': len(session_info),
                        'total_records': len(all_records),
                        'filter_type': filter_type
                    },
                    'sessions': session_info,
                    'records': all_records
                }
                if include_audit:
                    # Add audit trail for all decisions
                    audit_records = []
                    for session_id, session in self.review_sessions.items():
                        for record in session['records']:
                            if record['human_decision'] != 'pending':
                                audit_record = record.copy()
                                audit_record['session_id'] = session_id
                                audit_record['session_filename'] = session['filename']
                                audit_records.append(audit_record)
                    export_data['audit_trail'] = audit_records
            else:
                # CSV format
                if all_records:
                    df = pd.DataFrame(all_records)
                    export_data = df.to_csv(index=False)
                else:
                    export_data = "No records to export"
            
            return {
                'success': True,
                'data': export_data,
                'total_records': len(all_records),
                'total_sessions': len(session_info),
                'format': format_type
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
