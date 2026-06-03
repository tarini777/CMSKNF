'use client'

import { usePersona } from '@/context/PersonaContext'
import { getVisibleTabs } from '@/lib/persona-navigation'
import type { DashboardMetrics } from '@/types/cms'

function fmt(n: number) {
  return new Intl.NumberFormat().format(n)
}

function insightPills(
  personaId: string,
  m: DashboardMetrics
): Array<{ label: string; value: string; warn?: boolean }> {
  switch (personaId) {
    case 'maria':
    case 'tomas':
      return [
        { label: 'Queue', value: fmt(m.pendingReview), warn: m.pendingReview > 0 },
        { label: 'Reportable', value: fmt(m.reportableCount) },
        { label: 'Score', value: `${m.complianceScore.toFixed(0)}%` },
      ]
    case 'derek':
      return [
        { label: 'Records', value: fmt(m.recordsProcessed) },
        { label: 'Quality', value: `${m.dataQualityScore.toFixed(0)}%` },
        { label: 'Errors', value: fmt(m.validationErrors), warn: m.validationErrors > 0 },
      ]
    case 'sam':
      return [
        { label: 'Rules', value: fmt(m.regulatoryRules) },
        { label: 'Errors', value: `${m.errorRate.toFixed(1)}%`, warn: m.errorRate > 0 },
        { label: 'Sessions', value: fmt(m.sessionCount) },
      ]
    case 'priya':
      return [
        { label: 'Score', value: `${m.complianceScore.toFixed(0)}%` },
        { label: 'Volume', value: fmt(m.recordsProcessed) },
        { label: 'Queue', value: fmt(m.pendingReview) },
      ]
    default:
      return [
        { label: 'Records', value: fmt(m.recordsProcessed) },
        { label: 'Score', value: `${m.complianceScore.toFixed(0)}%` },
      ]
  }
}

export default function PersonaInsightsStrip({ metrics }: { metrics: DashboardMetrics | null }) {
  const { persona, personaId, activeTab } = usePersona()
  const pills = metrics ? insightPills(persona.id, metrics) : []

  const tabMeta = getVisibleTabs(personaId).find((t) => t.id === activeTab)
  const activeLabel = tabMeta?.label ?? 'Overview'

  return (
    <div className="shrink-0 h-11 border-b bg-muted/40 px-4 flex items-center gap-3 overflow-hidden">
      <span className="text-xs font-medium capitalize truncate">{activeLabel}</span>
      <span className="text-muted-foreground/50">|</span>
      {metrics ? (
        <div className="flex items-center gap-2 min-w-0">
          {pills.map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs tabular-nums shrink-0 ${
                p.warn ? 'bg-amber-100 text-amber-900' : 'bg-background border'
              }`}
            >
              <span className="text-muted-foreground">{p.label}</span>
              <span className="font-semibold">{p.value}</span>
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Loading…</span>
      )}
    </div>
  )
}
