import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-log'
import {
  buildRecordWithPuf,
  RECORD_SPEND_INCLUDE,
} from '@/lib/lineage/record-view-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const record = await prisma.cMSRecord.findUnique({
      where: { id },
      include: {
        reviewSession: {
          select: {
            sessionId: true,
            filename: true,
            uploadTime: true,
          },
        },
        spendEvent: {
          include: RECORD_SPEND_INCLUDE,
        },
      },
    })

    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: buildRecordWithPuf(record, record.spendEvent),
    })
  } catch (error) {
    console.error('Error fetching record:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch record' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.cMSRecord.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const allowedFields = [
      'humanDecision',
      'humanReason',
      'finalReportable',
      'isReportable',
      'reason',
    ] as const

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.humanDecision === 'approve' || body.humanDecision === 'reject') {
      updateData.decisionTime = new Date()
    }

    const record = await prisma.cMSRecord.update({
      where: { id },
      data: updateData,
    })

    const auditAction =
      body.humanDecision === 'approve'
        ? 'approve'
        : body.humanDecision === 'reject'
          ? 'reject'
          : 'update'

    await createAuditLog({
      action: auditAction,
      entityType: 'record',
      entityId: id,
      oldValues: {
        humanDecision: existing.humanDecision,
        finalReportable: existing.finalReportable,
      },
      newValues: {
        humanDecision: record.humanDecision,
        humanReason: record.humanReason,
        finalReportable: record.finalReportable,
      },
      reason: body.humanReason,
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('Error updating record:', error)
    return NextResponse.json({ success: false, error: 'Failed to update record' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.cMSRecord.findUnique({ where: { id } })

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    await prisma.cMSRecord.delete({ where: { id } })

    await createAuditLog({
      action: 'delete',
      entityType: 'record',
      entityId: id,
      oldValues: { recordId: existing.recordId, coveredRecipientName: existing.coveredRecipientName },
    })

    return NextResponse.json({ success: true, message: 'Record deleted successfully' })
  } catch (error) {
    console.error('Error deleting record:', error)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}
