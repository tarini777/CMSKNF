import { NextRequest, NextResponse } from 'next/server'
import {
  createSubmissionBatch,
  getLineageForSpendEvent,
  getLineageStats,
} from '@/lib/lineage/ingest-pipeline'
import { ensureDefaultDataSources } from '@/lib/lineage/hcp-master-service'
import {
  getDedupClusters,
  getDedupStats,
  resolveDedupCluster,
} from '@/lib/lineage/dedup-cluster-service'
import { generateFullGeneralPufCsv, getPufExportStats } from '@/lib/lineage/puf-export-service'
import { ingestConnectorPayload } from '@/lib/lineage/connector-ingest-service'
import { CONCUR_CONNECTOR } from '@/lib/lineage/connectors/concur'
import { CVENT_CONNECTOR } from '@/lib/lineage/connectors/cvent'
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

      case 'dedup-clusters': {
        const status = searchParams.get('status') === 'all' ? 'all' : 'pending'
        const [clusters, dedupStats] = await Promise.all([
          getDedupClusters({ status }),
          getDedupStats(),
        ])
        return NextResponse.json({ success: true, data: { clusters, stats: dedupStats } })
      }

      case 'dedup-stats': {
        const dedupStats = await getDedupStats()
        return NextResponse.json({ success: true, data: dedupStats })
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

    if (action === 'resolve-dedup') {
      const { clusterId, primarySpendEventId, splitSpendEventIds, resolveAction, reviewedBy } = body
      if (!clusterId || !resolveAction) {
        return NextResponse.json(
          { success: false, error: 'clusterId and resolveAction required' },
          { status: 400 }
        )
      }
      const cluster = await resolveDedupCluster({
        clusterId,
        action: resolveAction,
        primarySpendEventId,
        splitSpendEventIds,
        reviewedBy,
      })
      return NextResponse.json({ success: true, data: cluster })
    }

    if (action === 'simulate-dedup-collision') {
      await ensureDefaultDataSources()
      const suffix = Date.now()
      const concurPayload = {
        ...CONCUR_CONNECTOR.sampleUpstreamPayload,
        ReportId: `RPT-DEDUP-${suffix}`,
        ExpenseId: `EXP-DEDUP-${suffix}`,
      }
      const cventPayload = {
        ...CVENT_CONNECTOR.sampleUpstreamPayload,
        RegistrationId: `REG-DEDUP-${suffix}`,
        EventId: `EVT-DEDUP-${suffix}`,
      }

      const [concurResult, cventResult] = await Promise.all([
        ingestConnectorPayload('concur', concurPayload, { createCmsRecord: true }),
        ingestConnectorPayload('cvent', cventPayload, { createCmsRecord: true }),
      ])

      const clusters = await getDedupClusters({ status: 'pending' })
      return NextResponse.json({
        success: true,
        data: {
          concur: concurResult,
          cvent: cventResult,
          pendingClusters: clusters.length,
          clusters,
        },
      })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Lineage POST error:', error)
    return NextResponse.json({ success: false, error: 'Lineage POST failed' }, { status: 500 })
  }
}
