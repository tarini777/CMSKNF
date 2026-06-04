'use client'

import { useState, useEffect } from 'react'
import { getActiveProgramYear, getMilestoneStatus, type SubmissionMilestone } from '@/lib/submission-calendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, RefreshCw, CheckSquare, Package } from 'lucide-react'
import DisputeDashboard from './DisputeDashboard'
import ConsentDashboard from './ConsentDashboard'
import InternationalExportPanel from './InternationalExportPanel'

interface Milestone {
  id: string
  jurisdiction: string
  phase: string
  title: string
  startDate: string
  endDate: string
  description: string
  actionRequired: string
  anticipated?: boolean
}

interface UsSummary {
  programYear: number
  submissionWindow: string
  reportingDeadline: string
  disputeWindow: string
  publicationDate: string
}

interface ChecklistItem {
  id: string
  label: string
  completed: boolean
}

export default function TransparencyDashboard() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [usSummary, setUsSummary] = useState<UsSummary | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [aggregateMsg, setAggregateMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [bundleInfo, setBundleInfo] = useState<{ files: Array<{ filename: string; rowCount: number }> } | null>(null)

  const programYear = getActiveProgramYear()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [calRes, attRes] = await Promise.all([
        fetch(`/api/transparency/calendar?programYear=${programYear}`),
        fetch(`/api/transparency/attestation?programYear=${programYear}`),
      ])
      const cal = await calRes.json()
      const att = await attRes.json()
      if (cal.success) {
        setMilestones(cal.data.filter((m: Milestone) => m.jurisdiction === 'US'))
        setUsSummary(cal.usSummary ?? null)
      }
      if (att.success) setChecklist(att.data.checklist)
    } finally {
      setLoading(false)
    }
  }

  const runAggregate = async () => {
    const res = await fetch('/api/transparency/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programYear }),
    })
    const data = await res.json()
    setAggregateMsg(data.success ? data.message : data.error)
    loadData()
  }

  const exportCms = () => {
    window.open(`/api/transparency/export?programYear=${programYear}`, '_blank')
  }

  const loadBundle = async () => {
    const res = await fetch(`/api/transparency/export?programYear=${programYear}&bundle=1`)
    const data = await res.json()
    if (data.success) {
      setBundleInfo(data.data)
    } else {
      setAggregateMsg(data.error || 'Export blocked — check checklist')
    }
  }

  const downloadPuf = (file: 'general' | 'research' | 'ownership') => {
    window.open(`/api/transparency/export/file?programYear=${programYear}&file=${file}`, '_blank')
  }

  const doneCount = checklist.filter((c) => c.completed).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Submission</h2>
          <p className="text-xs text-muted-foreground">Program year {programYear}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runAggregate}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Recalc
          </Button>
          <Button size="sm" onClick={exportCms}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {aggregateMsg && (
        <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">{aggregateMsg}</p>
      )}

      {usSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatChip label="Submit" value={usSummary.submissionWindow} />
          <StatChip label="Attest by" value={usSummary.reportingDeadline} />
          <StatChip label="Disputes" value={usSummary.disputeWindow} />
          <StatChip label="Publish" value={usSummary.publicationDate} />
        </div>
      )}

      <Tabs defaultValue="calendar">
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="calendar" className="text-xs">Timeline</TabsTrigger>
          <TabsTrigger value="attestation" className="text-xs">Checklist {doneCount}/{checklist.length}</TabsTrigger>
          <TabsTrigger value="export" className="text-xs">OPS bundle</TabsTrigger>
          <TabsTrigger value="disputes" className="text-xs">Disputes</TabsTrigger>
          <TabsTrigger value="consent" className="text-xs">Consent</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-3 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : (
            milestones.map((m) => {
              const status = getMilestoneStatus(m as SubmissionMilestone)
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                    status === 'active' ? 'border-primary bg-primary/5' : 'bg-card'
                  }`}
                >
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {m.phase}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{m.title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      {m.startDate === m.endDate ? m.startDate : `${m.startDate} – ${m.endDate}`}
                    </p>
                  </div>
                  {status === 'active' && (
                    <Badge className="bg-emerald-600 text-white text-[10px] shrink-0">Now</Badge>
                  )}
                  {status === 'past' && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Done
                    </Badge>
                  )}
                </div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="attestation" className="mt-3 space-y-2">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card"
            >
              <CheckSquare
                className={`w-4 h-4 shrink-0 ${item.completed ? 'text-emerald-600' : 'text-muted-foreground'}`}
              />
              <span className="text-sm flex-1">{item.label}</span>
              <Badge variant={item.completed ? 'default' : 'outline'} className="text-[10px]">
                {item.completed ? 'Done' : 'Open'}
              </Badge>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="export" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Full PUF bundle for CMS Open Payments System upload — attestation still required on CMS portal.
          </p>
          <Button size="sm" variant="outline" onClick={loadBundle}>
            <Package className="w-3.5 h-3.5 mr-1.5" />
            Preview bundle
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => downloadPuf('general')}>General (91-col)</Button>
            <Button size="sm" onClick={() => downloadPuf('research')}>Research</Button>
            <Button size="sm" onClick={() => downloadPuf('ownership')}>Ownership</Button>
          </div>
          {bundleInfo?.files && (
            <div className="space-y-1">
              {bundleInfo.files.map((f) => (
                <p key={f.filename} className="text-xs font-mono text-muted-foreground">
                  {f.filename} · {f.rowCount} rows
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <InternationalExportPanel />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                window.open(`/api/transparency/attestation/pack?programYear=${programYear}`, '_blank')
              }
            >
              Attestation PDF
            </Button>
          </div>
          <a href="/disclosure" target="_blank" className="text-xs text-primary underline block">
            Open public disclosure site →
          </a>
          <a href="/hcp-review" target="_blank" className="text-xs text-primary underline block">
            HCP 45-day review portal →
          </a>
        </TabsContent>

        <TabsContent value="disputes" className="mt-3">
          <DisputeDashboard />
        </TabsContent>

        <TabsContent value="consent" className="mt-3">
          <ConsentDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-medium mt-0.5 leading-snug">{value}</p>
    </div>
  )
}
