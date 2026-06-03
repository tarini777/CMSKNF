'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { FmvAnalysis } from '@/lib/fmv-service'
import { Loader2 } from 'lucide-react'

export default function FmvPanel({ recordId }: { recordId: string }) {
  const [analysis, setAnalysis] = useState<FmvAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/fmv/analyze?recordId=${encodeURIComponent(recordId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setAnalysis(d.data)
      })
      .finally(() => setLoading(false))
  }, [recordId])

  if (loading) {
    return (
      <div className="rounded-lg border bg-muted/30 p-3 flex justify-center">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!analysis) return null

  const statusColor =
    analysis.status === 'above_fmv'
      ? 'destructive'
      : analysis.status === 'within_range'
        ? 'default'
        : 'secondary'

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">FMV check</p>
        <Badge variant={statusColor as 'default' | 'destructive' | 'secondary'} className="text-[9px]">
          {analysis.status.replace(/_/g, ' ')}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="text-muted-foreground">Actual</p>
          <p className="font-medium tabular-nums">${analysis.actualUsd.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Benchmark</p>
          <p className="font-medium tabular-nums">
            {analysis.benchmarkUsd != null ? `$${analysis.benchmarkUsd.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{analysis.message}</p>
      <p className="text-[10px] text-muted-foreground font-mono">source: {analysis.rateSource}</p>
    </div>
  )
}
