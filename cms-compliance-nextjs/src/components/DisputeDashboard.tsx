'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getActiveProgramYear, type DisputeStatus } from '@/lib/submission-calendar'
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'

interface DisputeRecord {
  id: string
  recordId: string
  coveredRecipientName: string
  coveredRecipientNpi?: string
  totalAmountOfPaymentUsdollars: number
  dateOfPayment?: string
  disputeWorkflowStatus?: string
  disputeNotes?: string
  natureOfPaymentOrTransferOfValue?: string
}

const NEXT_STATUS: Partial<Record<DisputeStatus, DisputeStatus>> = {
  none: 'under_review',
  under_review: 'disputed',
  disputed: 'corrected',
  corrected: 'resolved',
}

const STATUS_LABEL: Record<string, string> = {
  none: 'None',
  under_review: 'Review',
  disputed: 'Disputed',
  corrected: 'Corrected',
  resolved: 'Resolved',
}

export default function DisputeDashboard() {
  const programYear = getActiveProgramYear()
  const [records, setRecords] = useState<DisputeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/transparency/dispute?programYear=${programYear}&status=open`)
    const data = await res.json()
    if (data.success) setRecords(data.data.records)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [programYear])

  const transition = async (record: DisputeRecord) => {
    const current = (record.disputeWorkflowStatus || 'none') as DisputeStatus
    const next = NEXT_STATUS[current]
    if (!next) return

    setActing(record.id)
    setMessage(null)
    const res = await fetch('/api/transparency/dispute', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recordId: record.id,
        status: next,
        reason: reasons[record.id],
      }),
    })
    const data = await res.json()
    setActing(null)
    if (data.success) {
      setMessage(`Updated ${record.recordId}`)
      load()
    } else {
      setMessage(data.error)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Open disputes · PY {programYear}</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </div>

      {message && <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">{message}</p>}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No open disputes — HCP portal submissions appear here.</p>
      ) : (
        records.map((r) => {
          const status = r.disputeWorkflowStatus || 'none'
          const next = NEXT_STATUS[status as DisputeStatus]
          return (
            <div key={r.id} className="rounded-lg border bg-card p-3 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{r.coveredRecipientName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    {r.recordId} · ${r.totalAmountOfPaymentUsdollars.toLocaleString()}
                  </p>
                </div>
                <Badge variant={status === 'disputed' ? 'destructive' : 'secondary'} className="text-[10px]">
                  {STATUS_LABEL[status] || status}
                </Badge>
              </div>
              {r.disputeNotes && (
                <p className="text-xs text-muted-foreground flex gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  {r.disputeNotes}
                </p>
              )}
              {next && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <Textarea
                    placeholder="Reason for transition…"
                    rows={2}
                    className="text-xs min-h-0"
                    value={reasons[r.id] || ''}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [r.id]: e.target.value }))}
                  />
                  <Button size="sm" className="shrink-0" disabled={acting === r.id} onClick={() => transition(r)}>
                    {acting === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        → {STATUS_LABEL[next]}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
