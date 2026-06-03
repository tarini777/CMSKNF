/**
 * CMS Open Payments PUF validation — Jan 2025 data dictionary alignment.
 * Validates export column order, required fields, and row-level completeness.
 */

import { prisma } from '@/lib/prisma'
import {
  CMS_GENERAL_PUF_HEADERS,
  CMS_OWNERSHIP_PUF_HEADERS,
  CMS_RESEARCH_PUF_REQUIRED_FIELDS,
  type CmsGeneralPufFields,
  type CmsOwnershipPufFields,
  type CmsResearchPufFields,
} from '@/types/cms-puf'
import {
  generateFullGeneralPufCsv,
  generateFullOwnershipPufCsv,
  generateFullResearchPufCsv,
} from '@/lib/lineage/puf-export-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export interface PufValidationIssue {
  severity: 'error' | 'warning'
  code: string
  fileType: 'general' | 'research' | 'ownership'
  message: string
  recordId?: string
  field?: string
}

export interface PufFileValidation {
  fileType: 'general' | 'research' | 'ownership'
  rowCount: number
  expectedFieldCount: number
  actualHeaderCount: number
  headerMatch: boolean
  populatedFieldRate: number
  issues: PufValidationIssue[]
}

export interface PufValidationReport {
  programYear: string
  dictionaryVersion: string
  valid: boolean
  files: PufFileValidation[]
  totalErrors: number
  totalWarnings: number
}

const DICTIONARY_VERSION = 'CMS Open Payments Jan 2025'

const GENERAL_REQUIRED: (keyof CmsGeneralPufFields)[] = [
  'change_type',
  'covered_recipient_type',
  'total_amount_of_payment_usdollars',
  'date_of_payment',
  'nature_of_payment_or_transfer_of_value',
  'form_of_payment_or_transfer_of_value',
  'applicable_manufacturer_or_applicable_gpo_making_payment_name',
  'record_id',
  'program_year',
]

const OWNERSHIP_REQUIRED: (keyof CmsOwnershipPufFields)[] = [
  'change_type',
  'physician_npi',
  'physician_first_name',
  'physician_last_name',
  'total_amount_invested_usdollars',
  'record_id',
  'program_year',
]

function isEmpty(value: unknown): boolean {
  return value == null || String(value).trim() === ''
}

function parseCsvHeaders(csv: string): string[] {
  const firstLine = csv.split('\n')[0] || ''
  return firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())
}

function headerMatchesDictionary(csv: string, expectedKeys: string[]): { match: boolean; count: number } {
  const headers = parseCsvHeaders(csv)
  const expected = expectedKeys.map((k) => k.toLowerCase())
  if (headers.length !== expected.length) {
    return { match: false, count: headers.length }
  }
  const match = expected.every((h, i) => headers[i] === h)
  return { match, count: headers.length }
}

function fieldPopulationRate<T extends Record<string, unknown>>(
  rows: T[],
  allKeys: string[]
): number {
  if (rows.length === 0 || allKeys.length === 0) return 1
  let filled = 0
  let total = 0
  for (const row of rows) {
    for (const key of allKeys) {
      total++
      if (!isEmpty(row[key])) filled++
    }
  }
  return total > 0 ? filled / total : 1
}

function validateGeneralRows(
  lines: Array<{ recordId: string; pufFields: unknown }>
): PufValidationIssue[] {
  const issues: PufValidationIssue[] = []
  for (const line of lines) {
    const fields = line.pufFields as CmsGeneralPufFields
    for (const key of GENERAL_REQUIRED) {
      if (isEmpty(fields[key])) {
        issues.push({
          severity: 'error',
          code: 'required_field_missing',
          fileType: 'general',
          message: `Missing required field ${key}`,
          recordId: line.recordId || fields.record_id,
          field: key,
        })
      }
    }
    const isPhysician = (fields.covered_recipient_type || '').toLowerCase().includes('physician')
    if (isPhysician && isEmpty(fields.covered_recipient_npi) && isEmpty(fields.covered_recipient_profile_id)) {
      issues.push({
        severity: 'warning',
        code: 'identity_incomplete',
        fileType: 'general',
        message: 'Physician row missing NPI and CMS profile ID',
        recordId: line.recordId || fields.record_id,
      })
    }
  }
  return issues
}

function validateResearchRows(
  lines: Array<{ recordId: string; pufFields: unknown }>
): PufValidationIssue[] {
  const issues: PufValidationIssue[] = []
  for (const line of lines) {
    const fields = line.pufFields as CmsResearchPufFields
    for (const key of CMS_RESEARCH_PUF_REQUIRED_FIELDS) {
      if (isEmpty(fields[key])) {
        issues.push({
          severity: 'error',
          code: 'required_field_missing',
          fileType: 'research',
          message: `Missing required research field ${key}`,
          recordId: line.recordId || fields.record_id,
          field: key,
        })
      }
    }
  }
  return issues
}

function validateOwnershipRows(
  lines: Array<{ recordId: string; pufFields: unknown }>
): PufValidationIssue[] {
  const issues: PufValidationIssue[] = []
  for (const line of lines) {
    const fields = line.pufFields as CmsOwnershipPufFields
    for (const key of OWNERSHIP_REQUIRED) {
      if (isEmpty(fields[key])) {
        issues.push({
          severity: 'error',
          code: 'required_field_missing',
          fileType: 'ownership',
          message: `Missing required ownership field ${key}`,
          recordId: line.recordId || fields.record_id,
          field: key,
        })
      }
    }
  }
  return issues
}

export async function validatePufExports(programYear?: string): Promise<PufValidationReport> {
  const year = programYear || String(getActiveProgramYear())

  const [generalCsv, researchCsv, ownershipCsv, generalLines, researchLines, ownershipLines] =
    await Promise.all([
      generateFullGeneralPufCsv(year),
      generateFullResearchPufCsv(year),
      generateFullOwnershipPufCsv(year),
      prisma.cmsGeneralPaymentLine.findMany({
        where: { programYear: year, isReportable: true },
        select: { recordId: true, pufFields: true },
      }),
      prisma.cmsResearchPaymentLine.findMany({
        where: { programYear: year, isReportable: true },
        select: { recordId: true, pufFields: true },
      }),
      prisma.cmsOwnershipPaymentLine.findMany({
        where: { programYear: year, isReportable: true },
        select: { recordId: true, pufFields: true },
      }),
    ])

  const generalHeader = headerMatchesDictionary(generalCsv, CMS_GENERAL_PUF_HEADERS)
  const ownershipHeader = headerMatchesDictionary(ownershipCsv, CMS_OWNERSHIP_PUF_HEADERS)

  const generalIssues: PufValidationIssue[] = []
  if (!generalHeader.match && generalLines.length > 0) {
    generalIssues.push({
      severity: 'error',
      code: 'header_mismatch',
      fileType: 'general',
      message: `General PUF header count/order mismatch: expected ${CMS_GENERAL_PUF_HEADERS.length}, got ${generalHeader.count}`,
    })
  }
  generalIssues.push(...validateGeneralRows(generalLines))

  const researchIssues: PufValidationIssue[] = []
  if (researchLines.length > 0) {
    researchIssues.push(...validateResearchRows(researchLines))
  }

  const ownershipIssues: PufValidationIssue[] = []
  if (!ownershipHeader.match && ownershipLines.length > 0) {
    ownershipIssues.push({
      severity: 'error',
      code: 'header_mismatch',
      fileType: 'ownership',
      message: `Ownership PUF header count/order mismatch: expected ${CMS_OWNERSHIP_PUF_HEADERS.length}, got ${ownershipHeader.count}`,
    })
  }
  ownershipIssues.push(...validateOwnershipRows(ownershipLines))

  const files: PufFileValidation[] = [
    {
      fileType: 'general',
      rowCount: generalLines.length,
      expectedFieldCount: CMS_GENERAL_PUF_HEADERS.length,
      actualHeaderCount: generalHeader.count,
      headerMatch: generalHeader.match || generalLines.length === 0,
      populatedFieldRate: fieldPopulationRate(
        generalLines.map((l) => l.pufFields as Record<string, unknown>),
        CMS_GENERAL_PUF_HEADERS
      ),
      issues: generalIssues,
    },
    {
      fileType: 'research',
      rowCount: researchLines.length,
      expectedFieldCount: CMS_RESEARCH_PUF_REQUIRED_FIELDS.length,
      actualHeaderCount: parseCsvHeaders(researchCsv).length,
      headerMatch: true,
      populatedFieldRate:
        researchLines.length > 0
          ? fieldPopulationRate(
              researchLines.map((l) => l.pufFields as Record<string, unknown>),
              [...CMS_RESEARCH_PUF_REQUIRED_FIELDS]
            )
          : 1,
      issues: researchIssues,
    },
    {
      fileType: 'ownership',
      rowCount: ownershipLines.length,
      expectedFieldCount: CMS_OWNERSHIP_PUF_HEADERS.length,
      actualHeaderCount: ownershipHeader.count,
      headerMatch: ownershipHeader.match || ownershipLines.length === 0,
      populatedFieldRate: fieldPopulationRate(
        ownershipLines.map((l) => l.pufFields as Record<string, unknown>),
        CMS_OWNERSHIP_PUF_HEADERS
      ),
      issues: ownershipIssues,
    },
  ]

  const totalErrors = files.reduce(
    (n, f) => n + f.issues.filter((i) => i.severity === 'error').length,
    0
  )
  const totalWarnings = files.reduce(
    (n, f) => n + f.issues.filter((i) => i.severity === 'warning').length,
    0
  )

  return {
    programYear: year,
    dictionaryVersion: DICTIONARY_VERSION,
    valid: totalErrors === 0,
    files,
    totalErrors,
    totalWarnings,
  }
}
