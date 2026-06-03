/**
 * CMS Open Payments dispute workflow + submission calendar (REQ-013, REQ-016–018).
 * US dates align with CMS Open Payments program-year timeline:
 * https://openpaymentsdata.cms.gov/about
 * https://www.cms.gov/openpayments/program-participants/reporting-entities/data-submission-and-attestation
 */

export interface SubmissionMilestoneLink {
  label: string
  url: string
}

export interface SubmissionMilestone {
  id: string
  jurisdiction: string
  phase: string
  title: string
  startDate: string
  endDate: string
  description: string
  actionRequired: string
  responsibleParty?: string
  details?: string[]
  cmsReference?: string
  links?: SubmissionMilestoneLink[]
  /** CMS-marked anticipated dates (e.g. June publication) */
  anticipated?: boolean
  sortOrder: number
}

export const OPEN_PAYMENTS_LINKS: SubmissionMilestoneLink[] = [
  { label: 'CMS Open Payments — About', url: 'https://openpaymentsdata.cms.gov/about' },
  {
    label: 'Data submission & attestation (CMS.gov)',
    url: 'https://www.cms.gov/openpayments/program-participants/reporting-entities/data-submission-and-attestation',
  },
  {
    label: 'Reporting entity resources',
    url: 'https://www.cms.gov/priorities/key-initiatives/open-payments/resources/reporting-entitities',
  },
  {
    label: 'Open Payments API & data',
    url: 'https://openpaymentsdata.cms.gov/about/api',
  },
]

export interface UsCalendarSummary {
  programYear: number
  reportingDeadline: string
  publicationDate: string
  submissionWindow: string
  disputeWindow: string
  correctionWindow: string
  coveredRecipients: string[]
  fileTypes: string[]
}

function usMilestones(programYear: number): SubmissionMilestone[] {
  const y = programYear
  const next = y + 1

  return [
    {
      id: 'us_collection',
      jurisdiction: 'US',
      phase: 'Collect',
      title: 'Program year data collection',
      startDate: `${y}-01-01`,
      endDate: `${y}-12-31`,
      description: `Capture all payments and transfers of value made during calendar year ${y}.`,
      actionRequired: 'Route Concur, CRM, vendor, and AP feeds into lineage; resolve dedup clusters before export.',
      responsibleParty: 'Compliance + data stewards',
      details: [
        'Program year runs January 1 through December 31.',
        'Reportable to physicians, non-physician practitioners (NP, PA, CRNA, CNS, CNM), and teaching hospitals.',
        'Include prior-year unreported payments if discovered during remediation.',
        'CMS disallows deletions without substantiated reason — use change_type corrections instead.',
      ],
      cmsReference: '42 CFR Part 403 — Sunshine Act reporting',
      links: OPEN_PAYMENTS_LINKS,
      sortOrder: 1,
    },
    {
      id: 'us_registration',
      jurisdiction: 'US',
      phase: 'Prepare',
      title: 'Open Payments System registration & recertification',
      startDate: `${next}-01-01`,
      endDate: `${next}-01-31`,
      description: 'Register or recertify applicable manufacturer / applicable GPO accounts in the CMS Open Payments System (OPS).',
      actionRequired: 'Confirm OPS user roles (submitter, attester); verify entity profile before Feb 1 submission window.',
      responsibleParty: 'Registration administrator',
      details: [
        'Reporting entities must have vetted CMS credentials before data submission.',
        'Assign separate submitter and attester roles where required by internal controls.',
        'Download current teaching hospital list for the program year from CMS resources.',
      ],
      links: [
        {
          label: 'Registration & submission tutorial (PDF)',
          url: 'https://www.cms.gov/files/document/tutorial-op-amgpo-registration-submission-january-2026.pdf',
        },
        ...OPEN_PAYMENTS_LINKS,
      ],
      sortOrder: 2,
    },
    {
      id: 'us_test_upload',
      jurisdiction: 'US',
      phase: 'Submit',
      title: 'Test file validation (optional)',
      startDate: `${next}-02-01`,
      endDate: `${next}-03-31`,
      description: 'Upload a test file to OPS to validate CSV formatting before final submission.',
      actionRequired: 'Export general / research / ownership PUF files from this platform; fix CMS error report before production upload.',
      responsibleParty: 'Data operations',
      details: [
        'OPS accepts character-delimited CSV bulk upload or manual record entry.',
        'Test uploads produce an error report for column headers, data types, and mapping issues.',
        'Validate against the Jan 2025 Submission Data Mapping document (91 general payment fields).',
      ],
      links: OPEN_PAYMENTS_LINKS,
      sortOrder: 3,
    },
    {
      id: 'us_submission',
      jurisdiction: 'US',
      phase: 'Submit',
      title: 'CMS Open Payments data submission window',
      startDate: `${next}-02-01`,
      endDate: `${next}-03-31`,
      description: `Submit program year ${y} data to CMS — general payments, research payments, and ownership/investment interests.`,
      actionRequired: 'Upload attested-ready CSV to OPS; include delay-in-publication and third-party indicators where applicable.',
      responsibleParty: 'Compliance submitter',
      details: [
        'Submission window: February 1 through March 31.',
        'Three submission file types: General Payments, Research Payments, Ownership & Investment.',
        'Prior program-year records may be edited or added during this window.',
        'Notify attester when records reach attestation-ready status in OPS.',
      ],
      cmsReference: 'Reporting deadline: March 31 each year',
      links: OPEN_PAYMENTS_LINKS,
      sortOrder: 4,
    },
    {
      id: 'us_attestation',
      jurisdiction: 'US',
      phase: 'Attest',
      title: 'Final submission attestation',
      startDate: `${next}-02-01`,
      endDate: `${next}-03-31`,
      description: 'Legal representative attests to timeliness, accuracy, and completeness of all submitted program-year data.',
      actionRequired: 'Complete manual attestation on CMS portal by March 31 — cannot be automated from this platform.',
      responsibleParty: 'Authorized attester (legal/compliance officer)',
      details: [
        'Attestation applies to the full program year, not individual files or payment types.',
        'Optional assumptions statement may explain methodologies (e.g., per-meal allocation).',
        'Re-attestation required if any attested record, delay indicator, or deletion changes.',
        'Submissions not attested by March 31 are late and may incur civil monetary penalties.',
      ],
      cmsReference: 'Reporting is complete only when official attestation is received',
      links: OPEN_PAYMENTS_LINKS,
      sortOrder: 5,
    },
    {
      id: 'us_dispute',
      jurisdiction: 'US',
      phase: 'Review',
      title: 'Covered recipient review & dispute period (main window)',
      startDate: `${next}-04-01`,
      endDate: `${next}-05-15`,
      description: 'Physicians, NPPs, and teaching hospitals review reported data and initiate disputes in OPS.',
      actionRequired: 'Monitor dispute workflow; apply corrections with audit trail and change_type before May 15 cutoff for June publication.',
      responsibleParty: 'Compliance dispute coordinator',
      details: [
        'Review and dispute activities begin April 1 and may continue through the calendar year.',
        'May 15 is the cutoff for disputes/corrections to appear in the June data publication.',
        'Use dispute_status_for_publication and platform dispute workflow (pending → disputed → corrected → resolved).',
        'Resolve cross-source dedup collisions before disputes to avoid duplicate HCP notifications.',
      ],
      anticipated: true,
      links: [
        {
          label: 'Review & dispute overview (CMS PDF)',
          url: 'https://www.cms.gov/openpayments/review-and-dispute',
        },
        ...OPEN_PAYMENTS_LINKS,
      ],
      sortOrder: 6,
    },
    {
      id: 'us_dispute_correction',
      jurisdiction: 'US',
      phase: 'Review',
      title: 'Additional dispute correction window',
      startDate: `${next}-05-16`,
      endDate: `${next}-05-30`,
      description: 'Final correction period for outstanding disputes before June publication.',
      actionRequired: 'Close remaining disputed records; re-attest if attested data changed.',
      responsibleParty: 'Compliance dispute coordinator',
      details: [
        'May 16–May 30 window for corrections on outstanding disputes only.',
        'Changes during this window may require re-attestation in OPS.',
      ],
      anticipated: true,
      sortOrder: 7,
    },
    {
      id: 'us_publication',
      jurisdiction: 'US',
      phase: 'Publish',
      title: 'CMS public data publication',
      startDate: `${next}-06-30`,
      endDate: `${next}-06-30`,
      description: `Program year ${y} attested data published on OpenPaymentsData.CMS.gov for public search and download.`,
      actionRequired: 'Verify publication matches attested export; archive submission batch and audit logs.',
      responsibleParty: 'Compliance + legal',
      details: [
        'Anticipated publication on or by June 30 each year.',
        'Published data reflects attested records as of dispute/correction cutoffs.',
        'Data available via CMS Open Payments public portal and API.',
      ],
      anticipated: true,
      links: [
        { label: 'Search published data', url: 'https://openpaymentsdata.cms.gov/' },
        ...OPEN_PAYMENTS_LINKS,
      ],
      sortOrder: 8,
    },
  ]
}

export function getActiveProgramYear(today: Date = new Date()): number {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  // Jan–Jun: CMS submission/dispute/publication cycle for prior calendar year
  if (month <= 6) return year - 1
  return year
}

export function getUsCalendarSummary(programYear: number): UsCalendarSummary {
  const next = programYear + 1
  return {
    programYear,
    submissionWindow: `February 1 – March 31, ${next}`,
    reportingDeadline: `March 31, ${next} (attestation required)`,
    disputeWindow: `April 1 – May 15, ${next}`,
    correctionWindow: `May 16 – May 30, ${next}`,
    publicationDate: `On or by June 30, ${next}`,
    coveredRecipients: [
      'Physicians',
      'Non-physician practitioners (NP, PA, CRNA/AA, CNS, CNM)',
      'Teaching hospitals',
    ],
    fileTypes: ['General Payments', 'Research Payments', 'Ownership & Investment Interests'],
  }
}

export function getSubmissionCalendar(programYear: number): SubmissionMilestone[] {
  const y = programYear
  const next = y + 1

  const international: SubmissionMilestone[] = [
    {
      id: 'fr_h1',
      jurisdiction: 'FR',
      phase: 'Submit',
      title: 'France H1 submission (Loi Bertrand)',
      startDate: `${y}-07-01`,
      endDate: `${y}-09-01`,
      description: 'Submit Jan–Jun data to Transparence Santé',
      actionRequired: 'Register agreements and benefits ≥ €10',
      sortOrder: 20,
    },
    {
      id: 'fr_h2',
      jurisdiction: 'FR',
      phase: 'Submit',
      title: 'France H2 submission',
      startDate: `${next}-01-01`,
      endDate: `${next}-03-01`,
      description: 'Submit Jul–Dec data to Transparence Santé',
      actionRequired: 'Complete one-key / BDPM portal submission',
      sortOrder: 21,
    },
    {
      id: 'efpia_publication',
      jurisdiction: 'EU/UK',
      phase: 'Publish',
      title: 'EFPIA / Disclosure UK publication deadline',
      startDate: `${next}-06-01`,
      endDate: `${next}-06-30`,
      description: 'Publish individual + aggregate disclosure reports',
      actionRequired: 'Apply consent-based individual vs aggregate splits',
      sortOrder: 22,
    },
  ]

  return [...usMilestones(y), ...international].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getUsSubmissionCalendar(programYear: number): SubmissionMilestone[] {
  return usMilestones(programYear)
}

export function getMilestoneStatus(
  milestone: SubmissionMilestone,
  today: Date = new Date()
): 'upcoming' | 'active' | 'past' {
  const todayStr = today.toISOString().slice(0, 10)
  if (todayStr < milestone.startDate) return 'upcoming'
  if (todayStr > milestone.endDate) return 'past'
  return 'active'
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
  nppesVerified?: boolean
  aggregatesCurrent?: boolean
  pufValidated?: boolean
}): AttestationChecklistItem[] {
  return [
    {
      id: 'data_complete',
      label: 'All program-year payments captured',
      required: true,
      completed: stats.totalRecords > 0,
      description: 'Verify all payment sources integrated (Jan 1 – Dec 31 program year)',
    },
    {
      id: 'reportable_reviewed',
      label: 'Reportable records reviewed and approved',
      required: true,
      completed: stats.reportableRecords > 0,
      description: 'Human-in-the-loop review completed before OPS upload',
    },
    {
      id: 'disputes_resolved',
      label: 'Disputes resolved before June publication cutoffs',
      required: true,
      completed: stats.unresolvedDisputes === 0,
      description: 'No open disputes after May 15 / May 30 correction windows',
    },
    {
      id: 'nppes_verified',
      label: 'NPI identity verified (NPPES)',
      required: true,
      completed: stats.nppesVerified !== false,
      description: 'All reportable physician NPIs verified at ingest; export blocked when NPPES_INGEST_POLICY=block',
    },
    {
      id: 'aggregates_current',
      label: 'Annual aggregate thresholds recalculated',
      required: true,
      completed: stats.aggregatesCurrent !== false,
      description: 'Sub-threshold payments rolled up per jurisdiction_rules before OPS export',
    },
    {
      id: 'puf_validated',
      label: 'PUF files validated against Jan 2025 data dictionary',
      required: true,
      completed: stats.pufValidated !== false,
      description: 'General (91-col), research, and ownership exports pass column and required-field validation',
    },
    {
      id: 'cms_export',
      label: 'CMS Open Payments CSV export generated',
      required: true,
      completed: stats.exportGenerated,
      description: 'Validate general (91-field), research, and ownership files against CMS data dictionary',
    },
    {
      id: 'test_file',
      label: 'OPS test file validated (recommended)',
      required: false,
      completed: stats.exportGenerated,
      description: 'Upload test file to CMS portal and clear formatting errors before March 31 deadline',
    },
    {
      id: 'manual_attestation',
      label: 'Manual attestation on CMS Open Payments portal',
      required: true,
      completed: false,
      description: 'Authorized attester must certify timeliness, accuracy, and completeness by March 31 — cannot be automated',
    },
  ]
}
