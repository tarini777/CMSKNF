'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Play,
  Pause,
  Settings
} from 'lucide-react'

interface APIMonitorStatus {
  service: 'cms' | 'pubmed' | 'clinicaltrials'
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  lastCheck: string
  responseTime: number
  successRate: number
  errorCount: number
  lastError?: string
  uptime: number
  healthScore: number
}

interface APIMonitorAlert {
  id: string
  service: 'cms' | 'pubmed' | 'clinicaltrials'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
  resolvedAt?: string
}

interface MonitoringDashboardData {
  overallHealth: number
  totalServices: number
  healthyServices: number
  degradedServices: number
  downServices: number
  activeAlerts: number
  criticalAlerts: number
  lastUpdated: string
  services: APIMonitorStatus[]
}

export default function APIMonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState<MonitoringDashboardData | null>(null)
  const [alerts, setAlerts] = useState<APIMonitorAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    fetchMonitoringData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMonitoringData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchMonitoringData = async () => {
    try {
      setLoading(true)
      
      const [dashboardResponse, alertsResponse] = await Promise.all([
        fetch('/api/monitoring/status?type=dashboard'),
        fetch('/api/monitoring/status?type=alerts&active=true')
      ])

      const dashboardResult = await dashboardResponse.json()
      const alertsResult = await alertsResponse.json()

      if (dashboardResult.success) {
        setDashboardData(dashboardResult.data)
        setError(null)
      } else {
        setError(dashboardResult.error)
      }

      if (alertsResult.success) {
        setAlerts(alertsResult.data)
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      healthy: 'default' as const,
      degraded: 'secondary' as const,
      down: 'destructive' as const,
      unknown: 'outline' as const
    }
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const getSeverityBadge = (severity: string) => {
    const variants = {
      low: 'default' as const,
      medium: 'secondary' as const,
      high: 'destructive' as const,
      critical: 'destructive' as const
    }
    
    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'outline'}>
        {severity.toUpperCase()}
      </Badge>
    )
  }

  const formatServiceName = (service: string) => {
    switch (service) {
      case 'cms':
        return 'CMS Open Payments'
      case 'pubmed':
        return 'PubMed'
      case 'clinicaltrials':
        return 'ClinicalTrials.gov'
      default:
        return service.toUpperCase()
    }
  }

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Loading monitoring data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
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
          <h2 className="text-2xl font-bold">API Monitoring Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of external API services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMonitoringData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {dashboardData && (
        <>
          {/* Overall Health Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overall Health</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {dashboardData.overallHealth}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.healthyServices}/{dashboardData.totalServices} services healthy
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {dashboardData.activeAlerts}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.criticalAlerts} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Services Down</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {dashboardData.downServices}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboardData.degradedServices} degraded
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-primary">
                  {new Date(dashboardData.lastUpdated).toLocaleTimeString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Service Status */}
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>
                Real-time status of external API services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.services.map((service) => (
                  <div key={service.service} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(service.status)}
                      <div>
                        <h3 className="font-medium">{formatServiceName(service.service)}</h3>
                        <p className="text-sm text-muted-foreground">
                          Last check: {new Date(service.lastCheck).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {service.responseTime}ms
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {service.uptime.toFixed(1)}% uptime
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {service.successRate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          success rate
                        </div>
                      </div>
                      {getStatusBadge(service.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Alerts</CardTitle>
                <CardDescription>
                  Current alerts requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div>
                          <h4 className="font-medium">{formatServiceName(alert.service)}</h4>
                          <p className="text-sm text-muted-foreground">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {getSeverityBadge(alert.severity)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
