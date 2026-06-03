'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'

interface DisclosureReport {
  programYear: string
  individual: Array<{
    recipientName: string
    amountUsd: number
    natureOfPayment?: string
    jurisdiction: string
  }>
  aggregate: Array<{
    label: string
    recipientCount: number
    totalUsd: number
  }>
  summary: {
    individualCount: number
    individualTotalUsd: number
    aggregateTotalUsd: number
  }
}

export default function DisclosurePage() {
  const programYear = getActiveProgramYear()
  const [report, setReport] = useState<DisclosureReport | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/disclosure?programYear=${programYear}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setReport(d.data)
      })
      .finally(() => setLoading(false))
  }, [programYear])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="font-semibold">Transparency Disclosure</p>
            <p className="text-xs text-muted-foreground">Program year {programYear}</p>
          </div>
          <Link href="/" className="text-xs text-primary underline">
            Internal workspace
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : report ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Stat label="Individual payments" value={String(report.summary.individualCount)} />
              <Stat label="Individual total" value={`$${report.summary.individualTotalUsd.toLocaleString()}`} />
              <Stat label="Aggregate total" value={`$${report.summary.aggregateTotalUsd.toLocaleString()}`} />
            </div>

            <section>
              <h2 className="text-sm font-semibold mb-3">Individual disclosure (US / consented EU)</h2>
              <div className="space-y-2">
                {report.individual.slice(0, 50).map((row, i) => (
                  <div key={i} className="flex justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                    <span className="truncate">{row.recipientName}</span>
                    <span className="tabular-nums shrink-0">${row.amountUsd.toLocaleString()}</span>
                  </div>
                ))}
                {report.individual.length > 50 && (
                  <p className="text-xs text-muted-foreground">+ {report.individual.length - 50} more</p>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold mb-3">Aggregate disclosure (no consent / R&D)</h2>
              <div className="space-y-2">
                {report.aggregate.map((bucket) => (
                  <div key={bucket.label} className="rounded-lg border px-3 py-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-sm font-medium">{bucket.label}</p>
                      <Badge variant="secondary" className="text-[10px]">Aggregate</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bucket.recipientCount} recipients · ${bucket.totalUsd.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No disclosure data available.</p>
        )}
      </main>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}
