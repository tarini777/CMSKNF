import { prisma } from '@/lib/prisma'
import { getNppesIngestPolicy, type NppesIngestPolicy } from '@/lib/app-config'
import { verifyNpi, type NppesVerificationResult } from '@/lib/nppes-service'

export type NppesVerificationStatus =
  | 'verified'
  | 'name_mismatch'
  | 'not_found'
  | 'invalid_format'
  | 'skipped'

export interface NppesIngestVerification {
  status: NppesVerificationStatus
  message: string
  blocksExport: boolean
  verification: NppesVerificationResult | null
}

function isPhysicianLike(coveredRecipientType?: string | null): boolean {
  const t = (coveredRecipientType || '').toLowerCase()
  return t.includes('physician') || t.includes('practitioner') || t.includes('doctor')
}

export function resolveNppesStatus(verification: NppesVerificationResult | null): NppesVerificationStatus {
  if (!verification) return 'skipped'
  if (!verification.valid) {
    if (verification.message.includes('10 digits')) return 'invalid_format'
    return 'not_found'
  }
  if (verification.nameMatch === false) return 'name_mismatch'
  return 'verified'
}

export function blocksExportForStatus(
  status: NppesVerificationStatus,
  policy: NppesIngestPolicy = getNppesIngestPolicy()
): boolean {
  if (policy !== 'block') return false
  return status === 'not_found' || status === 'invalid_format' || status === 'name_mismatch'
}

export async function verifyRecordNpiAtIngest(input: {
  coveredRecipientNpi?: string | null
  coveredRecipientType?: string | null
  physicianFirstName?: string | null
  physicianLastName?: string | null
  coveredRecipientName?: string | null
}): Promise<NppesIngestVerification> {
  const policy = getNppesIngestPolicy()
  const npi = (input.coveredRecipientNpi || '').replace(/\D/g, '')

  if (!npi) {
    return {
      status: 'skipped',
      message: 'No NPI on record — verification skipped',
      blocksExport: false,
      verification: null,
    }
  }

  if (!isPhysicianLike(input.coveredRecipientType) && !input.physicianFirstName && !input.physicianLastName) {
    return {
      status: 'skipped',
      message: 'Non-physician recipient — NPPES verification skipped',
      blocksExport: false,
      verification: null,
    }
  }

  if (policy === 'off') {
    return {
      status: 'skipped',
      message: 'NPPES ingest verification disabled (NPPES_INGEST_POLICY=off)',
      blocksExport: false,
      verification: null,
    }
  }

  const verification = await verifyNpi(npi, {
    firstName: input.physicianFirstName || undefined,
    lastName: input.physicianLastName || undefined,
    coveredRecipientName: input.coveredRecipientName || undefined,
  })

  const status = resolveNppesStatus(verification)
  const blocksExport = blocksExportForStatus(status, policy)

  return {
    status,
    message: verification.message,
    blocksExport,
    verification,
  }
}

export async function persistNppesVerification(
  cmsRecordId: string,
  result: NppesIngestVerification
): Promise<void> {
  await prisma.cMSRecord.update({
    where: { id: cmsRecordId },
    data: {
      nppesVerificationStatus: result.status,
      nppesVerifiedAt: new Date(),
      nppesVerificationSource: result.verification?.source ?? null,
      nppesVerificationMessage: result.message,
    },
  })
}

export async function runNppesVerificationForRecord(cmsRecordId: string): Promise<NppesIngestVerification> {
  const record = await prisma.cMSRecord.findUnique({ where: { id: cmsRecordId } })
  if (!record) throw new Error(`Record not found: ${cmsRecordId}`)

  const result = await verifyRecordNpiAtIngest(record)
  await persistNppesVerification(cmsRecordId, result)
  return result
}

export async function countNppesExportBlockers(programYear?: string): Promise<number> {
  const year = programYear || String(new Date().getFullYear())
  return prisma.cMSRecord.count({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      nppesVerificationStatus: { in: ['not_found', 'invalid_format', 'name_mismatch'] },
    },
  })
}

export async function listNppesExportBlockers(programYear?: string, limit = 20) {
  const year = programYear || String(new Date().getFullYear())
  return prisma.cMSRecord.findMany({
    where: {
      isReportable: true,
      OR: [{ programYear: year }, { dateOfPayment: { startsWith: year } }],
      nppesVerificationStatus: { in: ['not_found', 'invalid_format', 'name_mismatch'] },
    },
    select: {
      id: true,
      recordId: true,
      coveredRecipientName: true,
      coveredRecipientNpi: true,
      nppesVerificationStatus: true,
      nppesVerificationMessage: true,
    },
    take: limit,
  })
}
