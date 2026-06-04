'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, CheckCircle, ExternalLink, Globe, RefreshCw, XCircle, AlertTriangle } from 'lucide-react'

const OPEN_PAYMENTS_DOCS_URL = 'https://openpaymentsdata.cms.gov/about/api'
const OPEN_PAYMENTS_API_URL = 'https://openpaymentsdata.cms.gov/api/1'

interface ConnectivityCheck {
  service: string
  endpoint?: string
  status: 'connected' | 'demo' | 'degraded' | 'disconnected'
  message?: string
  responseTimeMs?: number
  mode?: 'live' | 'demo' | 'mock'
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

interface CountryPreview {
  countryCode: string
  countryName: string
}

export default function ConnectivityDashboard() {
  const [data, setData] = useState<ConnectivityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [countries, setCountries] = useState<CountryPreview[]>([])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [connectivityRes, countriesRes] = await Promise.all([
        fetch('/api/connectivity'),
        fetch('/api/glossary?action=countries'),
      ])
      const connectivity = await connectivityRes.json()
      const countriesData = await countriesRes.json()
      setData(connectivity.data ?? connectivity)
      const countryList = countriesData.data?.countries ?? countriesData.data
      if (countriesData.success && Array.isArray(countryList)) {
        setCountries(
          countryList.slice(0, 12).map((c: CountryPreview | string) =>
            typeof c === 'string'
              ? { countryCode: c, countryName: c }
              : { countryCode: c.countryCode, countryName: c.countryName }
          )
        )
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
                    <div className="min-w-0">
                      <p className="font-medium">{check.service}</p>
                      {check.endpoint && (
                        <p className="text-xs text-muted-foreground break-all">{check.endpoint}</p>
                      )}
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

              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">CMS Open Payments (DKAN API)</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Live public transparency data from CMS — general, research, and ownership payment datasets.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 break-all">{OPEN_PAYMENTS_API_URL}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={OPEN_PAYMENTS_DOCS_URL} target="_blank" rel="noopener noreferrer">
                      API docs
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                </div>
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
                <Badge key={c.countryCode} variant="secondary">
                  {c.countryName}
                </Badge>
              ))}
              <Badge variant="outline">
                +{(data?.rulesSummary?.internationalCountries ?? 78) - countries.length} more via Glossary tab
              </Badge>
            </div>
          ) : loading ? (
            <p className="text-muted-foreground text-sm">Loading jurisdictions…</p>
          ) : (
            <p className="text-muted-foreground text-sm">Unable to load countries from glossary API</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
