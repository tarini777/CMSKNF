'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import { Loader2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface HcpPayment {
  id: string
  recordId: string
  amountUsd: number
  dateOfPayment?: string
  natureOfPayment?: string
  formOfPayment?: string
  manufacturer?: string
  disputeWorkflowStatus?: string
  disputeNotes?: string
}

export default function HcpReviewPage() {
  const programYear = getActiveProgramYear()
  const [npi, setNpi] = useState('')
  const [lastName, setLastName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState<string | null>(null)
  const [payments, setPayments] = useState<HcpPayment[]>([])
  const [disputeReasons, setDisputeReasons] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)

  const lookup = async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ npi, programYear: String(programYear) })
    if (lastName) params.set('lastName', lastName)
    const res = await fetch(`/api/hcp-portal?${params}`)
    const data = await res.json()
    setLoading(false)
    if (!data.success) {
      setError(data.error)
      setPayments([])
      setRecipientName(null)
      return
    }
    setRecipientName(data.data.recipientName)
    setPayments(data.data.payments)
  }

  const submitDispute = async (payment: HcpPayment) => {
    const reason = disputeReasons[payment.id]
    if (!reason?.trim()) {
      setError('Please describe the issue before submitting')
      return
    }
    setSubmitting(payment.id)
    setError(null)
    const res = await fetch('/api/hcp-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: payment.id, reason }),
    })
    const data = await res.json()
    setSubmitting(null)
    if (data.success) {
      lookup()
    } else {
      setError(data.error)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">Open Payments — HCP Review</p>
          <p className="text-xs text-muted-foreground">45-day dispute window · PY {programYear}</p>
        </div>
        <Link href="/" className="text-xs text-primary underline">
          Compliance workspace
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <Label htmlFor="npi">NPI (10 digits)</Label>
          <Input id="npi" value={npi} onChange={(e) => setNpi(e.target.value)} placeholder="1234567890" />
          <Label htmlFor="lastName">Last name (optional)</Label>
          <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Button className="w-full" onClick={lookup} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'View my payments'}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </p>
        )}

        {recipientName && (
          <div className="space-y-3">
            <p className="text-sm font-medium">{recipientName}</p>
            {payments.map((p) => (
              <div key={p.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">${p.amountUsd.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{p.dateOfPayment} · {p.natureOfPayment}</p>
                    <p className="text-[11px] text-muted-foreground">{p.manufacturer}</p>
                  </div>
                  {p.disputeWorkflowStatus && p.disputeWorkflowStatus !== 'none' && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {p.disputeWorkflowStatus}
                    </Badge>
                  )}
                </div>
                {(!p.disputeWorkflowStatus || p.disputeWorkflowStatus === 'none') && (
                  <>
                    <Textarea
                      placeholder="Describe what's incorrect…"
                      rows={2}
                      className="text-xs"
                      value={disputeReasons[p.id] || ''}
                      onChange={(e) => setDisputeReasons((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={submitting === p.id}
                      onClick={() => submitDispute(p)}
                    >
                      {submitting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dispute this payment'}
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
