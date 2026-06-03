/**
 * CMS Open Payments PUF validation — Jan 2025 data dictionary alignment.
 * Validates export column order, required fields, and row-level completeness.
 */

import { prisma } from '@/lib/prisma'
import {
  CMS_GENERAL_PUF_HEADERS,
  CMS_OWNERSHIP_PUF_HEADERS,
  CMS_RESEARCH_PUF_HEADERS,
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
          field: String(key),
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
          field: String(key),
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
          field: String(key),
        })
      }
    }

    const npi = String(fields.physician_npi || '').replace(/\D/g, '')
    if (npi && npi.length !== 10) {
      issues.push({
        severity: 'error',
        code: 'invalid_npi',
        fileType: 'ownership',
        message: 'physician_npi must be exactly 10 digits',
        recordId: line.recordId || fields.record_id,
        field: 'physician_npi',
      })
    } else if (!npi && isEmpty(fields.physician_profile_id)) {
      issues.push({
        severity: 'warning',
        code: 'identity_incomplete',
        fileType: 'ownership',
        message: 'Ownership row missing both physician_npi and physician_profile_id',
        recordId: line.recordId || fields.record_id,
      })
    }

    const invested = parseFloat(String(fields.total_amount_invested_usdollars ?? ''))
    const value = parseFloat(String(fields.value_of_interest ?? ''))
    if (!Number.isNaN(invested) && invested < 0) {
      issues.push({
        severity: 'error',
        code: 'invalid_amount',
        fileType: 'ownership',
        message: 'total_amount_invested_usdollars cannot be negative',
        recordId: line.recordId || fields.record_id,
        field: 'total_amount_invested_usdollars',
      })
    }
    if (!Number.isNaN(value) && value > 0 && isEmpty(fields.terms_of_interest)) {
      issues.push({
        severity: 'error',
        code: 'terms_required',
        fileType: 'ownership',
        message: 'terms_of_interest required when value_of_interest is populated',
        recordId: line.recordId || fields.record_id,
        field: 'terms_of_interest',
      })
    }

    const holder = String(fields.interest_held_by_physician_or_an_immediate_family_member || '')
      .trim()
      .toLowerCase()
    if (holder.startsWith('y') && isEmpty(fields.physician_last_name)) {
      issues.push({
        severity: 'error',
        code: 'family_interest_identity',
        fileType: 'ownership',
        message: 'physician_last_name required when interest held by physician or family',
        recordId: line.recordId || fields.record_id,
        field: 'physician_last_name',
      })
    }

    const changeType = String(fields.change_type || '').toUpperCase()
    if (changeType && !['N', 'C', 'D'].includes(changeType)) {
      issues.push({
        severity: 'warning',
        code: 'invalid_change_type',
        fileType: 'ownership',
        message: `change_type should be N, C, or D (got ${fields.change_type})`,
        recordId: line.recordId || fields.record_id,
        field: 'change_type',
      })
    }
  }
  return issues
}

/** Validate an OPS test-file CSV against Jan 2025 dictionary column order. */
export function validateOpsTestFileCsv(
  fileType: 'general' | 'research' | 'ownership',
  csvContent: string
): PufFileValidation {
  const expectedHeaders =
    fileType === 'general'
      ? CMS_GENERAL_PUF_HEADERS
      : fileType === 'research'
        ? CMS_RESEARCH_PUF_HEADERS
        : CMS_OWNERSHIP_PUF_HEADERS

  const headerCheck = headerMatchesDictionary(csvContent, expectedHeaders)
  const issues: PufValidationIssue[] = []

  if (!headerCheck.match) {
    issues.push({
      severity: 'error',
      code: 'header_mismatch',
      fileType,
      message: `OPS test file header mismatch: expected ${expectedHeaders.length} columns, got ${headerCheck.count}`,
    })
  }

  const dataLines = csvContent.split('\n').slice(1).filter((l) => l.trim())
  if (dataLines.length === 0 && headerCheck.match) {
    issues.push({
      severity: 'warning',
      code: 'empty_file',
      fileType,
      message: 'OPS test file has headers but no data rows',
    })
  }

  for (let i = 0; i < dataLines.length; i++) {
    const cols = dataLines[i].split(',')
    if (cols.length !== expectedHeaders.length) {
      issues.push({
        severity: 'error',
        code: 'row_column_count',
        fileType,
        message: `Row ${i + 2}: expected ${expectedHeaders.length} columns, got ${cols.length}`,
      })
    }
  }

  return {
    fileType,
    rowCount: dataLines.length,
    expectedFieldCount: expectedHeaders.length,
    actualHeaderCount: headerCheck.count,
    headerMatch: headerCheck.match,
    populatedFieldRate: 1,
    issues,
  }
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
  const researchHeader = headerMatchesDictionary(researchCsv, CMS_RESEARCH_PUF_HEADERS)
  if (!researchHeader.match && researchLines.length > 0) {
    researchIssues.push({
      severity: 'error',
      code: 'header_mismatch',
      fileType: 'research',
      message: `Research PUF header count/order mismatch: expected ${CMS_RESEARCH_PUF_HEADERS.length}, got ${researchHeader.count}`,
    })
  }
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
      expectedFieldCount: CMS_RESEARCH_PUF_HEADERS.length,
      actualHeaderCount: researchHeader.count,
      headerMatch: researchHeader.match || researchLines.length === 0,
      populatedFieldRate:
        researchLines.length > 0
          ? fieldPopulationRate(
              researchLines.map((l) => l.pufFields as Record<string, unknown>),
              CMS_RESEARCH_PUF_HEADERS
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
