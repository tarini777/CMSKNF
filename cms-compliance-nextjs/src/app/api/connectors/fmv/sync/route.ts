import { NextRequest, NextResponse } from 'next/server'
import { syncFmvRatesFromConnector, listActiveFmvRates, type FmvSyncPayload } from '@/lib/fmv-sync-service'
import { getCronSecret } from '@/lib/app-config'

function authorizeSync(request: NextRequest, bodySecret?: string): boolean {
  const configured = getCronSecret()
  if (!configured) return true
  const header = request.headers.get('x-cron-secret')
  return header === configured || bodySecret === configured
}

export async function GET() {
  const rates = await listActiveFmvRates()
  return NextResponse.json({
    success: true,
    data: {
      count: rates.length,
      rates: rates.map((r) => ({
        natureKey: r.natureKey,
        natureLabel: r.natureLabel,
        rateUsd: r.rateUsd,
        unit: r.unit,
        specialtyTier: r.specialtyTier,
        sourceKey: r.sourceKey,
        effectiveDate: r.effectiveDate,
      })),
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FmvSyncPayload & { cronSecret?: string }

    if (!authorizeSync(request, body.cronSecret)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { cronSecret: _ignored, ...payload } = body
    const result = await syncFmvRatesFromConnector(payload)

    return NextResponse.json({
      success: true,
      data: result,
      message: `Synced ${result.ratesUpserted} FMV rate(s) from ${result.sourceKey}`,
    })
  } catch (error) {
    console.error('FMV sync error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'FMV sync failed' },
      { status: 400 }
    )
  }
}
