import { CMSRecord } from '@/types/cms'
import { cmsFHIRAPIService } from './cms-fhir-api'
import { clinicalTrialsAPIService } from './clinicaltrials-api'
import { pubmedAPIService } from './pubmed-api'

export interface ExternalDataResult {
  source: 'cms' | 'pubmed' | 'clinicaltrials'
  data: any
  timestamp: string
  confidence: number
}

export interface CMSValidationResult {
  isValid: boolean
  confidence: number
  issues: string[]
  suggestions: string[]
}

export interface PubMedResult {
  pmid: string
  title: string
  authors: string[]
  journal: string
  publicationDate: string
  abstract: string
  relevanceScore: number
}

export interface ClinicalTrialResult {
  nctId: string
  title: string
  status: string
  phase: string
  conditions: string[]
  interventions: string[]
  locations: string[]
  relevanceScore: number
}

export class ExternalAPIService {
  private readonly CMS_API_BASE =
    process.env.OPEN_PAYMENTS_API_BASE_URL || 'https://openpaymentsdata.cms.gov/api/1'
  private readonly PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
  private readonly CLINICALTRIALS_API_BASE = 'https://clinicaltrials.gov/api/v2'

  /**
   * Validate CMS record against official CMS FHIR APIs (Patient Access, Provider Access, Payer-to-Payer)
   */
  async validateCMSRecord(record: CMSRecord): Promise<CMSValidationResult> {
    try {
      // Use the new FHIR-based CMS API service
      const fhirValidation = await cmsFHIRAPIService.validateCMSRecord(record)
      
      const validationResult: CMSValidationResult = {
        isValid: fhirValidation.isValid,
        confidence: fhirValidation.isValid ? 0.95 : 0.3,
        issues: fhirValidation.errors,
        suggestions: []
      }

      // Add specific suggestions based on validation results
      if (!fhirValidation.validationResults.patientValidation) {
        validationResult.suggestions.push('Verify patient ID with CMS database')
      }
      
      if (!fhirValidation.validationResults.coverageValidation) {
        validationResult.suggestions.push('Check patient coverage status')
      }
      
      if (!fhirValidation.validationResults.providerValidation) {
        validationResult.suggestions.push('Verify provider information in directory')
      }
      
      if (!fhirValidation.validationResults.amountValidation) {
        validationResult.suggestions.push('Review payment amount for accuracy')
      }

      // Additional business logic validation
      const amountValidation = await this.validatePaymentAmount(record)
      if (!amountValidation.isReasonable) {
        validationResult.issues.push('Payment amount outside normal range')
        validationResult.suggestions.push('Verify payment amount with source system')
      }

      // Check for duplicate payments
      const duplicateCheck = await this.checkForDuplicates(record)
      if (duplicateCheck.hasDuplicates) {
        validationResult.issues.push('Potential duplicate payment detected')
        validationResult.suggestions.push('Review for duplicate entries')
      }

      return validationResult
    } catch (error) {
      console.error('Error validating CMS record with FHIR API:', error)
      return {
        isValid: false,
        confidence: 0.0,
        issues: ['CMS FHIR API validation service unavailable'],
        suggestions: ['Manual review required', 'Check CMS API connectivity']
      }
    }
  }

  /**
   * Search PubMed for relevant research related to the payment using NCBI E-utilities
   */
  async searchPubMed(record: CMSRecord): Promise<PubMedResult[]> {
    try {
      // Use the new PubMed API service with NCBI E-utilities
      const articles = await pubmedAPIService.searchArticlesForCMSRecord(record)
      
      // Convert to the expected format
      return articles.map(article => ({
        pmid: article.pmid,
        title: article.title,
        authors: article.authors,
        journal: article.journal,
        publicationDate: article.publicationDate,
        abstract: article.abstract,
        keywords: article.keywords,
        relevanceScore: article.relevanceScore
      }))
    } catch (error) {
      console.error('Error searching PubMed:', error)
      return []
    }
  }

  /**
   * Search ClinicalTrials.gov for relevant clinical trials using the new API
   */
  async searchClinicalTrials(record: CMSRecord): Promise<ClinicalTrialResult[]> {
    try {
      // Use the new ClinicalTrials API service
      const trials = await clinicalTrialsAPIService.searchTrialsForCMSRecord(record)
      
      // Convert to the expected format
      return trials.map(trial => ({
        nctId: trial.nctId,
        title: trial.briefTitle,
        status: trial.status,
        phase: trial.phase,
        conditions: trial.conditions,
        interventions: trial.interventions,
        locations: trial.locations,
        relevanceScore: trial.relevanceScore
      }))
    } catch (error) {
      console.error('Error searching ClinicalTrials.gov:', error)
      return []
    }
  }

  /**
   * Get comprehensive external data for a record
   */
  async getExternalData(record: CMSRecord): Promise<ExternalDataResult[]> {
    try {
      const results: ExternalDataResult[] = []

      // Get CMS validation
      const cmsValidation = await this.validateCMSRecord(record)
      results.push({
        source: 'cms',
        data: cmsValidation,
        timestamp: new Date().toISOString(),
        confidence: cmsValidation.confidence
      })

      // Get PubMed results
      const pubmedResults = await this.searchPubMed(record)
      if (pubmedResults.length > 0) {
        results.push({
          source: 'pubmed',
          data: pubmedResults,
          timestamp: new Date().toISOString(),
          confidence: pubmedResults.reduce((sum, r) => sum + r.relevanceScore, 0) / pubmedResults.length
        })
      }

      // Get ClinicalTrials.gov results
      const clinicalTrialResults = await this.searchClinicalTrials(record)
      if (clinicalTrialResults.length > 0) {
        results.push({
          source: 'clinicaltrials',
          data: clinicalTrialResults,
          timestamp: new Date().toISOString(),
          confidence: clinicalTrialResults.reduce((sum, r) => sum + r.relevanceScore, 0) / clinicalTrialResults.length
        })
      }

      return results
    } catch (error) {
      console.error('Error getting external data:', error)
      return []
    }
  }

  /**
   * Batch process multiple records for external validation
   */
  async batchValidateRecords(records: CMSRecord[]): Promise<Map<string, ExternalDataResult[]>> {
    const results = new Map<string, ExternalDataResult[]>()

    // Process records in batches to avoid rate limiting
    const batchSize = 10
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (record) => {
        const externalData = await this.getExternalData(record)
        results.set(record.id, externalData)
      })

      await Promise.all(batchPromises)
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < records.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  /**
   * Private helper methods
   */
  private async validateRecipient(recipientId: string): Promise<{ exists: boolean; details?: any }> {
    // Simulate CMS API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          exists: Math.random() > 0.1, // 90% chance of existing
          details: {
            name: 'Dr. John Smith',
            specialty: 'Cardiology',
            location: 'New York, NY'
          }
        })
      }, 500)
    })
  }

  private async validatePaymentAmount(record: CMSRecord): Promise<{ isReasonable: boolean; historicalAverage?: number }> {
    // Simulate payment amount validation
    return new Promise((resolve) => {
      setTimeout(() => {
        const amount = record.totalAmountOfPaymentUsdollars
        const isReasonable = amount >= 0 && amount <= 100000
        resolve({
          isReasonable,
          historicalAverage: Math.random() * 5000
        })
      }, 300)
    })
  }

  private async checkForDuplicates(record: CMSRecord): Promise<{ hasDuplicates: boolean; duplicates?: any[] }> {
    // Simulate duplicate check
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          hasDuplicates: Math.random() < 0.05, // 5% chance of duplicates
          duplicates: []
        })
      }, 200)
    })
  }

  private extractSearchTerms(record: CMSRecord): string[] {
    const terms: string[] = []
    
    if (record.physicianSpecialty) {
      terms.push(record.physicianSpecialty)
    }
    
    if (record.natureOfPaymentOrTransferOfValue) {
      terms.push(record.natureOfPaymentOrTransferOfValue)
    }
    
    if (record.coveredRecipientName) {
      terms.push(record.coveredRecipientName)
    }

    return terms
  }
}

// Export singleton instance
export const externalAPIService = new ExternalAPIService()
