import { createHash } from 'crypto'
import {
  generateFullGeneralPufCsv,
  generateFullOwnershipPufCsv,
  generateFullResearchPufCsv,
  getPufExportStats,
} from '@/lib/lineage/puf-export-service'
import { getCmsExportStats } from '@/lib/cms-export-service'
import { getActiveProgramYear } from '@/lib/submission-calendar'

export interface CmsSubmissionFile {
  filename: string
  fileType: 'general' | 'research' | 'ownership'
  rowCount: number
  fieldCount: number
  sha256: string
  content: string
}

export interface CmsSubmissionPackage {
  programYear: string
  generatedAt: string
  submissionWindow: string
  files: CmsSubmissionFile[]
  manifest: {
    attestationRequired: boolean
    attestationNote: string
    opsPortalUrl: string
    stats: Awaited<ReturnType<typeof getCmsExportStats>>
    pufStats: Awaited<ReturnType<typeof getPufExportStats>>
  }
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

function countCsvRows(csv: string): number {
  const lines = csv.split('\n').filter(Boolean)
  return Math.max(0, lines.length - 1)
}

export async function buildCmsSubmissionPackage(programYear?: string): Promise<CmsSubmissionPackage> {
  const year = programYear || String(getActiveProgramYear())
  const next = parseInt(year, 10) + 1

  const [generalCsv, researchCsv, ownershipCsv, stats, pufStats] = await Promise.all([
    generateFullGeneralPufCsv(year),
    generateFullResearchPufCsv(year),
    generateFullOwnershipPufCsv(year),
    getCmsExportStats(year),
    getPufExportStats(year),
  ])

  const files: CmsSubmissionFile[] = [
    {
      filename: `GNRL${year}_general_payments.csv`,
      fileType: 'general',
      rowCount: countCsvRows(generalCsv),
      fieldCount: pufStats.generalFieldCount,
      sha256: sha256(generalCsv),
      content: generalCsv,
    },
    {
      filename: `RSRCH${year}_research_payments.csv`,
      fileType: 'research',
      rowCount: countCsvRows(researchCsv),
      fieldCount: 0,
      sha256: sha256(researchCsv),
      content: researchCsv,
    },
    {
      filename: `OWNRSHP${year}_ownership.csv`,
      fileType: 'ownership',
      rowCount: countCsvRows(ownershipCsv),
      fieldCount: pufStats.ownershipFieldCount,
      sha256: sha256(ownershipCsv),
      content: ownershipCsv,
    },
  ]

  return {
    programYear: year,
    generatedAt: new Date().toISOString(),
    submissionWindow: `February 1 – March 31, ${next}`,
    files,
    manifest: {
      attestationRequired: true,
      attestationNote:
        'Upload files to CMS Open Payments System (OPS), validate test file, then complete manual attestation by March 31.',
      opsPortalUrl: 'https://www.cms.gov/openpayments',
      stats,
      pufStats,
    },
  }
}
