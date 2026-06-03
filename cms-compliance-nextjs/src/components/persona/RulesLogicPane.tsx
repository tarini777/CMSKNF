'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePersona } from '@/context/PersonaContext'
import { ruleIdsForTab } from '@/lib/tab-rules'
import { getImplementedTransparencyRuleIds } from '@/lib/rule-registry'
import { getVisibleTabs } from '@/lib/persona-navigation'

interface RegistryRule {
  id: string
  name: string
  regulatoryBasis: string
  cfrSection?: string
  result: string
}

const MAX = 5

function resultDot(result: string) {
  if (result === 'reportable') return 'bg-emerald-500'
  if (result === 'non_reportable') return 'bg-slate-400'
  return 'bg-amber-400'
}

export default function RulesLogicPane() {
  const { activeTab, personaId } = usePersona()
  const [registry, setRegistry] = useState<RegistryRule[]>([])

  useEffect(() => {
    fetch('/api/transparency/rules')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setRegistry(d.data.implemented ?? [])
      })
      .catch(() => {})
  }, [])

  const tabLabel = getVisibleTabs(personaId).find((t) => t.id === activeTab)?.label ?? 'Workspace'

  const rules = useMemo(() => {
    const ids = ruleIdsForTab(activeTab)
    const byId = new Map(registry.map((r) => [r.id, r]))
    const out: RegistryRule[] = []
    for (const id of ids) {
      if (out.length >= MAX) break
      const hit = byId.get(id)
      if (hit) out.push(hit)
    }
    if (out.length < MAX) {
      for (const id of getImplementedTransparencyRuleIds()) {
        if (out.length >= MAX) break
        if (out.some((r) => r.id === id)) continue
        const hit = byId.get(id)
        if (hit) out.push(hit)
      }
    }
    return out.slice(0, MAX)
  }, [activeTab, registry])

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col border-l bg-muted/20 overflow-hidden h-full">
      <div className="shrink-0 px-3 py-2.5 border-b">
        <p className="text-xs font-semibold">Rules</p>
        <p className="text-[10px] text-muted-foreground truncate">{tabLabel}</p>
      </div>
      <ul className="flex-1 px-3 py-2 space-y-1.5 overflow-hidden min-h-0">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-start gap-2 rounded-md bg-background/80 border px-2 py-1.5"
          >
            <span className={`mt-1 h-1.5 w-1.5 rounded-full shrink-0 ${resultDot(rule.result)}`} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium truncate">{rule.name}</p>
              <p className="text-[10px] text-muted-foreground truncate font-mono">
                {rule.cfrSection || rule.regulatoryBasis.split('—')[0].trim()}
              </p>
            </div>
          </li>
        ))}
        {rules.length === 0 && <li className="text-[11px] text-muted-foreground px-1">…</li>}
      </ul>
    </aside>
  )
}
