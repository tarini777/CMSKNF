import { NextRequest, NextResponse } from 'next/server'
import { verifyNpi } from '@/lib/nppes-service'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { npi, recordId, firstName, lastName, coveredRecipientName } = body

    if (!npi && !recordId) {
      return NextResponse.json({ success: false, error: 'npi or recordId required' }, { status: 400 })
    }

    let targetNpi = npi
    let nameHints = { firstName, lastName, coveredRecipientName }

    if (recordId) {
      const record = await prisma.cMSRecord.findFirst({
        where: { OR: [{ id: recordId }, { recordId }] },
      })
      if (!record) {
        return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
      }
      targetNpi = record.coveredRecipientNpi || npi
      nameHints = {
        firstName: record.physicianFirstName || firstName,
        lastName: record.physicianLastName || lastName,
        coveredRecipientName: record.coveredRecipientName,
      }
    }

    const result = await verifyNpi(targetNpi, nameHints)

    if (recordId && result.valid) {
      await prisma.cMSRecord.updateMany({
        where: { OR: [{ id: recordId }, { recordId }] },
        data: {
          physicianSpecialty: result.provider?.specialty || undefined,
        },
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('NPPES verify error:', error)
    return NextResponse.json({ success: false, error: 'NPPES verification failed' }, { status: 500 })
  }
}
