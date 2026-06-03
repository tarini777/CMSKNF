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

export default function AppNavRail() {
  const { personaId, activeTab, setActiveTab } = usePersona()
  const tabs = getVisibleTabs(personaId)

  return (
    <nav className="hidden md:flex w-[4.5rem] shrink-0 flex-col items-center gap-1 border-r bg-card py-3">
      {tabs.map((tab) => {
        const Icon = ICONS[tab.id]
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            title={tab.label}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg text-[10px] gap-1 transition-colors ${
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="leading-none max-w-[3.25rem] truncate px-0.5">{tab.shortLabel ?? tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
