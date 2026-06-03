'use client'

import { Badge } from '@/components/ui/badge'
import type { RecordRuleCitations } from '@/lib/rule-citation-service'

interface AppliedRulesPanelProps {
  citations?: RecordRuleCitations | null
}

export default function AppliedRulesPanel({ citations }: AppliedRulesPanelProps) {
  if (!citations?.resolvedRules.length) {
    return null
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Applied rules</p>
      <ul className="space-y-1.5">
        {citations.resolvedRules.slice(0, 6).map((rule) => (
          <li key={rule.ruleId} className="flex items-center gap-2 text-xs">
            <span
              className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                rule.result === 'reportable' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <span className="font-medium truncate flex-1">{rule.name}</span>
            <Badge variant="outline" className="text-[9px] font-mono shrink-0">
              {rule.cfrSection || 'CMS'}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  )
}
