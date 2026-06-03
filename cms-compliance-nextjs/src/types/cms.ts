// CMS Compliance Data Types
export interface CMSRecord {
  id: string
  recordId: string
  coveredRecipientId: string
  coveredRecipientName: string
  coveredRecipientType: string
  teachingHospitalId?: string
  teachingHospitalName?: string
  teachingHospitalCcn?: string
  coveredRecipientNpi?: string
  physicianProfileId?: string
  physicianFirstName?: string
  physicianMiddleName?: string
  physicianLastName?: string
  physicianNameSuffix?: string
  recipientPrimaryBusinessStreetAddressLine1?: string
  recipientPrimaryBusinessStreetAddressLine2?: string
  recipientCity?: string
  recipientState?: string
  recipientZipCode?: string
  recipientCountry?: string
  recipientProvince?: string
  recipientPostalCode?: string
  physicianPrimaryType?: string
  physicianSpecialty?: string
  physicianLicenseStateCode1?: string
  physicianLicenseStateCode2?: string
  physicianLicenseStateCode3?: string
  physicianLicenseStateCode4?: string
  physicianLicenseStateCode5?: string
  submittingApplicableManufacturerOrApplicableGpoName?: string
  applicableManufacturerOrApplicableGpoMakingPaymentId?: string
  applicableManufacturerOrApplicableGpoMakingPaymentName?: string
  applicableManufacturerOrApplicableGpoMakingPaymentState?: string
  applicableManufacturerOrApplicableGpoMakingPaymentCountry?: string
  totalAmountOfPaymentUsdollars: number
  dateOfPayment?: string
  numberOfPaymentsIncludedInTotalAmount?: string
  formOfPaymentOrTransferOfValue?: string
  natureOfPaymentOrTransferOfValue?: string
  cityOfTravel?: string
  stateOfTravel?: string
  countryOfTravel?: string
  physicianOwnershipIndicator?: string
  thirdPartyPaymentRecipientIndicator?: string
  nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue?: string
  charityIndicator?: string
  thirdPartyEqualsCoveredRecipientIndicator?: string
  contextualInformation?: string
  delayInPublicationIndicator?: string
  disputeStatusForPublication?: string
  productIndicator?: string
  relatedProductIndicator?: string
  changeType?: string
  sourceSystem?: string
  nameOfAssociatedCoveredDrugOrBiological1?: string
  nameOfAssociatedCoveredDrugOrBiological2?: string
  nameOfAssociatedCoveredDrugOrBiological3?: string
  nameOfAssociatedCoveredDrugOrBiological4?: string
  nameOfAssociatedCoveredDrugOrBiological5?: string
  ndcOfAssociatedCoveredDrugOrBiological1?: string
  ndcOfAssociatedCoveredDrugOrBiological2?: string
  ndcOfAssociatedCoveredDrugOrBiological3?: string
  ndcOfAssociatedCoveredDrugOrBiological4?: string
  ndcOfAssociatedCoveredDrugOrBiological5?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply1?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply2?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply3?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply4?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply5?: string
  programYear?: string
  paymentPublicationDate?: string
  
  // Processing fields
  isReportable: boolean
  humanDecision?: 'approve' | 'reject' | 'pending'
  humanReason?: string
  decisionTime?: Date
  finalReportable?: boolean
  appliedRules?: any
  reason?: string

  // COM-TRANSP-001 transparency fields
  cmsReportCategory?: 'general' | 'research' | 'ownership'
  paymentCurrency?: string
  exchangeRate?: number
  reportingCurrencyValue?: number
  consentForDisclosure?: boolean
  disclosureType?: 'individual' | 'aggregate'
  aggregateStatus?: 'not_applicable' | 'pending' | 'reportable' | 'non_reportable'
  recipientAnnualAggregate?: number
  disputeWorkflowStatus?: string
  disputeNotes?: string
  
  // Audit fields
  createdAt: Date
  updatedAt: Date
  
  // Relations
  reviewSessionId?: string
  reviewSession?: ReviewSession
  spendEventId?: string | null
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

export interface CompanyRule {
  id: string
  name: string
  description: string
  ruleType: 'threshold' | 'exclusion' | 'inclusion' | 'validation'
  conditions: any
  isActive: boolean
  priority: number
  createdBy?: string
  updatedBy?: string
  createdAt: Date
  updatedAt: Date
}

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
  status: 'pending_review' | 'in_review' | 'completed'
  createdBy?: string
  createdAt: Date
  updatedAt: Date
  
  // Relations
  records: CMSRecord[]
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
