import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { canTransitionDispute, DisputeStatus } from '@/lib/submission-calendar'
import { createAuditLog } from '@/lib/audit-log'
import { getPerformedBy } from '@/lib/request-user'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, status, reason } = body

    if (!recordId || !status) {
      return NextResponse.json({ success: false, error: 'recordId and status required' }, { status: 400 })
    }

    const record = await prisma.cMSRecord.findUnique({ where: { id: recordId } })
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
      where: { id: recordId },
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
      entityId: recordId,
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
