import { glossaryService } from './glossary-service'
import { CMSRecord } from '@/types/cms'

export interface CMSPaymentRecord {
  // Basic identifiers
  changeType: string
  recordId: string
  programYear: number
  
  // Recipient information
  coveredRecipientType: string
  teachingHospitalCCN?: string
  teachingHospitalID?: string
  teachingHospitalName?: string
  coveredRecipientProfileID?: string
  coveredRecipientNPI?: string
  coveredRecipientFirstName?: string
  coveredRecipientMiddleName?: string
  coveredRecipientLastName?: string
  coveredRecipientNameSuffix?: string
  
  // Recipient address
  recipientPrimaryBusinessStreetAddressLine1?: string
  recipientPrimaryBusinessStreetAddressLine2?: string
  recipientCity?: string
  recipientState?: string
  recipientZipCode?: string
  recipientCountry?: string
  
  // Recipient specialties and types
  coveredRecipientPrimaryType1?: string
  coveredRecipientPrimaryType2?: string
  coveredRecipientPrimaryType3?: string
  coveredRecipientPrimaryType4?: string
  coveredRecipientPrimaryType5?: string
  coveredRecipientPrimaryType6?: string
  coveredRecipientSpecialty1?: string
  coveredRecipientSpecialty2?: string
  coveredRecipientSpecialty3?: string
  coveredRecipientSpecialty4?: string
  coveredRecipientSpecialty5?: string
  coveredRecipientSpecialty6?: string
  
  // License information
  coveredRecipientLicenseStateCode1?: string
  coveredRecipientLicenseStateCode2?: string
  coveredRecipientLicenseStateCode3?: string
  coveredRecipientLicenseStateCode4?: string
  coveredRecipientLicenseStateCode5?: string
  
  // Manufacturer/GPO information
  submittingApplicableManufacturerOrApplicableGPOName?: string
  applicableManufacturerOrApplicableGPOMakingPaymentID?: string
  applicableManufacturerOrApplicableGPOMakingPaymentName?: string
  applicableManufacturerOrApplicableGPOMakingPaymentState?: string
  applicableManufacturerOrApplicableGPOMakingPaymentCountry?: string
  
  // Payment information
  totalAmountOfPaymentUSDollars?: number
  dateOfPayment?: string
  numberOfPaymentsIncludedInTotalAmount?: number
  formOfPaymentOrTransferOfValue?: string
  natureOfPaymentOrTransferOfValue?: string
  
  // Travel information
  cityOfTravel?: string
  stateOfTravel?: string
  countryOfTravel?: string
  
  // Additional indicators
  physicianOwnershipIndicator?: string
  thirdPartyPaymentRecipientIndicator?: string
  nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue?: string
  charityIndicator?: string
  thirdPartyEqualsCoveredRecipientIndicator?: string
  contextualInformation?: string
  delayInPublicationIndicator?: string
  disputeStatusForPublication?: string
  relatedProductIndicator?: string
  
  // Product information (up to 5 products)
  coveredOrNoncoveredIndicator1?: string
  indicateDrugOrBiologicalOrDeviceOrMedicalSupply1?: string
  productCategoryOrTherapeuticArea1?: string
  nameOfDrugOrBiologicalOrDeviceOrMedicalSupply1?: string
  associatedDrugOrBiologicalNDC1?: string
  associatedDeviceOrMedicalSupplyPDI1?: string
  
  // Research-specific fields
  noncoveredRecipientEntityName?: string
  principalInvestigator1CoveredRecipientType?: string
  principalInvestigator1ProfileID?: string
  principalInvestigator1NPI?: string
  principalInvestigator1FirstName?: string
  principalInvestigator1MiddleName?: string
  principalInvestigator1LastName?: string
  principalInvestigator1NameSuffix?: string
  expenditureCategory1?: string
  expenditureCategory2?: string
  expenditureCategory3?: string
  expenditureCategory4?: string
  expenditureCategory5?: string
  expenditureCategory6?: string
  preclinicalResearchIndicator?: string
  nameOfStudy?: string
  clinicalTrialsGovIdentifier?: string
  researchInformationLink?: string
  contextOfResearch?: string
  
  // Ownership-specific fields
  ownershipType?: string
  amountInvested?: number
  valueOfInterest?: number
  
  // Publication information
  paymentPublicationDate?: string
}

export interface AnalysisResult {
  recordId: string
  isReportable: boolean
  confidence: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  fraudIndicators: string[]
  anomalyScore: number
  reportabilityAnalysis: any
  patterns: {
    amountPattern: string
    timingPattern: string
    recipientPattern: string
    manufacturerPattern: string
  }
  recommendations: string[]
}

export interface PatternAnalysis {
  fraudPatterns: {
    suspiciousAmounts: CMSPaymentRecord[]
    unusualTiming: CMSPaymentRecord[]
    duplicatePayments: CMSPaymentRecord[]
    highRiskRecipients: CMSPaymentRecord[]
    manufacturerConcentration: CMSPaymentRecord[]
  }
  reportabilityPatterns: {
    clearlyReportable: CMSPaymentRecord[]
    clearlyNonReportable: CMSPaymentRecord[]
    greyArea: CMSPaymentRecord[]
    disputedRecords: CMSPaymentRecord[]
  }
  statisticalAnalysis: {
    totalRecords: number
    totalAmount: number
    averageAmount: number
    medianAmount: number
    topManufacturers: Array<{ name: string; count: number; totalAmount: number }>
    topRecipients: Array<{ name: string; count: number; totalAmount: number }>
    paymentTypeDistribution: Array<{ type: string; count: number; percentage: number }>
    natureOfPaymentDistribution: Array<{ nature: string; count: number; percentage: number }>
    stateDistribution: Array<{ state: string; count: number; percentage: number }>
    monthlyDistribution: Array<{ month: string; count: number; totalAmount: number }>
  }
  complianceMetrics: {
    reportabilityRate: number
    disputeRate: number
    averageConfidence: number
    riskDistribution: {
      low: number
      medium: number
      high: number
      critical: number
    }
  }
}

export class DataAnalysisService {
  private records: CMSPaymentRecord[] = []
  private analysisResults: AnalysisResult[] = []

  /**
   * Load and parse CMS Open Payments CSV files
   */
  async loadCMSData(filePaths: {
    generalPayments?: string
    researchPayments?: string
    ownershipPayments?: string
    removedDeleted?: string
  }): Promise<{ success: boolean; records: number; errors: string[] }> {
    const errors: string[] = []
    let totalRecords = 0

    try {
      // Load General Payments
      if (filePaths.generalPayments) {
        const generalRecords = await this.parseCSVFile(filePaths.generalPayments, 'general')
        this.records.push(...generalRecords)
        totalRecords += generalRecords.length
      }

      // Load Research Payments
      if (filePaths.researchPayments) {
        const researchRecords = await this.parseCSVFile(filePaths.researchPayments, 'research')
        this.records.push(...researchRecords)
        totalRecords += researchRecords.length
      }

      // Load Ownership Payments
      if (filePaths.ownershipPayments) {
        const ownershipRecords = await this.parseCSVFile(filePaths.ownershipPayments, 'ownership')
        this.records.push(...ownershipRecords)
        totalRecords += ownershipRecords.length
      }

      // Load Removed/Deleted Records
      if (filePaths.removedDeleted) {
        const removedRecords = await this.parseCSVFile(filePaths.removedDeleted, 'removed')
        this.records.push(...removedRecords)
        totalRecords += removedRecords.length
      }

      return { success: true, records: totalRecords, errors }
    } catch (error) {
      errors.push(`Failed to load CMS data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      return { success: false, records: 0, errors }
    }
  }

  /**
   * Parse a single CSV file
   */
  private async parseCSVFile(filePath: string, type: 'general' | 'research' | 'ownership' | 'removed'): Promise<CMSPaymentRecord[]> {
    // This would typically use a CSV parsing library like 'csv-parser' or 'papaparse'
    // For now, we'll create a mock implementation
    const records: CMSPaymentRecord[] = []
    
    // In a real implementation, you would:
    // 1. Read the CSV file
    // 2. Parse each row into a CMSPaymentRecord object
    // 3. Handle data type conversions (strings to numbers, dates, etc.)
    // 4. Validate required fields
    
    return records
  }

  /**
   * Analyze all loaded records for patterns and anomalies
   */
  async analyzePatterns(): Promise<PatternAnalysis> {
    if (this.records.length === 0) {
      throw new Error('No records loaded. Please load CMS data first.')
    }

    // Analyze each record
    for (const record of this.records) {
      const analysis = await this.analyzeRecord(record)
      this.analysisResults.push(analysis)
    }

    return this.generatePatternAnalysis()
  }

  /**
   * Analyze a single record for reportability and anomalies
   */
  private async analyzeRecord(record: CMSPaymentRecord): Promise<AnalysisResult> {
    // Convert to CMSRecord format for glossary service
    const cmsRecord: CMSRecord = {
      id: record.recordId,
      recordId: record.recordId,
      coveredRecipientId: record.coveredRecipientNPI || record.recordId,
      coveredRecipientName: this.getRecipientName(record),
      coveredRecipientType: record.coveredRecipientType || 'Physician',
      totalAmountOfPaymentUsdollars: record.totalAmountOfPaymentUSDollars || 0,
      isReportable: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      amount: record.totalAmountOfPaymentUSDollars || 0,
      description: record.natureOfPaymentOrTransferOfValue || '',
      providerName: this.getRecipientName(record),
      date: record.dateOfPayment || '',
      status: 'pending',
      category: this.getRecordCategory(record),
      natureOfPayment: record.natureOfPaymentOrTransferOfValue || '',
      recipientType: record.coveredRecipientType || '',
      manufacturerName: record.applicableManufacturerOrApplicableGPOMakingPaymentName || '',
      disputeStatus: record.disputeStatusForPublication || 'No',
      contextualInformation: record.contextualInformation || ''
    }

    // Get reportability analysis from glossary service
    const reportabilityAnalysis = await glossaryService.analyzeReportability(cmsRecord)

    // Calculate fraud indicators
    const fraudIndicators = this.detectFraudIndicators(record)

    // Calculate anomaly score
    const anomalyScore = this.calculateAnomalyScore(record)

    // Determine risk level
    const riskLevel = this.determineRiskLevel(fraudIndicators, anomalyScore, reportabilityAnalysis.confidence)

    // Identify patterns
    const patterns = this.identifyPatterns(record)

    // Generate recommendations
    const recommendations = this.generateRecommendations(record, fraudIndicators, reportabilityAnalysis)

    return {
      recordId: record.recordId,
      isReportable: reportabilityAnalysis.isReportable,
      confidence: reportabilityAnalysis.confidence,
      riskLevel,
      fraudIndicators,
      anomalyScore,
      reportabilityAnalysis,
      patterns,
      recommendations
    }
  }

  /**
   * Detect fraud indicators in a record
   */
  private detectFraudIndicators(record: CMSPaymentRecord): string[] {
    const indicators: string[] = []

    // Amount-based indicators
    if (record.totalAmountOfPaymentUSDollars && record.totalAmountOfPaymentUSDollars > 100000) {
      indicators.push('Very high payment amount (>$100,000)')
    }

    if (record.totalAmountOfPaymentUSDollars && record.totalAmountOfPaymentUSDollars < 10) {
      indicators.push('Payment below reporting threshold')
    }

    // Timing indicators
    if (record.delayInPublicationIndicator === 'Yes') {
      indicators.push('Delayed publication')
    }

    // Dispute indicators
    if (record.disputeStatusForPublication === 'Yes') {
      indicators.push('Disputed record')
    }

    // Third-party payment indicators
    if (record.thirdPartyPaymentRecipientIndicator === 'Yes') {
      indicators.push('Third-party payment recipient')
    }

    // Ownership indicators
    if (record.physicianOwnershipIndicator === 'Yes') {
      indicators.push('Physician ownership interest')
    }

    // Charity indicators
    if (record.charityIndicator === 'Yes') {
      indicators.push('Charity payment')
    }

    // Contextual information indicators
    if (record.contextualInformation && record.contextualInformation.length > 500) {
      indicators.push('Extensive contextual information')
    }

    return indicators
  }

  /**
   * Calculate anomaly score for a record
   */
  private calculateAnomalyScore(record: CMSPaymentRecord): number {
    let score = 0

    // Amount anomalies
    if (record.totalAmountOfPaymentUSDollars) {
      if (record.totalAmountOfPaymentUSDollars > 50000) score += 0.3
      if (record.totalAmountOfPaymentUSDollars < 10) score += 0.2
    }

    // Timing anomalies
    if (record.delayInPublicationIndicator === 'Yes') score += 0.2

    // Dispute anomalies
    if (record.disputeStatusForPublication === 'Yes') score += 0.3

    // Third-party anomalies
    if (record.thirdPartyPaymentRecipientIndicator === 'Yes') score += 0.1

    // Ownership anomalies
    if (record.physicianOwnershipIndicator === 'Yes') score += 0.2

    return Math.min(score, 1.0) // Cap at 1.0
  }

  /**
   * Determine risk level based on indicators and scores
   */
  private determineRiskLevel(
    fraudIndicators: string[],
    anomalyScore: number,
    confidence: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalIndicators = fraudIndicators.filter(indicator => 
      indicator.includes('Very high payment') || 
      indicator.includes('Disputed record')
    )

    if (criticalIndicators.length > 0 || anomalyScore > 0.7) {
      return 'critical'
    }

    if (fraudIndicators.length > 3 || anomalyScore > 0.5) {
      return 'high'
    }

    if (fraudIndicators.length > 1 || anomalyScore > 0.3) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * Identify patterns in a record
   */
  private identifyPatterns(record: CMSPaymentRecord) {
    return {
      amountPattern: this.getAmountPattern(record.totalAmountOfPaymentUSDollars || 0),
      timingPattern: this.getTimingPattern(record.dateOfPayment || ''),
      recipientPattern: this.getRecipientPattern(record),
      manufacturerPattern: this.getManufacturerPattern(record)
    }
  }

  private getAmountPattern(amount: number): string {
    if (amount < 10) return 'Below threshold'
    if (amount < 100) return 'Low amount'
    if (amount < 1000) return 'Medium amount'
    if (amount < 10000) return 'High amount'
    return 'Very high amount'
  }

  private getTimingPattern(date: string): string {
    if (!date) return 'Unknown'
    const paymentDate = new Date(date)
    const month = paymentDate.getMonth()
    
    // Check for end-of-quarter patterns
    if ([2, 5, 8, 11].includes(month)) return 'End of quarter'
    if ([0, 6].includes(month)) return 'Beginning of year/half'
    return 'Regular timing'
  }

  private getRecipientPattern(record: CMSPaymentRecord): string {
    if (record.coveredRecipientType?.includes('Teaching Hospital')) return 'Teaching hospital'
    if (record.coveredRecipientType?.includes('Physician')) return 'Physician'
    return 'Other recipient'
  }

  private getManufacturerPattern(record: CMSPaymentRecord): string {
    const manufacturer = record.applicableManufacturerOrApplicableGPOMakingPaymentName || ''
    if (manufacturer.includes('Inc.') || manufacturer.includes('LLC')) return 'Corporate entity'
    return 'Other entity'
  }

  /**
   * Generate recommendations for a record
   */
  private generateRecommendations(
    record: CMSPaymentRecord,
    fraudIndicators: string[],
    reportabilityAnalysis: any
  ): string[] {
    const recommendations: string[] = []

    if (fraudIndicators.length > 0) {
      recommendations.push('Review fraud indicators and investigate further')
    }

    if (record.disputeStatusForPublication === 'Yes') {
      recommendations.push('Resolve dispute before final reporting')
    }

    if (record.delayInPublicationIndicator === 'Yes') {
      recommendations.push('Investigate reason for publication delay')
    }

    if (reportabilityAnalysis.confidence < 0.7) {
      recommendations.push('Low confidence in reportability - manual review recommended')
    }

    if (record.totalAmountOfPaymentUSDollars && record.totalAmountOfPaymentUSDollars > 50000) {
      recommendations.push('High-value payment - ensure proper documentation')
    }

    return recommendations
  }

  /**
   * Generate comprehensive pattern analysis
   */
  private generatePatternAnalysis(): PatternAnalysis {
    const fraudPatterns = this.identifyFraudPatterns()
    const reportabilityPatterns = this.identifyReportabilityPatterns()
    const statisticalAnalysis = this.generateStatisticalAnalysis()
    const complianceMetrics = this.generateComplianceMetrics()

    return {
      fraudPatterns,
      reportabilityPatterns,
      statisticalAnalysis,
      complianceMetrics
    }
  }

  private identifyFraudPatterns() {
    return {
      suspiciousAmounts: this.records.filter(r => 
        (r.totalAmountOfPaymentUSDollars || 0) > 100000 || 
        (r.totalAmountOfPaymentUSDollars || 0) < 10
      ),
      unusualTiming: this.records.filter(r => r.delayInPublicationIndicator === 'Yes'),
      duplicatePayments: this.findDuplicatePayments(),
      highRiskRecipients: this.records.filter(r => 
        this.analysisResults.find(ar => ar.recordId === r.recordId)?.riskLevel === 'high' || 
        this.analysisResults.find(ar => ar.recordId === r.recordId)?.riskLevel === 'critical'
      ),
      manufacturerConcentration: this.findManufacturerConcentration()
    }
  }

  private identifyReportabilityPatterns() {
    return {
      clearlyReportable: this.records.filter(r => {
        const ar = this.analysisResults.find(a => a.recordId === r.recordId)
        return ar?.isReportable === true && (ar?.confidence ?? 0) > 0.8
      }),
      clearlyNonReportable: this.records.filter(r => {
        const ar = this.analysisResults.find(a => a.recordId === r.recordId)
        return ar?.isReportable === false && (ar?.confidence ?? 0) > 0.8
      }),
      greyArea: this.records.filter(r => {
        const ar = this.analysisResults.find(a => a.recordId === r.recordId)
        return (ar?.confidence ?? 0) < 0.7
      }),
      disputedRecords: this.records.filter(r => r.disputeStatusForPublication === 'Yes')
    }
  }

  private findDuplicatePayments(): CMSPaymentRecord[] {
    const duplicates: CMSPaymentRecord[] = []
    const seen = new Set<string>()

    for (const record of this.records) {
      const key = `${record.applicableManufacturerOrApplicableGPOMakingPaymentName}-${record.coveredRecipientProfileID}-${record.totalAmountOfPaymentUSDollars}-${record.dateOfPayment}`
      
      if (seen.has(key)) {
        duplicates.push(record)
      } else {
        seen.add(key)
      }
    }

    return duplicates
  }

  private findManufacturerConcentration(): CMSPaymentRecord[] {
    const manufacturerCounts = new Map<string, number>()
    
    for (const record of this.records) {
      const manufacturer = record.applicableManufacturerOrApplicableGPOMakingPaymentName || 'Unknown'
      manufacturerCounts.set(manufacturer, (manufacturerCounts.get(manufacturer) || 0) + 1)
    }

    // Find manufacturers with high concentration
    const highConcentrationManufacturers = Array.from(manufacturerCounts.entries())
      .filter(([_, count]) => count > 100) // More than 100 payments
      .map(([manufacturer, _]) => manufacturer)

    return this.records.filter(r => 
      highConcentrationManufacturers.includes(r.applicableManufacturerOrApplicableGPOMakingPaymentName || '')
    )
  }

  private generateStatisticalAnalysis() {
    const amounts = this.records
      .map(r => r.totalAmountOfPaymentUSDollars || 0)
      .filter(amount => amount > 0)

    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0)
    const averageAmount = amounts.length > 0 ? totalAmount / amounts.length : 0
    const sortedAmounts = amounts.sort((a, b) => a - b)
    const medianAmount = sortedAmounts.length > 0 
      ? sortedAmounts[Math.floor(sortedAmounts.length / 2)] 
      : 0

    // Manufacturer analysis
    const manufacturerCounts = new Map<string, { count: number; totalAmount: number }>()
    for (const record of this.records) {
      const manufacturer = record.applicableManufacturerOrApplicableGPOMakingPaymentName || 'Unknown'
      const amount = record.totalAmountOfPaymentUSDollars || 0
      
      if (!manufacturerCounts.has(manufacturer)) {
        manufacturerCounts.set(manufacturer, { count: 0, totalAmount: 0 })
      }
      
      const current = manufacturerCounts.get(manufacturer)!
      manufacturerCounts.set(manufacturer, {
        count: current.count + 1,
        totalAmount: current.totalAmount + amount
      })
    }

    const topManufacturers = Array.from(manufacturerCounts.entries())
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
      .slice(0, 10)
      .map(([name, data]) => ({ name, count: data.count, totalAmount: data.totalAmount }))

    // Recipient analysis
    const recipientCounts = new Map<string, { count: number; totalAmount: number }>()
    for (const record of this.records) {
      const recipient = this.getRecipientName(record)
      const amount = record.totalAmountOfPaymentUSDollars || 0
      
      if (!recipientCounts.has(recipient)) {
        recipientCounts.set(recipient, { count: 0, totalAmount: 0 })
      }
      
      const current = recipientCounts.get(recipient)!
      recipientCounts.set(recipient, {
        count: current.count + 1,
        totalAmount: current.totalAmount + amount
      })
    }

    const topRecipients = Array.from(recipientCounts.entries())
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
      .slice(0, 10)
      .map(([name, data]) => ({ name, count: data.count, totalAmount: data.totalAmount }))

    // Payment type distribution
    const paymentTypeCounts = new Map<string, number>()
    for (const record of this.records) {
      const type = record.formOfPaymentOrTransferOfValue || 'Unknown'
      paymentTypeCounts.set(type, (paymentTypeCounts.get(type) || 0) + 1)
    }

    const paymentTypeDistribution = Array.from(paymentTypeCounts.entries())
      .map(([type, count]) => ({
        type,
        count,
        percentage: (count / this.records.length) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // Nature of payment distribution
    const natureCounts = new Map<string, number>()
    for (const record of this.records) {
      const nature = record.natureOfPaymentOrTransferOfValue || 'Unknown'
      natureCounts.set(nature, (natureCounts.get(nature) || 0) + 1)
    }

    const natureOfPaymentDistribution = Array.from(natureCounts.entries())
      .map(([nature, count]) => ({
        nature,
        count,
        percentage: (count / this.records.length) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // State distribution
    const stateCounts = new Map<string, number>()
    for (const record of this.records) {
      const state = record.recipientState || 'Unknown'
      stateCounts.set(state, (stateCounts.get(state) || 0) + 1)
    }

    const stateDistribution = Array.from(stateCounts.entries())
      .map(([state, count]) => ({
        state,
        count,
        percentage: (count / this.records.length) * 100
      }))
      .sort((a, b) => b.count - a.count)

    // Monthly distribution
    const monthlyCounts = new Map<string, { count: number; totalAmount: number }>()
    for (const record of this.records) {
      if (record.dateOfPayment) {
        const date = new Date(record.dateOfPayment)
        const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        const amount = record.totalAmountOfPaymentUSDollars || 0
        
        if (!monthlyCounts.has(month)) {
          monthlyCounts.set(month, { count: 0, totalAmount: 0 })
        }
        
        const current = monthlyCounts.get(month)!
        monthlyCounts.set(month, {
          count: current.count + 1,
          totalAmount: current.totalAmount + amount
        })
      }
    }

    const monthlyDistribution = Array.from(monthlyCounts.entries())
      .map(([month, data]) => ({ month, count: data.count, totalAmount: data.totalAmount }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    return {
      totalRecords: this.records.length,
      totalAmount,
      averageAmount,
      medianAmount,
      topManufacturers,
      topRecipients,
      paymentTypeDistribution,
      natureOfPaymentDistribution,
      stateDistribution,
      monthlyDistribution
    }
  }

  private generateComplianceMetrics() {
    const reportableCount = this.analysisResults.filter(ar => ar.isReportable).length
    const disputedCount = this.records.filter(r => r.disputeStatusForPublication === 'Yes').length
    const averageConfidence = this.analysisResults.length > 0 
      ? this.analysisResults.reduce((sum, ar) => sum + ar.confidence, 0) / this.analysisResults.length 
      : 0

    const riskDistribution = {
      low: this.analysisResults.filter(ar => ar.riskLevel === 'low').length,
      medium: this.analysisResults.filter(ar => ar.riskLevel === 'medium').length,
      high: this.analysisResults.filter(ar => ar.riskLevel === 'high').length,
      critical: this.analysisResults.filter(ar => ar.riskLevel === 'critical').length
    }

    return {
      reportabilityRate: this.records.length > 0 ? (reportableCount / this.records.length) * 100 : 0,
      disputeRate: this.records.length > 0 ? (disputedCount / this.records.length) * 100 : 0,
      averageConfidence,
      riskDistribution
    }
  }

  private getRecipientName(record: CMSPaymentRecord): string {
    if (record.teachingHospitalName) {
      return record.teachingHospitalName
    }
    
    const parts = [
      record.coveredRecipientFirstName,
      record.coveredRecipientMiddleName,
      record.coveredRecipientLastName,
      record.coveredRecipientNameSuffix
    ].filter(Boolean)
    
    return parts.join(' ') || 'Unknown Recipient'
  }

  private getRecordCategory(record: CMSPaymentRecord): string {
    if (record.natureOfPaymentOrTransferOfValue?.toLowerCase().includes('research')) {
      return 'research'
    }
    if (record.ownershipType) {
      return 'ownership'
    }
    return 'general'
  }

  /**
   * Get analysis results
   */
  getAnalysisResults(): AnalysisResult[] {
    return this.analysisResults
  }

  /**
   * Get records
   */
  getRecords(): CMSPaymentRecord[] {
    return this.records
  }

  /**
   * Clear all data
   */
  clearData(): void {
    this.records = []
    this.analysisResults = []
  }
}

export const dataAnalysisService = new DataAnalysisService()
