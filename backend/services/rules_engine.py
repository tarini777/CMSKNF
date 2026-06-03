"""
Rules Engine
Simple, modular rules engine for CMS reportability decisions
"""

from typing import List, Dict, Optional
from models.cms_data import CMSRecord, CompanyRule
import re

class RulesEngine:
    """Rules engine for determining CMS reportability"""
    
    def __init__(self):
        self.rules = []
        self.default_rules = self._create_default_rules()
        self.rules.extend(self.default_rules)
    
    def _create_default_rules(self) -> List[CompanyRule]:
        """Create default CMS rules"""
        return [
            CompanyRule({
                'rule_id': 'default_de_minimis',
                'rule_name': 'De Minimis Threshold',
                'rule_description': 'Payments under $11.04 are not reportable',
                'rule_type': 'non_reportable',
                'conditions': [
                    {'field': 'total_amount_of_payment_usdollars', 'operator': '<', 'value': 11.04}
                ],
                'priority': 1
            }),
            CompanyRule({
                'rule_id': 'default_teaching_hospital',
                'rule_name': 'Teaching Hospital Payments',
                'rule_description': 'Payments to teaching hospitals are reportable',
                'rule_type': 'reportable',
                'conditions': [
                    {'field': 'covered_recipient_type', 'operator': '==', 'value': 'Teaching Hospital'}
                ],
                'priority': 2
            }),
            CompanyRule({
                'rule_id': 'default_physician_payment',
                'rule_name': 'Physician Payments',
                'rule_description': 'Payments to physicians are reportable if over threshold',
                'rule_type': 'reportable',
                'conditions': [
                    {'field': 'covered_recipient_type', 'operator': '==', 'value': 'Covered Recipient Physician'},
                    {'field': 'total_amount_of_payment_usdollars', 'operator': '>=', 'value': 11.04}
                ],
                'priority': 3
            }),
            CompanyRule({
                'rule_id': 'default_charity',
                'rule_name': 'Charity Payments',
                'rule_description': 'Charity payments are not reportable',
                'rule_type': 'non_reportable',
                'conditions': [
                    {'field': 'charity_indicator', 'operator': '==', 'value': 'Yes'}
                ],
                'priority': 4
            }),
            CompanyRule({
                'rule_id': 'default_third_party',
                'rule_name': 'Third Party Payments',
                'rule_description': 'Third party payments are reportable',
                'rule_type': 'reportable',
                'conditions': [
                    {'field': 'third_party_payment_recipient_indicator', 'operator': '==', 'value': 'Yes'}
                ],
                'priority': 5
            })
        ]
    
    def add_rule(self, rule: CompanyRule):
        """Add a new company rule"""
        self.rules.append(rule)
        self.rules.sort(key=lambda x: x.priority)
    
    def remove_rule(self, rule_id: str):
        """Remove a rule by ID"""
        self.rules = [rule for rule in self.rules if rule.rule_id != rule_id]
    
    def update_rule(self, rule_id: str, updated_rule: CompanyRule):
        """Update an existing rule"""
        for i, rule in enumerate(self.rules):
            if rule.rule_id == rule_id:
                self.rules[i] = updated_rule
                break
        self.rules.sort(key=lambda x: x.priority)
    
    def evaluate_record(self, record: CMSRecord) -> Dict:
        """Evaluate a CMS record against all rules"""
        evaluation_result = {
            'is_reportable': None,
            'applied_rules': [],
            'reasoning': [],
            'reason': '',  # Add reason field for compatibility
            'confidence_score': 0.0
        }
        
        # Sort rules by priority (lower number = higher priority)
        sorted_rules = sorted([rule for rule in self.rules if rule.is_active], 
                            key=lambda x: x.priority)
        
        for rule in sorted_rules:
            if self._evaluate_conditions(record, rule.conditions):
                evaluation_result['applied_rules'].append(rule.rule_id)
                evaluation_result['reasoning'].append(rule.rule_description)
                
                if rule.rule_type == 'reportable':
                    evaluation_result['is_reportable'] = True
                    evaluation_result['reason'] = rule.rule_description
                    evaluation_result['confidence_score'] = 1.0
                    break
                elif rule.rule_type == 'non_reportable':
                    evaluation_result['is_reportable'] = False
                    evaluation_result['reason'] = rule.rule_description
                    evaluation_result['confidence_score'] = 1.0
                    break
                elif rule.rule_type == 'conditional':
                    # For conditional rules, continue evaluating
                    evaluation_result['confidence_score'] += 0.5
        
        # If no rules matched, default to reportable for amounts >= threshold
        if evaluation_result['is_reportable'] is None:
            if record.total_amount_of_payment_usdollars >= 11.04:
                evaluation_result['is_reportable'] = True
                evaluation_result['reason'] = 'Default: Amount above de minimis threshold'
                evaluation_result['reasoning'].append('Default: Amount above de minimis threshold')
                evaluation_result['confidence_score'] = 0.8
            else:
                evaluation_result['is_reportable'] = False
                evaluation_result['reason'] = 'Default: Amount below de minimis threshold'
                evaluation_result['reasoning'].append('Default: Amount below de minimis threshold')
                evaluation_result['confidence_score'] = 0.8
        
        return evaluation_result
    
    def _evaluate_conditions(self, record: CMSRecord, conditions: List[Dict]) -> bool:
        """Evaluate if a record matches the given conditions"""
        for condition in conditions:
            field = condition['field']
            operator = condition['operator']
            value = condition['value']
            
            # Get field value from record
            record_value = getattr(record, field, None)
            
            if not self._compare_values(record_value, operator, value):
                return False
        
        return True
    
    def _compare_values(self, record_value, operator: str, expected_value) -> bool:
        """Compare record value with expected value using the given operator"""
        if record_value is None:
            return False
        
        try:
            if operator == '==':
                return str(record_value).lower() == str(expected_value).lower()
            elif operator == '!=':
                return str(record_value).lower() != str(expected_value).lower()
            elif operator == '>':
                return float(record_value) > float(expected_value)
            elif operator == '>=':
                return float(record_value) >= float(expected_value)
            elif operator == '<':
                return float(record_value) < float(expected_value)
            elif operator == '<=':
                return float(record_value) <= float(expected_value)
            elif operator == 'contains':
                return str(expected_value).lower() in str(record_value).lower()
            elif operator == 'not_contains':
                return str(expected_value).lower() not in str(record_value).lower()
            elif operator == 'regex':
                return bool(re.search(str(expected_value), str(record_value), re.IGNORECASE))
            else:
                return False
        except (ValueError, TypeError):
            return False
    
    def get_rules_summary(self) -> Dict:
        """Get summary of all rules"""
        active_rules = [rule for rule in self.rules if rule.is_active]
        return {
            'total_rules': len(self.rules),
            'active_rules': len(active_rules),
            'rule_types': {
                'reportable': len([r for r in active_rules if r.rule_type == 'reportable']),
                'non_reportable': len([r for r in active_rules if r.rule_type == 'non_reportable']),
                'conditional': len([r for r in active_rules if r.rule_type == 'conditional'])
            },
            'rules': [rule.to_dict() for rule in active_rules]
        }
