'use client'

import type { ComponentType } from 'react'
import {
  BarChart3,
  Upload,
  FileCheck,
  TrendingUp,
  Building2,
  BookOpen,
  Settings,
  Activity,
  Shield,
  GitBranch,
  Database,
  Scale,
} from 'lucide-react'
import { usePersona } from '@/context/PersonaContext'
import { getVisibleTabs } from '@/lib/persona-navigation'
import type { DashboardTab } from '@/config/personas'

const ICONS: Record<DashboardTab, ComponentType<{ className?: string }>> = {
  dashboard: BarChart3,
  upload: Upload,
  review: FileCheck,
  analytics: TrendingUp,
  'open-payments': Building2,
  glossary: BookOpen,
  'data-analysis': BarChart3,
  rules: Settings,
  monitoring: Activity,
  audit: Shield,
  lineage: GitBranch,
  connectivity: Database,
  transparency: Scale,
}

export default function AppMobileNav() {
  const { personaId, activeTab, setActiveTab } = usePersona()
  const tabs = getVisibleTabs(personaId).slice(0, 5)

  return (
    <nav className="md:hidden shrink-0 border-t bg-card flex items-stretch justify-around safe-area-pb">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.id]
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] ${
              active ? 'text-primary font-medium' : 'text-muted-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="truncate max-w-[4rem]">{tab.shortLabel ?? tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
