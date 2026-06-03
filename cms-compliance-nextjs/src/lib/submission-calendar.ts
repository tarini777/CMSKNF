/**
 * CMS Open Payments dispute workflow + submission calendar (REQ-013, REQ-016–018).
 */

export interface SubmissionMilestone {
  id: string
  jurisdiction: string
  title: string
  startDate: string
  endDate: string
  description: string
  actionRequired: string
}

export function getSubmissionCalendar(programYear: number): SubmissionMilestone[] {
  const y = programYear
  const next = y + 1
  return [
    {
      id: 'us_collection',
      jurisdiction: 'US',
      title: 'Data collection period',
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      description: 'Collect all payments and transfers of value for calendar year',
      actionRequired: 'Ensure all sources feed Payment Capture API',
    },
    {
      id: 'us_submission',
      jurisdiction: 'US',
      title: 'CMS Open Payments submission window',
      startDate: `${next}-02-01`,
      endDate: `${next}-03-31`,
      description: 'Submit data to CMS Open Payments (bulk CSV upload)',
      actionRequired: 'Export CMS-formatted CSV and upload to CMS portal',
    },
    {
      id: 'us_dispute',
      jurisdiction: 'US',
      title: 'HCP 45-day dispute review period',
      startDate: `${next}-04-01`,
      endDate: `${next}-05-15`,
      description: 'Physicians review and dispute reported data before publication',
      actionRequired: 'Monitor dispute workflow; resolve corrections with audit trail',
    },
    {
      id: 'us_publication',
      jurisdiction: 'US',
      title: 'CMS public publication',
      startDate: `${next}-06-30`,
      endDate: `${next}-06-30`,
      description: 'Final data published on Open Payments website',
      actionRequired: 'Verify attestation completed on CMS portal',
    },
    {
      id: 'fr_h1',
      jurisdiction: 'FR',
      title: 'France H1 submission (Loi Bertrand)',
      startDate: `${y}-07-01`,
      endDate: `${y}-09-01`,
      description: 'Submit Jan–Jun data to Transparence Santé',
      actionRequired: 'Register agreements and benefits ≥ €10',
    },
    {
      id: 'fr_h2',
      jurisdiction: 'FR',
      title: 'France H2 submission',
      startDate: `${next}-01-01`,
      endDate: `${next}-03-01`,
      description: 'Submit Jul–Dec data to Transparence Santé',
      actionRequired: 'Complete one-key / BDPM portal submission',
    },
    {
      id: 'efpia_publication',
      jurisdiction: 'EU/UK',
      title: 'EFPIA / Disclosure UK publication deadline',
      startDate: `${next}-06-01`,
      endDate: `${next}-06-30`,
      description: 'Publish individual + aggregate disclosure reports',
      actionRequired: 'Apply consent-based individual vs aggregate splits',
    },
  ]
}

export type DisputeStatus = 'none' | 'under_review' | 'disputed' | 'corrected' | 'resolved'

export interface DisputeTransition {
  from: DisputeStatus
  to: DisputeStatus
  allowed: boolean
  requiresReason: boolean
}

const DISPUTE_TRANSITIONS: DisputeTransition[] = [
  { from: 'none', to: 'under_review', allowed: true, requiresReason: false },
  { from: 'under_review', to: 'disputed', allowed: true, requiresReason: true },
  { from: 'disputed', to: 'corrected', allowed: true, requiresReason: true },
  { from: 'corrected', to: 'resolved', allowed: true, requiresReason: false },
  { from: 'disputed', to: 'resolved', allowed: true, requiresReason: true },
]

export function canTransitionDispute(from: DisputeStatus, to: DisputeStatus): DisputeTransition | null {
  return DISPUTE_TRANSITIONS.find((t) => t.from === from && t.to === to) || null
}

export interface AttestationChecklistItem {
  id: string
  label: string
  required: boolean
  completed: boolean
  description: string
}

export function buildAttestationChecklist(stats: {
  totalRecords: number
  reportableRecords: number
  disputedRecords: number
  unresolvedDisputes: number
  exportGenerated: boolean
}): AttestationChecklistItem[] {
  return [
    {
      id: 'data_complete',
      label: 'All program-year payments captured',
      required: true,
      completed: stats.totalRecords > 0,
      description: 'Verify all payment sources integrated',
    },
    {
      id: 'reportable_reviewed',
      label: 'Reportable records reviewed and approved',
      required: true,
      completed: stats.reportableRecords > 0,
      description: 'Human-in-the-loop review completed',
    },
    {
      id: 'disputes_resolved',
      label: 'All disputes resolved before publication',
      required: true,
      completed: stats.unresolvedDisputes === 0,
      description: 'No open disputes during 45-day review window',
    },
    {
      id: 'cms_export',
      label: 'CMS Open Payments CSV export generated',
      required: true,
      completed: stats.exportGenerated,
      description: 'Validate against CMS data dictionary',
    },
    {
      id: 'manual_attestation',
      label: 'Manual attestation on CMS portal',
      required: true,
      completed: false,
      description: 'Legal representative must attest on cms.gov — cannot be automated',
    },
  ]
}
