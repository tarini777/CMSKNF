# Real CMS Data Integration Setup Guide

## 🔗 **Connecting to Real CMS Data Sources**

This guide will help you configure the Knowledge Nexus Framework to connect to real CMS data sources instead of using demo/mock data.

## 📋 **Prerequisites**

### 1. **CMS API Access Requirements**
- **CMS FHIR API**: Requires registration with CMS for API access
- **CMS Open Payments**: Public API, no authentication required
- **PubMed API**: Free NCBI E-utilities access
- **ClinicalTrials.gov**: Public API, no authentication required

### 2. **Required Credentials**
- CMS FHIR API Client ID and Secret
- Optional: PubMed API Key (for higher rate limits)
- Optional: ClinicalTrials.gov API Key

## 🛠️ **Configuration Steps**

### Step 1: Create Environment File

Create a `.env.local` file in the project root:

```bash
# =============================================================================
# CMS FHIR API CONFIGURATION - REAL DATA SOURCES
# =============================================================================

# CMS FHIR API Configuration
CMS_FHIR_BASE_URL=https://api.cms.gov/fhir/v1
CMS_FHIR_CLIENT_ID=your-cms-client-id-here
CMS_FHIR_CLIENT_SECRET=your-cms-client-secret-here
CMS_FHIR_SCOPE=system/Patient.read system/Coverage.read system/ExplanationOfBenefit.read system/Task.read system/Practitioner.read
CMS_FHIR_TOKEN_URL=https://api.cms.gov/oauth2/token
CMS_FHIR_API_VERSION=4.0.1

# =============================================================================
# CMS OPEN PAYMENTS API CONFIGURATION
# =============================================================================

# CMS Open Payments API (Public - No Auth Required)
CMS_OPEN_PAYMENTS_BASE_URL=https://openpaymentsdata.cms.gov/api/v1

# =============================================================================
# EXTERNAL API CONFIGURATION
# =============================================================================

# PubMed API (NCBI E-utilities)
PUBMED_BASE_URL=https://eutils.ncbi.nlm.nih.gov/entrez/eutils
PUBMED_API_KEY=your-pubmed-api-key-here

# ClinicalTrials.gov API
CLINICALTRIALS_BASE_URL=https://clinicaltrials.gov/api/v2
CLINICALTRIALS_API_KEY=your-clinicaltrials-api-key-here

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="24h"

# Session Configuration
SESSION_SECRET="your-session-secret-key-change-this-in-production"
SESSION_MAX_AGE="86400"

# Encryption Keys
ENCRYPTION_KEY="your-32-character-encryption-key-here"
DATA_ENCRYPTION_ENABLED="true"

# =============================================================================
# FILE UPLOAD CONFIGURATION
# =============================================================================

# File Upload Limits
MAX_FILE_SIZE="104857600"  # 100MB in bytes
MAX_FILES_PER_UPLOAD="10"
ALLOWED_FILE_TYPES=".csv,.xlsx,.xls"

# File Storage
FILE_STORAGE_PATH="./uploads/"
FILE_CLEANUP_ENABLED="true"
FILE_RETENTION_DAYS="30"

# =============================================================================
# MONITORING & ALERTING
# =============================================================================

# System Monitoring
MONITORING_ENABLED="true"
HEALTH_CHECK_INTERVAL="60000"
PERFORMANCE_MONITORING_ENABLED="true"

# Alert Configuration
ALERT_SEVERITY_LEVELS="low,medium,high,critical"
ALERT_ESCALATION_TIME="24"
ALERT_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# API Monitoring
API_MONITORING_ENABLED="true"
API_HEALTH_CHECK_INTERVAL="60000"
API_TIMEOUT_THRESHOLD="5000"

# =============================================================================
# CORS CONFIGURATION
# =============================================================================

CORS_ORIGIN="http://localhost:3000,https://your-domain.com"
CORS_CREDENTIALS="true"
```

### Step 2: Obtain CMS API Credentials

#### **CMS FHIR API Access**
1. **Register with CMS**: Visit [CMS API Portal](https://api.cms.gov/)
2. **Create Application**: Register your application for FHIR API access
3. **Get Credentials**: Obtain Client ID and Client Secret
4. **Update Environment**: Replace `your-cms-client-id-here` and `your-cms-client-secret-here`

#### **CMS Open Payments API**
- **No Authentication Required**: This is a public API
- **Base URL**: `https://openpaymentsdata.cms.gov/api/v1`
- **Rate Limits**: 1000 requests per hour

### Step 3: Configure External APIs

#### **PubMed API (NCBI E-utilities)**
1. **Get API Key**: Register at [NCBI](https://www.ncbi.nlm.nih.gov/account/)
2. **Rate Limits**: 3 requests per second without key, 10 requests per second with key
3. **Update Environment**: Replace `your-pubmed-api-key-here`

#### **ClinicalTrials.gov API**
1. **Get API Key**: Register at [ClinicalTrials.gov](https://clinicaltrials.gov/api/gui)
2. **Rate Limits**: 100 requests per minute
3. **Update Environment**: Replace `your-clinicaltrials-api-key-here`

### Step 4: Update API Services

The system will automatically detect real credentials and switch from demo mode to production mode.

## 🔍 **Verification Steps**

### 1. **Check API Health**
```bash
# Test CMS FHIR API
curl "http://localhost:3000/api/cms/fhir?action=health"

# Test Open Payments API
curl "http://localhost:3000/api/open-payments?action=health"

# Test PubMed API
curl "http://localhost:3000/api/pubmed?action=health"

# Test ClinicalTrials API
curl "http://localhost:3000/api/clinicaltrials?action=health"
```

### 2. **Monitor Dashboard**
- Visit: `http://localhost:3000`
- Check the Monitoring tab
- Verify all APIs show "Healthy" status
- No demo mode indicators should appear

### 3. **Test Real Data Queries**
```bash
# Test Open Payments search
curl "http://localhost:3000/api/open-payments?action=search&limit=10&programYear=2023"

# Test PubMed search
curl "http://localhost:3000/api/pubmed?action=search&query=diabetes&limit=10"

# Test ClinicalTrials search
curl "http://localhost:3000/api/clinicaltrials?action=search&condition=diabetes&limit=10"
```

## 🚨 **Important Notes**

### **Rate Limits**
- **CMS FHIR API**: 1000 requests per hour
- **Open Payments**: 1000 requests per hour
- **PubMed**: 3 requests per second (10 with API key)
- **ClinicalTrials**: 100 requests per minute

### **Data Privacy & Compliance**
- All real CMS data is subject to HIPAA compliance requirements
- Ensure proper data handling and storage
- Implement appropriate access controls
- Regular security audits recommended

### **Production Considerations**
- Use production-grade database (PostgreSQL/MySQL)
- Implement proper logging and monitoring
- Set up backup and disaster recovery
- Configure SSL/TLS certificates
- Implement rate limiting and caching

## 🔧 **Troubleshooting**

### **Common Issues**

1. **Authentication Failures**
   - Verify Client ID and Secret are correct
   - Check API endpoint URLs
   - Ensure proper scopes are requested

2. **Rate Limit Exceeded**
   - Implement request queuing
   - Add caching mechanisms
   - Consider API key upgrades

3. **Data Format Issues**
   - Verify FHIR version compatibility
   - Check data transformation logic
   - Validate response schemas

### **Debug Mode**
Enable debug logging by setting:
```bash
DEBUG=true
LOG_LEVEL=debug
```

## 📞 **Support Resources**

- **CMS API Documentation**: https://api.cms.gov/docs
- **FHIR R4 Specification**: https://hl7.org/fhir/R4/
- **Open Payments Documentation**: https://openpaymentsdata.cms.gov/
- **PubMed E-utilities**: https://www.ncbi.nlm.nih.gov/books/NBK25501/
- **ClinicalTrials API**: https://clinicaltrials.gov/api/gui

## ✅ **Success Indicators**

When properly configured, you should see:
- ✅ No "demo mode" messages in logs
- ✅ Real data responses from APIs
- ✅ All monitoring services showing "Healthy"
- ✅ Actual CMS compliance data processing
- ✅ Live Open Payments data integration

---

**Next Steps**: After configuration, restart the application and verify all APIs are connecting to real data sources.
