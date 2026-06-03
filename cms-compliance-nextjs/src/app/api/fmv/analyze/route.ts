import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeFmv } from '@/lib/fmv-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')

    if (!recordId) {
      return NextResponse.json({ success: false, error: 'recordId required' }, { status: 400 })
    }

    const record = await prisma.cMSRecord.findFirst({
      where: { OR: [{ id: recordId }, { recordId }] },
    })

    if (!record) {
      return NextResponse.json({ success: false, error: 'Record not found' }, { status: 404 })
    }

    const analysis = await analyzeFmv(record)
    return NextResponse.json({ success: true, data: analysis })
  } catch (error) {
    console.error('FMV analyze error:', error)
    return NextResponse.json({ success: false, error: 'FMV analysis failed' }, { status: 500 })
  }
}
