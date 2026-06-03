import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import { canTransitionDispute, DisputeStatus } from '@/lib/submission-calendar'
import { createAuditLog } from '@/lib/audit-log'
import { applyPublicRateLimit } from '@/lib/public-api-rate-limit'

/** HCP-facing 45-day review portal (REQ-018). */
export async function GET(request: NextRequest) {
  const rate = applyPublicRateLimit(request, 'hcp_portal')
  if (rate.blocked) return rate.blocked

  try {
    const { searchParams } = new URL(request.url)
    const npi = (searchParams.get('npi') || '').replace(/\D/g, '')
    const lastName = (searchParams.get('lastName') || '').toLowerCase().trim()
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())

    if (npi.length !== 10) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit NPI required' }, { status: 400 })
    }

    const records = await prisma.cMSRecord.findMany({
      where: {
        coveredRecipientNpi: npi,
        isReportable: true,
        OR: [{ programYear }, { dateOfPayment: { startsWith: programYear } }],
      },
      orderBy: { dateOfPayment: 'desc' },
    })

    let filtered = records
    if (lastName) {
      filtered = records.filter((r) => r.coveredRecipientName.toLowerCase().includes(lastName))
    }

    if (filtered.length === 0) {
      return NextResponse.json({ success: false, error: 'No reportable payments found for this NPI' }, { status: 404 })
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          programYear,
          recipientName: filtered[0].coveredRecipientName,
          npi,
          payments: filtered.map((r) => ({
            id: r.id,
            recordId: r.recordId,
            amountUsd: r.totalAmountOfPaymentUsdollars,
            dateOfPayment: r.dateOfPayment,
            natureOfPayment: r.natureOfPaymentOrTransferOfValue,
            formOfPayment: r.formOfPaymentOrTransferOfValue,
            manufacturer: r.applicableManufacturerOrApplicableGpoMakingPaymentName,
            disputeWorkflowStatus: r.disputeWorkflowStatus,
            disputeNotes: r.disputeNotes,
          })),
        },
      },
      { headers: rate.headers }
    )
  } catch (error) {
    console.error('HCP portal error:', error)
    return NextResponse.json({ success: false, error: 'Portal lookup failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const rate = applyPublicRateLimit(request, 'hcp_portal')
  if (rate.blocked) return rate.blocked

  try {
    const body = await request.json()
    const { recordId, reason } = body

    if (!recordId || !reason?.trim()) {
      return NextResponse.json({ success: false, error: 'recordId and reason required' }, { status: 400 })
    }

    const record = await prisma.cMSRecord.findFirst({
      where: { OR: [{ id: recordId }, { recordId }] },
    })
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const from = (record.disputeWorkflowStatus || 'none') as DisputeStatus
    let targetStatus: DisputeStatus

    if (from === 'none') {
      if (!canTransitionDispute('none', 'under_review')) {
        return NextResponse.json({ success: false, error: 'Cannot open dispute' }, { status: 400 })
      }
      targetStatus = 'under_review'
    } else if (from === 'under_review') {
      if (!canTransitionDispute('under_review', 'disputed')) {
        return NextResponse.json({ success: false, error: 'Cannot escalate dispute' }, { status: 400 })
      }
      targetStatus = 'disputed'
    } else {
      return NextResponse.json({ success: false, error: 'Dispute already in progress' }, { status: 400 })
    }

    const updated = await prisma.cMSRecord.update({
      where: { id: record.id },
      data: {
        disputeWorkflowStatus: targetStatus,
        disputeNotes: reason,
        disputeOpenedAt: new Date(),
        disputeStatusForPublication: targetStatus === 'disputed' ? 'Yes' : record.disputeStatusForPublication,
      },
    })

    await createAuditLog({
      action: 'update',
      entityType: 'record',
      entityId: record.id,
      oldValues: { disputeWorkflowStatus: from },
      newValues: { disputeWorkflowStatus: targetStatus },
      reason: `HCP portal dispute: ${reason}`,
      performedBy: 'hcp_portal',
    })

    return NextResponse.json(
      { success: true, data: updated, message: 'Dispute submitted — compliance team will review' },
      { headers: rate.headers }
    )
  } catch (error) {
    console.error('HCP dispute error:', error)
    return NextResponse.json({ success: false, error: 'Failed to submit dispute' }, { status: 500 })
  }
}
