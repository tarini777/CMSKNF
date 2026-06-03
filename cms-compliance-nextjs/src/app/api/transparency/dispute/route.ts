import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canTransitionDispute, DisputeStatus, getActiveProgramYear } from '@/lib/submission-calendar'
import { createAuditLog } from '@/lib/audit-log'
import { getPerformedBy } from '@/lib/request-user'

async function findRecord(recordId: string) {
  return prisma.cMSRecord.findFirst({
    where: { OR: [{ id: recordId }, { recordId }] },
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const status = searchParams.get('status') || 'open'

    const openStatuses = ['under_review', 'disputed', 'corrected']
    const where: Record<string, unknown> = {
      OR: [{ programYear }, { dateOfPayment: { startsWith: programYear } }],
    }

    if (status === 'open') {
      where.disputeWorkflowStatus = { in: openStatuses }
    } else if (status !== 'all') {
      where.disputeWorkflowStatus = status
    } else {
      where.disputeWorkflowStatus = { not: 'none' }
    }

    const records = await prisma.cMSRecord.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        recordId: true,
        coveredRecipientName: true,
        coveredRecipientNpi: true,
        totalAmountOfPaymentUsdollars: true,
        dateOfPayment: true,
        disputeWorkflowStatus: true,
        disputeNotes: true,
        disputeOpenedAt: true,
        disputeStatusForPublication: true,
        natureOfPaymentOrTransferOfValue: true,
      },
    })

    return NextResponse.json({ success: true, data: { records, programYear } })
  } catch (error) {
    console.error('Dispute list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to list disputes' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, status, reason } = body

    if (!recordId || !status) {
      return NextResponse.json({ success: false, error: 'recordId and status required' }, { status: 400 })
    }

    const record = await findRecord(recordId)
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const from = (record.disputeWorkflowStatus || 'none') as DisputeStatus
    const to = status as DisputeStatus
    const transition = canTransitionDispute(from, to)

    if (!transition) {
      return NextResponse.json(
        { success: false, error: `Invalid dispute transition: ${from} → ${to}` },
        { status: 400 }
      )
    }

    if (transition.requiresReason && !reason?.trim()) {
      return NextResponse.json({ success: false, error: 'Reason required for this transition' }, { status: 400 })
    }

    const now = new Date()
    const updated = await prisma.cMSRecord.update({
      where: { id: record.id },
      data: {
        disputeWorkflowStatus: to,
        disputeNotes: reason || record.disputeNotes,
        disputeOpenedAt: to === 'disputed' ? now : record.disputeOpenedAt,
        disputeResolvedAt: to === 'resolved' ? now : record.disputeResolvedAt,
        disputeStatusForPublication: to === 'disputed' ? 'Yes' : to === 'resolved' ? 'No' : record.disputeStatusForPublication,
      },
    })

    await createAuditLog({
      action: 'update',
      entityType: 'record',
      entityId: record.id,
      oldValues: { disputeWorkflowStatus: from },
      newValues: { disputeWorkflowStatus: to },
      reason: reason || `Dispute workflow: ${from} → ${to}`,
      performedBy: await getPerformedBy(),
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Dispute update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update dispute status' }, { status: 500 })
  }
}
