'use client'

import { useState, useEffect, type ComponentType } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardMetrics } from '@/types/cms'
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
import ConnectorsDashboard from './ConnectorsDashboard'
import NppesConnectorPanel from './NppesConnectorPanel'
import DedupDashboard from './DedupDashboard'
import TransparencyDashboard from './TransparencyDashboard'
import AppHeader from './app/AppHeader'
import AppNavRail from './app/AppNavRail'
import PersonaInsightsStrip from './persona/PersonaInsightsStrip'
import RulesLogicPane from './persona/RulesLogicPane'
import { usePersona } from '@/context/PersonaContext'
import {
  AlertTriangle,
  CheckCircle,
  Database,
  FileCheck,
  TrendingUp,
} from 'lucide-react'

function DashboardInner() {
  const { activeTab } = usePersona()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const handleUploadSuccess = () => {
    fetchMetrics()
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <AppHeader />
      <PersonaInsightsStrip metrics={metrics} />

      <div className="flex flex-1 min-h-0">
        <AppNavRail />

        <div className="flex-1 min-w-0 overflow-y-auto px-4 py-4 app-work-surface">
          {activeTab === 'dashboard' && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">Loading…</div>
              ) : error ? (
                <Card className="border-destructive">
                  <CardContent className="pt-6 flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                  </CardContent>
                </Card>
              ) : metrics ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <MetricTile icon={TrendingUp} label="Quality" value={formatPercentage(metrics.dataQualityScore)} />
                  <MetricTile icon={Database} label="Records" value={formatNumber(metrics.recordsProcessed)} />
                  <MetricTile icon={CheckCircle} label="Compliance" value={formatPercentage(metrics.complianceScore)} />
                  <MetricTile icon={FileCheck} label="In queue" value={formatNumber(metrics.pendingReview)} highlight={metrics.pendingReview > 0} />
                </div>
              ) : null}
            </>
          )}
          {activeTab === 'upload' && (
            <FileUpload onUploadSuccess={handleUploadSuccess} onUploadError={handleUploadError} />
          )}
          {activeTab === 'review' && <RecordsTable />}
          {activeTab === 'rules' && <RulesManager />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'open-payments' && <OpenPaymentsDashboard />}
          {activeTab === 'glossary' && <GlossaryDashboard />}
          {activeTab === 'data-analysis' && <DataAnalysisDashboard />}
          {activeTab === 'monitoring' && <APIMonitoringDashboard />}
          {activeTab === 'audit' && <AuditLogDashboard />}
          {activeTab === 'lineage' && (
            <div className="space-y-4">
              <LineageDashboard />
              <DedupDashboard />
              <NppesConnectorPanel />
              <ConnectorsDashboard />
            </div>
          )}
          {activeTab === 'connectivity' && <ConnectivityDashboard />}
          {activeTab === 'transparency' && <TransparencyDashboard />}
        </div>

        <RulesLogicPane />
      </div>
    </div>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  return <DashboardInner />
}
