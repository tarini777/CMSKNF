import type { UserRole } from '@/types/cms'

/** Dashboard surface areas — aligned with COM-TRANSP-001 workflows. */
export type DashboardTab =
  | 'dashboard'
  | 'upload'
  | 'review'
  | 'analytics'
  | 'open-payments'
  | 'glossary'
  | 'data-analysis'
  | 'rules'
  | 'monitoring'
  | 'audit'
  | 'lineage'
  | 'connectivity'
  | 'transparency'

export type PersonaAccess = 'owner' | 'viewer'

export interface PersonaTabDef {
  id: DashboardTab
  label: string
  shortLabel: string
  icon: string
  hub?: 'transparency' | 'lineage' | 'governance' | 'data'
}

export interface PersonaDefinition {
  id: string
  name: string
  tag: string
  role: string
  group: 'Compliance' | 'Data & Lineage' | 'Platform' | 'Leadership'
  color: string
  laneLine: string
  valueProp: string
  homeTab: DashboardTab
  /** Maps to RBAC role when auth is enabled */
  rbacRole: UserRole
  ownedTabs: DashboardTab[]
  viewerTabs: DashboardTab[]
  quickActions: Array<{ label: string; tab: DashboardTab; description?: string }>
}

export const DASHBOARD_TABS: PersonaTabDef[] = [
  { id: 'dashboard', label: 'Overview', shortLabel: 'Home', icon: 'BarChart3' },
  { id: 'upload', label: 'Ingest', shortLabel: 'Ingest', icon: 'Upload', hub: 'data' },
  { id: 'review', label: 'Review queue', shortLabel: 'Review', icon: 'FileCheck', hub: 'transparency' },
  { id: 'analytics', label: 'Analytics', shortLabel: 'Stats', icon: 'TrendingUp', hub: 'data' },
  { id: 'open-payments', label: 'CMS lookup', shortLabel: 'CMS', icon: 'Building2', hub: 'transparency' },
  { id: 'glossary', label: 'Glossary', shortLabel: 'Terms', icon: 'BookOpen', hub: 'transparency' },
  { id: 'data-analysis', label: 'Patterns', shortLabel: 'Patterns', icon: 'BarChart3', hub: 'data' },
  { id: 'rules', label: 'Policies', shortLabel: 'Rules', icon: 'Settings', hub: 'governance' },
  { id: 'monitoring', label: 'Integrations', shortLabel: 'APIs', icon: 'Activity', hub: 'governance' },
  { id: 'audit', label: 'Audit log', shortLabel: 'Audit', icon: 'Shield', hub: 'governance' },
  { id: 'lineage', label: 'Lineage', shortLabel: 'Lineage', icon: 'GitBranch', hub: 'lineage' },
  { id: 'connectivity', label: 'Global regimes', shortLabel: 'Global', icon: 'Database', hub: 'lineage' },
  { id: 'transparency', label: 'Submission', shortLabel: 'Submit', icon: 'Scale', hub: 'transparency' },
]

export const SHARED_HUBS = {
  transparency: {
    id: 'transparency',
    label: 'Transparency & Submission',
    ownerRole: 'Compliance / Regulatory Ops',
  },
  lineage: {
    id: 'lineage',
    label: 'Spend Lineage & Connectors',
    ownerRole: 'Data & Integration Ops',
  },
  governance: {
    id: 'governance',
    label: 'Rules & Platform Governance',
    ownerRole: 'IT / Platform Admin',
  },
  data: {
    id: 'data',
    label: 'Data Quality & Analytics',
    ownerRole: 'Data Analyst',
  },
} as const

export const PERSONAS: Record<string, PersonaDefinition> = {
  maria: {
    id: 'maria',
    name: 'Maria Chen',
    tag: 'COMP',
    role: 'Compliance Officer',
    group: 'Compliance',
    color: '#b5471f',
    laneLine: 'Approve reportability, steward disputes, and drive CMS attestation readiness',
    valueProp: 'Transform compliance from reactive burden into proactive advantage',
    homeTab: 'review',
    rbacRole: 'compliance_officer',
    ownedTabs: ['review', 'transparency', 'glossary', 'open-payments'],
    viewerTabs: ['dashboard', 'audit', 'analytics'],
    quickActions: [
      { label: 'Review queue', tab: 'review', description: 'Approve or reject flagged payments' },
      { label: 'Submission calendar', tab: 'transparency', description: 'Collect, attest, and dispute windows' },
      { label: 'Glossary', tab: 'glossary', description: 'Open Payments term lookup' },
    ],
  },
  derek: {
    id: 'derek',
    name: 'Derek Walsh',
    tag: 'DATA',
    role: 'Data Analyst',
    group: 'Data & Lineage',
    color: '#2b4f7a',
    laneLine: 'Ingest source feeds, resolve dedup clusters, and improve data quality scores',
    valueProp: 'Unlock compliance data with ML insights and lineage traceability',
    homeTab: 'lineage',
    rbacRole: 'data_analyst',
    ownedTabs: ['upload', 'lineage', 'data-analysis', 'analytics', 'connectivity'],
    viewerTabs: ['dashboard', 'review', 'glossary'],
    quickActions: [
      { label: 'Upload batch', tab: 'upload', description: 'CSV or connector-sourced spend' },
      { label: 'Dedup clusters', tab: 'lineage', description: 'Cross-source Concur + Cvent collisions' },
      { label: 'Pattern analysis', tab: 'data-analysis', description: 'Anomalies and reportability trends' },
    ],
  },
  sam: {
    id: 'sam',
    name: 'Sam Ortiz',
    tag: 'IT',
    role: 'Platform Administrator',
    group: 'Platform',
    color: '#7d8896',
    laneLine: 'Operate connectors, rules engine, monitoring, and audit replay infrastructure',
    valueProp: 'Cloud-native reliability with full API and lineage observability',
    homeTab: 'monitoring',
    rbacRole: 'admin',
    ownedTabs: ['rules', 'monitoring', 'audit', 'lineage', 'connectivity'],
    viewerTabs: ['dashboard', 'transparency', 'glossary'],
    quickActions: [
      { label: 'Source connectors', tab: 'lineage', description: 'Concur, Cvent, Veeva, vendor feeds' },
      { label: 'Company rules', tab: 'rules', description: 'Policy overlays on CMS engine' },
      { label: 'API health', tab: 'monitoring', description: 'External integration status' },
    ],
  },
  priya: {
    id: 'priya',
    name: 'Priya Mehta',
    tag: 'EXEC',
    role: 'Executive Leadership',
    group: 'Leadership',
    color: '#2f6b3d',
    laneLine: 'Monitor compliance KPIs, program-year milestones, and organizational risk posture',
    valueProp: '40% cost reduction with audit-ready transparency reporting',
    homeTab: 'dashboard',
    rbacRole: 'executive',
    ownedTabs: ['dashboard', 'analytics'],
    viewerTabs: ['transparency', 'audit', 'open-payments'],
    quickActions: [
      { label: 'Executive KPIs', tab: 'dashboard', description: 'Quality, volume, compliance score' },
      { label: 'Program calendar', tab: 'transparency', description: 'US Open Payments annual cycle' },
      { label: 'Trend analytics', tab: 'analytics', description: 'Reportability and anomaly trends' },
    ],
  },
  tomas: {
    id: 'tomas',
    name: 'Tomas Reyes',
    tag: 'REG',
    role: 'Regulatory Operations',
    group: 'Compliance',
    color: '#6a3d6e',
    laneLine: 'Validate rule citations, jurisdiction overlays, and CMS export readiness',
    valueProp: 'Explainable findings with 42 CFR and EFPIA regulatory basis',
    homeTab: 'transparency',
    rbacRole: 'compliance_officer',
    ownedTabs: ['transparency', 'glossary', 'open-payments', 'audit'],
    viewerTabs: ['review', 'lineage', 'dashboard'],
    quickActions: [
      { label: 'Rules & export', tab: 'transparency', description: 'Submission timeline and attestation' },
      { label: 'Checklist', tab: 'transparency', description: 'Portal prep tasks' },
      { label: 'Audit trail', tab: 'audit', description: 'Decision history' },
    ],
  },
}

export const DEFAULT_PERSONA_ID = 'maria'

export const PERSONA_URL_ALIASES: Record<string, string> = {
  compliance: 'maria',
  compliance_officer: 'maria',
  maria: 'maria',
  analyst: 'derek',
  data_analyst: 'derek',
  derek: 'derek',
  admin: 'sam',
  it: 'sam',
  sam: 'sam',
  executive: 'priya',
  exec: 'priya',
  priya: 'priya',
  regulatory: 'tomas',
  regops: 'tomas',
  tomas: 'tomas',
}

export function resolvePersonaId(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_PERSONA_ID
  const key = raw.toLowerCase().trim()
  return PERSONA_URL_ALIASES[key] || (PERSONAS[key] ? key : DEFAULT_PERSONA_ID)
}

export function getPersona(id: string): PersonaDefinition {
  return PERSONAS[resolvePersonaId(id)]
}

export function personaForRole(role: UserRole): string {
  const match = Object.values(PERSONAS).find((p) => p.rbacRole === role)
  return match?.id ?? DEFAULT_PERSONA_ID
}
