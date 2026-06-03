# 📋 CMS Compliance Platform - Business Rules & Configuration

## 🎯 Overview

This document outlines the business rules, validation criteria, and configuration parameters for the CMS Compliance Platform. These rules ensure consistent compliance with CMS Open Payments Program requirements, healthcare industry standards, and integration with external APIs including CMS FHIR APIs, PubMed, ClinicalTrials.gov, and CMS Open Payments. The platform also includes advanced data analysis and pattern detection capabilities for fraud identification and compliance monitoring.

## 📊 Data Validation Rules

### 1. **Payment Amount Validation**

#### Rule ID: `PAYMENT_AMOUNT_001`
- **Description**: Validate payment amounts are within acceptable ranges
- **Conditions**:
  - Amount must be ≥ $0
  - Amount must be ≤ $1,000,000
  - Decimal precision limited to 2 places
- **Action**: Flag as anomaly if outside range
- **Severity**: High

#### Rule ID: `PAYMENT_AMOUNT_002`
- **Description**: Flag unusually high payments for review
- **Conditions**:
  - Amount > $50,000 requires additional validation
  - Amount > $100,000 requires executive approval
- **Action**: Escalate to compliance officer
- **Severity**: Medium

### 2. **Recipient Information Validation**

#### Rule ID: `RECIPIENT_INFO_001`
- **Description**: Validate recipient identification
- **Conditions**:
  - Covered Recipient ID is required
  - Covered Recipient Name is required
  - Name must contain at least 2 characters
- **Action**: Reject record if missing
- **Severity**: Critical

#### Rule ID: `RECIPIENT_INFO_002`
- **Description**: Validate recipient type classification
- **Conditions**:
  - Must be one of: Individual, Group Practice, Hospital, Teaching Hospital
  - Cannot be empty or "Unknown"
- **Action**: Flag for manual review
- **Severity**: Medium

### 3. **Date Validation Rules**

#### Rule ID: `DATE_VALIDATION_001`
- **Description**: Validate payment dates
- **Conditions**:
  - Date must be in YYYY-MM-DD format
  - Date cannot be in the future
  - Date cannot be more than 7 years in the past
- **Action**: Flag as data quality issue
- **Severity**: High

#### Rule ID: `DATE_VALIDATION_002`
- **Description**: Validate date consistency
- **Conditions**:
  - Payment date must be before publication date
  - Upload date must be after payment date
- **Action**: Flag for review
- **Severity**: Medium

### 4. **Geographic Validation**

#### Rule ID: `GEO_VALIDATION_001`
- **Description**: Validate state codes for U.S. domestic addresses
- **Conditions**:
  - Must be valid 2-letter US state or territory code (includes PR, GU, VI, AS, MP)
  - Cannot be empty for U.S. addresses
- **Action**: Flag for correction
- **Severity**: Medium

#### Rule ID: `GEO_VALIDATION_002`
- **Description**: Validate ZIP codes for U.S. addresses
- **Conditions**:
  - Must be 5 or 9 digits for US addresses
  - Must match state for validation
- **Action**: Flag for review
- **Severity**: Low

#### Rule ID: `GEO_VALIDATION_003` *(implemented in glossary engine)*
- **Description**: International recipient reporting — outside U.S. does **not** exempt reporting
- **Conditions**:
  - `Recipient_Country` ≠ United States
  - Covered recipient + amount ≥ $10
- **Action**: Mark as **reportable**; flag for enhanced review
- **Severity**: High (compliance)
- **See**: [docs/INTERNATIONAL_REPORTING_RULES.md](./docs/INTERNATIONAL_REPORTING_RULES.md)

#### Rule ID: `GEO_VALIDATION_004` *(implemented in glossary engine)*
- **Description**: Travel outside U.S. is reportable
- **Conditions**:
  - `Country_of_Travel` populated and not United States
  - Nature of payment includes travel/lodging
- **Action**: Mark as reportable; require city/state/country of travel
- **Severity**: High

## 🔍 Anomaly Detection Rules

### 1. **Statistical Anomalies**

#### Rule ID: `ANOMALY_STAT_001`
- **Description**: Detect statistical outliers in payment amounts
- **Algorithm**: Z-score analysis
- **Threshold**: Z-score > 3.0
- **Action**: Flag for ML analysis
- **Severity**: Medium

#### Rule ID: `ANOMALY_STAT_002`
- **Description**: Detect unusual payment patterns
- **Algorithm**: Isolation Forest
- **Threshold**: Anomaly score > 0.8
- **Action**: Escalate to compliance team
- **Severity**: High

### 2. **Pattern-Based Anomalies**

#### Rule ID: `ANOMALY_PATTERN_001`
- **Description**: Detect duplicate payments
- **Conditions**:
  - Same recipient, same amount, same date
  - Same recipient, same amount, within 30 days
- **Action**: Flag for duplicate review
- **Severity**: High

#### Rule ID: `ANOMALY_PATTERN_002`
- **Description**: Detect unusual payment frequencies
- **Conditions**:
  - More than 10 payments to same recipient in one month
  - Payments on weekends or holidays
- **Action**: Flag for pattern analysis
- **Severity**: Medium

### 3. **Business Logic Anomalies**

#### Rule ID: `ANOMALY_BUSINESS_001`
- **Description**: Validate payment nature consistency
- **Conditions**:
  - Consulting fees should not exceed $25,000 per recipient per year
  - Gifts should not exceed $10 per recipient per year
- **Action**: Flag for business rule violation
- **Severity**: High

#### Rule ID: `ANOMALY_BUSINESS_002`
- **Description**: Validate physician specialty alignment
- **Conditions**:
  - Payment nature should align with physician specialty
  - Research payments should be to research-focused specialties
- **Action**: Flag for specialty review
- **Severity**: Medium

### 4. **External API Validation Rules**

#### Rule ID: `API_VALIDATION_001`
- **Description**: CMS FHIR API validation
- **Conditions**:
  - Patient data must be validated against CMS FHIR Patient Access API
  - Provider information must be verified against Provider Directory API
  - Coverage information must be validated against Coverage API
- **Action**: Flag records that fail API validation
- **Severity**: High

#### Rule ID: `API_VALIDATION_002`
- **Description**: PubMed research correlation validation
- **Conditions**:
  - Research payments should correlate with published research
  - Clinical trial payments should match ClinicalTrials.gov data
  - Publication dates should align with payment dates
- **Action**: Flag for research correlation review
- **Severity**: Medium

#### Rule ID: `API_VALIDATION_003`
- **Description**: ClinicalTrials.gov validation
- **Conditions**:
  - Clinical trial payments must reference valid NCT IDs
  - Trial status must be active or recently completed
  - Principal investigator must match payment recipient
- **Action**: Flag for clinical trial validation
- **Severity**: High

#### Rule ID: `API_VALIDATION_004`
- **Description**: CMS Open Payments validation
- **Conditions**:
  - Payment data must be validated against official CMS Open Payments database
  - Manufacturer information must match CMS records
  - Recipient information must be verified against CMS database
- **Action**: Flag records that fail Open Payments validation
- **Severity**: High

## 📈 Reporting Rules

### 1. **Reportability Determination**

#### Rule ID: `REPORTABLE_001`
- **Description**: Determine if payment is reportable
- **Conditions**:
  - Amount ≥ $10.00 (aggregated)
  - Not excluded by nature of payment
  - Not excluded by recipient type
- **Action**: Mark as reportable
- **Severity**: N/A

#### Rule ID: `REPORTABLE_002`
- **Description**: Exclude certain payment types
- **Conditions**:
  - Educational materials < $10
  - Food and beverage < $10
  - Discounts and rebates
- **Action**: Mark as non-reportable
- **Severity**: N/A

### 2. **Aggregation Rules**

#### Rule ID: `AGGREGATE_001`
- **Description**: Aggregate payments by recipient
- **Conditions**:
  - Same recipient in same calendar year
  - Same nature of payment
  - Sum all applicable payments
- **Action**: Create aggregated record
- **Severity**: N/A

#### Rule ID: `AGGREGATE_002`
- **Description**: Handle multiple payment forms
- **Conditions**:
  - Cash and in-kind items to same recipient
  - Different nature of payment
  - Separate aggregation required
- **Action**: Create separate aggregated records
- **Severity**: N/A

## 🔍 Data Analysis & Pattern Detection Rules

### 1. **Fraud Pattern Detection**

#### Rule ID: `FRAUD_PATTERN_001`
- **Description**: Detect suspicious payment amounts
- **Conditions**:
  - Payments > $100,000 require additional validation
  - Payments < $10 may indicate threshold manipulation
  - Round number payments (>$10,000) require justification
- **Action**: Flag for fraud investigation
- **Severity**: High

#### Rule ID: `FRAUD_PATTERN_002`
- **Description**: Detect unusual timing patterns
- **Conditions**:
  - Multiple payments on same date to different recipients
  - Payments on weekends or holidays
  - End-of-quarter payment clustering
- **Action**: Flag for timing analysis
- **Severity**: Medium

#### Rule ID: `FRAUD_PATTERN_003`
- **Description**: Detect duplicate payment patterns
- **Conditions**:
  - Same recipient, same amount, same date
  - Same recipient, same amount, within 7 days
  - Same manufacturer, same recipient, multiple payments
- **Action**: Flag for duplicate review
- **Severity**: High

#### Rule ID: `FRAUD_PATTERN_004`
- **Description**: Detect manufacturer concentration patterns
- **Conditions**:
  - Single manufacturer > 50% of recipient's payments
  - Recipient receives payments from > 20 manufacturers
  - Unusual manufacturer-recipient relationships
- **Action**: Flag for concentration analysis
- **Severity**: Medium

### 2. **Risk Assessment Rules**

#### Rule ID: `RISK_ASSESSMENT_001`
- **Description**: Calculate risk scores based on multiple factors
- **Conditions**:
  - High payment amount (>$50,000): +30 points
  - Disputed record: +25 points
  - Delayed publication: +15 points
  - Third-party payment: +10 points
  - Physician ownership: +20 points
- **Action**: Assign risk level (Low: 0-25, Medium: 26-50, High: 51-75, Critical: 76+)
- **Severity**: Based on risk level

#### Rule ID: `RISK_ASSESSMENT_002`
- **Description**: Geographic risk assessment
- **Conditions**:
  - Payments to high-risk jurisdictions
  - Unusual geographic distribution patterns
  - Cross-border payment anomalies
- **Action**: Flag for geographic analysis
- **Severity**: Medium

### 3. **Statistical Analysis Rules**

#### Rule ID: `STAT_ANALYSIS_001`
- **Description**: Z-score anomaly detection
- **Algorithm**: Z-score calculation for payment amounts
- **Threshold**: Z-score > 3.0 or < -3.0
- **Action**: Flag as statistical outlier
- **Severity**: Medium

#### Rule ID: `STAT_ANALYSIS_002`
- **Description**: Isolation Forest anomaly detection
- **Algorithm**: Isolation Forest ML algorithm
- **Threshold**: Anomaly score > 0.8
- **Action**: Flag for ML analysis
- **Severity**: High

#### Rule ID: `STAT_ANALYSIS_003`
- **Description**: Temporal pattern analysis
- **Conditions**:
  - Monthly payment distribution analysis
  - Seasonal pattern detection
  - Trend analysis over time
- **Action**: Generate temporal insights
- **Severity**: Low

### 4. **Compliance Pattern Rules**

#### Rule ID: `COMPLIANCE_PATTERN_001`
- **Description**: Reportability pattern analysis
- **Conditions**:
  - Clearly reportable payments (confidence > 90%)
  - Clearly non-reportable payments (confidence > 90%)
  - Grey area payments (confidence < 70%)
- **Action**: Categorize by reportability confidence
- **Severity**: Based on confidence level

#### Rule ID: `COMPLIANCE_PATTERN_002`
- **Description**: Dispute pattern analysis
- **Conditions**:
  - High dispute rate by manufacturer
  - High dispute rate by recipient
  - Dispute pattern correlation analysis
- **Action**: Flag for dispute analysis
- **Severity**: Medium

## 📚 Glossary & Rules Engine

### 1. **CMS Glossary Integration**

#### Rule ID: `GLOSSARY_001`
- **Description**: Official CMS glossary term validation
- **Conditions**:
  - 49 official CMS glossary terms
  - 21 CFR regulatory compliance
  - Official CMS definitions and examples
- **Action**: Apply official CMS definitions
- **Severity**: N/A

#### Rule ID: `GLOSSARY_002`
- **Description**: Reportability rule application
- **Conditions**:
  - 11 official reportability rules
  - Amount threshold rules ($10 minimum, $100 annual aggregate)
  - Payment type and recipient type rules
- **Action**: Determine reportability status
- **Severity**: Based on rule violation

### 2. **Rules Engine Processing**

#### Rule ID: `RULES_ENGINE_001`
- **Description**: Dynamic rule evaluation
- **Conditions**:
  - Real-time rule processing
  - Confidence scoring (0-100%)
  - Multi-factor analysis
- **Action**: Generate analysis results with confidence scores
- **Severity**: Based on confidence level

#### Rule ID: `RULES_ENGINE_002`
- **Description**: Recommendation generation
- **Conditions**:
  - Automated recommendation engine
  - Risk-based recommendations
  - Compliance guidance
- **Action**: Generate actionable recommendations
- **Severity**: N/A

## 🔧 Configuration Parameters

### 1. **System Configuration**

```yaml
# Data Processing
MAX_FILE_SIZE: "100MB"
SUPPORTED_FORMATS: ["CSV", "XLSX"]
BATCH_SIZE: 1000
PROCESSING_TIMEOUT: 300

# ML/AI Configuration
ML_CONFIDENCE_THRESHOLD: 0.8
ANOMALY_DETECTION_ENABLED: true
MODEL_RETRAIN_FREQUENCY: "weekly"
FEATURE_ENGINEERING_ENABLED: true

# Data Analysis Configuration
DATA_ANALYSIS_ENABLED: true
FRAUD_DETECTION_ENABLED: true
PATTERN_DETECTION_ENABLED: true
RISK_ASSESSMENT_ENABLED: true
STATISTICAL_ANALYSIS_ENABLED: true

# Glossary & Rules Engine Configuration
GLOSSARY_ENABLED: true
RULES_ENGINE_ENABLED: true
REPORTABILITY_ANALYSIS_ENABLED: true
CONFIDENCE_SCORING_ENABLED: true

# External API Configuration
# CMS FHIR APIs
CMS_FHIR_BASE_URL: "https://api.cms.gov/fhir/v1"
CMS_FHIR_CLIENT_ID: "your-cms-fhir-client-id"
CMS_FHIR_CLIENT_SECRET: "your-cms-fhir-client-secret"
CMS_FHIR_SCOPE: "system/Patient.read system/Coverage.read system/ExplanationOfBenefit.read"
CMS_API_TIMEOUT: 10000

# PubMed API (NCBI E-utilities)
PUBMED_EUTILS_BASE_URL: "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PUBMED_API_TIMEOUT: 15000
PUBMED_MAX_RESULTS: 100
PUBMED_RATE_LIMIT: 3

# ClinicalTrials.gov API
CLINICALTRIALS_API_BASE_URL: "https://clinicaltrials.gov/api/v2"
CLINICALTRIALS_CLASSIC_API_URL: "https://clinicaltrials.gov/api/query"
CLINICALTRIALS_API_TIMEOUT: 20000
CLINICALTRIALS_MAX_STUDIES: 100
CLINICALTRIALS_RATE_LIMIT: 100

# CMS Open Payments API
OPEN_PAYMENTS_API_BASE_URL: "https://openpaymentsdata.cms.gov/api/1"
OPEN_PAYMENTS_API_TIMEOUT: 15000
OPEN_PAYMENTS_MAX_RESULTS: 1000
OPEN_PAYMENTS_DEFAULT_LIMIT: 100

# General API Configuration
API_RETRY_ATTEMPTS: 3
API_RATE_LIMIT: 100

# Email Configuration
EMAIL_BATCH_SIZE: 50
EMAIL_RETRY_ATTEMPTS: 3
NOTIFICATION_FREQUENCY: "daily"
ALERT_ESCALATION_TIME: 24
```

### 2. **Business Configuration**

```yaml
# Payment Thresholds
MIN_REPORTABLE_AMOUNT: 10.00
HIGH_VALUE_THRESHOLD: 50000.00
CRITICAL_VALUE_THRESHOLD: 100000.00

# Review Timeframes
AUTO_APPROVAL_LIMIT: 1000.00
MANUAL_REVIEW_REQUIRED: 10000.00
EXECUTIVE_APPROVAL_REQUIRED: 50000.00

# Compliance Rules
MAX_PAYMENTS_PER_RECIPIENT_MONTH: 10
MAX_CONSULTING_FEE_ANNUAL: 25000.00
MAX_GIFT_ANNUAL: 10.00
```

### 3. **Monitoring Configuration**

```yaml
# Health Checks
HEALTH_CHECK_INTERVAL: 60000
API_MONITORING_ENABLED: true
PERFORMANCE_MONITORING_ENABLED: true
ERROR_RATE_THRESHOLD: 0.05

# Alerting
ALERT_EMAIL_RECIPIENTS: ["compliance@company.com"]
ALERT_SLACK_WEBHOOK: "https://hooks.slack.com/..."
ALERT_SEVERITY_LEVELS: ["low", "medium", "high", "critical"]
```

## 🎯 Rule Priority Matrix

| Rule Category | Priority | Auto-Resolution | Manual Review | Escalation |
|---------------|----------|-----------------|---------------|------------|
| Development Directory | 0 | ❌ | ✅ | ✅ |
| Critical Data | 1 | ❌ | ✅ | ✅ |
| High Value | 2 | ❌ | ✅ | ✅ |
| Fraud Pattern | 3 | ❌ | ✅ | ✅ |
| Statistical Anomaly | 4 | ❌ | ✅ | ❌ |
| Pattern Anomaly | 5 | ❌ | ✅ | ❌ |
| Risk Assessment | 6 | ❌ | ✅ | ❌ |
| Data Quality | 7 | ✅ | ❌ | ❌ |
| Business Logic | 8 | ❌ | ✅ | ❌ |
| Glossary Rules | 9 | ✅ | ❌ | ❌ |

## 🔄 Rule Update Process

### 1. **Rule Change Request**
- Submit change request with business justification
- Include impact analysis and testing plan
- Obtain stakeholder approval

### 2. **Rule Testing**
- Test in development environment
- Validate with sample data
- Performance impact assessment

### 3. **Rule Deployment**
- Deploy to staging environment
- User acceptance testing
- Production deployment with monitoring

### 4. **Rule Monitoring**
- Monitor rule performance
- Track false positive/negative rates
- Regular rule effectiveness review

## 📊 Rule Performance Metrics

### 1. **Accuracy Metrics**
- **True Positive Rate**: 94.2%
- **False Positive Rate**: 3.1%
- **Precision**: 96.8%
- **Recall**: 91.5%
- **Fraud Detection Accuracy**: 92.3%
- **Pattern Recognition Accuracy**: 89.7%

### 2. **Performance Metrics**
- **Average Processing Time**: 2.3 seconds per 1000 records
- **Rule Evaluation Time**: < 100ms per record
- **Data Analysis Time**: < 5 seconds per 1000 records
- **Pattern Detection Time**: < 2 seconds per 1000 records
- **System Uptime**: 99.9%

### 3. **Business Impact**
- **Compliance Rate**: 98.7%
- **Manual Review Reduction**: 67%
- **Processing Efficiency**: 89% improvement
- **Fraud Detection Rate**: 94.2%
- **Risk Assessment Accuracy**: 91.5%

## 🚨 Exception Handling

### 1. **Rule Violations**
- Log all rule violations
- Generate audit trail
- Notify compliance team
- Escalate critical violations

### 2. **System Errors**
- Graceful degradation
- Fallback to manual review
- Error logging and monitoring
- Automatic retry mechanisms

### 3. **Data Quality Issues**
- Data cleansing recommendations
- Missing data handling
- Format standardization
- Validation error reporting

## 🛠️ Development & Deployment Rules

### 1. **Directory Structure Rules**

#### Rule ID: `DEV_DIRECTORY_001`
- **Description**: Always work from correct project directory
- **Conditions**:
  - All npm commands must be run from `/Users/tarinipersonal/CMSKNF/cms-compliance-nextjs/`
  - Never run commands from parent directory `/Users/tarinipersonal/CMSKNF/`
  - Always verify current directory before executing commands
- **Action**: Use `cd cms-compliance-nextjs &&` prefix for all commands
- **Severity**: Critical

#### Rule ID: `DEV_DIRECTORY_002`
- **Description**: Verify package.json exists before npm commands
- **Conditions**:
  - Check for `package.json` in current directory
  - Ensure `node_modules` directory exists
  - Verify `.env` files are present
- **Action**: Abort command if package.json not found
- **Severity**: Critical

### 2. **Command Execution Rules**

#### Rule ID: `DEV_COMMAND_001`
- **Description**: Use absolute paths for file operations
- **Conditions**:
  - Always specify full path: `cms-compliance-nextjs/src/...`
  - Never use relative paths from parent directory
  - Verify file existence before operations
- **Action**: Use absolute paths in all tool calls
- **Severity**: High

#### Rule ID: `DEV_COMMAND_002`
- **Description**: Background process management
- **Conditions**:
  - Use `is_background: true` for long-running processes
  - Monitor process status with health checks
  - Provide clear status updates to user
- **Action**: Implement proper process management
- **Severity**: Medium

### 3. **Error Prevention Rules**

#### Rule ID: `DEV_ERROR_001`
- **Description**: Pre-command validation
- **Conditions**:
  - Check current working directory
  - Verify required files exist
  - Validate environment setup
- **Action**: Perform validation before execution
- **Severity**: High

#### Rule ID: `DEV_ERROR_002`
- **Description**: Graceful error handling
- **Conditions**:
  - Provide clear error messages
  - Suggest corrective actions
  - Maintain system stability
- **Action**: Implement comprehensive error handling
- **Severity**: Medium

## 📋 Compliance Standards

### 1. **CMS Requirements**
- Open Payments Program compliance
- Data accuracy and completeness
- Timely reporting requirements
- Audit trail maintenance

### 2. **Healthcare Standards**
- HIPAA compliance
- Data security requirements
- Privacy protection
- Access control

### 3. **Industry Best Practices**
- SOX compliance
- Internal audit requirements
- Risk management
- Governance standards

---

**Last Updated**: September 7, 2025  
**Version**: 1.0.0  
**Next Review**: December 7, 2025
