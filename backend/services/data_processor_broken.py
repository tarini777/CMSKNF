"""
Data Processor
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
    
    def process_csv_upload(self, file_content: bytes, filename: str) -> Dict:
        """Process uploaded CSV file"""
        try:
            # Parse CSV with more robust error handling
            df = pd.read_csv(
                io.StringIO(file_content.decode('utf-8')),
                on_bad_lines='skip',  # Skip bad lines instead of failing
                encoding='utf-8',
                dtype=str,  # Read all columns as strings initially
                na_values=['', 'nan', 'NaN', 'null', 'NULL', 'None', 'N/A', 'n/a']
            )
            
            # Replace any remaining NaN values with empty strings
            df = df.fillna('')
            
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
            
        # Process each record with memory management
        processed_records = []
        try:
            for index, row in df.iterrows():
                try:
                    # Convert row to dictionary and clean data
                    record_data = row.to_dict()
                    
                    # Clean all data to remove NaN values
                    for key, value in record_data.items():
                        if pd.isna(value) or value == 'nan' or value == 'NaN' or value == 'null' or value == 'NULL':
                            record_data[key] = ''
                    
                    # Add default values for missing fields
                    if 'covered_recipient_type' not in record_data or not record_data['covered_recipient_type']:
                        record_data['covered_recipient_type'] = 'Covered Recipient Physician'
                    if 'form_of_payment_or_transfer_of_value' not in record_data or not record_data['form_of_payment_or_transfer_of_value']:
                        record_data['form_of_payment_or_transfer_of_value'] = 'Cash or cash equivalent'
                    
                    # Clean and convert numeric fields
                    if 'total_amount_of_payment_usdollars' in record_data:
                        try:
                            amount = float(record_data['total_amount_of_payment_usdollars'])
                            # Handle NaN values
                            if math.isnan(amount):
                                amount = 0.0
                            record_data['total_amount_of_payment_usdollars'] = amount
                        except (ValueError, TypeError):
                            record_data['total_amount_of_payment_usdollars'] = 0.0
                    
                    if 'number_of_payments_included_in_total_amount' in record_data:
                        try:
                            record_data['number_of_payments_included_in_total_amount'] = int(record_data['number_of_payments_included_in_total_amount'])
                        except (ValueError, TypeError):
                            record_data['number_of_payments_included_in_total_amount'] = 1
                    
                    # Create CMS record
                    record = CMSRecord(record_data)
                    
                    # Validate record
                    validation_errors = self._validate_record(record)
                    if validation_errors:
                        record.validation_errors = validation_errors
                        record.processing_status = 'error'
                        upload.error_count += 1
                    else:
                        # Apply rules engine
                        evaluation = self.rules_engine.evaluate_record(record)
                        record.is_reportable = evaluation['is_reportable']
                        record.reason = evaluation['reason']
                        record.applied_rules = evaluation['applied_rules']
                        record.processing_status = 'processed'
                        
                        if record.is_reportable:
                            upload.reportable_count += 1
                        else:
                            upload.non_reportable_count += 1
                    
                    # Add review metadata
                    record_dict = record.to_dict()
                    record_dict['record_id'] = str(uuid.uuid4())
                    record_dict['session_id'] = session_id
                    record_dict['human_decision'] = 'pending'
                    record_dict['human_reason'] = ''
                    record_dict['decision_time'] = None
                    record_dict['final_reportable'] = record.is_reportable
                    
                    processed_records.append(record_dict)
                    review_session['records'].append(record_dict)
                    upload.processed_records += 1
                    
                except Exception as e:
                    logging.error(f"Error processing record {index}: {str(e)}")
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
            logger.error(f"Error in CSV processing: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            # Memory cleanup
            if 'df' in locals():
                del df
            gc.collect()
    
    def _validate_record(self, record: CMSRecord) -> List[str]:
        """Validate a CMS record"""
        errors = []
        
        # Required fields validation - make more flexible
        required_fields = [
            'covered_recipient_name',
            'total_amount_of_payment_usdollars',
            'date_of_payment',
            'nature_of_payment_or_transfer_of_value'
        ]
        
        # Check for covered_recipient_id or similar fields
        id_fields = ['covered_recipient_id', 'recipient_id', 'physician_id', 'hcp_id']
        has_id = any(getattr(record, field, None) for field in id_fields)
        if not has_id:
            # Generate a default ID if none exists
            record.covered_recipient_id = f"auto_{record.covered_recipient_name.replace(' ', '_').lower()}" if record.covered_recipient_name else "unknown"
        
        for field in required_fields:
            value = getattr(record, field, None)
            if not value or (isinstance(value, str) and value.strip() == ''):
                errors.append(f"Missing required field: {field}")
        
        # Amount validation
        if record.total_amount_of_payment_usdollars < 0:
            errors.append("Payment amount cannot be negative")
        
        # Date validation
        if record.date_of_payment:
            try:
                pd.to_datetime(record.date_of_payment)
            except:
                errors.append("Invalid date format for date_of_payment")
        
        return errors
    
    def _generate_validation_summary(self, records: List[Dict]) -> Dict:
        """Generate validation summary for processed records"""
        total_records = len(records)
        error_records = len([r for r in records if r.get('processing_status') == 'error'])
        reportable_records = len([r for r in records if r.get('is_reportable') is True])
        non_reportable_records = len([r for r in records if r.get('is_reportable') is False])
        
        return {
            'total_records': total_records,
            'error_records': error_records,
            'reportable_records': reportable_records,
            'non_reportable_records': non_reportable_records,
            'success_rate': ((total_records - error_records) / total_records * 100) if total_records > 0 else 0
        }
    
    def get_processing_stats(self) -> Dict:
        """Get current processing statistics"""
        return {
            'processing_stats': self.processing_stats,
            'rules_summary': self.rules_engine.get_rules_summary()
        }
    
    def add_company_rule(self, rule_data: Dict) -> Dict:
        """Add a new company rule"""
        try:
            from models.cms_data import CompanyRule
            rule = CompanyRule(rule_data)
            self.rules_engine.add_rule(rule)
            
            return {
                'success': True,
                'rule': rule.to_dict(),
                'message': 'Rule added successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to add rule'
            }
    
    def get_company_rules(self) -> Dict:
        """Get all company rules"""
        return {
            'success': True,
            'rules_summary': self.rules_engine.get_rules_summary()
        }
    
    def update_company_rule(self, rule_id: str, rule_data: Dict) -> Dict:
        """Update an existing company rule"""
        try:
            from models.cms_data import CompanyRule
            updated_rule = CompanyRule(rule_data)
            self.rules_engine.update_rule(rule_id, updated_rule)
            
            return {
                'success': True,
                'rule': updated_rule.to_dict(),
                'message': 'Rule updated successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to update rule'
            }
    
    def delete_company_rule(self, rule_id: str) -> Dict:
        """Delete a company rule"""
        try:
            self.rules_engine.remove_rule(rule_id)
            
            return {
                'success': True,
                'message': f'Rule {rule_id} deleted successfully'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'message': 'Failed to delete rule'
            }
    
    # Review and Approval System Methods
    def get_review_sessions(self) -> List[Dict]:
        """Get all review sessions"""
        sessions = []
        for session_id, session in self.review_sessions.items():
            session_summary = {
                'session_id': session_id,
                'filename': session['filename'],
                'upload_time': session['upload_time'],
                'total_records': session['total_records'],
                'status': session['status'],
                'pending_decisions': len([r for r in session['records'] if r['human_decision'] == 'pending']),
                'approved': len([r for r in session['records'] if r['human_decision'] == 'approve']),
                'rejected': len([r for r in session['records'] if r['human_decision'] == 'reject'])
            }
            sessions.append(session_summary)
        return sorted(sessions, key=lambda x: x['upload_time'], reverse=True)
    
    def get_review_session(self, session_id: str) -> Dict:
        """Get specific review session"""
        if session_id not in self.review_sessions:
            return None
        return self.review_sessions[session_id]
    
    def get_session_records(self, session_id: str, page: int = 1, per_page: int = 20, filter_type: str = 'all') -> Dict:
        """Get records for a review session with pagination"""
        if session_id not in self.review_sessions:
            return {'records': [], 'total': 0, 'page': page, 'per_page': per_page}
        
        session = self.review_sessions[session_id]
        all_records = session['records']
        
        # Apply filter
        if filter_type == 'reportable':
            filtered_records = [r for r in all_records if r['is_reportable']]
        elif filter_type == 'non_reportable':
            filtered_records = [r for r in all_records if not r['is_reportable']]
        elif filter_type == 'pending':
            filtered_records = [r for r in all_records if r['human_decision'] == 'pending']
        else:
            filtered_records = all_records
        
        # Pagination
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_records = filtered_records[start_idx:end_idx]
        
        return {
            'records': paginated_records,
            'total': len(filtered_records),
            'page': page,
            'per_page': per_page,
            'total_pages': (len(filtered_records) + per_page - 1) // per_page
        }
    
    def make_human_decision(self, record_id: str, decision: str, reason: str = '', modified_data: Dict = None) -> Dict:
        """Make a human decision on a record"""
        # Find the record in all sessions
        for session_id, session in self.review_sessions.items():
            for record in session['records']:
                if record['record_id'] == record_id:
                    record['human_decision'] = decision
                    record['human_reason'] = reason
                    record['decision_time'] = datetime.now().isoformat()
                    
                    if decision == 'approve':
                        record['final_reportable'] = record['is_reportable']
                    elif decision == 'reject':
                        record['final_reportable'] = not record['is_reportable']
                    elif decision == 'modify' and modified_data:
                        # Update record with modified data
                        for key, value in modified_data.items():
                            if key in record:
                                record[key] = value
                        # Re-evaluate with modified data
                        from models.cms_data import CMSRecord
                        modified_record = CMSRecord(record)
                        evaluation = self.rules_engine.evaluate_record(modified_record)
                        record['is_reportable'] = evaluation['is_reportable']
                        record['reason'] = evaluation['reason']
                        record['final_reportable'] = evaluation['is_reportable']
                    
                    return {'success': True, 'message': f'Decision {decision} recorded for record {record_id}'}
        
        return {'success': False, 'error': 'Record not found'}
    
    def make_bulk_decisions(self, session_id: str, decisions: List[Dict]) -> Dict:
        """Make bulk decisions on multiple records"""
        if session_id not in self.review_sessions:
            return {'success': False, 'error': 'Session not found'}
        
        processed = 0
        for decision_data in decisions:
            result = self.make_human_decision(
                decision_data['record_id'],
                decision_data['decision'],
                decision_data.get('reason', ''),
                decision_data.get('modified_data', {})
            )
            if result['success']:
                processed += 1
        
        return {'success': True, 'message': f'Processed {processed} decisions'}
    
    def export_session(self, session_id: str, format_type: str = 'csv', include_audit: bool = False) -> Dict:
        """Export session data"""
        if session_id not in self.review_sessions:
            return {'success': False, 'error': 'Session not found'}
        
        session = self.review_sessions[session_id]
        records = session['records']
        
        # Filter to only approved records
        approved_records = [r for r in records if r['human_decision'] == 'approve']
        
        if format_type == 'json':
            export_data = {
                'session_info': {
                    'session_id': session_id,
                    'filename': session['filename'],
                    'export_time': datetime.now().isoformat(),
                    'total_records': len(approved_records)
                },
                'records': approved_records
            }
            if include_audit:
                export_data['audit_trail'] = [r for r in records if r['human_decision'] != 'pending']
        else:
            # CSV format
            if approved_records:
                df = pd.DataFrame(approved_records)
                export_data = df.to_csv(index=False)
            else:
                export_data = "No approved records to export"
        
        return {'success': True, 'data': export_data, 'format': format_type}
    
    def generate_download_file(self, session_id: str, format_type: str = 'csv', include_audit: bool = False) -> str:
        """Generate download file for session"""
        if session_id not in self.review_sessions:
            return None
        
        # Create downloads directory if it doesn't exist
        downloads_dir = 'downloads'
        os.makedirs(downloads_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"cms_report_{session_id}_{timestamp}.{format_type}"
        filepath = os.path.join(downloads_dir, filename)
        
        # Get export data
        export_result = self.export_session(session_id, format_type, include_audit)
        if not export_result['success']:
            return None
        
        # Write file
        with open(filepath, 'w', encoding='utf-8') as f:
            if format_type == 'json':
                import json
                json.dump(export_result['data'], f, indent=2)
            else:
                f.write(export_result['data'])
        
        return filepath
    
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
