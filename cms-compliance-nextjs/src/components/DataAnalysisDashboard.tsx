'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Database, 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  FileText,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  Shield,
  Target,
  PieChart,
  Activity
} from 'lucide-react'

interface CMSPaymentRecord {
  recordId: string
  changeType: string
  coveredRecipientType: string
  coveredRecipientFirstName?: string
  coveredRecipientLastName?: string
  teachingHospitalName?: string
  applicableManufacturerOrApplicableGPOMakingPaymentName?: string
  totalAmountOfPaymentUSDollars?: number
  dateOfPayment?: string
  natureOfPaymentOrTransferOfValue?: string
  formOfPaymentOrTransferOfValue?: string
  disputeStatusForPublication?: string
  delayInPublicationIndicator?: string
  recipientState?: string
  programYear: number
}

interface AnalysisResult {
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

interface PatternAnalysis {
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

export default function DataAnalysisDashboard() {
  const [records, setRecords] = useState<CMSPaymentRecord[]>([])
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [patternAnalysis, setPatternAnalysis] = useState<PatternAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('')
  const [filterReportability, setFilterReportability] = useState<string>('')
  const [selectedRecord, setSelectedRecord] = useState<CMSPaymentRecord | null>(null)

  useEffect(() => {
    loadDataStatus()
  }, [])

  const loadDataStatus = async () => {
    try {
      const response = await fetch('/api/data-analysis?action=status')
      const data = await response.json()
      
      if (data.success) {
        // Load sample data for demonstration
        await loadSampleData()
      }
    } catch (err) {
      console.error('Failed to load data status:', err)
    }
  }

  const loadSampleData = async () => {
    // Create sample data for demonstration
    const sampleRecords: CMSPaymentRecord[] = [
      {
        recordId: '1133195830',
        changeType: 'ADD',
        coveredRecipientType: 'Covered Recipient Teaching Hospital',
        teachingHospitalName: 'Ochsner Clinic Foundation',
        applicableManufacturerOrApplicableGPOMakingPaymentName: 'Genentech USA, Inc.',
        totalAmountOfPaymentUSDollars: 10000.00,
        dateOfPayment: '02/23/2024',
        natureOfPaymentOrTransferOfValue: 'Grant',
        formOfPaymentOrTransferOfValue: 'Cash or cash equivalent',
        disputeStatusForPublication: 'No',
        delayInPublicationIndicator: 'No',
        recipientState: 'LA',
        programYear: 2024
      },
      {
        recordId: '1133196475',
        changeType: 'ADD',
        coveredRecipientType: 'Covered Recipient Teaching Hospital',
        teachingHospitalName: 'Vanderbilt University Medical Center',
        applicableManufacturerOrApplicableGPOMakingPaymentName: 'Genentech USA, Inc.',
        totalAmountOfPaymentUSDollars: 5000.00,
        dateOfPayment: '08/01/2024',
        natureOfPaymentOrTransferOfValue: 'Grant',
        formOfPaymentOrTransferOfValue: 'Cash or cash equivalent',
        disputeStatusForPublication: 'No',
        delayInPublicationIndicator: 'No',
        recipientState: 'TN',
        programYear: 2024
      },
      {
        recordId: '1142632901',
        changeType: 'ADD',
        coveredRecipientType: 'Covered Recipient Teaching Hospital',
        teachingHospitalName: 'Gundersen Lutheran Medical Center',
        applicableManufacturerOrApplicableGPOMakingPaymentName: 'Linde Gas & Equipment Inc.',
        totalAmountOfPaymentUSDollars: 330.00,
        dateOfPayment: '02/13/2024',
        natureOfPaymentOrTransferOfValue: 'Long term medical supply or device loan',
        formOfPaymentOrTransferOfValue: 'In-kind items and services',
        disputeStatusForPublication: 'No',
        delayInPublicationIndicator: 'No',
        recipientState: 'WI',
        programYear: 2024
      }
    ]

    const sampleAnalysisResults: AnalysisResult[] = [
      {
        recordId: '1133195830',
        isReportable: true,
        confidence: 0.95,
        riskLevel: 'low',
        fraudIndicators: [],
        anomalyScore: 0.1,
        reportabilityAnalysis: {
          isReportable: true,
          confidence: 0.95,
          applicableRules: ['rule_amount_threshold'],
          reasoning: ['Payment amount exceeds reporting threshold', 'Grant payment to teaching hospital'],
          warnings: [],
          recommendations: []
        },
        patterns: {
          amountPattern: 'High amount',
          timingPattern: 'Regular timing',
          recipientPattern: 'Teaching hospital',
          manufacturerPattern: 'Corporate entity'
        },
        recommendations: []
      },
      {
        recordId: '1133196475',
        isReportable: true,
        confidence: 0.90,
        riskLevel: 'low',
        fraudIndicators: [],
        anomalyScore: 0.1,
        reportabilityAnalysis: {
          isReportable: true,
          confidence: 0.90,
          applicableRules: ['rule_amount_threshold'],
          reasoning: ['Payment amount exceeds reporting threshold', 'Grant payment to teaching hospital'],
          warnings: [],
          recommendations: []
        },
        patterns: {
          amountPattern: 'Medium amount',
          timingPattern: 'Regular timing',
          recipientPattern: 'Teaching hospital',
          manufacturerPattern: 'Corporate entity'
        },
        recommendations: []
      },
      {
        recordId: '1142632901',
        isReportable: true,
        confidence: 0.85,
        riskLevel: 'low',
        fraudIndicators: [],
        anomalyScore: 0.2,
        reportabilityAnalysis: {
          isReportable: true,
          confidence: 0.85,
          applicableRules: ['rule_amount_threshold'],
          reasoning: ['Payment amount exceeds reporting threshold', 'Long-term medical supply loan'],
          warnings: [],
          recommendations: []
        },
        patterns: {
          amountPattern: 'Low amount',
          timingPattern: 'Regular timing',
          recipientPattern: 'Teaching hospital',
          manufacturerPattern: 'Corporate entity'
        },
        recommendations: []
      }
    ]

    setRecords(sampleRecords)
    setAnalysisResults(sampleAnalysisResults)

    // Generate mock pattern analysis
    const mockPatternAnalysis: PatternAnalysis = {
      fraudPatterns: {
        suspiciousAmounts: [],
        unusualTiming: [],
        duplicatePayments: [],
        highRiskRecipients: [],
        manufacturerConcentration: sampleRecords
      },
      reportabilityPatterns: {
        clearlyReportable: sampleRecords,
        clearlyNonReportable: [],
        greyArea: [],
        disputedRecords: []
      },
      statisticalAnalysis: {
        totalRecords: sampleRecords.length,
        totalAmount: sampleRecords.reduce((sum, r) => sum + (r.totalAmountOfPaymentUSDollars || 0), 0),
        averageAmount: sampleRecords.reduce((sum, r) => sum + (r.totalAmountOfPaymentUSDollars || 0), 0) / sampleRecords.length,
        medianAmount: 5000,
        topManufacturers: [
          { name: 'Genentech USA, Inc.', count: 2, totalAmount: 15000 },
          { name: 'Linde Gas & Equipment Inc.', count: 1, totalAmount: 330 }
        ],
        topRecipients: [
          { name: 'Ochsner Clinic Foundation', count: 1, totalAmount: 10000 },
          { name: 'Vanderbilt University Medical Center', count: 1, totalAmount: 5000 },
          { name: 'Gundersen Lutheran Medical Center', count: 1, totalAmount: 330 }
        ],
        paymentTypeDistribution: [
          { type: 'Cash or cash equivalent', count: 2, percentage: 66.7 },
          { type: 'In-kind items and services', count: 1, percentage: 33.3 }
        ],
        natureOfPaymentDistribution: [
          { nature: 'Grant', count: 2, percentage: 66.7 },
          { nature: 'Long term medical supply or device loan', count: 1, percentage: 33.3 }
        ],
        stateDistribution: [
          { state: 'LA', count: 1, percentage: 33.3 },
          { state: 'TN', count: 1, percentage: 33.3 },
          { state: 'WI', count: 1, percentage: 33.3 }
        ],
        monthlyDistribution: [
          { month: 'Feb 2024', count: 2, totalAmount: 10330 },
          { month: 'Aug 2024', count: 1, totalAmount: 5000 }
        ]
      },
      complianceMetrics: {
        reportabilityRate: 100,
        disputeRate: 0,
        averageConfidence: 0.90,
        riskDistribution: {
          low: 3,
          medium: 0,
          high: 0,
          critical: 0
        }
      }
    }

    setPatternAnalysis(mockPatternAnalysis)
  }

  const handleAnalyzePatterns = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/data-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'analyze_patterns'
        })
      })

      const data = await response.json()

      if (data.success) {
        setPatternAnalysis(data.data)
      } else {
        setError(data.error || 'Pattern analysis failed')
      }
    } catch (err) {
      setError('Failed to analyze patterns')
      console.error('Pattern analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default'
      case 'medium': return 'outline'
      case 'high': return 'secondary'
      case 'critical': return 'destructive'
      default: return 'outline'
    }
  }

  const getReportabilityBadgeVariant = (isReportable: boolean) => {
    return isReportable ? 'default' : 'secondary'
  }

  const filteredRecords = records.filter(record => {
    const matchesSearch = !searchQuery || 
      record.teachingHospitalName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.coveredRecipientFirstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.coveredRecipientLastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.applicableManufacturerOrApplicableGPOMakingPaymentName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesRiskLevel = !filterRiskLevel || 
      analysisResults.find(ar => ar.recordId === record.recordId)?.riskLevel === filterRiskLevel

    const matchesReportability = !filterReportability || 
      (filterReportability === 'reportable' && analysisResults.find(ar => ar.recordId === record.recordId)?.isReportable) ||
      (filterReportability === 'non-reportable' && !analysisResults.find(ar => ar.recordId === record.recordId)?.isReportable)

    return matchesSearch && matchesRiskLevel && matchesReportability
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CMS Data Analysis & Pattern Detection</h2>
          <p className="text-muted-foreground">
            Exploratory analysis of CMS Open Payments data for fraud detection and compliance patterns
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAnalyzePatterns} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze Patterns
              </>
            )}
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {patternAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{patternAnalysis.statisticalAnalysis.totalRecords.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                CMS Open Payments records
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${patternAnalysis.statisticalAnalysis.totalAmount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Total payment value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reportability Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {patternAnalysis.complianceMetrics.reportabilityRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Clearly reportable payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Confidence</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(patternAnalysis.complianceMetrics.averageConfidence * 100).toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Analysis confidence
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="fraud-detection">Fraud Detection</TabsTrigger>
          <TabsTrigger value="reportability">Reportability Analysis</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {patternAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Risk Distribution</CardTitle>
                  <CardDescription>Distribution of risk levels across all records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Low Risk</span>
                      <Badge variant="default">{patternAnalysis.complianceMetrics.riskDistribution.low}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Medium Risk</span>
                      <Badge variant="outline">{patternAnalysis.complianceMetrics.riskDistribution.medium}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Risk</span>
                      <Badge variant="secondary">{patternAnalysis.complianceMetrics.riskDistribution.high}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Critical Risk</span>
                      <Badge variant="destructive">{patternAnalysis.complianceMetrics.riskDistribution.critical}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Manufacturers</CardTitle>
                  <CardDescription>Manufacturers with highest payment volumes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.statisticalAnalysis.topManufacturers.slice(0, 5).map((manufacturer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm truncate">{manufacturer.name}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">${manufacturer.totalAmount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{manufacturer.count} payments</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="fraud-detection" className="space-y-4">
          {patternAnalysis && (
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fraud Pattern Detection</CardTitle>
                  <CardDescription>Identified patterns that may indicate fraudulent activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Suspicious Amounts</h4>
                      <Badge variant="outline">{patternAnalysis.fraudPatterns.suspiciousAmounts.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        Payments with unusually high or low amounts
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Unusual Timing</h4>
                      <Badge variant="outline">{patternAnalysis.fraudPatterns.unusualTiming.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        Payments with delayed publication
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Duplicate Payments</h4>
                      <Badge variant="outline">{patternAnalysis.fraudPatterns.duplicatePayments.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        Potentially duplicate payment records
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">High Risk Recipients</h4>
                      <Badge variant="outline">{patternAnalysis.fraudPatterns.highRiskRecipients.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        Recipients with high risk scores
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Manufacturer Concentration</h4>
                      <Badge variant="outline">{patternAnalysis.fraudPatterns.manufacturerConcentration.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        High concentration of payments from single manufacturer
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="reportability" className="space-y-4">
          {patternAnalysis && (
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Reportability Analysis</CardTitle>
                  <CardDescription>Classification of payments by reportability status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Clearly Reportable</h4>
                      <Badge variant="default">{patternAnalysis.reportabilityPatterns.clearlyReportable.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        High confidence reportable payments
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Clearly Non-Reportable</h4>
                      <Badge variant="secondary">{patternAnalysis.reportabilityPatterns.clearlyNonReportable.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        High confidence non-reportable payments
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Grey Area</h4>
                      <Badge variant="outline">{patternAnalysis.reportabilityPatterns.greyArea.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        Low confidence - requires manual review
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Disputed Records</h4>
                      <Badge variant="destructive">{patternAnalysis.reportabilityPatterns.disputedRecords.length} records</Badge>
                      <p className="text-xs text-muted-foreground">
                        Records under dispute
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="statistics" className="space-y-4">
          {patternAnalysis && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Type Distribution</CardTitle>
                  <CardDescription>Distribution of payment forms</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.statisticalAnalysis.paymentTypeDistribution.map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{type.type}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{type.count} ({type.percentage.toFixed(1)}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Nature of Payment Distribution</CardTitle>
                  <CardDescription>Distribution of payment natures</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.statisticalAnalysis.natureOfPaymentDistribution.map((nature, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{nature.nature}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{nature.count} ({nature.percentage.toFixed(1)}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>State Distribution</CardTitle>
                  <CardDescription>Geographic distribution of payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.statisticalAnalysis.stateDistribution.slice(0, 10).map((state, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{state.state}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">{state.count} ({state.percentage.toFixed(1)}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Distribution</CardTitle>
                  <CardDescription>Payment distribution by month</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {patternAnalysis.statisticalAnalysis.monthlyDistribution.map((month, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{month.month}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium">${month.totalAmount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{month.count} payments</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment Records</CardTitle>
              <CardDescription>Detailed view of CMS Open Payments records with analysis results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Records</Label>
                  <Input
                    id="search"
                    placeholder="Search by recipient, manufacturer, or record ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="riskLevel">Risk Level</Label>
                  <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="reportability">Reportability</Label>
                  <Select value={filterReportability} onValueChange={setFilterReportability}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="reportable">Reportable</SelectItem>
                      <SelectItem value="non-reportable">Non-Reportable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {filteredRecords.map((record) => {
              const analysis = analysisResults.find(ar => ar.recordId === record.recordId)
              return (
                <Card key={record.recordId}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {record.teachingHospitalName || 
                           `${record.coveredRecipientFirstName} ${record.coveredRecipientLastName}`}
                        </CardTitle>
                        <CardDescription>
                          {record.applicableManufacturerOrApplicableGPOMakingPaymentName} • 
                          {record.dateOfPayment} • Record ID: {record.recordId}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {analysis && (
                          <>
                            <Badge variant={getRiskBadgeVariant(analysis.riskLevel)}>
                              {analysis.riskLevel.toUpperCase()} RISK
                            </Badge>
                            <Badge variant={getReportabilityBadgeVariant(analysis.isReportable)}>
                              {analysis.isReportable ? 'REPORTABLE' : 'NON-REPORTABLE'}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Payment Details</h4>
                        <p className="text-sm text-muted-foreground">
                          Amount: ${record.totalAmountOfPaymentUSDollars?.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Nature: {record.natureOfPaymentOrTransferOfValue}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Form: {record.formOfPaymentOrTransferOfValue}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Recipient Details</h4>
                        <p className="text-sm text-muted-foreground">
                          Type: {record.coveredRecipientType}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          State: {record.recipientState}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Program Year: {record.programYear}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-1">Analysis Results</h4>
                        {analysis && (
                          <>
                            <p className="text-sm text-muted-foreground">
                              Confidence: {(analysis.confidence * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Anomaly Score: {(analysis.anomalyScore * 100).toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Fraud Indicators: {analysis.fraudIndicators.length}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {analysis && analysis.fraudIndicators.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Fraud Indicators:</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.fraudIndicators.map((indicator, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis && analysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommendations:</h4>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {analysis.recommendations.map((recommendation, index) => (
                            <li key={index}>• {recommendation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
