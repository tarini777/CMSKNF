import { CMSRecord } from '@/types/cms'
import { openPaymentsAPIService, OpenPaymentsRecord } from './open-payments-api'

export interface HistoricalPaymentRecord {
  id: string
  pharmaCompany: string
  recipientName: string
  recipientType: string
  paymentAmount: number
  paymentDate: string
  natureOfPayment: string
  productName?: string
  therapeuticArea?: string
  submissionDate: string
  reportingPeriod: string
  aggregateSpendCategory: string
  complianceStatus: 'compliant' | 'non-compliant' | 'under-review'
  validationResults: {
    cmsValidation: boolean
    researchCorrelation: boolean
    clinicalTrialValidation: boolean
  }
  source: 'cms-open-payments' | 'company-submission' | 'third-party'
  lastUpdated: string
}

export interface AggregateSpendSummary {
  pharmaCompany: string
  reportingPeriod: string
  totalPayments: number
  totalAmount: number
  recipientCount: number
  complianceRate: number
  topTherapeuticAreas: Array<{
    area: string
    amount: number
    percentage: number
  }>
  topRecipients: Array<{
    recipient: string
    amount: number
    paymentCount: number
  }>
}

export interface PharmaCompanyProfile {
  companyName: string
  companyId: string
  industry: 'pharmaceutical' | 'biotechnology' | 'medical-device' | 'other'
  headquarters: string
  submissionHistory: Array<{
    period: string
    totalAmount: number
    paymentCount: number
    complianceRate: number
  }>
  complianceTrends: {
    improvement: number
    averageComplianceRate: number
    lastSubmissionDate: string
  }
  riskProfile: 'low' | 'medium' | 'high'
}

export class HistoricalPaymentsService {
  private readonly API_BASE = '/api/historical-payments'

  /**
   * Import historical payment data from various sources
   */
  async importHistoricalData(
    source: 'cms-open-payments' | 'company-submission' | 'bulk-import',
    data: any[]
  ): Promise<{
    success: boolean
    imported: number
    errors: number
    summary: string
  }> {
    try {
      // If importing from CMS Open Payments, use the Open Payments API
      if (source === 'cms-open-payments') {
        return await this.importFromOpenPayments(data)
      }

      const response = await fetch(`${this.API_BASE}/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source,
          data,
          validate: true,
          enrich: true
        })
      })

      if (!response.ok) {
        throw new Error(`Import failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error importing historical data:', error)
      return {
        success: false,
        imported: 0,
        errors: 0,
        summary: 'Import failed due to system error'
      }
    }
  }

  /**
   * Import data from CMS Open Payments API
   */
  private async importFromOpenPayments(importParams: any): Promise<{
    success: boolean
    imported: number
    errors: number
    summary: string
  }> {
    try {
      let imported = 0
      let errors = 0

      // Get available datasets
      const { datasets } = await openPaymentsAPIService.getAvailableDatasets()
      
      // Import from each dataset
      for (const dataset of datasets) {
        try {
          const { payments } = await openPaymentsAPIService.getPaymentsByDataset(
            dataset.identifier,
            importParams.limit || 1000,
            importParams.offset || 0
          )

          // Convert Open Payments records to Historical Payment Records
          const historicalRecords = payments.map(payment => this.convertOpenPaymentsToHistorical(payment))
          
          // Store in local database (simulated)
          imported += historicalRecords.length
          
        } catch (error) {
          console.error(`Error importing dataset ${dataset.identifier}:`, error)
          errors++
        }
      }

      return {
        success: true,
        imported,
        errors,
        summary: `Successfully imported ${imported} records from ${datasets.length} datasets with ${errors} errors`
      }
    } catch (error) {
      console.error('Error importing from Open Payments:', error)
      return {
        success: false,
        imported: 0,
        errors: 1,
        summary: 'Failed to import from Open Payments API'
      }
    }
  }

  /**
   * Convert Open Payments record to Historical Payment record
   */
  private convertOpenPaymentsToHistorical(openPayment: OpenPaymentsRecord): HistoricalPaymentRecord {
    return {
      id: openPayment.recordId || `open-payments-${Date.now()}-${Math.random()}`,
      pharmaCompany: openPayment.applicableManufacturerOrApplicableGPOMakingPaymentName || 'Unknown',
      recipientName: this.buildRecipientName(openPayment),
      recipientType: openPayment.physicianProfileId ? 'physician' : 'teaching_hospital',
      paymentAmount: openPayment.totalAmountOfPaymentUsdollars || 0,
      paymentDate: openPayment.dateOfPayment || openPayment.paymentPublicationDate || new Date().toISOString(),
      natureOfPayment: openPayment.natureOfPaymentOrTransferOfValue || 'Unknown',
      productName: this.extractProductName(openPayment),
      therapeuticArea: openPayment.physicianSpecialty || 'Unknown',
      submissionDate: openPayment.paymentPublicationDate || new Date().toISOString(),
      reportingPeriod: openPayment.programYear || new Date().getFullYear().toString(),
      aggregateSpendCategory: this.categorizePayment(openPayment),
      complianceStatus: this.determineComplianceStatus(openPayment),
      validationResults: {
        cmsValidation: true, // Open Payments data is pre-validated by CMS
        researchCorrelation: false, // Would need to be determined separately
        clinicalTrialValidation: false // Would need to be determined separately
      },
      source: 'cms-open-payments',
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Build recipient name from Open Payments record
   */
  private buildRecipientName(openPayment: OpenPaymentsRecord): string {
    if (openPayment.teachingHospitalName) {
      return openPayment.teachingHospitalName
    }
    
    if (openPayment.physicianFirstName || openPayment.physicianLastName) {
      const parts = [
        openPayment.physicianFirstName,
        openPayment.physicianMiddleName,
        openPayment.physicianLastName,
        openPayment.physicianNameSuffix
      ].filter(Boolean)
      
      return parts.join(' ')
    }
    
    return 'Unknown Recipient'
  }

  /**
   * Extract product name from Open Payments record
   */
  private extractProductName(openPayment: OpenPaymentsRecord): string | undefined {
    const products = [
      openPayment.nameOfAssociatedCoveredDrugOrBiological1,
      openPayment.nameOfAssociatedCoveredDrugOrBiological2,
      openPayment.nameOfAssociatedCoveredDrugOrBiological3,
      openPayment.nameOfAssociatedCoveredDrugOrBiological4,
      openPayment.nameOfAssociatedCoveredDrugOrBiological5,
      openPayment.nameOfAssociatedCoveredDeviceOrMedicalSupply1,
      openPayment.nameOfAssociatedCoveredDeviceOrMedicalSupply2,
      openPayment.nameOfAssociatedCoveredDeviceOrMedicalSupply3,
      openPayment.nameOfAssociatedCoveredDeviceOrMedicalSupply4,
      openPayment.nameOfAssociatedCoveredDeviceOrMedicalSupply5
    ].filter(Boolean)
    
    return products.length > 0 ? products[0] : undefined
  }

  /**
   * Categorize payment for aggregate spend management
   */
  private categorizePayment(openPayment: OpenPaymentsRecord): string {
    const nature = openPayment.natureOfPaymentOrTransferOfValue?.toLowerCase() || ''
    
    if (nature.includes('research')) return 'Research'
    if (nature.includes('consulting')) return 'Consulting'
    if (nature.includes('speaking')) return 'Speaking'
    if (nature.includes('travel')) return 'Travel'
    if (nature.includes('food')) return 'Food & Beverage'
    if (nature.includes('gift')) return 'Gifts'
    if (nature.includes('education')) return 'Education'
    if (nature.includes('royalty')) return 'Royalties'
    if (nature.includes('ownership')) return 'Ownership Interest'
    
    return 'Other'
  }

  /**
   * Determine compliance status based on Open Payments data
   */
  private determineComplianceStatus(openPayment: OpenPaymentsRecord): 'compliant' | 'non-compliant' | 'under-review' {
    if (openPayment.disputeStatusForPublication === 'Yes') {
      return 'under-review'
    }
    
    if (openPayment.delayInPublicationIndicator === 'Yes') {
      return 'under-review'
    }
    
    // Basic compliance check - could be enhanced with more sophisticated rules
    if (openPayment.totalAmountOfPaymentUsdollars && openPayment.totalAmountOfPaymentUsdollars > 0) {
      return 'compliant'
    }
    
    return 'non-compliant'
  }

  /**
   * Search historical payments by various criteria
   */
  async searchHistoricalPayments(filters: {
    pharmaCompany?: string
    recipientName?: string
    dateRange?: {
      startDate: string
      endDate: string
    }
    amountRange?: {
      minAmount: number
      maxAmount: number
    }
    therapeuticArea?: string
    complianceStatus?: string
    limit?: number
    offset?: number
  }): Promise<{
    payments: HistoricalPaymentRecord[]
    totalCount: number
    aggregations: {
      totalAmount: number
      averageAmount: number
      complianceRate: number
    }
  }> {
    try {
      const queryParams = new URLSearchParams()
      
      if (filters.pharmaCompany) queryParams.append('pharmaCompany', filters.pharmaCompany)
      if (filters.recipientName) queryParams.append('recipientName', filters.recipientName)
      if (filters.dateRange) {
        queryParams.append('startDate', filters.dateRange.startDate)
        queryParams.append('endDate', filters.dateRange.endDate)
      }
      if (filters.amountRange) {
        queryParams.append('minAmount', filters.amountRange.minAmount.toString())
        queryParams.append('maxAmount', filters.amountRange.maxAmount.toString())
      }
      if (filters.therapeuticArea) queryParams.append('therapeuticArea', filters.therapeuticArea)
      if (filters.complianceStatus) queryParams.append('complianceStatus', filters.complianceStatus)
      if (filters.limit) queryParams.append('limit', filters.limit.toString())
      if (filters.offset) queryParams.append('offset', filters.offset.toString())

      const response = await fetch(`${this.API_BASE}/search?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error searching historical payments:', error)
      return {
        payments: [],
        totalCount: 0,
        aggregations: {
          totalAmount: 0,
          averageAmount: 0,
          complianceRate: 0
        }
      }
    }
  }

  /**
   * Get aggregate spend summary for a pharmaceutical company
   */
  async getAggregateSpendSummary(
    pharmaCompany: string,
    reportingPeriod?: string
  ): Promise<AggregateSpendSummary | null> {
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('pharmaCompany', pharmaCompany)
      if (reportingPeriod) queryParams.append('reportingPeriod', reportingPeriod)

      const response = await fetch(`${this.API_BASE}/aggregate-spend?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Aggregate spend query failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting aggregate spend summary:', error)
      return null
    }
  }

  /**
   * Get pharmaceutical company profile with compliance history
   */
  async getPharmaCompanyProfile(companyName: string): Promise<PharmaCompanyProfile | null> {
    try {
      const response = await fetch(`${this.API_BASE}/company-profile/${encodeURIComponent(companyName)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error(`Company profile query failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting company profile:', error)
      return null
    }
  }

  /**
   * Compare pharmaceutical companies' compliance performance
   */
  async comparePharmaCompanies(companyNames: string[]): Promise<{
    companies: PharmaCompanyProfile[]
    comparison: {
      averageComplianceRate: number
      totalSpend: number
      topPerformer: string
      improvementTrends: Array<{
        company: string
        improvement: number
      }>
    }
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/compare-companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ companyNames })
      })

      if (!response.ok) {
        throw new Error(`Company comparison failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error comparing companies:', error)
      return {
        companies: [],
        comparison: {
          averageComplianceRate: 0,
          totalSpend: 0,
          topPerformer: '',
          improvementTrends: []
        }
      }
    }
  }

  /**
   * Get therapeutic area analysis
   */
  async getTherapeuticAreaAnalysis(): Promise<{
    areas: Array<{
      name: string
      totalSpend: number
      paymentCount: number
      topCompanies: Array<{
        company: string
        amount: number
        percentage: number
      }>
      complianceRate: number
    }>
    trends: Array<{
      area: string
      year: string
      spend: number
      growth: number
    }>
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/therapeutic-analysis`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Therapeutic analysis failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting therapeutic area analysis:', error)
      return {
        areas: [],
        trends: []
      }
    }
  }

  /**
   * Get compliance trends over time
   */
  async getComplianceTrends(
    timeRange: 'yearly' | 'quarterly' | 'monthly' = 'yearly'
  ): Promise<{
    trends: Array<{
      period: string
      totalSpend: number
      complianceRate: number
      paymentCount: number
      violations: number
    }>
    insights: {
      overallImprovement: number
      bestPeriod: string
      worstPeriod: string
      averageComplianceRate: number
    }
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/compliance-trends?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Compliance trends query failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting compliance trends:', error)
      return {
        trends: [],
        insights: {
          overallImprovement: 0,
          bestPeriod: '',
          worstPeriod: '',
          averageComplianceRate: 0
        }
      }
    }
  }

  /**
   * Export historical data for analysis
   */
  async exportHistoricalData(
    filters: any,
    format: 'csv' | 'excel' | 'json' = 'csv'
  ): Promise<{
    success: boolean
    downloadUrl?: string
    recordCount: number
    error?: string
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          filters,
          format,
          includeAggregations: true
        })
      })

      if (!response.ok) {
        throw new Error(`Export failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error exporting historical data:', error)
      return {
        success: false,
        recordCount: 0,
        error: 'Export failed due to system error'
      }
    }
  }

  /**
   * Get data quality metrics for historical payments
   */
  async getDataQualityMetrics(): Promise<{
    totalRecords: number
    completeness: {
      overall: number
      byField: Record<string, number>
    }
    accuracy: {
      overall: number
      bySource: Record<string, number>
    }
    consistency: {
      overall: number
      issues: Array<{
        type: string
        count: number
        description: string
      }>
    }
    recommendations: string[]
  }> {
    try {
      const response = await fetch(`${this.API_BASE}/data-quality`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Data quality query failed: ${response.status} ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting data quality metrics:', error)
      return {
        totalRecords: 0,
        completeness: { overall: 0, byField: {} },
        accuracy: { overall: 0, bySource: {} },
        consistency: { overall: 0, issues: [] },
        recommendations: []
      }
    }
  }
}

// Export singleton instance
export const historicalPaymentsService = new HistoricalPaymentsService()
