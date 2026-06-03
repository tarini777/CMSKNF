import { CMSRecord } from '@/types/cms'

export interface PubMedArticle {
  pmid: string
  title: string
  authors: string[]
  journal: string
  publicationDate: string
  abstract: string
  keywords: string[]
  doi: string
  pmc: string
  meshTerms: string[]
  publicationType: string[]
  language: string
  country: string
  relevanceScore: number
  citationCount: number
  lastUpdated: string
}

export interface PubMedSearchParams {
  query: string
  maxResults: number
  sortBy: 'relevance' | 'date' | 'author' | 'journal'
  dateRange?: {
    startDate: string
    endDate: string
  }
  publicationTypes?: string[]
  languages?: string[]
  countries?: string[]
  meshTerms?: string[]
  authors?: string[]
  journals?: string[]
}

export interface PubMedSearchResult {
  articles: PubMedArticle[]
  totalCount: number
  searchTime: number
  query: string
  nextPageToken?: string
}

export interface PubMedCitation {
  pmid: string
  citation: string
  formattedCitation: string
  bibtex: string
  ris: string
}

export class PubMedAPIService {
  private readonly EUTILS_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
  private readonly ESEARCH_URL = `${this.EUTILS_BASE}/esearch.fcgi`
  private readonly EFETCH_URL = `${this.EUTILS_BASE}/efetch.fcgi`
  private readonly ELINK_URL = `${this.EUTILS_BASE}/elink.fcgi`
  private readonly ESUMMARY_URL = `${this.EUTILS_BASE}/esummary.fcgi`
  private readonly EINFO_URL = `${this.EUTILS_BASE}/einfo.fcgi`
  private readonly ESPELL_URL = `${this.EUTILS_BASE}/espell.fcgi`
  private readonly EGQUERY_URL = `${this.EUTILS_BASE}/egquery.fcgi`

  /**
   * Search PubMed using E-utilities
   */
  async searchArticles(searchParams: PubMedSearchParams): Promise<PubMedSearchResult> {
    try {
      const startTime = Date.now()
      
      // Step 1: Search for PMIDs using esearch
      const searchResponse = await this.performESearch(searchParams)
      const pmids = searchResponse.pmids
      
      if (pmids.length === 0) {
        return {
          articles: [],
          totalCount: 0,
          searchTime: Date.now() - startTime,
          query: searchParams.query
        }
      }

      // Step 2: Fetch article details using efetch
      const articles = await this.performEFetch(pmids, searchParams)
      
      return {
        articles,
        totalCount: searchResponse.totalCount,
        searchTime: Date.now() - startTime,
        query: searchParams.query,
        nextPageToken: searchResponse.nextPageToken
      }
    } catch (error) {
      console.error('Error searching PubMed:', error)
      // Return mock data for development
      return this.getMockPubMedResults(searchParams)
    }
  }

  /**
   * Get article details by PMID
   */
  async getArticleDetails(pmid: string): Promise<PubMedArticle | null> {
    try {
      const articles = await this.performEFetch([pmid], {
        query: '',
        maxResults: 1,
        sortBy: 'relevance'
      })
      
      return articles.length > 0 ? articles[0] : null
    } catch (error) {
      console.error('Error getting article details:', error)
      return null
    }
  }

  /**
   * Search articles related to a CMS record
   */
  async searchArticlesForCMSRecord(record: CMSRecord): Promise<PubMedArticle[]> {
    try {
      // Extract search terms from the CMS record
      const searchTerms = this.extractSearchTermsFromRecord(record)
      
      const searchParams: PubMedSearchParams = {
        query: searchTerms.join(' AND '),
        maxResults: 20,
        sortBy: 'relevance',
        dateRange: {
          startDate: '2020-01-01',
          endDate: new Date().toISOString().split('T')[0]
        }
      }

      const searchResult = await this.searchArticles(searchParams)
      return searchResult.articles
    } catch (error) {
      console.error('Error searching PubMed for CMS record:', error)
      return []
    }
  }

  /**
   * Get citations for articles
   */
  async getCitations(pmids: string[]): Promise<PubMedCitation[]> {
    try {
      const citations: PubMedCitation[] = []
      
      for (const pmid of pmids) {
        const citation = await this.getArticleCitation(pmid)
        if (citation) {
          citations.push(citation)
        }
      }
      
      return citations
    } catch (error) {
      console.error('Error getting citations:', error)
      return []
    }
  }

  /**
   * Get related articles
   */
  async getRelatedArticles(pmid: string): Promise<PubMedArticle[]> {
    try {
      // Use elink to find related articles
      const relatedPmids = await this.getRelatedPMIDs(pmid)
      
      if (relatedPmids.length === 0) {
        return []
      }

      // Fetch details for related articles
      const articles = await this.performEFetch(relatedPmids.slice(0, 10), {
        query: '',
        maxResults: 10,
        sortBy: 'relevance'
      })
      
      return articles
    } catch (error) {
      console.error('Error getting related articles:', error)
      return []
    }
  }

  /**
   * Get API health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean
    responseTime: number
    lastCheck: Date
    error?: string
  }> {
    const startTime = Date.now()
    
    try {
      // Test with a simple search
      const response = await fetch(`${this.ESEARCH_URL}?db=pubmed&term=aspirin&retmax=1&retmode=json`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CMS-Compliance-Platform/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`)
      }

      return {
        isHealthy: true,
        responseTime: Date.now() - startTime,
        lastCheck: new Date()
      }
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Perform ESearch to get PMIDs
   */
  private async performESearch(searchParams: PubMedSearchParams): Promise<{
    pmids: string[]
    totalCount: number
    nextPageToken?: string
  }> {
    const params = new URLSearchParams()
    params.append('db', 'pubmed')
    params.append('term', searchParams.query)
    params.append('retmax', searchParams.maxResults.toString())
    params.append('retmode', 'json')
    params.append('sort', this.mapSortBy(searchParams.sortBy))
    params.append('tool', 'CMS-Compliance-Platform')
    params.append('email', 'support@cms-compliance.com')

    // Add date range if specified
    if (searchParams.dateRange) {
      const dateQuery = `${searchParams.dateRange.startDate}:${searchParams.dateRange.endDate}[dp]`
      params.append('term', `${searchParams.query} AND ${dateQuery}`)
    }

    // Add publication types if specified
    if (searchParams.publicationTypes && searchParams.publicationTypes.length > 0) {
      const typeQuery = searchParams.publicationTypes.map(type => `"${type}"[pt]`).join(' OR ')
      params.append('term', `${searchParams.query} AND (${typeQuery})`)
    }

    const response = await fetch(`${this.ESEARCH_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CMS-Compliance-Platform/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`ESearch request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const esearchResult = data.esearchresult

    return {
      pmids: esearchResult.idlist || [],
      totalCount: parseInt(esearchResult.count || '0'),
      nextPageToken: esearchResult.webenv
    }
  }

  /**
   * Perform EFetch to get article details
   */
  private async performEFetch(pmids: string[], searchParams: PubMedSearchParams): Promise<PubMedArticle[]> {
    if (pmids.length === 0) {
      return []
    }

    const params = new URLSearchParams()
    params.append('db', 'pubmed')
    params.append('id', pmids.join(','))
    params.append('retmode', 'xml')
    params.append('rettype', 'abstract')
    params.append('tool', 'CMS-Compliance-Platform')
    params.append('email', 'support@cms-compliance.com')

    const response = await fetch(`${this.EFETCH_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'CMS-Compliance-Platform/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`EFetch request failed: ${response.status} ${response.statusText}`)
    }

    const xmlText = await response.text()
    return this.parseXMLResponse(xmlText, searchParams)
  }

  /**
   * Get related PMIDs using ELink
   */
  private async getRelatedPMIDs(pmid: string): Promise<string[]> {
    const params = new URLSearchParams()
    params.append('dbfrom', 'pubmed')
    params.append('db', 'pubmed')
    params.append('id', pmid)
    params.append('linkname', 'pubmed_pubmed')
    params.append('retmode', 'json')
    params.append('tool', 'CMS-Compliance-Platform')
    params.append('email', 'support@cms-compliance.com')

    const response = await fetch(`${this.ELINK_URL}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CMS-Compliance-Platform/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(`ELink request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const linksets = data.linksets || []
    
    if (linksets.length > 0 && linksets[0].linksetdbs) {
      return linksets[0].linksetdbs[0].links || []
    }
    
    return []
  }

  /**
   * Get article citation
   */
  private async getArticleCitation(pmid: string): Promise<PubMedCitation | null> {
    try {
      const params = new URLSearchParams()
      params.append('db', 'pubmed')
      params.append('id', pmid)
      params.append('retmode', 'ref')
      params.append('rettype', 'abstract')
      params.append('tool', 'CMS-Compliance-Platform')
      params.append('email', 'support@cms-compliance.com')

      const response = await fetch(`${this.EFETCH_URL}?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'CMS-Compliance-Platform/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`Citation request failed: ${response.status} ${response.statusText}`)
      }

      const citationText = await response.text()
      
      return {
        pmid,
        citation: citationText,
        formattedCitation: this.formatCitation(citationText),
        bibtex: this.convertToBibTeX(citationText, pmid),
        ris: this.convertToRIS(citationText, pmid)
      }
    } catch (error) {
      console.error('Error getting citation:', error)
      return null
    }
  }

  /**
   * Parse XML response from EFetch
   */
  private parseXMLResponse(xmlText: string, searchParams: PubMedSearchParams): PubMedArticle[] {
    try {
      // For simplicity, we'll use a basic XML parser approach
      // In production, you might want to use a proper XML parser like xml2js
      const articles: PubMedArticle[] = []
      
      // Extract PMIDs from XML
      const pmidMatches = xmlText.match(/<PMID[^>]*>(\d+)<\/PMID>/g)
      if (!pmidMatches) {
        return articles
      }

      for (const pmidMatch of pmidMatches) {
        const pmid = pmidMatch.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1] || ''
        
        // Extract other fields from XML
        const title = this.extractXMLField(xmlText, 'ArticleTitle', pmid)
        const abstract = this.extractXMLField(xmlText, 'AbstractText', pmid)
        const journal = this.extractXMLField(xmlText, 'Title', pmid)
        const authors = this.extractXMLFieldArray(xmlText, 'Author', pmid)
        const publicationDate = this.extractXMLField(xmlText, 'PubDate', pmid)
        const meshTerms = this.extractXMLFieldArray(xmlText, 'MeshHeading', pmid)
        const keywords = this.extractXMLFieldArray(xmlText, 'Keyword', pmid)
        const doi = this.extractXMLField(xmlText, 'ELocationID', pmid)
        const pmc = this.extractXMLField(xmlText, 'PMC', pmid)

        articles.push({
          pmid,
          title: title || 'No title available',
          authors: authors || [],
          journal: journal || 'No journal available',
          publicationDate: publicationDate || '',
          abstract: abstract || 'No abstract available',
          keywords: keywords || [],
          doi: doi || '',
          pmc: pmc || '',
          meshTerms: meshTerms || [],
          publicationType: this.extractXMLFieldArray(xmlText, 'PublicationType', pmid) || [],
          language: this.extractXMLField(xmlText, 'Language', pmid) || 'English',
          country: this.extractXMLField(xmlText, 'Country', pmid) || '',
          relevanceScore: this.calculateRelevanceScore(searchParams.query, title, abstract, keywords),
          citationCount: 0, // Would need additional API call to get citation count
          lastUpdated: new Date().toISOString()
        })
      }

      return articles
    } catch (error) {
      console.error('Error parsing XML response:', error)
      return []
    }
  }

  /**
   * Extract field from XML
   */
  private extractXMLField(xmlText: string, fieldName: string, pmid: string): string {
    const pattern = new RegExp(`<${fieldName}[^>]*>([^<]*)</${fieldName}>`, 'i')
    const match = xmlText.match(pattern)
    return match ? match[1].trim() : ''
  }

  /**
   * Extract array of fields from XML
   */
  private extractXMLFieldArray(xmlText: string, fieldName: string, pmid: string): string[] {
    const pattern = new RegExp(`<${fieldName}[^>]*>([^<]*)</${fieldName}>`, 'gi')
    const matches = xmlText.match(pattern)
    return matches ? matches.map(match => match.replace(/<\/?[^>]+>/g, '').trim()) : []
  }

  /**
   * Map sort by parameter to E-utilities format
   */
  private mapSortBy(sortBy: string): string {
    switch (sortBy) {
      case 'relevance': return 'relevance'
      case 'date': return 'pub_date'
      case 'author': return 'first_author'
      case 'journal': return 'journal'
      default: return 'relevance'
    }
  }

  /**
   * Extract search terms from CMS record
   */
  private extractSearchTermsFromRecord(record: CMSRecord): string[] {
    const terms: string[] = []
    
    if (record.physicianSpecialty) {
      terms.push(record.physicianSpecialty)
    }
    
    if (record.natureOfPaymentOrTransferOfValue) {
      terms.push(record.natureOfPaymentOrTransferOfValue)
    }
    
    if (record.coveredRecipientName) {
      // Extract potential research areas from recipient name
      const name = record.coveredRecipientName.toLowerCase()
      if (name.includes('cardio')) terms.push('cardiovascular')
      if (name.includes('neuro')) terms.push('neurology')
      if (name.includes('onco')) terms.push('oncology')
      if (name.includes('derma')) terms.push('dermatology')
    }

    return terms.filter(term => term.length > 2)
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(query: string, title: string, abstract: string, keywords: string[]): number {
    let score = 0.5 // Base score
    
    const queryLower = query.toLowerCase()
    const titleLower = title.toLowerCase()
    const abstractLower = abstract.toLowerCase()
    
    // Title matches
    if (titleLower.includes(queryLower)) {
      score += 0.3
    }
    
    // Abstract matches
    if (abstractLower.includes(queryLower)) {
      score += 0.2
    }
    
    // Keyword matches
    const keywordMatches = keywords.filter(keyword => 
      keyword.toLowerCase().includes(queryLower)
    ).length
    score += keywordMatches * 0.1
    
    return Math.min(score, 1.0) // Cap at 1.0
  }

  /**
   * Format citation
   */
  private formatCitation(citationText: string): string {
    // Basic citation formatting
    return citationText.replace(/\n/g, ' ').trim()
  }

  /**
   * Convert to BibTeX format
   */
  private convertToBibTeX(citationText: string, pmid: string): string {
    // Basic BibTeX conversion
    return `@article{pmid${pmid},
  title = {${citationText.split('.')[0]}},
  journal = {${citationText.split('.')[1] || 'Unknown'}},
  year = {${new Date().getFullYear()}},
  pmid = {${pmid}}
}`
  }

  /**
   * Convert to RIS format
   */
  private convertToRIS(citationText: string, pmid: string): string {
    // Basic RIS conversion
    return `TY  - JOUR
TI  - ${citationText.split('.')[0]}
JO  - ${citationText.split('.')[1] || 'Unknown'}
PY  - ${new Date().getFullYear()}
ID  - ${pmid}
ER  - `
  }

  /**
   * Get mock PubMed results for development
   */
  private getMockPubMedResults(searchParams: PubMedSearchParams): PubMedSearchResult {
    const mockArticles: PubMedArticle[] = [
      {
        pmid: '12345678',
        title: 'Clinical Trial of New Drug for Treatment of Cardiovascular Disease',
        authors: ['Smith, J.', 'Johnson, A.', 'Brown, M.'],
        journal: 'New England Journal of Medicine',
        publicationDate: '2024-01-15',
        abstract: 'This study evaluates the efficacy and safety of a new drug for treating cardiovascular disease in a randomized controlled trial.',
        keywords: ['cardiovascular disease', 'clinical trial', 'drug therapy'],
        doi: '10.1056/NEJM.2024.123456',
        pmc: 'PMC1234567',
        meshTerms: ['Cardiovascular Diseases', 'Drug Therapy', 'Clinical Trial'],
        publicationType: ['Journal Article', 'Randomized Controlled Trial'],
        language: 'English',
        country: 'United States',
        relevanceScore: 0.85,
        citationCount: 15,
        lastUpdated: '2024-09-01'
      },
      {
        pmid: '87654321',
        title: 'Healthcare Provider Training and Patient Outcomes',
        authors: ['Wilson, K.', 'Davis, L.', 'Miller, R.'],
        journal: 'Journal of Medical Education',
        publicationDate: '2024-02-20',
        abstract: 'This study examines the impact of healthcare provider training programs on patient outcomes and satisfaction.',
        keywords: ['medical education', 'patient outcomes', 'training'],
        doi: '10.1000/jme.2024.876543',
        pmc: 'PMC8765432',
        meshTerms: ['Medical Education', 'Patient Outcomes', 'Training'],
        publicationType: ['Journal Article', 'Observational Study'],
        language: 'English',
        country: 'United States',
        relevanceScore: 0.72,
        citationCount: 8,
        lastUpdated: '2024-08-15'
      }
    ]

    // Filter based on search terms if provided
    if (searchParams.query) {
      const queryLower = searchParams.query.toLowerCase()
      const filteredArticles = mockArticles.filter(article => 
        article.title.toLowerCase().includes(queryLower) ||
        article.abstract.toLowerCase().includes(queryLower) ||
        article.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
      )
      
      return {
        articles: filteredArticles,
        totalCount: filteredArticles.length,
        searchTime: 150,
        query: searchParams.query
      }
    }

    return {
      articles: mockArticles,
      totalCount: mockArticles.length,
      searchTime: 150,
      query: searchParams.query
    }
  }
}

// Export singleton instance
export const pubmedAPIService = new PubMedAPIService()
