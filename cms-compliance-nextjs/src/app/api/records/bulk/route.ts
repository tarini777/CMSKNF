import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordIds, action, reason } = body as {
      recordIds: string[]
      action: 'approve' | 'reject'
      reason?: string
    }

    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json({ success: false, error: 'recordIds required' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ success: false, error: 'action must be approve or reject' }, { status: 400 })
    }

    const humanDecision = action === 'approve' ? 'approve' : 'reject'
    const records = await prisma.cMSRecord.findMany({
      where: { id: { in: recordIds } },
    })

    await Promise.all(
      records.map(async (record) => {
        await prisma.cMSRecord.update({
          where: { id: record.id },
          data: {
            humanDecision,
            humanReason: reason,
            decisionTime: new Date(),
            finalReportable: action === 'approve' ? record.isReportable : false,
          },
        })

        await createAuditLog({
          action,
          entityType: 'record',
          entityId: record.id,
          oldValues: { humanDecision: record.humanDecision },
          newValues: { humanDecision, humanReason: reason },
          reason,
        })
      })
    )

    return NextResponse.json({
      success: true,
      data: { updated: records.length },
    })
  } catch (error) {
    console.error('Bulk record update failed:', error)
    return NextResponse.json({ success: false, error: 'Bulk update failed' }, { status: 500 })
  }
}
