'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Database, GitBranch, RefreshCw, Users, FileStack } from 'lucide-react'

interface LineageStats {
  dataSources: number
  hcpMasterRecords: number
  sourceTransactions: number
  spendEvents: number
  generalPaymentLines: number
  researchPaymentLines: number
  ownershipPaymentLines: number
  spendBySource: Array<{ source: string; count: number }>
}

interface DataSourceRow {
  sourceKey: string
  sourceName: string
  sourceCategory: string
}

interface RecentEvent {
  id: string
  sourceSystem: string
  amountUsd: number
  cmsCategory: string
  status: string
  dataSource: { sourceName: string }
  hcpMaster?: { fullName?: string; npi?: string }
}

export default function LineageDashboard() {
  const [stats, setStats] = useState<LineageStats | null>(null)
  const [sources, setSources] = useState<DataSourceRow[]>([])
  const [recent, setRecent] = useState<RecentEvent[]>([])
  const [exportStats, setExportStats] = useState<{ generalFieldCount: number; generalReportable: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/lineage?action=stats')
      const json = await res.json()
      if (json.success) {
        setStats(json.data.stats)
        setSources(json.data.sources)
        setExportStats(json.data.exportStats)
      }
      const recentRes = await fetch('/api/lineage?action=recent')
      const recentJson = await recentRes.json()
      if (recentJson.success) setRecent(recentJson.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Systems-of-Record Lineage
              </CardTitle>
              <CardDescription>
                Source transaction → HCP master → spend event → CMS PUF submission line (Jan 2025 dictionary)
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Data sources" value={stats.dataSources} icon={<Database className="w-4 h-4" />} />
              <Stat label="HCP master" value={stats.hcpMasterRecords} icon={<Users className="w-4 h-4" />} />
              <Stat label="Source transactions" value={stats.sourceTransactions} icon={<FileStack className="w-4 h-4" />} />
              <Stat label="Spend events" value={stats.spendEvents} icon={<GitBranch className="w-4 h-4" />} />
              <Stat label="General PUF lines" value={stats.generalPaymentLines} />
              <Stat label="Research PUF lines" value={stats.researchPaymentLines} />
              <Stat label="Ownership PUF lines" value={stats.ownershipPaymentLines} />
              <Stat
                label="PUF field coverage"
                value={exportStats ? `${exportStats.generalFieldCount} cols` : '91 cols'}
              />
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Loading lineage stats...</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Registered source systems</CardTitle>
            <CardDescription>ERP, Concur, CRM, CTMS, vendors, MDM — ready for connector feeds</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
              {sources.map((s) => (
                <Badge key={s.sourceKey} variant="secondary" title={s.sourceCategory}>
                  {s.sourceName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent spend events</CardTitle>
            <CardDescription>Latest ingested rows with source → recipient trace</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Upload a CSV to create the first lineage chain.</p>
            ) : (
              <div className="space-y-3">
                {recent.slice(0, 8).map((ev) => (
                  <div key={ev.id} className="flex items-start justify-between gap-2 p-3 border rounded-lg text-sm">
                    <div>
                      <p className="font-medium">{ev.dataSource?.sourceName || ev.sourceSystem}</p>
                      <p className="text-muted-foreground">
                        {ev.hcpMaster?.fullName || 'Unresolved recipient'}
                        {ev.hcpMaster?.npi ? ` · NPI ${ev.hcpMaster.npi}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{ev.cmsCategory}</Badge>
                      <p className="text-muted-foreground mt-1">${ev.amountUsd.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string
  value: number | string
  icon?: React.ReactNode
}) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}
