import {
  DASHBOARD_TABS,
  PERSONAS,
  SHARED_HUBS,
  type DashboardTab,
  type PersonaAccess,
  type PersonaDefinition,
  resolvePersonaId,
} from '@/config/personas'

export type VisiblePersonaTab = (typeof DASHBOARD_TABS)[number] & { access: PersonaAccess }

export function tabAccessLevel(personaId: string, tabId: DashboardTab): PersonaAccess | null {
  const persona = PERSONAS[resolvePersonaId(personaId)]
  if (!persona) return null
  if (persona.ownedTabs.includes(tabId)) return 'owner'
  if (persona.viewerTabs.includes(tabId)) return 'viewer'
  if (persona.rbacRole === 'admin') return 'owner'
  return null
}

export function canAccessTab(personaId: string, tabId: DashboardTab): boolean {
  return tabAccessLevel(personaId, tabId) != null
}

export function getVisibleTabs(personaId: string): VisiblePersonaTab[] {
  const persona = PERSONAS[resolvePersonaId(personaId)]
  if (!persona) return DASHBOARD_TABS.map((tab) => ({ ...tab, access: 'viewer' as PersonaAccess }))

  return DASHBOARD_TABS.filter((t) => canAccessTab(personaId, t.id)).map((tab) => ({
    ...tab,
    access: tabAccessLevel(personaId, tab.id)!,
  }))
}

export function getNavGroups(personaId: string) {
  const visible = getVisibleTabs(personaId)
  const owned = visible.filter((t) => t.access === 'owner')
  const viewOnly = visible.filter((t) => t.access === 'viewer')

  const groups: Array<{ group: string; hint?: string; items: typeof visible }> = []

  if (owned.length) {
    groups.push({ group: 'Your workbench', items: owned })
  }
  if (viewOnly.length) {
    groups.push({
      group: 'Read-only',
      hint: 'Monitor without operational ownership',
      items: viewOnly,
    })
  }

  return groups
}

export function homeTabForPersona(personaId: string): DashboardTab {
  return PERSONAS[resolvePersonaId(personaId)]?.homeTab ?? 'dashboard'
}

export function hubNavForPersona(personaId: string) {
  const persona = PERSONAS[resolvePersonaId(personaId)]
  if (!persona) return []

  const hubAccess = new Map<string, PersonaAccess>()

  for (const tab of [...persona.ownedTabs, ...persona.viewerTabs]) {
    const def = DASHBOARD_TABS.find((t) => t.id === tab)
    if (!def?.hub) continue
    const level = persona.ownedTabs.includes(tab) ? 'owner' : 'viewer'
    const existing = hubAccess.get(def.hub)
    if (!existing || (existing === 'viewer' && level === 'owner')) {
      hubAccess.set(def.hub, level as PersonaAccess)
    }
  }

  const ownedHubs: Array<{ hubId: string; label: string; access: PersonaAccess; ownerRole: string }> = []
  const viewHubs: typeof ownedHubs = []

  hubAccess.forEach((access, hubId) => {
    const hub = SHARED_HUBS[hubId as keyof typeof SHARED_HUBS]
    if (!hub) return
    const entry = { hubId, label: hub.label, access, ownerRole: hub.ownerRole }
    if (access === 'owner') ownedHubs.push(entry)
    else viewHubs.push(entry)
  })

  return { ownedHubs, viewHubs }
}

export function buildHubContext(
  personaId: string,
  tabId: DashboardTab
): { title: string; blurb: string; action: string; access: PersonaAccess } | null {
  const level = tabAccessLevel(personaId, tabId)
  if (!level) return null

  const tab = DASHBOARD_TABS.find((t) => t.id === tabId)
  if (!tab?.hub) return null

  const hub = SHARED_HUBS[tab.hub]
  const ownerAction =
    tab.hub === 'transparency'
      ? 'Drive review, attestation, and CMS export for the active program year'
      : tab.hub === 'lineage'
        ? 'Ingest feeds, trace spend events, and resolve dedup clusters'
        : tab.hub === 'governance'
          ? 'Configure rules, monitor APIs, and export audit trails'
          : 'Upload batches and analyze data quality patterns'

  const viewerAction =
    tab.hub === 'transparency'
      ? 'Monitor submission status — operational changes sit with Compliance'
      : tab.hub === 'lineage'
        ? 'View lineage health — connector changes sit with Data/IT'
        : tab.hub === 'governance'
          ? 'Read-only platform view — contact IT for configuration'
          : 'View analytics — data ingestion owned by Data Ops'

  return {
    title: hub.label,
    access: level,
    blurb: tab.label,
    action: level === 'owner' ? ownerAction : viewerAction,
  }
}

export function governanceEscalationHints(): Array<{ tag: string; name: string; for: string }> {
  return [
    { tag: PERSONAS.maria.tag, name: PERSONAS.maria.name, for: 'Record review & disputes' },
    { tag: PERSONAS.tomas.tag, name: PERSONAS.tomas.name, for: 'Regulatory export & attestation' },
    { tag: PERSONAS.sam.tag, name: PERSONAS.sam.name, for: 'Connectors & platform health' },
  ]
}

export function listPersonaGroups(): Record<PersonaDefinition['group'], PersonaDefinition[]> {
  const groups: Record<PersonaDefinition['group'], PersonaDefinition[]> = {
    Compliance: [],
    'Data & Lineage': [],
    Platform: [],
    Leadership: [],
  }
  Object.values(PERSONAS).forEach((p) => groups[p.group].push(p))
  return groups
}
