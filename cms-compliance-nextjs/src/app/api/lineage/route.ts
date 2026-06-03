import { NextRequest, NextResponse } from 'next/server'
import {
  createSubmissionBatch,
  getLineageForSpendEvent,
  getLineageStats,
} from '@/lib/lineage/ingest-pipeline'
import { ensureDefaultDataSources } from '@/lib/lineage/hcp-master-service'
import { generateFullGeneralPufCsv, getPufExportStats } from '@/lib/lineage/puf-export-service'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'

    switch (action) {
      case 'stats': {
        await ensureDefaultDataSources()
        const [stats, exportStats, sources] = await Promise.all([
          getLineageStats(),
          getPufExportStats(searchParams.get('programYear') || undefined),
          prisma.dataSource.findMany({
            where: { isActive: true },
            orderBy: { sourceCategory: 'asc' },
          }),
        ])
        return NextResponse.json({
          success: true,
          data: { stats, exportStats, sources },
        })
      }

      case 'trace': {
        const spendEventId = searchParams.get('spendEventId')
        if (!spendEventId) {
          return NextResponse.json({ success: false, error: 'spendEventId required' }, { status: 400 })
        }
        const lineage = await getLineageForSpendEvent(spendEventId)
        return NextResponse.json({ success: true, data: lineage })
      }

      case 'export-general': {
        const csv = await generateFullGeneralPufCsv(searchParams.get('programYear') || undefined)
        const year = searchParams.get('programYear') || new Date().getFullYear()
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="cms-general-puf-${year}.csv"`,
          },
        })
      }

      case 'recent': {
        const events = await prisma.spendEvent.findMany({
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            dataSource: { select: { sourceKey: true, sourceName: true } },
            hcpMaster: { select: { fullName: true, npi: true } },
            generalLine: { select: { recordId: true, isReportable: true } },
            researchLine: { select: { recordId: true, isReportable: true } },
            ownershipLine: { select: { recordId: true, isReportable: true } },
          },
        })
        return NextResponse.json({ success: true, data: events })
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Lineage API error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Lineage API failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, programYear, fileType } = body

    if (action === 'create-batch') {
      const batch = await createSubmissionBatch(
        programYear || String(new Date().getFullYear()),
        fileType || 'general'
      )
      return NextResponse.json({ success: true, data: batch })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Lineage POST error:', error)
    return NextResponse.json({ success: false, error: 'Lineage POST failed' }, { status: 500 })
  }
}
