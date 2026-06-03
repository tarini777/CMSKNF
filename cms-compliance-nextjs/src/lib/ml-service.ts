import { IsolationForest } from 'ml-isolation-forest'
import { Matrix } from 'ml-matrix'
import { CMSRecord } from '@/types/cms'

export interface AnomalyDetectionResult {
  isAnomaly: boolean
  anomalyScore: number
  confidence: number
  reasons: string[]
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface DataQualityScore {
  overallScore: number
  completenessScore: number
  accuracyScore: number
  consistencyScore: number
  validityScore: number
  issues: string[]
  recommendations: string[]
}

export class MLService {
  private isolationForest: IsolationForest
  private isModelTrained: boolean = false

  constructor() {
    this.isolationForest = new IsolationForest({
      contamination: 0.1, // 10% of data expected to be anomalies
      randomState: 42
    })
  }

  /**
   * Train the anomaly detection model with historical data
   */
  async trainAnomalyDetectionModel(records: CMSRecord[]): Promise<void> {
    try {
      const features = this.extractFeatures(records)
      const matrix = new Matrix(features)
      
      this.isolationForest.train(matrix)
      this.isModelTrained = true
      
      console.log(`✅ Anomaly detection model trained with ${records.length} records`)
    } catch (error) {
      console.error('❌ Error training anomaly detection model:', error)
      throw error
    }
  }

  /**
   * Detect anomalies in CMS records
   */
  detectAnomalies(records: CMSRecord[]): AnomalyDetectionResult[] {
    if (!this.isModelTrained) {
      console.warn('⚠️ Model not trained, using rule-based detection')
      return records.map(record => this.ruleBasedAnomalyDetection(record))
    }

    try {
      const features = this.extractFeatures(records)
      const matrix = new Matrix(features)
      const predictions = this.isolationForest.predict(matrix)
      const scores = this.isolationForest.decisionFunction(matrix)

      return records.map((record, index) => {
        const isAnomaly = predictions[index] === -1
        const anomalyScore = Math.abs(scores[index])
        const confidence = Math.min(anomalyScore * 10, 1.0)
        
        return {
          isAnomaly,
          anomalyScore,
          confidence,
          reasons: this.generateAnomalyReasons(record, anomalyScore),
          riskLevel: this.calculateRiskLevel(anomalyScore)
        }
      })
    } catch (error) {
      console.error('❌ Error in anomaly detection:', error)
      return records.map(record => this.ruleBasedAnomalyDetection(record))
    }
  }

  /**
   * Calculate data quality score for records
   */
  calculateDataQualityScore(records: CMSRecord[]): DataQualityScore {
    if (records.length === 0) {
      return {
        overallScore: 0,
        completenessScore: 0,
        accuracyScore: 0,
        consistencyScore: 0,
        validityScore: 0,
        issues: ['No records to analyze'],
        recommendations: ['Upload data to begin quality analysis']
      }
    }

    const completenessScore = this.calculateCompletenessScore(records)
    const accuracyScore = this.calculateAccuracyScore(records)
    const consistencyScore = this.calculateConsistencyScore(records)
    const validityScore = this.calculateValidityScore(records)

    const overallScore = (completenessScore + accuracyScore + consistencyScore + validityScore) / 4

    return {
      overallScore: Math.round(overallScore * 100) / 100,
      completenessScore: Math.round(completenessScore * 100) / 100,
      accuracyScore: Math.round(accuracyScore * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      validityScore: Math.round(validityScore * 100) / 100,
      issues: this.identifyDataIssues(records),
      recommendations: this.generateRecommendations(records, {
        completenessScore,
        accuracyScore,
        consistencyScore,
        validityScore
      })
    }
  }

  /**
   * Extract numerical features from CMS records for ML processing
   */
  private extractFeatures(records: CMSRecord[]): number[][] {
    return records.map(record => [
      record.totalAmountOfPaymentUsdollars || 0,
      this.parseDate(record.dateOfPayment) || 0,
      this.encodeString(record.coveredRecipientType) || 0,
      this.encodeString(record.formOfPaymentOrTransferOfValue) || 0,
      this.encodeString(record.natureOfPaymentOrTransferOfValue) || 0,
      this.encodeString(record.physicianSpecialty) || 0,
      this.encodeString(record.recipientState) || 0,
      this.encodeString(record.physicianPrimaryType) || 0,
      record.isReportable ? 1 : 0,
      this.calculateRecordCompleteness(record)
    ])
  }

  /**
   * Rule-based anomaly detection fallback
   */
  private ruleBasedAnomalyDetection(record: CMSRecord): AnomalyDetectionResult {
    const reasons: string[] = []
    let anomalyScore = 0

    // Check for unusual payment amounts
    if (record.totalAmountOfPaymentUsdollars > 100000) {
      reasons.push('Unusually high payment amount')
      anomalyScore += 0.3
    }

    if (record.totalAmountOfPaymentUsdollars < 0) {
      reasons.push('Negative payment amount')
      anomalyScore += 0.5
    }

    // Check for missing critical fields
    if (!record.coveredRecipientName) {
      reasons.push('Missing recipient name')
      anomalyScore += 0.2
    }

    if (!record.dateOfPayment) {
      reasons.push('Missing payment date')
      anomalyScore += 0.1
    }

    // Check for unusual patterns
    if (record.coveredRecipientType === 'Unknown' || record.coveredRecipientType === '') {
      reasons.push('Unclear recipient type')
      anomalyScore += 0.2
    }

    const isAnomaly = anomalyScore > 0.3
    const confidence = Math.min(anomalyScore, 1.0)

    return {
      isAnomaly,
      anomalyScore,
      confidence,
      reasons,
      riskLevel: this.calculateRiskLevel(anomalyScore)
    }
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(records: CMSRecord[]): number {
    const requiredFields = [
      'coveredRecipientName',
      'coveredRecipientId',
      'totalAmountOfPaymentUsdollars',
      'dateOfPayment',
      'formOfPaymentOrTransferOfValue'
    ]

    let totalCompleteness = 0

    records.forEach(record => {
      let recordCompleteness = 0
      requiredFields.forEach(field => {
        const value = record[field as keyof CMSRecord]
        if (value !== null && value !== undefined && value !== '') {
          recordCompleteness += 1
        }
      })
      totalCompleteness += recordCompleteness / requiredFields.length
    })

    return totalCompleteness / records.length
  }

  /**
   * Calculate accuracy score
   */
  private calculateAccuracyScore(records: CMSRecord[]): number {
    let accuracyScore = 0
    let totalChecks = 0

    records.forEach(record => {
      // Check for valid email-like patterns in IDs
      if (record.coveredRecipientId && this.isValidId(record.coveredRecipientId)) {
        accuracyScore += 1
      }
      totalChecks += 1

      // Check for valid date format
      if (record.dateOfPayment && this.isValidDate(record.dateOfPayment)) {
        accuracyScore += 1
      }
      totalChecks += 1

      // Check for reasonable payment amounts
      if (record.totalAmountOfPaymentUsdollars >= 0 && record.totalAmountOfPaymentUsdollars <= 1000000) {
        accuracyScore += 1
      }
      totalChecks += 1
    })

    return totalChecks > 0 ? accuracyScore / totalChecks : 0
  }

  /**
   * Calculate consistency score
   */
  private calculateConsistencyScore(records: CMSRecord[]): number {
    if (records.length < 2) return 1.0

    // Check for consistent data formats
    const dateFormats = new Set()
    const amountRanges = new Set()
    const recipientTypes = new Set()

    records.forEach(record => {
      if (record.dateOfPayment) {
        dateFormats.add(this.getDateFormat(record.dateOfPayment))
      }
      if (record.totalAmountOfPaymentUsdollars) {
        amountRanges.add(this.getAmountRange(record.totalAmountOfPaymentUsdollars))
      }
      if (record.coveredRecipientType) {
        recipientTypes.add(record.coveredRecipientType)
      }
    })

    const formatConsistency = 1 - (dateFormats.size - 1) / Math.max(records.length, 1)
    const typeConsistency = 1 - (recipientTypes.size - 1) / Math.max(records.length, 1)

    return (formatConsistency + typeConsistency) / 2
  }

  /**
   * Calculate validity score
   */
  private calculateValidityScore(records: CMSRecord[]): number {
    let validRecords = 0

    records.forEach(record => {
      let isValid = true

      // Check for required fields
      if (!record.coveredRecipientName || !record.coveredRecipientId) {
        isValid = false
      }

      // Check for valid amounts
      if (record.totalAmountOfPaymentUsdollars < 0) {
        isValid = false
      }

      // Check for valid dates
      if (record.dateOfPayment && !this.isValidDate(record.dateOfPayment)) {
        isValid = false
      }

      if (isValid) validRecords++
    })

    return validRecords / records.length
  }

  /**
   * Helper methods
   */
  private parseDate(dateString: string | null | undefined): number {
    if (!dateString) return 0
    const date = new Date(dateString)
    return isNaN(date.getTime()) ? 0 : date.getTime()
  }

  private encodeString(str: string | null | undefined): number {
    if (!str) return 0
    return str.split('').reduce((hash, char) => hash + char.charCodeAt(0), 0) % 1000
  }

  private calculateRecordCompleteness(record: CMSRecord): number {
    const fields = Object.keys(record)
    const filledFields = fields.filter(field => {
      const value = record[field as keyof CMSRecord]
      return value !== null && value !== undefined && value !== ''
    })
    return filledFields.length / fields.length
  }

  private generateAnomalyReasons(record: CMSRecord, score: number): string[] {
    const reasons: string[] = []
    
    if (score > 0.8) {
      reasons.push('High anomaly score detected')
    }
    
    if (record.totalAmountOfPaymentUsdollars > 50000) {
      reasons.push('Large payment amount')
    }
    
    if (!record.coveredRecipientName) {
      reasons.push('Missing recipient information')
    }

    return reasons
  }

  private calculateRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score < 0.3) return 'low'
    if (score < 0.6) return 'medium'
    if (score < 0.8) return 'high'
    return 'critical'
  }

  private identifyDataIssues(records: CMSRecord[]): string[] {
    const issues: string[] = []
    
    const missingNames = records.filter(r => !r.coveredRecipientName).length
    if (missingNames > 0) {
      issues.push(`${missingNames} records missing recipient names`)
    }

    const invalidAmounts = records.filter(r => r.totalAmountOfPaymentUsdollars < 0).length
    if (invalidAmounts > 0) {
      issues.push(`${invalidAmounts} records with negative amounts`)
    }

    const missingDates = records.filter(r => !r.dateOfPayment).length
    if (missingDates > 0) {
      issues.push(`${missingDates} records missing payment dates`)
    }

    return issues
  }

  private generateRecommendations(records: CMSRecord[], scores: any): string[] {
    const recommendations: string[] = []

    if (scores.completenessScore < 0.8) {
      recommendations.push('Improve data completeness by ensuring all required fields are filled')
    }

    if (scores.accuracyScore < 0.9) {
      recommendations.push('Review data accuracy and validate field formats')
    }

    if (scores.consistencyScore < 0.7) {
      recommendations.push('Standardize data formats across all records')
    }

    if (scores.validityScore < 0.95) {
      recommendations.push('Address data validation issues before processing')
    }

    return recommendations
  }

  private isValidId(id: string): boolean {
    return id.length > 0 && /^[A-Za-z0-9_-]+$/.test(id)
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  private getDateFormat(dateString: string): string {
    // Simple date format detection
    if (dateString.includes('/')) return 'MM/DD/YYYY'
    if (dateString.includes('-')) return 'YYYY-MM-DD'
    return 'unknown'
  }

  private getAmountRange(amount: number): string {
    if (amount < 10) return 'small'
    if (amount < 100) return 'medium'
    if (amount < 1000) return 'large'
    return 'very-large'
  }
}

// Export singleton instance
export const mlService = new MLService()
