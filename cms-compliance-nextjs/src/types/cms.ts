// CMS Compliance Data Types
import type { CMSRecord as PrismaCMSRecord } from '@prisma/client'

/**
 * App CMS record — required core fields plus optional Prisma columns.
 * Accepts full DB rows and partial test fixtures.
 */
export type CMSRecord = Partial<PrismaCMSRecord> & {
  id: string
  recordId: string
  coveredRecipientId: string
  coveredRecipientName: string
  coveredRecipientType: string
  totalAmountOfPaymentUsdollars: number
  isReportable: boolean
  createdAt: Date
  updatedAt: Date
  /** Legacy alias used in open-payments-api */
  providerName?: string
  amount?: number
  date?: string
  description?: string
  status?: string
  category?: string
  natureOfPayment?: string
  recipientType?: string
  manufacturerName?: string
  disputeStatus?: string
}

/** Record enriched with PUF line data — returned by /api/records when lineage exists. */
export interface RecordPufSummary {
  fileType: 'general' | 'research' | 'ownership'
  fieldCount: number
  totalFields: number
  recordId: string
  changeType?: string
  coveredRecipientNpi?: string
  teachingHospitalCcn?: string
  hasLineage: boolean
  spendEventId?: string
  sourceSystem?: string
  sourceTransactionId?: string
  pufLineId?: string
}

export interface RecordWithPuf extends CMSRecord {
  pufSummary?: RecordPufSummary
  pufFields?: Record<string, unknown>
  lineage?: {
    dataSourceName?: string
    dataSourceKey?: string
    dedupKey?: string
  }
  ruleCitations?: import('@/lib/rule-citation-service').RecordRuleCitations
}

export type CompanyRule = import('@prisma/client').CompanyRule

export interface ReviewSession {
  id: string
  sessionId: string
  filename: string
  uploadTime: Date
  totalRecords: number
  processedRecords: number
  reportableCount: number
  nonReportableCount: number
  errorCount: number
  status: 'pending_review' | 'in_review' | 'completed' | string
  createdBy?: string | null
  createdAt: Date
  updatedAt: Date
  
  // Relations
  records?: CMSRecord[]
}

export interface DataUpload {
  id: string
  filename: string
  fileSize: number
  totalRecords: number
  processedRecords: number
  reportableCount: number
  nonReportableCount: number
  errorCount: number
  status: 'processing' | 'completed' | 'failed'
  validationSummary?: any
  uploadedBy?: string
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject'
  entityType: 'record' | 'rule' | 'session'
  entityId: string
  oldValues?: any
  newValues?: any
  reason?: string
  performedBy?: string
  performedAt: Date
}

export type UserRole = 'admin' | 'compliance_officer' | 'data_analyst' | 'executive'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'compliance_officer' | 'data_analyst' | 'executive'
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T = any> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

// Dashboard Metrics Types
export interface DashboardMetrics {
  dataQualityScore: number
  recordsProcessed: number
  duplicatesRemoved: number
  validationErrors: number
  complianceScore: number
  regulatoryRules: number
  processingRate: number
  errorRate: number
  pendingReview: number
  reportableCount: number
  sessionCount: number
  timestamp: string
}

// File Upload Types
export interface FileUploadResponse {
  success: boolean
  sessionId?: string
  totalRecords?: number
  processedRecords?: number
  reportableCount?: number
  nonReportableCount?: number
  errorCount?: number
  error?: string
}

// Rules Engine Types
export interface RuleEvaluation {
  isReportable: boolean
  reason: string
  appliedRules: string[]
  confidence: number
}

// ML/AI Types
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

// Analytics Types
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
