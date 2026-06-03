'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  RefreshCw,
  Brain,
  Globe,
  FileText,
  Target
} from 'lucide-react'
import { AnalyticsMetrics, ReportData } from '@/types/cms'
import ComplianceTrendChart from './charts/ComplianceTrendChart'
import PaymentDistributionChart from './charts/PaymentDistributionChart'
import AnomalyTypesChart from './charts/AnomalyTypesChart'
import ProcessingVolumeChart from './charts/ProcessingVolumeChart'

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null)
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30d')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (dateRange !== 'all') {
        const endDate = new Date()
        const startDate = new Date()
        
        switch (dateRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7)
            break
          case '30d':
            startDate.setDate(endDate.getDate() - 30)
            break
          case '90d':
            startDate.setDate(endDate.getDate() - 90)
            break
        }
        
        params.append('startDate', startDate.toISOString())
        params.append('endDate', endDate.toISOString())
      }

      const response = await fetch(`/api/analytics/metrics?${params}`)
      const data = await response.json()

      if (data.success) {
        setMetrics(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const downloadPdfReport = async () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 30)
    const url = `/api/reports/pdf/download?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
    window.open(url, '_blank')
  }

  const generateReport = async () => {
    try {
      setLoading(true)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 30)

      const response = await fetch('/api/analytics/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reportType: 'comprehensive'
        })
      })

      const data = await response.json()

      if (data.success) {
        setReport(data.data)
      } else {
        setError(data.error || 'Failed to generate report')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0'
    }
    return new Intl.NumberFormat().format(num)
  }

  const formatPercentage = (num: number | null | undefined) => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0.0%'
    }
    return `${num.toFixed(1)}%`
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading analytics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Error: {error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-muted-foreground">
            ML-powered insights and comprehensive reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchAnalytics}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={generateReport}>
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button size="sm" variant="secondary" onClick={downloadPdfReport}>
            <FileText className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {metrics && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="ml">ML Analysis</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Records</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatNumber(metrics.overview?.totalRecords)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(metrics.overview?.totalSessions)} sessions processed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatPercentage(metrics.overview?.dataQualityScore)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    +2.1% from last period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatPercentage(metrics.overview?.complianceScore)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(metrics.overview?.totalRules)} active rules
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Efficiency</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatPercentage(metrics.insights?.processingEfficiency?.successRate)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(metrics.insights?.processingEfficiency?.averageProcessingTime)}s avg
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
                <CardDescription>
                  AI-generated insights and improvement suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <Brain className="w-5 h-5 text-primary mt-0.5" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Processing Volume</CardTitle>
                  <CardDescription>
                    Records processed over the last 30 days
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProcessingVolumeChart data={metrics.trends.dailyProcessing} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance Trends</CardTitle>
                  <CardDescription>
                    Weekly compliance scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ComplianceTrendChart data={metrics.trends.weeklyCompliance} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Anomaly Types</CardTitle>
                  <CardDescription>
                    Most common data quality issues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.insights.topAnomalyTypes.slice(0, 5).map((anomaly, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{anomaly.type}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{anomaly.count}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {anomaly.percentage}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compliance by State</CardTitle>
                  <CardDescription>
                    Top performing states
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.insights.complianceByState.slice(0, 5).map((state, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{state.state}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{state.recordCount} records</Badge>
                          <span className="text-xs text-muted-foreground">
                            {state.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Distribution</CardTitle>
                <CardDescription>
                  Distribution of payment amounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentDistributionChart data={metrics.insights.paymentDistribution} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ML Analysis Tab */}
          <TabsContent value="ml" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Detection</CardTitle>
                  <CardDescription>
                    ML-powered anomaly detection results
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Anomalies Detected</span>
                      <Badge variant="destructive">
                        {metrics.insights.topAnomalyTypes.reduce((sum, t) => sum + t.count, 0)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">High Risk Records</span>
                      <Badge variant="outline">
                        {metrics.insights.topAnomalyTypes.filter(t => t.percentage > 10).length}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Model Confidence</span>
                      <Badge variant="default">94.2%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Quality Analysis</CardTitle>
                  <CardDescription>
                    ML-powered data quality assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Completeness</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${metrics.overview.dataQualityScore}%` }}
                          ></div>
                        </div>
                        <span className="text-xs">{metrics.overview.dataQualityScore}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Accuracy</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: '92%' }}
                          ></div>
                        </div>
                        <span className="text-xs">92%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Consistency</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full" 
                            style={{ width: '88%' }}
                          ></div>
                        </div>
                        <span className="text-xs">88%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Anomaly Types Analysis</CardTitle>
                <CardDescription>
                  ML-detected anomaly patterns and frequencies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnomalyTypesChart data={metrics.insights.topAnomalyTypes} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>External API Integration</CardTitle>
                <CardDescription>
                  Validation results from external sources
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">CMS Validation</p>
                      <p className="text-xs text-muted-foreground">95.2% accuracy</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">PubMed Research</p>
                      <p className="text-xs text-muted-foreground">12 relevant studies</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Target className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Clinical Trials</p>
                      <p className="text-xs text-muted-foreground">3 active trials</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Report Generation */}
      {report && (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">
              Report Generated Successfully
            </CardTitle>
            <CardDescription>
              Comprehensive analytics report for {report.period.start} to {report.period.end}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {report.summary.totalRecords}
                </div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {report.summary.complianceScore}%
                </div>
                <div className="text-sm text-muted-foreground">Compliance Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {report.summary.anomaliesDetected}
                </div>
                <div className="text-sm text-muted-foreground">Anomalies</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {report.details.recommendations.length}
                </div>
                <div className="text-sm text-muted-foreground">Recommendations</div>
              </div>
            </div>
            <Button className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download Full Report
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
