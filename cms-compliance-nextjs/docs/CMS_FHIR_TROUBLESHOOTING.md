# 🔧 CMS FHIR API Integration - Troubleshooting Guide

## 🎯 Overview

This guide provides comprehensive troubleshooting steps for the CMS FHIR API integration, covering Patient Access API, Provider Access API, Payer-to-Payer Data Exchange, Provider Directory API, and Prior Authorization Requirements, Documentation and Decision (PARDD) API.

## 🚨 Common Issues & Solutions

### 1. **Authentication Failures**

#### **Issue**: `Authentication failed: 401 Unauthorized`

**Possible Causes:**
- Invalid client credentials
- Expired client secret
- Incorrect scope configuration
- Network connectivity issues

**Solutions:**
```bash
# 1. Verify environment variables
echo $CMS_FHIR_CLIENT_ID
echo $CMS_FHIR_CLIENT_SECRET
echo $CMS_FHIR_SCOPE

# 2. Test authentication endpoint
curl -X POST https://api.cms.gov/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=system/Patient.read"

# 3. Check token response
# Expected response:
# {
#   "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIs...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "scope": "system/Patient.read system/Coverage.read"
# }
```

**Environment Configuration:**
```bash
# .env.local
CMS_FHIR_BASE_URL="https://api.cms.gov/fhir/v1"
CMS_FHIR_CLIENT_ID="your-actual-client-id"
CMS_FHIR_CLIENT_SECRET="your-actual-client-secret"
CMS_FHIR_SCOPE="system/Patient.read system/Coverage.read system/ExplanationOfBenefit.read system/Task.read system/Practitioner.read"
CMS_FHIR_TOKEN_URL="https://api.cms.gov/oauth2/token"
CMS_FHIR_API_VERSION="4.0.1"
```

### 2. **API Endpoint Issues**

#### **Issue**: `FHIR API request failed: 404 Not Found`

**Possible Causes:**
- Incorrect base URL
- Wrong API version
- Invalid resource endpoint

**Solutions:**
```bash
# 1. Verify base URL format
# Correct: https://api.cms.gov/fhir/v1
# Incorrect: https://api.cms.gov/fhir/v1/

# 2. Test basic connectivity
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.cms.gov/fhir/v1/metadata

# 3. Check API version compatibility
# Ensure using FHIR R4 (4.0.1) as specified in CMS requirements
```

#### **Issue**: `FHIR API request failed: 403 Forbidden`

**Possible Causes:**
- Insufficient scope permissions
- Resource access restrictions
- Rate limiting

**Solutions:**
```bash
# 1. Verify scope includes required permissions
CMS_FHIR_SCOPE="system/Patient.read system/Coverage.read system/ExplanationOfBenefit.read system/Task.read system/Practitioner.read"

# 2. Check rate limits
# CMS FHIR API typically allows 100 requests per minute
# Implement proper rate limiting in your application

# 3. Verify resource access permissions
# Some resources may require additional authorization
```

### 3. **Data Validation Issues**

#### **Issue**: Patient validation always returns `null`

**Possible Causes:**
- Invalid patient identifier format
- Patient not found in CMS database
- Incorrect search parameters

**Solutions:**
```typescript
// 1. Verify patient ID format
// CMS typically uses specific identifier systems
const patientId = "1234567890" // Ensure correct format

// 2. Test with known patient ID
const testPatient = await cmsFHIRAPIService.validatePatient("TEST_PATIENT_ID")

// 3. Check search parameters
const result = await cmsFHIRAPIService.makeFHIRRequest('Patient', {
  identifier: patientId,
  _count: '1'
})
```

#### **Issue**: Coverage validation fails

**Possible Causes:**
- Patient reference format incorrect
- Coverage data not available
- Date range issues

**Solutions:**
```typescript
// 1. Verify patient reference format
// Should be: "Patient/1234567890"
const patientRef = `Patient/${patientId}`

// 2. Check coverage search parameters
const coverage = await cmsFHIRAPIService.getPatientCoverage(patientId)

// 3. Verify date formats
// Use ISO 8601 format: YYYY-MM-DD
const startDate = "2024-01-01"
const endDate = "2024-12-31"
```

### 4. **Performance Issues**

#### **Issue**: Slow API response times

**Possible Causes:**
- Network latency
- Large data sets
- Inefficient queries

**Solutions:**
```typescript
// 1. Implement proper pagination
const params = {
  patient: patientId,
  _count: '100', // Limit results per page
  _page: '1'     // Use pagination
}

// 2. Use specific date ranges
const params = {
  patient: patientId,
  'billable-period': 'ge2024-01-01,le2024-12-31'
}

// 3. Implement caching
const cacheKey = `patient_${patientId}_coverage`
const cachedData = await redis.get(cacheKey)
if (cachedData) {
  return JSON.parse(cachedData)
}
```

### 5. **Error Handling**

#### **Issue**: Unhandled API errors

**Solutions:**
```typescript
// 1. Implement comprehensive error handling
try {
  const result = await cmsFHIRAPIService.validatePatient(patientId)
  return result
} catch (error) {
  if (error.status === 401) {
    // Re-authenticate
    await cmsFHIRAPIService.authenticate()
    return await cmsFHIRAPIService.validatePatient(patientId)
  } else if (error.status === 429) {
    // Rate limited - wait and retry
    await new Promise(resolve => setTimeout(resolve, 60000))
    return await cmsFHIRAPIService.validatePatient(patientId)
  } else {
    // Log error and return fallback
    console.error('CMS FHIR API error:', error)
    return null
  }
}

// 2. Implement retry logic
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
curl -X GET "http://localhost:3000/api/cms/fhir?action=health"

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

### 2. **Authentication Test**

```bash
# Test authentication
curl -X GET "http://localhost:3000/api/cms/fhir?action=authenticate"

# Expected response:
# {
#   "success": true,
#   "message": "Successfully authenticated with CMS FHIR API"
# }
```

### 3. **Patient Validation Test**

```bash
# Test patient validation
curl -X POST "http://localhost:3000/api/cms/fhir" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "validate_patient",
    "data": {
      "patientId": "1234567890"
    }
  }'
```

### 4. **Coverage Validation Test**

```bash
# Test coverage validation
curl -X POST "http://localhost:3000/api/cms/fhir" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_coverage",
    "data": {
      "patientId": "1234567890"
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
const result = await cmsFHIRAPIService.validatePatient(patientId)
const responseTime = Date.now() - startTime

console.log(`CMS FHIR API response time: ${responseTime}ms`)

// Alert if response time > 5 seconds
if (responseTime > 5000) {
  console.warn(`Slow CMS FHIR API response: ${responseTime}ms`)
}
```

### 3. **Track API Usage**

```typescript
// Implement usage tracking
const apiUsage = {
  endpoint: 'Patient',
  method: 'GET',
  timestamp: new Date().toISOString(),
  responseTime: responseTime,
  success: !!result
}

// Store in monitoring system
await monitoringService.trackAPIUsage(apiUsage)
```

## 🛠️ Configuration Checklist

### **Environment Variables**
- [ ] `CMS_FHIR_BASE_URL` - Correct FHIR base URL
- [ ] `CMS_FHIR_CLIENT_ID` - Valid client ID
- [ ] `CMS_FHIR_CLIENT_SECRET` - Valid client secret
- [ ] `CMS_FHIR_SCOPE` - Required scopes
- [ ] `CMS_FHIR_TOKEN_URL` - Correct token endpoint
- [ ] `CMS_FHIR_API_VERSION` - FHIR R4 (4.0.1)

### **Network Configuration**
- [ ] Outbound HTTPS access to `api.cms.gov`
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

### 1. **Authentication Management**
```typescript
// Implement token refresh logic
private async ensureValidToken(): Promise<boolean> {
  if (!this.accessToken || !this.tokenExpiry || new Date() >= this.tokenExpiry) {
    return await this.authenticate()
  }
  return true
}
```

### 2. **Rate Limiting**
```typescript
// Implement rate limiting
private rateLimiter = new Map<string, number>()

private async checkRateLimit(endpoint: string): Promise<void> {
  const now = Date.now()
  const lastRequest = this.rateLimiter.get(endpoint) || 0
  const timeSinceLastRequest = now - lastRequest
  
  if (timeSinceLastRequest < 600) { // 100 requests per minute
    await new Promise(resolve => setTimeout(resolve, 600 - timeSinceLastRequest))
  }
  
  this.rateLimiter.set(endpoint, now)
}
```

### 3. **Caching Strategy**
```typescript
// Implement caching for frequently accessed data
private cache = new Map<string, { data: any; expiry: Date }>()

private getCachedData(key: string): any | null {
  const cached = this.cache.get(key)
  if (cached && cached.expiry > new Date()) {
    return cached.data
  }
  this.cache.delete(key)
  return null
}

private setCachedData(key: string, data: any, ttl: number = 3600): void {
  this.cache.set(key, {
    data,
    expiry: new Date(Date.now() + ttl * 1000)
  })
}
```

## 📞 Support Resources

### **CMS FHIR API Documentation**
- [CMS Interoperability and Patient Access Final Rule](https://www.cms.gov/Regulations-and-Guidance/Guidance/Interoperability/index)
- [HL7 FHIR R4 Documentation](https://hl7.org/fhir/R4/)
- [US Core Implementation Guide](https://hl7.org/fhir/us/core/)

### **Technical Support**
- **Email**: cms-fhir-support@cms.gov
- **Documentation**: https://api.cms.gov/docs
- **Status Page**: https://status.cms.gov

### **Community Resources**
- **HL7 FHIR Community**: https://chat.fhir.org/
- **CMS Developer Portal**: https://api.cms.gov/
- **GitHub Issues**: Report bugs and feature requests

---

**Last Updated**: September 7, 2025  
**Version**: 1.0.0  
**Next Review**: December 7, 2025
