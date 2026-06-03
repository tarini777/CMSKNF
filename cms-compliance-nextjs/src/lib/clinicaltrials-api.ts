import { CMSRecord } from '@/types/cms'

export interface ClinicalTrialResult {
  nctId: string
  briefTitle: string
  officialTitle: string
  phase: string
  status: string
  primaryCompletionDate: string
  completionDate: string
  primaryOutcomeMeasure: string[]
  conditions: string[]
  interventions: string[]
  locations: string[]
  leadSponsor: string
  collaborators: string[]
  studyType: string
  enrollment: number
  relevanceScore: number
  lastUpdatePostDate: string
}

export interface ClinicalTrialSearchParams {
  searchTerms: string
  targetFields: string[]
  maxStudies: number
  format: 'csv' | 'json' | 'xml'
  phase?: string
  status?: string
  condition?: string
  intervention?: string
  location?: string
  sponsor?: string
  studyType?: string
  minEnrollment?: number
  maxEnrollment?: number
  startDate?: string
  endDate?: string
}

export interface ClinicalTrialComparison {
  nctId: string
  changes: Array<{
    field: string
    oldValue: any
    newValue: any
    changeDate: string
  }>
}

export class ClinicalTrialsAPIService {
  private readonly API_BASE = 'https://clinicaltrials.gov/api/v2'
  private readonly CLASSIC_API_BASE = 'https://clinicaltrials.gov/api/query'
  private readonly PYTHON_API_BASE = 'https://clinicaltrials.gov/api/query/study_fields'

  /**
   * Search clinical trials using the new API v2
   */
  async searchTrials(searchParams: ClinicalTrialSearchParams): Promise<ClinicalTrialResult[]> {
    try {
      const queryParams = this.buildSearchQuery(searchParams)
      const response = await fetch(`${this.API_BASE}/studies?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CMS-Compliance-Platform/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`ClinicalTrials API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseAPIResponse(data, searchParams)
    } catch (error) {
      console.error('Error searching clinical trials:', error)
      // Fallback to mock data for development
      return this.getMockClinicalTrials(searchParams)
    }
  }

  /**
   * Search clinical trials using the classic API (for backward compatibility)
   */
  async searchTrialsClassic(searchParams: ClinicalTrialSearchParams): Promise<ClinicalTrialResult[]> {
    try {
      const queryParams = this.buildClassicSearchQuery(searchParams)
      const response = await fetch(`${this.CLASSIC_API_BASE}/study_fields?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CMS-Compliance-Platform/1.0'
        }
      })

      if (!response.ok) {
        throw new Error(`ClinicalTrials Classic API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseClassicAPIResponse(data, searchParams)
    } catch (error) {
      console.error('Error searching clinical trials with classic API:', error)
      return this.getMockClinicalTrials(searchParams)
    }
  }

  /**
   * Get specific trial details by NCT ID
   */
  async getTrialDetails(nctId: string): Promise<ClinicalTrialResult | null> {
    try {
      const response = await fetch(`${this.API_BASE}/studies/${nctId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CMS-Compliance-Platform/1.0'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`ClinicalTrials API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return this.parseTrialDetails(data)
    } catch (error) {
      console.error('Error getting trial details:', error)
      return null
    }
  }

  /**
   * Search trials related to a CMS record
   */
  async searchTrialsForCMSRecord(record: CMSRecord): Promise<ClinicalTrialResult[]> {
    try {
      // Extract search terms from the CMS record
      const searchTerms = this.extractSearchTermsFromRecord(record)
      
      const searchParams: ClinicalTrialSearchParams = {
        searchTerms: searchTerms.join(' AND '),
        targetFields: [
          'NCTId',
          'BriefTitle',
          'OfficialTitle',
          'Phase',
          'Status',
          'PrimaryCompletionDate',
          'CompletionDate',
          'PrimaryOutcomeMeasure',
          'Condition',
          'InterventionName',
          'LocationCountry',
          'LeadSponsorName',
          'CollaboratorName',
          'StudyType',
          'EnrollmentCount',
          'LastUpdatePostDate'
        ],
        maxStudies: 20,
        format: 'json'
      }

      return await this.searchTrials(searchParams)
    } catch (error) {
      console.error('Error searching trials for CMS record:', error)
      return []
    }
  }

  /**
   * Track changes in clinical trials over time
   */
  async trackTrialChanges(
    nctIds: string[],
    previousData: Map<string, ClinicalTrialResult>
  ): Promise<ClinicalTrialComparison[]> {
    const comparisons: ClinicalTrialComparison[] = []

    for (const nctId of nctIds) {
      try {
        const currentTrial = await this.getTrialDetails(nctId)
        const previousTrial = previousData.get(nctId)

        if (currentTrial && previousTrial) {
          const changes = this.compareTrialData(previousTrial, currentTrial)
          if (changes.length > 0) {
            comparisons.push({
              nctId,
              changes
            })
          }
        }
      } catch (error) {
        console.error(`Error tracking changes for trial ${nctId}:`, error)
      }
    }

    return comparisons
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
      const response = await fetch(`${this.API_BASE}/studies?query.term=aspirin&pageSize=1`, {
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
   * Build search query for API v2
   */
  private buildSearchQuery(searchParams: ClinicalTrialSearchParams): string {
    const params = new URLSearchParams()
    
    // Basic search
    params.append('query.term', searchParams.searchTerms)
    params.append('pageSize', searchParams.maxStudies.toString())
    
    // Filters
    if (searchParams.phase) {
      params.append('filter.overallStatus', searchParams.phase)
    }
    if (searchParams.status) {
      params.append('filter.overallStatus', searchParams.status)
    }
    if (searchParams.condition) {
      params.append('filter.conditions', searchParams.condition)
    }
    if (searchParams.intervention) {
      params.append('filter.interventions', searchParams.intervention)
    }
    if (searchParams.location) {
      params.append('filter.locations', searchParams.location)
    }
    if (searchParams.sponsor) {
      params.append('filter.sponsors', searchParams.sponsor)
    }
    if (searchParams.studyType) {
      params.append('filter.studyTypes', searchParams.studyType)
    }
    if (searchParams.minEnrollment) {
      params.append('filter.minEnrollment', searchParams.minEnrollment.toString())
    }
    if (searchParams.maxEnrollment) {
      params.append('filter.maxEnrollment', searchParams.maxEnrollment.toString())
    }
    if (searchParams.startDate) {
      params.append('filter.startDate', searchParams.startDate)
    }
    if (searchParams.endDate) {
      params.append('filter.endDate', searchParams.endDate)
    }

    return params.toString()
  }

  /**
   * Build search query for classic API
   */
  private buildClassicSearchQuery(searchParams: ClinicalTrialSearchParams): string {
    const params = new URLSearchParams()
    
    params.append('expr', searchParams.searchTerms)
    params.append('fields', searchParams.targetFields.join(','))
    params.append('min_rnk', '1')
    params.append('max_rnk', searchParams.maxStudies.toString())
    params.append('fmt', searchParams.format)

    return params.toString()
  }

  /**
   * Parse API v2 response
   */
  private parseAPIResponse(data: any, searchParams: ClinicalTrialSearchParams): ClinicalTrialResult[] {
    if (!data.studies || !Array.isArray(data.studies)) {
      return []
    }

    return data.studies.map((study: any) => this.parseTrialData(study, searchParams))
  }

  /**
   * Parse classic API response
   */
  private parseClassicAPIResponse(data: any, searchParams: ClinicalTrialSearchParams): ClinicalTrialResult[] {
    if (!data.StudyFieldsResponse || !data.StudyFieldsResponse.StudyFields) {
      return []
    }

    return data.StudyFieldsResponse.StudyFields.map((study: any) => 
      this.parseClassicTrialData(study, searchParams)
    )
  }

  /**
   * Parse individual trial data from API v2
   */
  private parseTrialData(study: any, searchParams: ClinicalTrialSearchParams): ClinicalTrialResult {
    const protocolSection = study.protocolSection || {}
    const identificationModule = protocolSection.identificationModule || {}
    const statusModule = protocolSection.statusModule || {}
    const designModule = protocolSection.designModule || {}
    const conditionsModule = protocolSection.conditionsModule || {}
    const interventionsModule = protocolSection.interventionsModule || {}
    const locationsModule = protocolSection.locationsModule || {}
    const sponsorCollaboratorsModule = protocolSection.sponsorCollaboratorsModule || {}

    return {
      nctId: identificationModule.nctId || '',
      briefTitle: identificationModule.briefTitle || '',
      officialTitle: identificationModule.officialTitle || '',
      phase: designModule.phases?.join(', ') || '',
      status: statusModule.overallStatus || '',
      primaryCompletionDate: statusModule.primaryCompletionDateStruct?.date || '',
      completionDate: statusModule.completionDateStruct?.date || '',
      primaryOutcomeMeasure: designModule.primaryOutcomes?.map((outcome: any) => outcome.measure) || [],
      conditions: conditionsModule.conditions || [],
      interventions: interventionsModule.interventions?.map((intervention: any) => intervention.name) || [],
      locations: locationsModule.locations?.map((location: any) => location.facility?.name) || [],
      leadSponsor: sponsorCollaboratorsModule.leadSponsor?.name || '',
      collaborators: sponsorCollaboratorsModule.collaborators?.map((collab: any) => collab.name) || [],
      studyType: designModule.studyType || '',
      enrollment: designModule.enrollmentInfo?.count || 0,
      relevanceScore: this.calculateRelevanceScore(study, searchParams),
      lastUpdatePostDate: statusModule.lastUpdatePostDateStruct?.date || ''
    }
  }

  /**
   * Parse individual trial data from classic API
   */
  private parseClassicTrialData(study: any, searchParams: ClinicalTrialSearchParams): ClinicalTrialResult {
    return {
      nctId: study.NCTId?.[0] || '',
      briefTitle: study.BriefTitle?.[0] || '',
      officialTitle: study.OfficialTitle?.[0] || '',
      phase: study.Phase?.join(', ') || '',
      status: study.OverallStatus?.[0] || '',
      primaryCompletionDate: study.PrimaryCompletionDate?.[0] || '',
      completionDate: study.CompletionDate?.[0] || '',
      primaryOutcomeMeasure: study.PrimaryOutcomeMeasure || [],
      conditions: study.Condition || [],
      interventions: study.InterventionName || [],
      locations: study.LocationCountry || [],
      leadSponsor: study.LeadSponsorName?.[0] || '',
      collaborators: study.CollaboratorName || [],
      studyType: study.StudyType?.[0] || '',
      enrollment: parseInt(study.EnrollmentCount?.[0] || '0'),
      relevanceScore: this.calculateRelevanceScore(study, searchParams),
      lastUpdatePostDate: study.LastUpdatePostDate?.[0] || ''
    }
  }

  /**
   * Parse trial details from API v2
   */
  private parseTrialDetails(data: any): ClinicalTrialResult {
    // Similar to parseTrialData but for single trial details
    return this.parseTrialData(data, { searchTerms: '', targetFields: [], maxStudies: 1, format: 'json' })
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
      // Extract potential drug names or conditions from recipient name
      const name = record.coveredRecipientName.toLowerCase()
      if (name.includes('cardio')) terms.push('cardiovascular')
      if (name.includes('neuro')) terms.push('neurology')
      if (name.includes('onco')) terms.push('oncology')
    }

    return terms.filter(term => term.length > 2)
  }

  /**
   * Calculate relevance score for a trial
   */
  private calculateRelevanceScore(trial: any, searchParams: ClinicalTrialSearchParams): number {
    let score = 0.5 // Base score
    
    // Increase score based on matching conditions
    if (trial.conditions && searchParams.condition) {
      const matchingConditions = trial.conditions.filter((condition: string) =>
        condition.toLowerCase().includes(searchParams.condition!.toLowerCase())
      )
      score += matchingConditions.length * 0.1
    }
    
    // Increase score based on matching interventions
    if (trial.interventions && searchParams.intervention) {
      const matchingInterventions = trial.interventions.filter((intervention: string) =>
        intervention.toLowerCase().includes(searchParams.intervention!.toLowerCase())
      )
      score += matchingInterventions.length * 0.1
    }
    
    // Increase score for active trials
    if (trial.status && ['Recruiting', 'Active', 'Enrolling'].includes(trial.status)) {
      score += 0.2
    }
    
    // Increase score for later phases
    if (trial.phase && ['Phase 3', 'Phase 4'].includes(trial.phase)) {
      score += 0.1
    }
    
    return Math.min(score, 1.0) // Cap at 1.0
  }

  /**
   * Compare trial data to detect changes
   */
  private compareTrialData(previous: ClinicalTrialResult, current: ClinicalTrialResult): Array<{
    field: string
    oldValue: any
    newValue: any
    changeDate: string
  }> {
    const changes: Array<{
      field: string
      oldValue: any
      newValue: any
      changeDate: string
    }> = []

    const fieldsToCompare = [
      'status', 'phase', 'primaryCompletionDate', 'completionDate',
      'primaryOutcomeMeasure', 'conditions', 'interventions', 'locations',
      'leadSponsor', 'collaborators', 'studyType', 'enrollment'
    ]

    fieldsToCompare.forEach(field => {
      const oldValue = (previous as any)[field]
      const newValue = (current as any)[field]
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field,
          oldValue,
          newValue,
          changeDate: new Date().toISOString()
        })
      }
    })

    return changes
  }

  /**
   * Get mock clinical trials data for development/testing
   */
  private getMockClinicalTrials(searchParams: ClinicalTrialSearchParams): ClinicalTrialResult[] {
    const mockTrials: ClinicalTrialResult[] = [
      {
        nctId: 'NCT12345678',
        briefTitle: 'Phase III Study of New Drug for Treatment',
        officialTitle: 'A Phase III, Randomized, Double-Blind, Placebo-Controlled Study of New Drug for Treatment',
        phase: 'Phase 3',
        status: 'Recruiting',
        primaryCompletionDate: '2025-12-31',
        completionDate: '2026-06-30',
        primaryOutcomeMeasure: ['Efficacy as measured by primary endpoint', 'Safety and tolerability'],
        conditions: ['Diabetes', 'Cardiovascular Disease'],
        interventions: ['Drug: NewTherapy', 'Placebo'],
        locations: ['United States', 'Canada'],
        leadSponsor: 'Pharmaceutical Company Inc.',
        collaborators: ['Research Institute', 'University Medical Center'],
        studyType: 'Interventional',
        enrollment: 500,
        relevanceScore: 0.85,
        lastUpdatePostDate: '2024-09-01'
      },
      {
        nctId: 'NCT87654321',
        briefTitle: 'Healthcare Provider Training Study',
        officialTitle: 'A Study to Evaluate Healthcare Provider Training Program',
        phase: 'Phase 2',
        status: 'Active',
        primaryCompletionDate: '2025-06-30',
        completionDate: '2025-12-31',
        primaryOutcomeMeasure: ['Training effectiveness', 'Knowledge retention'],
        conditions: ['Medical Education'],
        interventions: ['Behavioral: Training Program'],
        locations: ['United States'],
        leadSponsor: 'Medical Education Foundation',
        collaborators: ['Healthcare System'],
        studyType: 'Interventional',
        enrollment: 200,
        relevanceScore: 0.72,
        lastUpdatePostDate: '2024-08-15'
      }
    ]

    // Filter based on search terms if provided
    if (searchParams.searchTerms) {
      const searchLower = searchParams.searchTerms.toLowerCase()
      return mockTrials.filter(trial => 
        trial.briefTitle.toLowerCase().includes(searchLower) ||
        trial.conditions.some(condition => condition.toLowerCase().includes(searchLower)) ||
        trial.interventions.some(intervention => intervention.toLowerCase().includes(searchLower))
      )
    }

    return mockTrials
  }
}

// Export singleton instance
export const clinicalTrialsAPIService = new ClinicalTrialsAPIService()
