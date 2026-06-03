# 🔬 ClinicalTrials.gov API Integration - Troubleshooting Guide

## 🎯 Overview

This guide provides comprehensive troubleshooting steps for the ClinicalTrials.gov API integration, covering both the new API v2 and the classic API for backward compatibility.

## 🚨 Common Issues & Solutions

### 1. **API Endpoint Issues**

#### **Issue**: `ClinicalTrials API request failed: 404 Not Found`

**Possible Causes:**
- Incorrect API endpoint URL
- API version mismatch
- Deprecated endpoint usage

**Solutions:**
```bash
# 1. Verify API endpoints
# New API v2: https://clinicaltrials.gov/api/v2/studies
# Classic API: https://clinicaltrials.gov/api/query/study_fields

# 2. Test basic connectivity
curl -H "Accept: application/json" \
  "https://clinicaltrials.gov/api/v2/studies?query.term=aspirin&pageSize=1"

# 3. Check API version compatibility
# Ensure using the correct API version for your use case
```

#### **Issue**: `ClinicalTrials API request failed: 403 Forbidden`

**Possible Causes:**
- Rate limiting exceeded
- Invalid request format
- Missing required headers

**Solutions:**
```bash
# 1. Check rate limits
# ClinicalTrials.gov allows 100 requests per minute
# Implement proper rate limiting in your application

# 2. Verify request headers
curl -H "Accept: application/json" \
  -H "User-Agent: CMS-Compliance-Platform/1.0" \
  "https://clinicaltrials.gov/api/v2/studies?query.term=aspirin"

# 3. Check request format
# Ensure proper URL encoding and parameter format
```

### 2. **Search Parameter Issues**

#### **Issue**: Search returns no results

**Possible Causes:**
- Invalid search terms
- Incorrect parameter format
- API response parsing issues

**Solutions:**
```typescript
// 1. Test with simple search terms
const searchParams = {
  searchTerms: "aspirin",
  targetFields: ["NCTId", "BriefTitle"],
  maxStudies: 10,
  format: "json" as const
}

// 2. Verify parameter format
const queryParams = new URLSearchParams()
queryParams.append('query.term', searchParams.searchTerms)
queryParams.append('pageSize', searchParams.maxStudies.toString())

// 3. Check response parsing
const response = await fetch(`${API_BASE}/studies?${queryParams}`)
const data = await response.json()
console.log('API Response:', data)
```

#### **Issue**: Search returns unexpected results

**Possible Causes:**
- Search term too broad or too specific
- Incorrect field mapping
- API response format changes

**Solutions:**
```typescript
// 1. Refine search terms
const searchTerms = "aspirin AND cardiovascular" // More specific
const searchTerms = "aspirin OR acetylsalicylic" // Broader search

// 2. Use filters for better results
const searchParams = {
  searchTerms: "aspirin",
  phase: "Phase 3",
  status: "Recruiting",
  condition: "cardiovascular",
  maxStudies: 20,
  format: "json" as const
}

// 3. Validate field mappings
const fieldMappings = {
  'NCTId': 'nctId',
  'BriefTitle': 'briefTitle',
  'Phase': 'phase',
  'Status': 'status'
}
```

### 3. **Data Parsing Issues**

#### **Issue**: Parsed data is incomplete or incorrect

**Possible Causes:**
- API response format changes
- Incorrect field extraction
- Missing data in API response

**Solutions:**
```typescript
// 1. Log raw API response
console.log('Raw API Response:', JSON.stringify(data, null, 2))

// 2. Validate field extraction
const parseTrialData = (study: any) => {
  const protocolSection = study.protocolSection || {}
  const identificationModule = protocolSection.identificationModule || {}
  
  return {
    nctId: identificationModule.nctId || 'N/A',
    briefTitle: identificationModule.briefTitle || 'N/A',
    // Add fallback values for all fields
  }
}

// 3. Handle missing data gracefully
const safeExtract = (obj: any, path: string, defaultValue: any = 'N/A') => {
  return path.split('.').reduce((current, key) => 
    current && current[key] !== undefined ? current[key] : defaultValue, obj
  )
}
```

### 4. **Performance Issues**

#### **Issue**: Slow API response times

**Possible Causes:**
- Large result sets
- Inefficient queries
- Network latency

**Solutions:**
```typescript
// 1. Implement pagination
const searchWithPagination = async (searchParams: any, pageSize = 50) => {
  const results = []
  let page = 1
  
  while (results.length < searchParams.maxStudies) {
    const pageResults = await searchTrials({
      ...searchParams,
      page,
      pageSize: Math.min(pageSize, searchParams.maxStudies - results.length)
    })
    
    results.push(...pageResults)
    if (pageResults.length < pageSize) break
    page++
  }
  
  return results
}

// 2. Use specific filters
const optimizedSearch = {
  searchTerms: "aspirin",
  phase: "Phase 3", // Filter by phase
  status: "Recruiting", // Filter by status
  maxStudies: 20, // Limit results
  format: "json" as const
}

// 3. Implement caching
const cache = new Map()
const getCachedResults = (key: string) => {
  const cached = cache.get(key)
  if (cached && cached.expiry > Date.now()) {
    return cached.data
  }
  return null
}
```

### 5. **Error Handling**

#### **Issue**: Unhandled API errors

**Solutions:**
```typescript
// 1. Implement comprehensive error handling
const searchTrialsWithErrorHandling = async (searchParams: any) => {
  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CMS-Compliance-Platform/1.0'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait and retry
        await new Promise(resolve => setTimeout(resolve, 60000))
        return await searchTrialsWithErrorHandling(searchParams)
      } else if (response.status === 404) {
        // Try fallback API
        return await searchTrialsClassic(searchParams)
      } else {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }
    }

    const data = await response.json()
    return parseAPIResponse(data, searchParams)
  } catch (error) {
    console.error('ClinicalTrials API error:', error)
    // Return mock data for development
    return getMockClinicalTrials(searchParams)
  }
}

// 2. Implement retry logic with exponential backoff
const retryWithBackoff = async (fn: Function, maxRetries = 3) => {
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

## 🔍 Diagnostic Tools

### 1. **API Health Check**

```bash
# Test API connectivity
curl -X GET "http://localhost:3000/api/clinicaltrials?action=health"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "isHealthy": true,
#     "responseTime": 250,
#     "lastCheck": "2024-09-07T17:30:00.000Z"
#   }
# }
```

### 2. **Search Test**

```bash
# Test basic search
curl -X GET "http://localhost:3000/api/clinicaltrials?action=search&search=aspirin&max=5"

# Test with filters
curl -X POST "http://localhost:3000/api/clinicaltrials" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "data": {
      "searchParams": {
        "searchTerms": "aspirin AND cardiovascular",
        "targetFields": ["NCTId", "BriefTitle", "Phase", "Status"],
        "maxStudies": 10,
        "format": "json",
        "phase": "Phase 3",
        "status": "Recruiting"
      }
    }
  }'
```

### 3. **Trial Details Test**

```bash
# Test trial details retrieval
curl -X POST "http://localhost:3000/api/clinicaltrials" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_trial_details",
    "data": {
      "nctId": "NCT12345678"
    }
  }'
```

### 4. **CMS Record Integration Test**

```bash
# Test CMS record integration
curl -X POST "http://localhost:3000/api/clinicaltrials" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search_for_cms_record",
    "data": {
      "record": {
        "id": "test-record",
        "physicianSpecialty": "Cardiology",
        "natureOfPaymentOrTransferOfValue": "Consulting fee",
        "coveredRecipientName": "Dr. Smith"
      }
    }
  }'
```

## 📊 Monitoring & Logging

### 1. **Enable Debug Logging**

```typescript
// Add to your environment configuration
DEBUG_ENABLED="true"
LOG_LEVEL="debug"
VERBOSE_LOGGING="true"
```

### 2. **Monitor API Performance**

```typescript
// Add performance monitoring
const startTime = Date.now()
const results = await clinicalTrialsAPIService.searchTrials(searchParams)
const responseTime = Date.now() - startTime

console.log(`ClinicalTrials API response time: ${responseTime}ms`)
console.log(`Results count: ${results.length}`)

// Alert if response time > 10 seconds
if (responseTime > 10000) {
  console.warn(`Slow ClinicalTrials API response: ${responseTime}ms`)
}
```

### 3. **Track API Usage**

```typescript
// Implement usage tracking
const apiUsage = {
  endpoint: 'ClinicalTrials',
  method: 'search',
  timestamp: new Date().toISOString(),
  responseTime: responseTime,
  resultCount: results.length,
  success: results.length > 0
}

// Store in monitoring system
await monitoringService.trackAPIUsage(apiUsage)
```

## 🛠️ Configuration Checklist

### **Environment Variables**
- [ ] `CLINICALTRIALS_API_BASE_URL` - Correct API v2 base URL
- [ ] `CLINICALTRIALS_CLASSIC_API_URL` - Classic API URL for fallback
- [ ] `CLINICALTRIALS_API_TIMEOUT` - Appropriate timeout setting
- [ ] `CLINICALTRIALS_MAX_STUDIES` - Maximum studies per request
- [ ] `CLINICALTRIALS_RATE_LIMIT` - Rate limiting configuration

### **Network Configuration**
- [ ] Outbound HTTPS access to `clinicaltrials.gov`
- [ ] No firewall blocking port 443
- [ ] DNS resolution working
- [ ] SSL/TLS certificates valid

### **Application Configuration**
- [ ] Proper error handling implemented
- [ ] Rate limiting configured
- [ ] Caching strategy in place
- [ ] Logging enabled
- [ ] Monitoring configured

## 🚀 Best Practices

### 1. **Search Optimization**
```typescript
// Use specific search terms
const optimizedSearch = {
  searchTerms: "aspirin AND cardiovascular AND phase 3",
  targetFields: ["NCTId", "BriefTitle", "Phase", "Status", "PrimaryCompletionDate"],
  maxStudies: 20,
  format: "json" as const,
  phase: "Phase 3",
  status: "Recruiting"
}

// Implement search result caching
const cacheKey = `search_${JSON.stringify(searchParams)}`
const cachedResults = await cache.get(cacheKey)
if (cachedResults) {
  return cachedResults
}
```

### 2. **Data Validation**
```typescript
// Validate API responses
const validateTrialData = (trial: any): boolean => {
  return !!(
    trial.nctId &&
    trial.briefTitle &&
    trial.status &&
    trial.phase
  )
}

// Filter out invalid results
const validTrials = results.filter(validateTrialData)
```

### 3. **Fallback Strategies**
```typescript
// Implement fallback to classic API
const searchWithFallback = async (searchParams: any) => {
  try {
    return await clinicalTrialsAPIService.searchTrials(searchParams)
  } catch (error) {
    console.warn('API v2 failed, trying classic API:', error)
    return await clinicalTrialsAPIService.searchTrialsClassic(searchParams)
  }
}
```

## 📞 Support Resources

### **ClinicalTrials.gov Documentation**
- [ClinicalTrials.gov API Documentation](https://clinicaltrials.gov/api/gui)
- [API v2 Documentation](https://clinicaltrials.gov/api/v2/docs)
- [Classic API Documentation](https://clinicaltrials.gov/api/gui/ref)

### **Technical Support**
- **Email**: clinicaltrials.gov@nih.gov
- **Documentation**: https://clinicaltrials.gov/api/gui
- **Status Page**: https://clinicaltrials.gov/api/gui/ref

### **Community Resources**
- **GitHub**: ClinicalTrials.gov API examples
- **Stack Overflow**: ClinicalTrials API questions
- **NIH Support**: Technical support for API issues

---

**Last Updated**: September 7, 2025  
**Version**: 1.0.0  
**Next Review**: December 7, 2025
