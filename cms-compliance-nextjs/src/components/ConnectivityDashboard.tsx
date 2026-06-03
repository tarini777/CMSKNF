'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, CheckCircle, Globe, RefreshCw, XCircle, AlertTriangle } from 'lucide-react'

interface ConnectivityCheck {
  service: string
  status: 'connected' | 'demo' | 'degraded' | 'disconnected'
  message?: string
  responseTimeMs?: number
}

interface ConnectivityResponse {
  overall: string
  checks: ConnectivityCheck[]
  rulesSummary?: {
    includesInternationalReporting?: boolean
    internationalCountries?: number
  }
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'connected':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'demo':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    case 'degraded':
      return <AlertTriangle className="w-4 h-4 text-orange-500" />
    default:
      return <XCircle className="w-4 h-4 text-red-500" />
  }
}

export default function ConnectivityDashboard() {
  const [data, setData] = useState<ConnectivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<string[]>([])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [connectivityRes, countriesRes] = await Promise.all([
        fetch('/api/connectivity'),
        fetch('/api/glossary?action=countries'),
      ])
      const connectivity = await connectivityRes.json()
      const countriesData = await countriesRes.json()
      setData(connectivity)
      if (countriesData.success && Array.isArray(countriesData.data)) {
        setCountries(countriesData.data.slice(0, 12))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Platform Connectivity
              </CardTitle>
              <CardDescription>End-to-end integration health across APIs and international reporting</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading && !data ? (
            <p className="text-muted-foreground">Running connectivity checks...</p>
          ) : data ? (
            <>
              <div className="mb-6">
                <span className="text-sm text-muted-foreground mr-2">Overall status:</span>
                <Badge variant={data.overall === 'healthy' ? 'default' : 'destructive'}>{data.overall}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.checks?.map((check) => (
                  <div key={check.service} className="flex items-start gap-3 p-4 border rounded-lg">
                    {statusIcon(check.status)}
                    <div>
                      <p className="font-medium">{check.service}</p>
                      <p className="text-sm text-muted-foreground">{check.message}</p>
                      {check.responseTimeMs !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">{check.responseTimeMs}ms</p>
                      )}
                      <Badge variant="outline" className="mt-2">
                        {check.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            International Reporting (Phase 5)
          </CardTitle>
          <CardDescription>
            {data?.rulesSummary?.includesInternationalReporting
              ? `${data.rulesSummary.internationalCountries || 78} jurisdictions configured`
              : 'Multi-jurisdiction rules loaded via glossary engine'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {countries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {countries.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
              <Badge variant="outline">+ more via Glossary tab</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Load countries from /api/glossary?action=countries</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
