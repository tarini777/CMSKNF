'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import { Loader2, UserCheck, UserX } from 'lucide-react'

interface ConsentRecord {
  id: string
  recordId: string
  coveredRecipientName: string
  recipientCountry?: string
  totalAmountOfPaymentUsdollars: number
  consentForDisclosure?: boolean | null
  disclosureType?: string
}

export default function ConsentDashboard() {
  const programYear = getActiveProgramYear()
  const [records, setRecords] = useState<ConsentRecord[]>([])
  const [stats, setStats] = useState({ pending: 0, individual: 0, aggregate: 0 })
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch(`/api/transparency/consent?programYear=${programYear}&filter=needs_consent`)
    const data = await res.json()
    if (data.success) {
      setRecords(data.data.records)
      setStats(data.data.stats)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [programYear])

  const setConsent = async (recordId: string, granted: boolean) => {
    setActing(recordId)
    await fetch('/api/transparency/consent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId, consentForDisclosure: granted }),
    })
    setActing(null)
    load()
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">{stats.pending} pending</Badge>
        <Badge variant="default" className="text-xs">{stats.individual} individual</Badge>
        <Badge variant="secondary" className="text-xs">{stats.aggregate} aggregate</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">All EU/UK recipients have consent recorded.</p>
      ) : (
        records.slice(0, 30).map((r) => (
          <div key={r.id} className="rounded-lg border bg-card px-3 py-2.5 flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{r.coveredRecipientName}</p>
              <p className="text-[11px] text-muted-foreground">
                {r.recipientCountry} · ${r.totalAmountOfPaymentUsdollars.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={acting === r.id}
                onClick={() => setConsent(r.id, true)}
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" />
                Yes
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={acting === r.id}
                onClick={() => setConsent(r.id, false)}
              >
                <UserX className="w-3.5 h-3.5 mr-1" />
                No
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
