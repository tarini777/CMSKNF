import { prisma } from '@/lib/prisma'
import {
  CMS_GENERAL_PUF_HEADERS,
  CMS_OWNERSHIP_PUF_HEADERS,
  type CmsGeneralPufFields,
  type CmsOwnershipPufFields,
} from '@/types/cms-puf'

function escapeCsv(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function pufToRow<T extends Record<string, unknown>>(fields: T, headers: (keyof T)[]): string {
  return headers.map((h) => escapeCsv(fields[h] as string | number | undefined)).join(',')
}

function headerLabels(keys: string[]): string {
  return keys.map((k) => k.toUpperCase()).join(',')
}

export async function generateFullGeneralPufCsv(programYear?: string): Promise<string> {
  const year = programYear || String(new Date().getFullYear())
  const lines = await prisma.cmsGeneralPaymentLine.findMany({
    where: { programYear: year, isReportable: true },
    orderBy: { dateOfPayment: 'asc' },
  })

  const rows = lines.map((line) =>
    pufToRow(line.pufFields as CmsGeneralPufFields, CMS_GENERAL_PUF_HEADERS)
  )

  return [headerLabels(CMS_GENERAL_PUF_HEADERS), ...rows].join('\n')
}

export async function generateFullOwnershipPufCsv(programYear?: string): Promise<string> {
  const year = programYear || String(new Date().getFullYear())
  const lines = await prisma.cmsOwnershipPaymentLine.findMany({
    where: { programYear: year, isReportable: true },
    orderBy: { recordId: 'asc' },
  })

  const rows = lines.map((line) =>
    pufToRow(line.pufFields as CmsOwnershipPufFields, CMS_OWNERSHIP_PUF_HEADERS)
  )

  return [headerLabels(CMS_OWNERSHIP_PUF_HEADERS), ...rows].join('\n')
}

export async function getPufExportStats(programYear?: string) {
  const year = programYear || String(new Date().getFullYear())
  const [general, research, ownership, linkedRecords] = await Promise.all([
    prisma.cmsGeneralPaymentLine.count({ where: { programYear: year, isReportable: true } }),
    prisma.cmsResearchPaymentLine.count({ where: { programYear: year, isReportable: true } }),
    prisma.cmsOwnershipPaymentLine.count({ where: { programYear: year, isReportable: true } }),
    prisma.cMSRecord.count({ where: { programYear: year, spendEventId: { not: null } } }),
  ])

  return {
    programYear: year,
    generalReportable: general,
    researchReportable: research,
    ownershipReportable: ownership,
    cmsRecordsWithLineage: linkedRecords,
    generalFieldCount: CMS_GENERAL_PUF_HEADERS.length,
    ownershipFieldCount: CMS_OWNERSHIP_PUF_HEADERS.length,
  }
}
