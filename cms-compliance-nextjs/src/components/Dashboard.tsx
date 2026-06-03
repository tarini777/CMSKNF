'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Upload, 
  FileCheck, 
  Settings, 
  TrendingUp, 
  Users, 
  Shield, 
  Activity,
  Database,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Scale,
  BookOpen,
  GitBranch
} from 'lucide-react'
import { DashboardMetrics, FileUploadResponse } from '@/types/cms'
import FileUpload from './FileUpload'
import RecordsTable from './RecordsTable'
import RulesManager from './RulesManager'
import AnalyticsDashboard from './AnalyticsDashboard'
import APIMonitoringDashboard from './APIMonitoringDashboard'
import OpenPaymentsDashboard from './OpenPaymentsDashboard'
import GlossaryDashboard from './GlossaryDashboard'
import DataAnalysisDashboard from './DataAnalysisDashboard'
import AuditLogDashboard from './AuditLogDashboard'
import ConnectivityDashboard from './ConnectivityDashboard'
import LineageDashboard from './LineageDashboard'
import TransparencyDashboard from './TransparencyDashboard'
import AuthHeader from './AuthHeader'

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(null)

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics')
      const data = await response.json()
      
      if (data.success) {
        setMetrics(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to fetch metrics')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`
  }

  const handleUploadSuccess = (result: FileUploadResponse) => {
    setUploadResult(result)
    // Refresh metrics after successful upload
    fetchMetrics()
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Knowledge Nexus Framework™
              </h1>
              <p className="text-muted-foreground mt-1">
                CMS Compliance Platform - Transforming Life Sciences Spend Management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <AuthHeader />
              <Badge variant="outline" className="text-primary border-primary">
                <Activity className="w-3 h-3 mr-1" />
                Real-time
              </Badge>
              <Badge variant="secondary">
                <Shield className="w-3 h-3 mr-1" />
                HIPAA Compliant
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="flex w-full flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Data Upload
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              Review & Approval
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="open-payments" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Open Payments
            </TabsTrigger>
            <TabsTrigger value="glossary" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Glossary & Rules
            </TabsTrigger>
            <TabsTrigger value="data-analysis" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Data Analysis
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Rules Management
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Monitoring
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Audit Trail
            </TabsTrigger>
            <TabsTrigger value="lineage" className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Lineage
            </TabsTrigger>
            <TabsTrigger value="connectivity" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Connectivity
            </TabsTrigger>
            <TabsTrigger value="transparency" className="flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Transparency
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading metrics...</span>
              </div>
            ) : error ? (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Error: {error}</span>
                  </div>
                </CardContent>
              </Card>
            ) : metrics ? (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Data Quality Score</CardTitle>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatPercentage(metrics.dataQualityScore)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +0.3% from last hour
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Records Processed</CardTitle>
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatNumber(metrics.recordsProcessed)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +1,200 this hour
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {formatPercentage(metrics.complianceScore)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +0.1% this week
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Regulatory Rules</CardTitle>
                      <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">
                        {metrics.regulatoryRules}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        +3 new rules
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Processing Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Processing Rate</span>
                        <span className="font-medium">{formatNumber(metrics.processingRate)}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duplicates Removed</span>
                        <span className="font-medium">{formatNumber(metrics.duplicatesRemoved)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Validation Errors</span>
                        <span className="font-medium text-destructive">{formatNumber(metrics.validationErrors)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Error Rate</span>
                        <span className="font-medium text-destructive">{formatPercentage(metrics.errorRate)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">System Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Database Connected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">API Services Active</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Real-time Processing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm">Security Monitoring</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full justify-start" variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload CMS Data
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <FileCheck className="w-4 h-4 mr-2" />
                        Review Records
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Rules
                      </Button>
                      <Button className="w-full justify-start" variant="outline">
                        <Users className="w-4 h-4 mr-2" />
                        Team Management
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Last Updated */}
                <div className="text-center text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Last updated: {new Date(metrics.timestamp).toLocaleTimeString()} | Auto-refresh every 10 seconds
                </div>
              </>
            ) : null}
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <FileUpload 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-6">
            <RecordsTable />
          </TabsContent>

          {/* Rules Tab */}
          <TabsContent value="rules" className="space-y-6">
            <RulesManager />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Open Payments Tab */}
          <TabsContent value="open-payments" className="space-y-6">
            <OpenPaymentsDashboard />
          </TabsContent>

          {/* Glossary & Rules Tab */}
          <TabsContent value="glossary" className="space-y-6">
            <GlossaryDashboard />
          </TabsContent>

          {/* Data Analysis Tab */}
          <TabsContent value="data-analysis" className="space-y-6">
            <DataAnalysisDashboard />
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring" className="space-y-6">
            <APIMonitoringDashboard />
          </TabsContent>

          {/* Audit Trail Tab */}
          <TabsContent value="audit" className="space-y-6">
            <AuditLogDashboard />
          </TabsContent>

          <TabsContent value="lineage" className="space-y-6">
            <LineageDashboard />
          </TabsContent>

          {/* Connectivity Tab (Phase 5) */}
          <TabsContent value="connectivity" className="space-y-6">
            <ConnectivityDashboard />
          </TabsContent>

          <TabsContent value="transparency" className="space-y-6">
            <TransparencyDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
