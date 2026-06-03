import { CMSRecord, CompanyRule, ReviewSession } from '@/types/cms'

export interface AnalyticsMetrics {
  overview: {
    totalRecords: number
    totalSessions: number
    totalRules: number
    dataQualityScore: number
    complianceScore: number
  }
  trends: {
    dailyProcessing: Array<{ date: string; count: number }>
    weeklyCompliance: Array<{ week: string; score: number }>
    monthlyAnomalies: Array<{ month: string; count: number }>
  }
  insights: {
    topAnomalyTypes: Array<{ type: string; count: number; percentage: number }>
    complianceByState: Array<{ state: string; score: number; recordCount: number }>
    paymentDistribution: Array<{ range: string; count: number; percentage: number }>
    processingEfficiency: {
      averageProcessingTime: number
      successRate: number
      errorRate: number
    }
  }
  recommendations: string[]
}

export interface ReportData {
  title: string
  generatedAt: string
  period: {
    start: string
    end: string
  }
  summary: {
    totalRecords: number
    reportableRecords: number
    nonReportableRecords: number
    anomaliesDetected: number
    complianceScore: number
  }
  details: {
    records: CMSRecord[]
    anomalies: any[]
    qualityIssues: string[]
    recommendations: string[]
  }
  charts: {
    complianceTrend: any
    paymentDistribution: any
    anomalyTypes: any
    geographicDistribution: any
  }
}

export class AnalyticsService {
  /**
   * Generate comprehensive analytics metrics
   */
  async generateAnalyticsMetrics(
    records: CMSRecord[],
    sessions: ReviewSession[],
    rules: CompanyRule[]
  ): Promise<AnalyticsMetrics> {
    const overview = this.calculateOverviewMetrics(records, sessions, rules)
    const trends = this.calculateTrends(records, sessions)
    const insights = this.calculateInsights(records)
    const recommendations = this.generateRecommendations(records, insights)

    return {
      overview,
      trends,
      insights,
      recommendations
    }
  }

  /**
   * Generate detailed report data
   */
  async generateReport(
    records: CMSRecord[],
    startDate: string,
    endDate: string
  ): Promise<ReportData> {
    const filteredRecords = this.filterRecordsByDate(records, startDate, endDate)
    
    const summary = this.calculateReportSummary(filteredRecords)
    const details = this.generateReportDetails(filteredRecords)
    const charts = this.generateReportCharts(filteredRecords)

    return {
      title: 'CMS Compliance Report',
      generatedAt: new Date().toISOString(),
      period: { start: startDate, end: endDate },
      summary,
      details,
      charts
    }
  }

  /**
   * Calculate overview metrics
   */
  private calculateOverviewMetrics(
    records: CMSRecord[],
    sessions: ReviewSession[],
    rules: CompanyRule[]
  ) {
    const totalRecords = records.length
    const totalSessions = sessions.length
    const totalRules = rules.filter(rule => rule.isActive).length
    
    const dataQualityScore = this.calculateDataQualityScore(records)
    const complianceScore = this.calculateComplianceScore(records)

    return {
      totalRecords,
      totalSessions,
      totalRules,
      dataQualityScore,
      complianceScore
    }
  }

  /**
   * Calculate trends over time
   */
  private calculateTrends(records: CMSRecord[], sessions: ReviewSession[]) {
    const dailyProcessing = this.calculateDailyProcessing(records)
    const weeklyCompliance = this.calculateWeeklyCompliance(records)
    const monthlyAnomalies = this.calculateMonthlyAnomalies(records)

    return {
      dailyProcessing,
      weeklyCompliance,
      monthlyAnomalies
    }
  }

  /**
   * Calculate insights and patterns
   */
  private calculateInsights(records: CMSRecord[]) {
    const topAnomalyTypes = this.calculateTopAnomalyTypes(records)
    const complianceByState = this.calculateComplianceByState(records)
    const paymentDistribution = this.calculatePaymentDistribution(records)
    const processingEfficiency = this.calculateProcessingEfficiency(records)

    return {
      topAnomalyTypes,
      complianceByState,
      paymentDistribution,
      processingEfficiency
    }
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQualityScore(records: CMSRecord[]): number {
    if (records.length === 0) return 0

    let totalScore = 0
    records.forEach(record => {
      let recordScore = 0
      let fieldCount = 0

      // Check completeness of key fields
      const keyFields = [
        'coveredRecipientName',
        'coveredRecipientId',
        'totalAmountOfPaymentUsdollars',
        'dateOfPayment',
        'formOfPaymentOrTransferOfValue'
      ]

      keyFields.forEach(field => {
        const value = record[field as keyof CMSRecord]
        if (value !== null && value !== undefined && value !== '') {
          recordScore += 1
        }
        fieldCount += 1
      })

      totalScore += recordScore / fieldCount
    })

    return Math.round((totalScore / records.length) * 100)
  }

  /**
   * Calculate compliance score
   */
  private calculateComplianceScore(records: CMSRecord[]): number {
    if (records.length === 0) return 0

    const validRecords = records.filter(record => {
      // Check if record meets basic compliance requirements
      return record.coveredRecipientName &&
             record.coveredRecipientId &&
             record.totalAmountOfPaymentUsdollars >= 0 &&
             record.dateOfPayment
    })

    return Math.round((validRecords.length / records.length) * 100)
  }

  /**
   * Calculate daily processing trends
   */
  private calculateDailyProcessing(records: CMSRecord[]) {
    const dailyCounts: { [key: string]: number } = {}
    
    records.forEach(record => {
      const date = new Date(record.createdAt).toISOString().split('T')[0]
      dailyCounts[date] = (dailyCounts[date] || 0) + 1
    })

    return Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30) // Last 30 days
  }

  /**
   * Calculate weekly compliance trends
   */
  private calculateWeeklyCompliance(records: CMSRecord[]) {
    const weeklyScores: { [key: string]: number[] } = {}
    
    records.forEach(record => {
      const week = this.getWeekKey(record.createdAt)
      if (!weeklyScores[week]) {
        weeklyScores[week] = []
      }
      
      const recordScore = this.calculateRecordComplianceScore(record)
      weeklyScores[week].push(recordScore)
    })

    return Object.entries(weeklyScores)
      .map(([week, scores]) => ({
        week,
        score: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12) // Last 12 weeks
  }

  /**
   * Calculate monthly anomalies
   */
  private calculateMonthlyAnomalies(records: CMSRecord[]) {
    const monthlyCounts: { [key: string]: number } = {}
    
    records.forEach(record => {
      const month = new Date(record.createdAt).toISOString().substring(0, 7)
      const hasAnomaly = record.appliedRules?.anomalyDetection?.isAnomaly || false
      
      if (hasAnomaly) {
        monthlyCounts[month] = (monthlyCounts[month] || 0) + 1
      }
    })

    return Object.entries(monthlyCounts)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12) // Last 12 months
  }

  /**
   * Calculate top anomaly types
   */
  private calculateTopAnomalyTypes(records: CMSRecord[]) {
    const anomalyTypes: { [key: string]: number } = {}
    
    records.forEach(record => {
      const reasons = record.appliedRules?.anomalyDetection?.reasons || []
      reasons.forEach((reason: string) => {
        anomalyTypes[reason] = (anomalyTypes[reason] || 0) + 1
      })
    })

    const totalAnomalies = Object.values(anomalyTypes).reduce((sum, count) => sum + count, 0)

    return Object.entries(anomalyTypes)
      .map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalAnomalies) * 100)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  /**
   * Calculate compliance by state
   */
  private calculateComplianceByState(records: CMSRecord[]) {
    const stateData: { [key: string]: { total: number; compliant: number } } = {}
    
    records.forEach(record => {
      const state = record.recipientState || 'Unknown'
      if (!stateData[state]) {
        stateData[state] = { total: 0, compliant: 0 }
      }
      
      stateData[state].total += 1
      if (this.isRecordCompliant(record)) {
        stateData[state].compliant += 1
      }
    })

    return Object.entries(stateData)
      .map(([state, data]) => ({
        state,
        score: Math.round((data.compliant / data.total) * 100),
        recordCount: data.total
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)
  }

  /**
   * Calculate payment distribution
   */
  private calculatePaymentDistribution(records: CMSRecord[]) {
    const ranges = [
      { min: 0, max: 10, label: '$0 - $10' },
      { min: 10, max: 100, label: '$10 - $100' },
      { min: 100, max: 1000, label: '$100 - $1,000' },
      { min: 1000, max: 10000, label: '$1,000 - $10,000' },
      { min: 10000, max: 100000, label: '$10,000 - $100,000' },
      { min: 100000, max: Infinity, label: '$100,000+' }
    ]

    const distribution = ranges.map(range => {
      const count = records.filter(record => {
        const amount = record.totalAmountOfPaymentUsdollars
        return amount >= range.min && amount < range.max
      }).length

      return {
        range: range.label,
        count,
        percentage: Math.round((count / records.length) * 100)
      }
    })

    return distribution
  }

  /**
   * Calculate processing efficiency
   */
  private calculateProcessingEfficiency(records: CMSRecord[]) {
    const totalRecords = records.length
    const successfulRecords = records.filter(record => !record.appliedRules?.anomalyDetection?.isAnomaly).length
    const errorRecords = records.filter(record => record.appliedRules?.anomalyDetection?.isAnomaly).length

    return {
      averageProcessingTime: 2.5, // Simulated
      successRate: Math.round((successfulRecords / totalRecords) * 100),
      errorRate: Math.round((errorRecords / totalRecords) * 100)
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(records: CMSRecord[], insights: any): string[] {
    const recommendations: string[] = []

    if (insights.processingEfficiency.errorRate > 10) {
      recommendations.push('High error rate detected. Review data quality and validation rules.')
    }

    if (insights.complianceByState.some((state: any) => state.score < 80)) {
      recommendations.push('Some states show low compliance scores. Focus on data quality improvements.')
    }

    if (insights.topAnomalyTypes.length > 0) {
      const topAnomaly = insights.topAnomalyTypes[0]
      recommendations.push(`Address most common anomaly: "${topAnomaly.type}" (${topAnomaly.percentage}% of cases)`)
    }

    if (insights.paymentDistribution.some((dist: any) => dist.range.includes('$100,000+') && dist.count > 0)) {
      recommendations.push('Review high-value payments for additional validation.')
    }

    return recommendations
  }

  /**
   * Helper methods
   */
  private filterRecordsByDate(records: CMSRecord[], startDate: string, endDate: string): CMSRecord[] {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    return records.filter(record => {
      const recordDate = new Date(record.createdAt)
      return recordDate >= start && recordDate <= end
    })
  }

  private calculateReportSummary(records: CMSRecord[]) {
    const totalRecords = records.length
    const reportableRecords = records.filter(r => r.isReportable).length
    const nonReportableRecords = totalRecords - reportableRecords
    const anomaliesDetected = records.filter(r => r.appliedRules?.anomalyDetection?.isAnomaly).length
    const complianceScore = this.calculateComplianceScore(records)

    return {
      totalRecords,
      reportableRecords,
      nonReportableRecords,
      anomaliesDetected,
      complianceScore
    }
  }

  private generateReportDetails(records: CMSRecord[]) {
    const anomalies = records.filter(r => r.appliedRules?.anomalyDetection?.isAnomaly)
    const qualityIssues = this.identifyQualityIssues(records)
    const recommendations = this.generateRecommendations(records, this.calculateInsights(records))

    return {
      records,
      anomalies,
      qualityIssues,
      recommendations
    }
  }

  private generateReportCharts(records: CMSRecord[]) {
    return {
      complianceTrend: this.calculateWeeklyCompliance(records),
      paymentDistribution: this.calculatePaymentDistribution(records),
      anomalyTypes: this.calculateTopAnomalyTypes(records),
      geographicDistribution: this.calculateComplianceByState(records)
    }
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear()
    const week = this.getWeekNumber(date)
    return `${year}-W${week.toString().padStart(2, '0')}`
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  private calculateRecordComplianceScore(record: CMSRecord): number {
    let score = 0
    let checks = 0

    if (record.coveredRecipientName) { score += 1; checks += 1 }
    if (record.coveredRecipientId) { score += 1; checks += 1 }
    if (record.totalAmountOfPaymentUsdollars >= 0) { score += 1; checks += 1 }
    if (record.dateOfPayment) { score += 1; checks += 1 }

    return checks > 0 ? (score / checks) * 100 : 0
  }

  private isRecordCompliant(record: CMSRecord): boolean {
    return record.coveredRecipientName &&
           record.coveredRecipientId &&
           record.totalAmountOfPaymentUsdollars >= 0 &&
           record.dateOfPayment &&
           !record.appliedRules?.anomalyDetection?.isAnomaly
  }

  private identifyQualityIssues(records: CMSRecord[]): string[] {
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
}

// Export singleton instance
export const analyticsService = new AnalyticsService()
