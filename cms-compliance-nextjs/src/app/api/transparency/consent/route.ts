import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-log'
import { getPerformedBy } from '@/lib/request-user'
import { getActiveProgramYear } from '@/lib/submission-calendar'
import { describeRecipientLocation } from '@/lib/geographic-rules'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const programYear = searchParams.get('programYear') || String(getActiveProgramYear())
    const filter = searchParams.get('filter') || 'needs_consent'

    const records = await prisma.cMSRecord.findMany({
      where: {
        isReportable: true,
        OR: [{ programYear }, { dateOfPayment: { startsWith: programYear } }],
      },
      orderBy: { coveredRecipientName: 'asc' },
      take: 200,
    })

    const euUk = records.filter((r) => {
      const loc = describeRecipientLocation(r)
      return loc.isForeignRecipient
    })

    const filtered =
      filter === 'all'
        ? euUk
        : filter === 'granted'
          ? euUk.filter((r) => r.consentForDisclosure === true)
          : filter === 'denied'
            ? euUk.filter((r) => r.consentForDisclosure === false)
            : euUk.filter((r) => r.consentForDisclosure == null)

    const stats = {
      total: euUk.length,
      pending: euUk.filter((r) => r.consentForDisclosure == null).length,
      individual: euUk.filter((r) => r.consentForDisclosure === true).length,
      aggregate: euUk.filter((r) => r.consentForDisclosure === false).length,
    }

    return NextResponse.json({
      success: true,
      data: {
        programYear,
        stats,
        records: filtered.map((r) => ({
          id: r.id,
          recordId: r.recordId,
          coveredRecipientName: r.coveredRecipientName,
          recipientCountry: r.recipientCountry,
          totalAmountOfPaymentUsdollars: r.totalAmountOfPaymentUsdollars,
          consentForDisclosure: r.consentForDisclosure,
          disclosureType: r.disclosureType,
          cmsReportCategory: r.cmsReportCategory,
        })),
      },
    })
  } catch (error) {
    console.error('Consent list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to list consent records' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, consentForDisclosure, disclosureType } = body

    if (!recordId || consentForDisclosure === undefined) {
      return NextResponse.json(
        { success: false, error: 'recordId and consentForDisclosure required' },
        { status: 400 }
      )
    }

    const record = await prisma.cMSRecord.findFirst({
      where: { OR: [{ id: recordId }, { recordId }] },
    })
    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const resolvedDisclosure =
      disclosureType ||
      (consentForDisclosure === true ? 'individual' : consentForDisclosure === false ? 'aggregate' : record.disclosureType)

    const updated = await prisma.cMSRecord.update({
      where: { id: record.id },
      data: {
        consentForDisclosure: Boolean(consentForDisclosure),
        disclosureType: resolvedDisclosure,
      },
    })

    await createAuditLog({
      action: 'update',
      entityType: 'record',
      entityId: record.id,
      oldValues: {
        consentForDisclosure: record.consentForDisclosure,
        disclosureType: record.disclosureType,
      },
      newValues: {
        consentForDisclosure: updated.consentForDisclosure,
        disclosureType: updated.disclosureType,
      },
      reason: `Consent ${consentForDisclosure ? 'granted' : 'denied'} — ${resolvedDisclosure} disclosure`,
      performedBy: await getPerformedBy(),
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Consent update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update consent' }, { status: 500 })
  }
}
