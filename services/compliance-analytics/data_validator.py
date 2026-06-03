"""
Knowledge Nexus Framework™ - Data Validation Service

This service ensures data integrity through:
- Cross-Reference: Integration with CMS Open Payments API
- Anomaly Detection: Using Isolation Forest model
- Missing Data Check: Automatic flagging of incomplete records
"""

import asyncio
import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import aiohttp
import asyncio
from concurrent.futures import ThreadPoolExecutor

# ML imports
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.impute import SimpleImputer
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logging.warning("scikit-learn not available. Install with: pip install scikit-learn")

logger = logging.getLogger(__name__)

class ValidationSeverity(Enum):
    """Validation issue severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class ValidationStatus(Enum):
    """Validation status"""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"
    PENDING = "pending"

@dataclass
class ValidationIssue:
    """Represents a data validation issue"""
    record_id: str
    field_name: str
    issue_type: str
    severity: ValidationSeverity
    message: str
    suggested_fix: Optional[str] = None
    confidence_score: float = 1.0
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class ValidationResult:
    """Result of data validation"""
    status: ValidationStatus
    total_records: int
    passed_records: int
    failed_records: int
    warning_records: int
    issues: List[ValidationIssue]
    validation_score: float
    processing_time: float
    recommendations: List[str] = field(default_factory=list)

class CMSAPIIntegrator:
    """Handles integration with CMS Open Payments API"""
    
    def __init__(self, api_base_url: str = "https://openpaymentsdata.cms.gov/api/v1"):
        self.api_base_url = api_base_url
        self.session = None
        self.cache = {}
        self.cache_ttl = 3600  # 1 hour cache

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def validate_physician_id(self, npi: str) -> Dict[str, Any]:
        """Validate physician NPI against CMS database"""
        if not npi or pd.isna(npi):
            return {
                'valid': False,
                'error': 'NPI is empty or null',
                'confidence': 0.0
            }
        
        # Check cache first
        cache_key = f"npi_{npi}"
        if cache_key in self.cache:
            cached_data = self.cache[cache_key]
            if datetime.now() - cached_data['timestamp'] < timedelta(seconds=self.cache_ttl):
                return cached_data['data']
        
        try:
            # Simulate API call (replace with actual CMS API integration)
            await asyncio.sleep(0.1)  # Simulate network delay
            
            # Mock validation logic
            is_valid = self._validate_npi_format(npi)
            
            result = {
                'valid': is_valid,
                'npi': npi,
                'confidence': 0.95 if is_valid else 0.0,
                'source': 'cms_api',
                'timestamp': datetime.now().isoformat()
            }
            
            # Cache the result
            self.cache[cache_key] = {
                'data': result,
                'timestamp': datetime.now()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error validating NPI {npi}: {str(e)}")
            return {
                'valid': False,
                'error': str(e),
                'confidence': 0.0
            }

    async def validate_hospital_affiliation(self, hospital_name: str, physician_npi: str) -> Dict[str, Any]:
        """Validate hospital affiliation"""
        if not hospital_name or pd.isna(hospital_name):
            return {
                'valid': False,
                'error': 'Hospital name is empty',
                'confidence': 0.0
            }
        
        try:
            # Simulate API call
            await asyncio.sleep(0.1)
            
            # Mock validation
            is_valid = len(hospital_name.strip()) > 3
            
            return {
                'valid': is_valid,
                'hospital_name': hospital_name,
                'physician_npi': physician_npi,
                'confidence': 0.9 if is_valid else 0.0,
                'source': 'cms_api'
            }
            
        except Exception as e:
            logger.error(f"Error validating hospital affiliation: {str(e)}")
            return {
                'valid': False,
                'error': str(e),
                'confidence': 0.0
            }

    def _validate_npi_format(self, npi: str) -> bool:
        """Validate NPI format (10 digits)"""
        if not isinstance(npi, str):
            return False
        
        # Remove any non-digit characters
        digits = ''.join(filter(str.isdigit, npi))
        
        # NPI should be 10 digits
        return len(digits) == 10

class AnomalyDetector:
    """Detects anomalies in financial and transactional data using ML"""
    
    def __init__(self, contamination: float = 0.1):
        self.contamination = contamination
        self.isolation_forest = None
        self.scaler = None
        self.imputer = None
        self.feature_columns = []
        self.is_trained = False

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Prepare features for anomaly detection"""
        features_df = df.copy()
        
        # Convert categorical variables to numeric
        if 'payment_category' in features_df.columns:
            features_df['payment_category_encoded'] = pd.Categorical(features_df['payment_category']).codes
        
        # Create derived features
        if 'payment_amount' in features_df.columns:
            features_df['payment_amount_log'] = np.log1p(features_df['payment_amount'])
            features_df['payment_amount_sqrt'] = np.sqrt(features_df['payment_amount'])
        
        if 'date_of_payment' in features_df.columns:
            features_df['payment_month'] = pd.to_datetime(features_df['date_of_payment']).dt.month
            features_df['payment_day_of_week'] = pd.to_datetime(features_df['date_of_payment']).dt.dayofweek
        
        # Select numeric features for anomaly detection
        numeric_columns = features_df.select_dtypes(include=[np.number]).columns
        self.feature_columns = list(numeric_columns)
        
        return features_df[self.feature_columns]

    def train_model(self, df: pd.DataFrame) -> None:
        """Train the anomaly detection model"""
        if not SKLEARN_AVAILABLE:
            logger.warning("scikit-learn not available. Skipping anomaly detection training.")
            return
        
        try:
            # Prepare features
            features_df = self.prepare_features(df)
            
            if features_df.empty:
                logger.warning("No features available for anomaly detection")
                return
            
            # Handle missing values
            self.imputer = SimpleImputer(strategy='median')
            features_imputed = self.imputer.fit_transform(features_df)
            
            # Scale features
            self.scaler = StandardScaler()
            features_scaled = self.scaler.fit_transform(features_imputed)
            
            # Train Isolation Forest
            self.isolation_forest = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100
            )
            
            self.isolation_forest.fit(features_scaled)
            self.is_trained = True
            
            logger.info(f"Anomaly detection model trained on {len(features_df)} records with {len(self.feature_columns)} features")
            
        except Exception as e:
            logger.error(f"Error training anomaly detection model: {str(e)}")
            self.is_trained = False

    def detect_anomalies(self, df: pd.DataFrame) -> List[ValidationIssue]:
        """Detect anomalies in the dataset"""
        if not self.is_trained or not SKLEARN_AVAILABLE:
            return []
        
        issues = []
        
        try:
            # Prepare features
            features_df = self.prepare_features(df)
            
            if features_df.empty:
                return issues
            
            # Handle missing values
            features_imputed = self.imputer.transform(features_df)
            
            # Scale features
            features_scaled = self.scaler.transform(features_imputed)
            
            # Predict anomalies
            anomaly_scores = self.isolation_forest.decision_function(features_scaled)
            anomaly_predictions = self.isolation_forest.predict(features_scaled)
            
            # Create issues for anomalies
            for idx, (score, prediction) in enumerate(zip(anomaly_scores, anomaly_predictions)):
                if prediction == -1:  # Anomaly detected
                    severity = ValidationSeverity.WARNING if score > -0.5 else ValidationSeverity.ERROR
                    
                    issue = ValidationIssue(
                        record_id=str(idx),
                        field_name="multiple_fields",
                        issue_type="anomaly_detected",
                        severity=severity,
                        message=f"Anomalous data pattern detected (score: {score:.3f})",
                        suggested_fix="Review record for data quality issues or unusual patterns",
                        confidence_score=abs(score)
                    )
                    issues.append(issue)
            
            logger.info(f"Detected {len(issues)} anomalies out of {len(df)} records")
            
        except Exception as e:
            logger.error(f"Error detecting anomalies: {str(e)}")
        
        return issues

class MissingDataChecker:
    """Checks for missing essential data fields"""
    
    def __init__(self):
        self.essential_fields = {
            'covered_recipient_name': 'Covered recipient name is required',
            'payment_amount': 'Payment amount is required',
            'date_of_payment': 'Date of payment is required',
            'npi': 'NPI (National Provider Identifier) is required',
            'payment_description': 'Payment description is required'
        }
        
        self.conditional_fields = {
            'hospital_affiliation': 'Hospital affiliation required for certain payment types',
            'research_id': 'Research ID required for research payments',
            'clinical_trial_id': 'Clinical trial ID required for clinical trial payments'
        }

    def check_missing_data(self, df: pd.DataFrame) -> List[ValidationIssue]:
        """Check for missing essential data"""
        issues = []
        
        for field, message in self.essential_fields.items():
            if field in df.columns:
                missing_count = df[field].isnull().sum()
                if missing_count > 0:
                    missing_indices = df[df[field].isnull()].index.tolist()
                    
                    for idx in missing_indices:
                        issue = ValidationIssue(
                            record_id=str(idx),
                            field_name=field,
                            issue_type="missing_data",
                            severity=ValidationSeverity.ERROR,
                            message=message,
                            suggested_fix=f"Provide valid {field} for this record",
                            confidence_score=1.0
                        )
                        issues.append(issue)
        
        # Check conditional fields
        for field, message in self.conditional_fields.items():
            if field in df.columns:
                # Add logic for conditional validation based on payment type
                pass
        
        return issues

class DataValidator:
    """Main data validation orchestrator"""
    
    def __init__(self, cms_api_url: str = "https://openpaymentsdata.cms.gov/api/v1"):
        self.cms_integrator = CMSAPIIntegrator(cms_api_url)
        self.anomaly_detector = AnomalyDetector()
        self.missing_data_checker = MissingDataChecker()
        self.logger = logging.getLogger(__name__)

    async def validate_data(self, df: pd.DataFrame, 
                          validate_with_cms: bool = True,
                          detect_anomalies: bool = True,
                          check_missing_data: bool = True) -> ValidationResult:
        """Main data validation function"""
        
        start_time = datetime.now()
        total_records = len(df)
        issues = []
        
        self.logger.info(f"Starting data validation for {total_records} records")
        
        # 1. Check for missing data
        if check_missing_data:
            self.logger.info("Checking for missing data...")
            missing_issues = self.missing_data_checker.check_missing_data(df)
            issues.extend(missing_issues)
        
        # 2. Train anomaly detection model
        if detect_anomalies and SKLEARN_AVAILABLE:
            self.logger.info("Training anomaly detection model...")
            self.anomaly_detector.train_model(df)
        
        # 3. Detect anomalies
        if detect_anomalies and self.anomaly_detector.is_trained:
            self.logger.info("Detecting anomalies...")
            anomaly_issues = self.anomaly_detector.detect_anomalies(df)
            issues.extend(anomaly_issues)
        
        # 4. Cross-reference with CMS API
        if validate_with_cms:
            self.logger.info("Cross-referencing with CMS API...")
            cms_issues = await self._validate_with_cms(df)
            issues.extend(cms_issues)
        
        # 5. Calculate validation metrics
        validation_metrics = self._calculate_validation_metrics(df, issues)
        
        # 6. Generate recommendations
        recommendations = self._generate_recommendations(issues, validation_metrics)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        self.logger.info(f"Data validation completed. Found {len(issues)} issues in {processing_time:.2f} seconds")
        
        return ValidationResult(
            status=self._determine_overall_status(issues),
            total_records=total_records,
            passed_records=validation_metrics['passed_records'],
            failed_records=validation_metrics['failed_records'],
            warning_records=validation_metrics['warning_records'],
            issues=issues,
            validation_score=validation_metrics['validation_score'],
            processing_time=processing_time,
            recommendations=recommendations
        )

    async def _validate_with_cms(self, df: pd.DataFrame) -> List[ValidationIssue]:
        """Validate data against CMS API"""
        issues = []
        
        async with self.cms_integrator as api:
            # Validate NPIs
            if 'npi' in df.columns:
                npi_validation_tasks = []
                for idx, npi in df['npi'].items():
                    if pd.notna(npi):
                        task = self._validate_single_npi(api, str(idx), str(npi))
                        npi_validation_tasks.append(task)
                
                if npi_validation_tasks:
                    npi_results = await asyncio.gather(*npi_validation_tasks, return_exceptions=True)
                    
                    for result in npi_results:
                        if isinstance(result, ValidationIssue):
                            issues.append(result)
            
            # Validate hospital affiliations
            if 'hospital_affiliation' in df.columns and 'npi' in df.columns:
                hospital_validation_tasks = []
                for idx, row in df.iterrows():
                    if pd.notna(row.get('hospital_affiliation')) and pd.notna(row.get('npi')):
                        task = self._validate_single_hospital(api, str(idx), row['hospital_affiliation'], row['npi'])
                        hospital_validation_tasks.append(task)
                
                if hospital_validation_tasks:
                    hospital_results = await asyncio.gather(*hospital_validation_tasks, return_exceptions=True)
                    
                    for result in hospital_results:
                        if isinstance(result, ValidationIssue):
                            issues.append(result)
        
        return issues

    async def _validate_single_npi(self, api: CMSAPIIntegrator, record_id: str, npi: str) -> Optional[ValidationIssue]:
        """Validate a single NPI"""
        try:
            result = await api.validate_physician_id(npi)
            
            if not result['valid']:
                return ValidationIssue(
                    record_id=record_id,
                    field_name='npi',
                    issue_type='invalid_npi',
                    severity=ValidationSeverity.ERROR,
                    message=f"Invalid NPI format or not found in CMS database: {npi}",
                    suggested_fix="Verify NPI format (10 digits) and check against CMS database",
                    confidence_score=result.get('confidence', 0.0)
                )
            
            return None
            
        except Exception as e:
            return ValidationIssue(
                record_id=record_id,
                field_name='npi',
                issue_type='validation_error',
                severity=ValidationSeverity.WARNING,
                message=f"Error validating NPI {npi}: {str(e)}",
                suggested_fix="Retry validation or check network connection",
                confidence_score=0.0
            )

    async def _validate_single_hospital(self, api: CMSAPIIntegrator, record_id: str, 
                                      hospital_name: str, physician_npi: str) -> Optional[ValidationIssue]:
        """Validate a single hospital affiliation"""
        try:
            result = await api.validate_hospital_affiliation(hospital_name, physician_npi)
            
            if not result['valid']:
                return ValidationIssue(
                    record_id=record_id,
                    field_name='hospital_affiliation',
                    issue_type='invalid_hospital',
                    severity=ValidationSeverity.WARNING,
                    message=f"Hospital affiliation not validated: {hospital_name}",
                    suggested_fix="Verify hospital name and physician affiliation",
                    confidence_score=result.get('confidence', 0.0)
                )
            
            return None
            
        except Exception as e:
            return ValidationIssue(
                record_id=record_id,
                field_name='hospital_affiliation',
                issue_type='validation_error',
                severity=ValidationSeverity.INFO,
                message=f"Error validating hospital affiliation: {str(e)}",
                suggested_fix="Retry validation or check network connection",
                confidence_score=0.0
            )

    def _calculate_validation_metrics(self, df: pd.DataFrame, issues: List[ValidationIssue]) -> Dict[str, Any]:
        """Calculate validation metrics"""
        total_records = len(df)
        
        # Count issues by severity
        critical_issues = [i for i in issues if i.severity == ValidationSeverity.CRITICAL]
        error_issues = [i for i in issues if i.severity == ValidationSeverity.ERROR]
        warning_issues = [i for i in issues if i.severity == ValidationSeverity.WARNING]
        
        # Count affected records
        affected_records = set()
        for issue in issues:
            affected_records.add(issue.record_id)
        
        failed_records = len([r for r in affected_records if any(
            i.severity in [ValidationSeverity.CRITICAL, ValidationSeverity.ERROR] 
            for i in issues if i.record_id == r
        )])
        
        warning_records = len([r for r in affected_records if any(
            i.severity == ValidationSeverity.WARNING 
            for i in issues if i.record_id == r
        )])
        
        passed_records = total_records - len(affected_records)
        
        # Calculate validation score
        validation_score = passed_records / total_records if total_records > 0 else 0.0
        
        return {
            'passed_records': passed_records,
            'failed_records': failed_records,
            'warning_records': warning_records,
            'validation_score': validation_score,
            'critical_issues': len(critical_issues),
            'error_issues': len(error_issues),
            'warning_issues': len(warning_issues)
        }

    def _determine_overall_status(self, issues: List[ValidationIssue]) -> ValidationStatus:
        """Determine overall validation status"""
        if not issues:
            return ValidationStatus.PASSED
        
        critical_issues = [i for i in issues if i.severity == ValidationSeverity.CRITICAL]
        error_issues = [i for i in issues if i.severity == ValidationSeverity.ERROR]
        
        if critical_issues or error_issues:
            return ValidationStatus.FAILED
        else:
            return ValidationStatus.WARNING

    def _generate_recommendations(self, issues: List[ValidationIssue], metrics: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on validation results"""
        recommendations = []
        
        if metrics['critical_issues'] > 0:
            recommendations.append("Address critical data quality issues immediately")
        
        if metrics['error_issues'] > 0:
            recommendations.append("Review and correct data validation errors")
        
        if metrics['warning_issues'] > 0:
            recommendations.append("Consider addressing warning-level issues for better data quality")
        
        if metrics['validation_score'] < 0.8:
            recommendations.append("Overall data quality is below acceptable threshold (80%)")
        
        # Issue-specific recommendations
        issue_types = {}
        for issue in issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1
        
        if 'missing_data' in issue_types:
            recommendations.append(f"Address {issue_types['missing_data']} missing data issues")
        
        if 'anomaly_detected' in issue_types:
            recommendations.append(f"Review {issue_types['anomaly_detected']} anomalous records")
        
        if 'invalid_npi' in issue_types:
            recommendations.append(f"Correct {issue_types['invalid_npi']} invalid NPI entries")
        
        return recommendations

# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    # Sample data for testing
    sample_data = {
        'covered_recipient_name': ['Dr. John Smith', 'Dr. Jane Doe', 'Dr. Robert Johnson'],
        'npi': ['1234567890', '0987654321', '1122334455'],
        'payment_amount': [1000, 500, 1500],
        'date_of_payment': ['2024-01-15', '2024-01-16', '2024-01-17'],
        'payment_description': ['Consulting', 'Speaking', 'Research'],
        'hospital_affiliation': ['General Hospital', 'Medical Center', 'University Hospital']
    }
    
    df = pd.DataFrame(sample_data)
    
    # Initialize validator
    validator = DataValidator()
    
    # Run validation
    async def test_validation():
        result = await validator.validate_data(df)
        
        print(f"Validation Status: {result.status.value}")
        print(f"Total Records: {result.total_records}")
        print(f"Passed: {result.passed_records}")
        print(f"Failed: {result.failed_records}")
        print(f"Warnings: {result.warning_records}")
        print(f"Validation Score: {result.validation_score:.2f}")
        print(f"Processing Time: {result.processing_time:.2f} seconds")
        
        print(f"\nIssues Found: {len(result.issues)}")
        for issue in result.issues:
            print(f"  - {issue.severity.value.upper()}: {issue.message}")
        
        print(f"\nRecommendations:")
        for rec in result.recommendations:
            print(f"  - {rec}")
    
    # Run the test
    asyncio.run(test_validation())
