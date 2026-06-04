'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Download, Globe, RefreshCw } from 'lucide-react'
import { getActiveProgramYear } from '@/lib/submission-calendar'

interface JurisdictionExportSummary {
  countryCode: string
  countryName: string
  regimeName: string
  regimeType: string
  exportTemplate: string
  reportableRecords: number
  exportUrl: string
}

interface InternationalExportStats {
  programYear: string
  totalJurisdictions: number
  jurisdictionsWithRecords: number
  totalReportableRecords: number
  jurisdictions: JurisdictionExportSummary[]
}

export default function InternationalExportPanel() {
  const programYear = getActiveProgramYear()
  const [stats, setStats] = useState<InternationalExportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCode, setSelectedCode] = useState('FR')

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/transparency/export/international?programYear=${programYear}&format=json&jurisdiction=all`
      )
      const data = await res.json()
      if (data.success) {
        setStats(data.data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [programYear])

  const exportJurisdiction = (code: string) => {
    window.open(
      `/api/transparency/export/international?programYear=${programYear}&jurisdiction=${code.toLowerCase()}`,
      '_blank'
    )
  }

  const withRecords = stats?.jurisdictions.filter((j) => j.reportableRecords > 0) ?? []
  const selected = stats?.jurisdictions.find((j) => j.countryCode === selectedCode)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4" />
              International Reporting (Phase 5)
            </CardTitle>
            <CardDescription>
              {stats
                ? `${stats.totalJurisdictions} jurisdictions configured · ${stats.jurisdictionsWithRecords} with reportable records`
                : 'Multi-jurisdiction CSV export for national transparency filings'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedCode} onValueChange={setSelectedCode}>
            <SelectTrigger className="sm:flex-1">
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {stats?.jurisdictions.map((j) => (
                <SelectItem key={j.countryCode} value={j.countryCode}>
                  {j.countryName} ({j.countryCode})
                  {j.reportableRecords > 0 ? ` — ${j.reportableRecords} records` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => exportJurisdiction(selectedCode)} disabled={!selected}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {selected && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
            <p>
              <strong>{selected.countryName}</strong> — {selected.regimeName}
            </p>
            <p className="text-muted-foreground">
              Template: {selected.exportTemplate.replace(/_/g, ' ')} · {selected.reportableRecords} reportable
              record(s) for {programYear}
            </p>
          </div>
        )}

        {withRecords.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Jurisdictions with reportable data
            </p>
            <div className="flex flex-wrap gap-2">
              {withRecords.map((j) => (
                <Button
                  key={j.countryCode}
                  size="sm"
                  variant="outline"
                  onClick={() => exportJurisdiction(j.countryCode)}
                >
                  {j.countryCode}
                  <Badge variant="secondary" className="ml-2">
                    {j.reportableRecords}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No international recipient records for {programYear} yet. Upload payments with Recipient_Country set to
            generate jurisdiction-specific exports.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
