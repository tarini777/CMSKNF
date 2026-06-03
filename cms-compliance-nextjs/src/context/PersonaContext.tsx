'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  personaForRole,
  resolvePersonaId,
  type DashboardTab,
  type PersonaDefinition,
} from '@/config/personas'
import {
  canAccessTab,
  homeTabForPersona,
} from '@/lib/persona-navigation'

const STORAGE_KEY = 'cmsknf_active_persona'

interface PersonaContextValue {
  personaId: string
  persona: PersonaDefinition
  activeTab: DashboardTab
  setActiveTab: (tab: DashboardTab) => void
  switchPersona: (personaId: string) => void
  syncPersonaFromRole: (role: string) => void
}

const PersonaContext = createContext<PersonaContextValue | null>(null)

function readStoredPersona(): string {
  if (typeof window === 'undefined') return DEFAULT_PERSONA_ID
  try {
    return resolvePersonaId(localStorage.getItem(STORAGE_KEY) || DEFAULT_PERSONA_ID)
  } catch {
    return DEFAULT_PERSONA_ID
  }
}

function readTabFromUrl(): DashboardTab | null {
  if (typeof window === 'undefined') return null
  const tab = new URLSearchParams(window.location.search).get('tab')
  return tab as DashboardTab | null
}

function readPersonaFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('persona')
  return raw ? resolvePersonaId(raw) : null
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID)
  const [activeTab, setActiveTabState] = useState<DashboardTab>('dashboard')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const fromUrl = readPersonaFromUrl()
    const stored = readStoredPersona()
    const id = fromUrl || stored
    const tabFromUrl = readTabFromUrl()
    const home = homeTabForPersona(id)
    const tab = tabFromUrl && canAccessTab(id, tabFromUrl) ? tabFromUrl : home

    setPersonaId(id)
    setActiveTabState(tab)
    setHydrated(true)
  }, [])

  const setActiveTab = useCallback(
    (tab: DashboardTab) => {
      if (!canAccessTab(personaId, tab)) return
      setActiveTabState(tab)
    },
    [personaId]
  )

  const switchPersona = useCallback((nextRaw: string) => {
    const next = resolvePersonaId(nextRaw)
    const home = homeTabForPersona(next)
    setPersonaId(next)
    setActiveTabState(home)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  const syncPersonaFromRole = useCallback(
    (role: string) => {
      switchPersona(personaForRole(role as PersonaDefinition['rbacRole']))
    },
    [switchPersona]
  )

  useEffect(() => {
    if (!hydrated) return
    if (!canAccessTab(personaId, activeTab)) {
      setActiveTabState(homeTabForPersona(personaId))
    }
  }, [hydrated, personaId, activeTab])

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return
    const url = new URL(window.location.href)
    url.searchParams.set('persona', personaId)
    url.searchParams.set('tab', activeTab)
    window.history.replaceState({}, '', url.toString())
  }, [hydrated, personaId, activeTab])

  const value = useMemo(
    () => ({
      personaId,
      persona: getPersona(personaId),
      activeTab,
      setActiveTab,
      switchPersona,
      syncPersonaFromRole,
    }),
    [personaId, activeTab, setActiveTab, switchPersona, syncPersonaFromRole]
  )

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Loading workbench…
      </div>
    )
  }

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
}

export function usePersona(): PersonaContextValue {
  const ctx = useContext(PersonaContext)
  if (!ctx) {
    throw new Error('usePersona must be used within PersonaProvider')
  }
  return ctx
}
