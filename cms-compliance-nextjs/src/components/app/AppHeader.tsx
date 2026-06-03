'use client'

import { getActiveProgramYear } from '@/lib/submission-calendar'
import AuthHeader from '@/components/AuthHeader'
import PersonaSwitcher from '@/components/persona/PersonaSwitcher'
import { usePersona } from '@/context/PersonaContext'
import { Badge } from '@/components/ui/badge'

export default function AppHeader() {
  const { persona } = usePersona()
  const programYear = getActiveProgramYear()

  return (
    <header className="shrink-0 h-14 border-b bg-card flex items-center justify-between gap-3 px-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            KNF
          </div>
          <div className="leading-tight hidden sm:block">
            <p className="text-sm font-semibold">Open Payments</p>
            <p className="text-[10px] text-muted-foreground">Compliance workspace</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-normal tabular-nums">
          PY {programYear}
        </Badge>
      </div>

      <PersonaSwitcher />

      <div className="flex items-center gap-2 shrink-0">
        <span
          className="hidden lg:inline text-xs text-muted-foreground truncate max-w-[140px]"
          style={{ color: persona.color }}
        >
          {persona.name}
        </span>
        <AuthHeader />
        <a href="/hcp-review" target="_blank" className="hidden sm:inline text-[10px] text-muted-foreground hover:text-foreground">
          HCP portal
        </a>
        <a href="/disclosure" target="_blank" className="hidden sm:inline text-[10px] text-muted-foreground hover:text-foreground">
          Disclosure
        </a>
      </div>
    </header>
  )
}
