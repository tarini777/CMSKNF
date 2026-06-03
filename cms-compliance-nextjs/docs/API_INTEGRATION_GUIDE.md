# 🔗 CMS Compliance Platform - API Integration Guide

## 📖 Table of Contents

1. [Overview](#overview)
2. [CMS FHIR APIs](#cms-fhir-apis)
3. [PubMed Integration](#pubmed-integration)
4. [ClinicalTrials.gov Integration](#clinicaltrialsgov-integration)
5. [API Monitoring](#api-monitoring)
6. [Authentication & Security](#authentication--security)
7. [Rate Limiting & Best Practices](#rate-limiting--best-practices)
8. [Error Handling](#error-handling)
9. [Testing & Validation](#testing--validation)
10. [Troubleshooting](#troubleshooting)

## 🎯 Overview

The CMS Compliance Platform integrates with multiple external healthcare APIs to provide comprehensive data validation, research correlation, and compliance checking. This guide covers all integrated APIs and their usage patterns.

### Connectivity status (start here)

Run a full connectivity audit:

```bash
curl -s http://localhost:3000/api/connectivity | jq .
```

See [Connectivity Checklist](./CONNECTIVITY_CHECKLIST.md) and [International Reporting Rules](./INTERNATIONAL_REPORTING_RULES.md) for setup and outside-U.S. reporting rules.

### Integrated APIs

| API | Purpose | Status | Rate Limit |
|-----|---------|--------|------------|
| **CMS FHIR APIs** | Healthcare data validation | ✅ Active | Varies by endpoint |
| **PubMed (NCBI E-utilities)** | Medical research correlation | ✅ Active | 3 req/sec (10 with key) |
| **ClinicalTrials.gov** | Clinical trial data | ✅ Active | 100 req/min |

## 🏥 CMS FHIR APIs

### Overview

The platform integrates with multiple CMS FHIR APIs to provide comprehensive healthcare data validation and compliance checking.

### Available APIs

#### 1. **Patient Access API**
- **Purpose**: Patient data and coverage information
- **Endpoints**: Patient records, coverage details, benefits
- **Use Cases**: Patient validation, coverage verification

#### 2. **Provider Access API**
- **Purpose**: Provider information and claims data
- **Endpoints**: Provider directory, claims data, encounter information
- **Use Cases**: Provider validation, claims verification

#### 3. **Payer-to-Payer API**
- **Purpose**: Data exchange between payers
- **Endpoints**: Claims transfer, member data exchange
- **Use Cases**: Cross-payer data validation

#### 4. **Provider Directory API**
- **Purpose**: Provider directory information
- **Endpoints**: Provider listings, specialties, locations
- **Use Cases**: Provider directory lookups

#### 5. **Prior Authorization API (PARDD)**
- **Purpose**: Prior authorization data
- **Endpoints**: Authorization requests, decisions, documentation
- **Use Cases**: Prior authorization validation

### Implementation

```typescript
// Example: Validate CMS record using FHIR APIs
const validationResult = await cmsFHIRAPIService.validateCMSRecord(record)

// Example: Get patient coverage
const coverage = await cmsFHIRAPIService.getPatientCoverage(patientId)

// Example: Check provider directory
const provider = await cmsFHIRAPIService.getProviderDirectory(providerId)
```

### Configuration

```bash
# Environment variables
CMS_FHIR_BASE_URL="https://api.cms.gov/fhir/v1"
CMS_FHIR_CLIENT_ID="your-cms-fhir-client-id"
CMS_FHIR_CLIENT_SECRET="your-cms-fhir-client-secret"
CMS_FHIR_SCOPE="system/Patient.read system/Coverage.read"
CMS_FHIR_TOKEN_URL="https://api.cms.gov/oauth2/token"
```

## 📚 PubMed Integration

### Overview

Integration with PubMed through NCBI E-utilities provides access to the world's largest medical research database.

### E-utilities Supported

| Utility | Purpose | Endpoint |
|---------|---------|----------|
| **ESearch** | Search for PMIDs | `/esearch.fcgi` |
| **EFetch** | Retrieve article details | `/efetch.fcgi` |
| **ELink** | Find related articles | `/elink.fcgi` |
| **ESummary** | Get article summaries | `/esummary.fcgi` |
| **EInfo** | Database information | `/einfo.fcgi` |
| **ESpell** | Spelling suggestions | `/espell.fcgi` |
| **EGQuery** | Global query | `/egquery.fcgi` |

### Implementation

```typescript
// Example: Search PubMed articles
const searchResults = await pubmedAPIService.searchArticles({
  query: 'aspirin AND cardiovascular[mesh]',
  maxResults: 20,
  sortBy: 'relevance',
  dateRange: {
    startDate: '2020-01-01',
    endDate: '2024-12-31'
  }
})

// Example: Get article details
const article = await pubmedAPIService.getArticleDetails('32580960')

// Example: Find related articles
const related = await pubmedAPIService.getRelatedArticles('32580960')
```

### Search Capabilities

- **Field Tags**: `[ti]` (title), `[ab]` (abstract), `[au]` (author), `[mesh]` (MeSH terms)
- **Date Ranges**: `"2020:2024"[dp]` for publication dates
- **Publication Types**: `"Journal Article"[pt]`, `"Review"[pt]`
- **Languages**: `english[la]`, `spanish[la]`
- **Countries**: `"United States"[ad]`

### Configuration

```bash
# Environment variables
PUBMED_EUTILS_BASE_URL="https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
PUBMED_ESEARCH_URL="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_EFETCH_URL="https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
PUBMED_API_TIMEOUT="15000"
PUBMED_MAX_RESULTS="100"
PUBMED_RATE_LIMIT="3"
```

## 🔬 ClinicalTrials.gov Integration

### Overview

Integration with ClinicalTrials.gov provides access to clinical trial data and research information.

### API Versions

#### 1. **API v2 (Recommended)**
- **Base URL**: `https://clinicaltrials.gov/api/v2`
- **Features**: Modern REST API, comprehensive data
- **Status**: ✅ Active

#### 2. **Classic API (Legacy)**
- **Base URL**: `https://clinicaltrials.gov/api/query`
- **Features**: Legacy support, limited functionality
- **Status**: ⚠️ Deprecated

### Implementation

```typescript
// Example: Search clinical trials
const trials = await clinicalTrialsAPIService.searchTrials({
  searchTerms: 'aspirin AND cardiovascular',
  targetFields: ['NCTId', 'BriefTitle', 'Phase', 'Status'],
  maxStudies: 20,
  format: 'json',
  phase: 'Phase 3',
  status: 'Recruiting'
})

// Example: Get trial details
const trial = await clinicalTrialsAPIService.getTrialDetails('NCT12345678')

// Example: Track trial changes
const changes = await clinicalTrialsAPIService.trackTrialChanges(nctIds, previousData)
```

### Search Features

- **Conditions**: Search by medical conditions
- **Interventions**: Search by drugs, devices, procedures
- **Phases**: Phase 1, 2, 3, 4 filtering
- **Status**: Recruiting, Active, Completed, etc.
- **Locations**: Geographic filtering
- **Sponsors**: Search by study sponsors

### Configuration

```bash
# Environment variables
CLINICALTRIALS_API_BASE_URL="https://clinicaltrials.gov/api/v2"
CLINICALTRIALS_CLASSIC_API_URL="https://clinicaltrials.gov/api/query"
CLINICALTRIALS_API_TIMEOUT="20000"
CLINICALTRIALS_MAX_STUDIES="100"
CLINICALTRIALS_RATE_LIMIT="100"
```

## 📊 API Monitoring

### Real-Time Monitoring

The platform provides comprehensive monitoring of all integrated APIs.

### Monitoring Features

- **Health Checks**: Real-time API availability monitoring
- **Performance Tracking**: Response times and success rates
- **Error Tracking**: Error rates and failure patterns
- **Alert Management**: Intelligent alerting with escalation

### Monitoring Dashboard

```typescript
// Example: Get API health status
const healthStatus = await apiMonitoringService.getHealthStatus()

// Example: Get monitoring metrics
const metrics = await apiMonitoringService.getMetrics()
```

### Alert Types

- **Critical**: API completely down
- **High**: Performance degradation
- **Medium**: Minor issues
- **Low**: Informational alerts

## 🔐 Authentication & Security

### CMS FHIR APIs

```typescript
// OAuth 2.0 authentication
const authResult = await cmsFHIRAPIService.authenticate()
```

### PubMed & ClinicalTrials.gov

- **No Authentication Required**: Public APIs
- **Rate Limiting**: Implemented to respect API limits
- **User-Agent**: Required for identification

### Security Best Practices

1. **API Keys**: Store securely in environment variables
2. **Rate Limiting**: Implement proper rate limiting
3. **Error Handling**: Don't expose sensitive information
4. **Logging**: Log API usage for monitoring
5. **Validation**: Validate all API responses

## ⚡ Rate Limiting & Best Practices

### Rate Limits

| API | Limit | Implementation |
|-----|-------|----------------|
| **CMS FHIR** | Varies | OAuth token management |
| **PubMed** | 3 req/sec | Built-in rate limiter |
| **ClinicalTrials.gov** | 100 req/min | Request throttling |

### Best Practices

#### 1. **Request Optimization**
```typescript
// Use specific search terms
const searchTerms = 'aspirin[title] AND cardiovascular[mesh]'

// Implement pagination
const pageSize = 50
const results = await searchWithPagination(searchTerms, pageSize)

// Cache frequently accessed data
const cacheKey = `search_${searchTerms}_${pageSize}`
const cachedResults = await cache.get(cacheKey)
```

#### 2. **Error Handling**
```typescript
// Implement retry logic with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}
```

#### 3. **Data Validation**
```typescript
// Validate API responses
const validateResponse = (response) => {
  if (!response || !response.data) {
    throw new Error('Invalid API response')
  }
  return response
}
```

## 🚨 Error Handling

### Common Error Types

#### 1. **Network Errors**
- **Timeout**: Request exceeded timeout limit
- **Connection**: Network connectivity issues
- **DNS**: Domain resolution failures

#### 2. **API Errors**
- **Rate Limiting**: Too many requests
- **Authentication**: Invalid credentials
- **Validation**: Invalid request parameters

#### 3. **Data Errors**
- **Parsing**: Invalid response format
- **Validation**: Data doesn't meet requirements
- **Missing Data**: Required fields not present

### Error Handling Strategy

```typescript
// Comprehensive error handling
const handleAPIError = (error) => {
  if (error.code === 'RATE_LIMIT') {
    // Wait and retry
    return retryWithBackoff()
  } else if (error.code === 'AUTH_FAILED') {
    // Re-authenticate
    return reauthenticate()
  } else if (error.code === 'NETWORK_ERROR') {
    // Use fallback data
    return getFallbackData()
  } else {
    // Log and throw
    console.error('API Error:', error)
    throw error
  }
}
```

## 🧪 Testing & Validation

### API Testing

#### 1. **Health Check Tests**
```bash
# Test CMS FHIR API
curl "http://localhost:3000/api/cms/fhir?action=health"

# Test PubMed API
curl "http://localhost:3000/api/pubmed?action=health"

# Test ClinicalTrials API
curl "http://localhost:3000/api/clinicaltrials?action=health"
```

#### 2. **Search Tests**
```bash
# Test PubMed search
curl "http://localhost:3000/api/pubmed?action=search&query=aspirin&max=5"

# Test ClinicalTrials search
curl "http://localhost:3000/api/clinicaltrials?action=search&search=aspirin&max=5"
```

#### 3. **Integration Tests**
```bash
# Test CMS record integration
curl -X POST "http://localhost:3000/api/pubmed" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search_for_cms_record",
    "data": {
      "record": {
        "physicianSpecialty": "Cardiology",
        "natureOfPaymentOrTransferOfValue": "Consulting fee"
      }
    }
  }'
```

### Validation Checklist

- [ ] API endpoints responding correctly
- [ ] Authentication working properly
- [ ] Rate limiting implemented
- [ ] Error handling comprehensive
- [ ] Data parsing accurate
- [ ] Monitoring functioning
- [ ] Alerts configured properly

## 🔧 Troubleshooting

### Common Issues

#### 1. **API Authentication Failures**
- **Cause**: Invalid credentials or expired tokens
- **Solution**: Verify credentials and refresh tokens

#### 2. **Rate Limiting Errors**
- **Cause**: Exceeding API rate limits
- **Solution**: Implement proper rate limiting

#### 3. **Data Parsing Errors**
- **Cause**: Unexpected response format
- **Solution**: Add robust error handling

#### 4. **Network Timeouts**
- **Cause**: Slow network or API response
- **Solution**: Increase timeout values

### Diagnostic Tools

#### 1. **API Health Checks**
```bash
# Check all API health
curl "http://localhost:3000/api/monitoring/status?type=dashboard"
```

#### 2. **Performance Monitoring**
```bash
# Get API performance metrics
curl "http://localhost:3000/api/metrics"
```

#### 3. **Error Logging**
```bash
# Check application logs
tail -f logs/application.log
```

### Support Resources

- **CMS FHIR**: [Troubleshooting Guide](CMS_FHIR_TROUBLESHOOTING.md)
- **PubMed**: [Troubleshooting Guide](PUBMED_API_TROUBLESHOOTING.md)
- **ClinicalTrials**: [Troubleshooting Guide](CLINICALTRIALS_API_TROUBLESHOOTING.md)

---

**Last Updated**: September 7, 2025  
**Version**: 1.0.0  
**Next Review**: December 7, 2025
