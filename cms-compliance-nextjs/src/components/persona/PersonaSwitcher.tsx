'use client'

import { listPersonaGroups } from '@/lib/persona-navigation'
import { usePersona } from '@/context/PersonaContext'

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function PersonaSwitcher() {
  const { personaId, persona, switchPersona } = usePersona()
  const groups = listPersonaGroups()

  return (
    <div className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
      {Object.values(groups)
        .flat()
        .map((p) => {
          const active = p.id === personaId
          return (
            <button
              key={p.id}
              type="button"
              title={`${p.name} · ${p.role}`}
              onClick={() => switchPersona(p.id)}
              className={`flex items-center gap-1.5 rounded-full pl-0.5 pr-2 py-0.5 text-xs font-medium transition-all ${
                active ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <span
                className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                style={{ backgroundColor: p.color }}
              >
                {initials(p.name)}
              </span>
              <span className="hidden sm:inline">{p.tag}</span>
            </button>
          )
        })}
    </div>
  )
}
