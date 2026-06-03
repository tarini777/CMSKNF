# 📚 PubMed API Integration - Troubleshooting Guide

## 🎯 Overview

This guide provides comprehensive troubleshooting steps for the PubMed API integration using NCBI E-utilities, covering all eight E-utility programs and their specific use cases.

## 🚨 Common Issues & Solutions

### 1. **E-utilities Endpoint Issues**

#### **Issue**: `E-utilities request failed: 404 Not Found`

**Possible Causes:**
- Incorrect E-utility endpoint URL
- Deprecated endpoint usage
- Network connectivity issues

**Solutions:**
```bash
# 1. Verify E-utilities endpoints
# Base URL: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/
# ESearch: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi
# EFetch: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
# ELink: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi

# 2. Test basic connectivity
curl -H "Accept: application/json" \
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=aspirin&retmax=1&retmode=json"

# 3. Check E-utility availability
curl "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/einfo.fcgi?db=pubmed"
```

#### **Issue**: `E-utilities request failed: 403 Forbidden`

**Possible Causes:**
- Rate limiting exceeded (3 requests per second)
- Missing required parameters
- Invalid request format

**Solutions:**
```bash
# 1. Implement proper rate limiting
# NCBI allows 3 requests per second without API key
# With API key: 10 requests per second

# 2. Add required parameters
curl -H "Accept: application/json" \
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=aspirin&retmax=1&retmode=json&tool=CMS-Compliance-Platform&email=support@cms-compliance.com"

# 3. Check request format
# Ensure proper URL encoding and parameter format
```

### 2. **ESearch Issues**

#### **Issue**: ESearch returns no results

**Possible Causes:**
- Invalid search terms
- Incorrect database specification
- Malformed query syntax

**Solutions:**
```typescript
// 1. Test with simple search terms
const searchParams = {
  db: 'pubmed',
  term: 'aspirin',
  retmax: 10,
  retmode: 'json',
  tool: 'CMS-Compliance-Platform',
  email: 'support@cms-compliance.com'
}

// 2. Verify database specification
const databases = ['pubmed', 'pmc', 'gene', 'nuccore', 'protein']
// Ensure using correct database for your search

// 3. Check query syntax
const query = 'aspirin AND cardiovascular[mesh]'
// Use proper Boolean operators and field tags
```

#### **Issue**: ESearch returns unexpected results

**Possible Causes:**
- Search term too broad or too specific
- Incorrect field tags
- Missing search filters

**Solutions:**
```typescript
// 1. Refine search terms with field tags
const refinedQuery = 'aspirin[title] AND cardiovascular[mesh] AND "2020"[dp]'

// 2. Use specific field tags
const fieldTags = {
  title: '[ti]',
  abstract: '[ab]',
  author: '[au]',
  journal: '[ta]',
  mesh: '[mesh]',
  publicationDate: '[dp]',
  language: '[la]',
  country: '[ad]'
}

// 3. Add filters for better results
const filteredQuery = 'aspirin AND cardiovascular[mesh] AND "2020:2024"[dp] AND english[la]'
```

### 3. **EFetch Issues**

#### **Issue**: EFetch returns incomplete data

**Possible Causes:**
- Incorrect retmode/rettype combination
- Large result sets
- XML parsing errors

**Solutions:**
```typescript
// 1. Use correct retmode/rettype combinations
const fetchParams = {
  db: 'pubmed',
  id: '32580960,33547166',
  retmode: 'xml',        // or 'json' for summary
  rettype: 'abstract',   // or 'medline', 'uilist'
  tool: 'CMS-Compliance-Platform',
  email: 'support@cms-compliance.com'
}

// 2. Handle large result sets
const batchSize = 200 // NCBI recommendation
const pmids = ['32580960', '33547166', '33547168']
const batches = this.chunkArray(pmids, batchSize)

// 3. Implement proper XML parsing
const parseXMLResponse = (xmlText: string) => {
  // Use proper XML parser like xml2js or DOMParser
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
  return this.extractDataFromXML(xmlDoc)
}
```

#### **Issue**: EFetch returns empty results

**Possible Causes:**
- Invalid PMIDs
- Database mismatch
- Network timeout

**Solutions:**
```typescript
// 1. Validate PMIDs before fetching
const validatePMID = (pmid: string): boolean => {
  return /^\d+$/.test(pmid) && pmid.length >= 6
}

// 2. Check database consistency
const searchDb = 'pubmed'
const fetchDb = 'pubmed' // Must match

// 3. Implement retry logic
const fetchWithRetry = async (pmids: string[], maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await this.performEFetch(pmids)
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }
}
```

### 4. **ELink Issues**

#### **Issue**: ELink returns no related articles

**Possible Causes:**
- Invalid link names
- Database mismatch
- No related articles available

**Solutions:**
```typescript
// 1. Use correct link names
const linkNames = {
  'pubmed_pubmed': 'Related articles in PubMed',
  'pubmed_pmc': 'Full text articles in PMC',
  'pubmed_gene': 'Related genes',
  'pubmed_nuccore': 'Related sequences'
}

// 2. Check database compatibility
const linkParams = {
  dbfrom: 'pubmed',
  db: 'pubmed',
  id: '32580960',
  linkname: 'pubmed_pubmed',
  retmode: 'json'
}

// 3. Handle empty results gracefully
const getRelatedArticles = async (pmid: string) => {
  const relatedPmids = await this.getRelatedPMIDs(pmid)
  if (relatedPmids.length === 0) {
    console.log(`No related articles found for PMID ${pmid}`)
    return []
  }
  return await this.performEFetch(relatedPmids.slice(0, 10))
}
```

### 5. **Rate Limiting Issues**

#### **Issue**: `Too many requests` error

**Possible Causes:**
- Exceeding 3 requests per second limit
- No API key configured
- Burst requests

**Solutions:**
```typescript
// 1. Implement rate limiting
class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests = 3
  private readonly timeWindow = 1000 // 1 second

  async waitIfNeeded(): Promise<void> {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.timeWindow - (now - this.requests[0])
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requests.push(now)
  }
}

// 2. Use API key for higher limits
const apiKey = process.env.NCBI_API_KEY
if (apiKey) {
  params.append('api_key', apiKey)
  // Allows 10 requests per second
}

// 3. Implement exponential backoff
const retryWithBackoff = async (fn: Function, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (error.message.includes('Too many requests')) {
        const waitTime = Math.pow(2, i) * 1000
        await new Promise(resolve => setTimeout(resolve, waitTime))
      } else {
        throw error
      }
    }
  }
}
```

### 6. **XML Parsing Issues**

#### **Issue**: XML parsing errors

**Possible Causes:**
- Malformed XML response
- Encoding issues
- Missing XML parser

**Solutions:**
```typescript
// 1. Use proper XML parser
import { parseString } from 'xml2js'

const parseXMLResponse = async (xmlText: string) => {
  return new Promise((resolve, reject) => {
    parseString(xmlText, (err, result) => {
      if (err) {
        console.error('XML parsing error:', err)
        reject(err)
      } else {
        resolve(result)
      }
    })
  })
}

// 2. Handle encoding issues
const response = await fetch(url)
const xmlText = await response.text()
// Ensure proper UTF-8 encoding

// 3. Validate XML structure
const validateXML = (xmlText: string): boolean => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    const parseError = xmlDoc.getElementsByTagName('parsererror')
    return parseError.length === 0
  } catch (error) {
    return false
  }
}
```

## 🔍 Diagnostic Tools

### 1. **API Health Check**

```bash
# Test E-utilities connectivity
curl -X GET "http://localhost:3000/api/pubmed?action=health"

# Expected response:
# {
#   "success": true,
#   "data": {
#     "isHealthy": true,
#     "responseTime": 563,
#     "lastCheck": "2024-09-07T17:53:25.714Z"
#   }
# }
```

### 2. **Search Test**

```bash
# Test basic search
curl -X GET "http://localhost:3000/api/pubmed?action=search&query=aspirin&max=5"

# Test with advanced parameters
curl -X POST "http://localhost:3000/api/pubmed" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "search",
    "data": {
      "searchParams": {
        "query": "aspirin AND cardiovascular[mesh]",
        "maxResults": 10,
        "sortBy": "relevance",
        "dateRange": {
          "startDate": "2020-01-01",
          "endDate": "2024-12-31"
        },
        "publicationTypes": ["Journal Article", "Review"],
        "languages": ["English"]
      }
    }
  }'
```

### 3. **Article Details Test**

```bash
# Test article details retrieval
curl -X GET "http://localhost:3000/api/pubmed?action=get_article_details&pmid=32580960"

# Test with POST method
curl -X POST "http://localhost:3000/api/pubmed" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_article_details",
    "data": {
      "pmid": "32580960"
    }
  }'
```

### 4. **Citations Test**

```bash
# Test citation retrieval
curl -X GET "http://localhost:3000/api/pubmed?action=get_citations&pmid=32580960"

# Test multiple citations
curl -X POST "http://localhost:3000/api/pubmed" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_citations",
    "data": {
      "pmids": ["32580960", "33547166", "33547168"]
    }
  }'
```

### 5. **Related Articles Test**

```bash
# Test related articles
curl -X GET "http://localhost:3000/api/pubmed?action=get_related_articles&pmid=32580960"

# Test with POST method
curl -X POST "http://localhost:3000/api/pubmed" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_related_articles",
    "data": {
      "pmid": "32580960"
    }
  }'
```

### 6. **CMS Record Integration Test**

```bash
# Test CMS record integration
curl -X POST "http://localhost:3000/api/pubmed" \
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
const results = await pubmedAPIService.searchArticles(searchParams)
const responseTime = Date.now() - startTime

console.log(`PubMed API response time: ${responseTime}ms`)
console.log(`Results count: ${results.articles.length}`)
console.log(`Total count: ${results.totalCount}`)

// Alert if response time > 10 seconds
if (responseTime > 10000) {
  console.warn(`Slow PubMed API response: ${responseTime}ms`)
}
```

### 3. **Track API Usage**

```typescript
// Implement usage tracking
const apiUsage = {
  endpoint: 'PubMed',
  method: 'search',
  timestamp: new Date().toISOString(),
  responseTime: responseTime,
  resultCount: results.articles.length,
  totalCount: results.totalCount,
  success: results.articles.length > 0
}

// Store in monitoring system
await monitoringService.trackAPIUsage(apiUsage)
```

## 🛠️ Configuration Checklist

### **Environment Variables**
- [ ] `PUBMED_EUTILS_BASE_URL` - Correct E-utilities base URL
- [ ] `PUBMED_ESEARCH_URL` - ESearch endpoint URL
- [ ] `PUBMED_EFETCH_URL` - EFetch endpoint URL
- [ ] `PUBMED_ELINK_URL` - ELink endpoint URL
- [ ] `PUBMED_API_TIMEOUT` - Appropriate timeout setting
- [ ] `PUBMED_MAX_RESULTS` - Maximum results per request
- [ ] `PUBMED_RATE_LIMIT` - Rate limiting configuration

### **Network Configuration**
- [ ] Outbound HTTPS access to `eutils.ncbi.nlm.nih.gov`
- [ ] No firewall blocking port 443
- [ ] DNS resolution working
- [ ] SSL/TLS certificates valid

### **Application Configuration**
- [ ] Proper error handling implemented
- [ ] Rate limiting configured (3 requests/second)
- [ ] XML parsing library installed
- [ ] Caching strategy in place
- [ ] Logging enabled
- [ ] Monitoring configured

## 🚀 Best Practices

### 1. **Search Optimization**
```typescript
// Use specific search terms with field tags
const optimizedSearch = {
  query: 'aspirin[title] AND cardiovascular[mesh] AND "2020:2024"[dp]',
  maxResults: 20,
  sortBy: 'relevance' as const,
  dateRange: {
    startDate: '2020-01-01',
    endDate: '2024-12-31'
  },
  publicationTypes: ['Journal Article', 'Review'],
  languages: ['English']
}

// Implement search result caching
const cacheKey = `pubmed_search_${JSON.stringify(searchParams)}`
const cachedResults = await cache.get(cacheKey)
if (cachedResults) {
  return cachedResults
}
```

### 2. **Data Validation**
```typescript
// Validate API responses
const validateArticle = (article: any): boolean => {
  return !!(
    article.pmid &&
    article.title &&
    article.journal &&
    article.abstract
  )
}

// Filter out invalid results
const validArticles = results.articles.filter(validateArticle)
```

### 3. **Error Handling**
```typescript
// Implement comprehensive error handling
const searchWithErrorHandling = async (searchParams: any) => {
  try {
    const results = await pubmedAPIService.searchArticles(searchParams)
    return results
  } catch (error) {
    if (error.message.includes('Too many requests')) {
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000))
      return await searchWithErrorHandling(searchParams)
    } else if (error.message.includes('404')) {
      // Try alternative endpoint
      return await pubmedAPIService.searchArticlesClassic(searchParams)
    } else {
      console.error('PubMed API error:', error)
      // Return mock data for development
      return pubmedAPIService.getMockPubMedResults(searchParams)
    }
  }
}
```

### 4. **Batch Processing**
```typescript
// Process large result sets in batches
const processLargeResultSet = async (pmids: string[]) => {
  const batchSize = 200
  const batches = chunkArray(pmids, batchSize)
  const results = []
  
  for (const batch of batches) {
    const batchResults = await pubmedAPIService.performEFetch(batch)
    results.push(...batchResults)
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 350)) // 3 requests/second
  }
  
  return results
}
```

## 📞 Support Resources

### **NCBI E-utilities Documentation**
- [E-utilities Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25501/)
- [ESearch Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25499/)
- [EFetch Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25497/)
- [ELink Documentation](https://www.ncbi.nlm.nih.gov/books/NBK25500/)

### **Technical Support**
- **Email**: info@ncbi.nlm.nih.gov
- **Documentation**: https://www.ncbi.nlm.nih.gov/books/NBK25501/
- **Status Page**: https://www.ncbi.nlm.nih.gov/books/NBK25501/

### **Community Resources**
- **GitHub**: NCBI E-utilities examples
- **Stack Overflow**: E-utilities questions
- **NCBI Help**: Technical support for API issues

---

**Last Updated**: September 7, 2025  
**Version**: 1.0.0  
**Next Review**: December 7, 2025
