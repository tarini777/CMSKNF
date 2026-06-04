import { NextRequest, NextResponse } from 'next/server'
import {
  ingestConnectorBatch,
  ingestConnectorPayload,
  previewConnectorMapping,
} from '@/lib/lineage/connector-ingest-service'
import {
  getConnectorDefinition,
  isSupportedConnector,
  listConnectorDefinitions,
  mapConnectorPayload,
  SUPPORTED_CONNECTOR_KEYS,
} from '@/lib/lineage/connectors'
import type { SupportedConnectorKey } from '@/lib/lineage/connectors/types'
import { REFERENCE_CONNECTORS } from '@/lib/lineage/connectors/nppes-mdm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'list'
    const sourceKey = searchParams.get('sourceKey')

    switch (action) {
      case 'list':
        return NextResponse.json({
          success: true,
          data: {
            supported: SUPPORTED_CONNECTOR_KEYS,
            connectors: listConnectorDefinitions(),
            referenceConnectors: REFERENCE_CONNECTORS,
          },
        })

      case 'mapping': {
        if (!sourceKey || !isSupportedConnector(sourceKey)) {
          return NextResponse.json(
            { success: false, error: `sourceKey must be one of: ${SUPPORTED_CONNECTOR_KEYS.join(', ')}` },
            { status: 400 }
          )
        }
        const def = getConnectorDefinition(sourceKey)!
        const sampleMap = mapConnectorPayload(sourceKey, def.sampleUpstreamPayload)
        return NextResponse.json({
          success: true,
          data: {
            definition: def,
            sampleMap,
          },
        })
      }

      case 'preview': {
        if (!sourceKey || !isSupportedConnector(sourceKey)) {
          return NextResponse.json({ success: false, error: 'Invalid sourceKey' }, { status: 400 })
        }
        const sample = getConnectorDefinition(sourceKey)!.sampleUpstreamPayload
        const mapped = mapConnectorPayload(sourceKey, sample)
        return NextResponse.json({ success: true, data: mapped })
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Connector GET error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connector GET failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sourceKey, payload, payloads, reviewSessionId, createCmsRecord } = body

    if (!sourceKey || !isSupportedConnector(sourceKey)) {
      return NextResponse.json(
        { success: false, error: `sourceKey required: ${SUPPORTED_CONNECTOR_KEYS.join(', ')}` },
        { status: 400 }
      )
    }

    const key = sourceKey as SupportedConnectorKey

    switch (action) {
      case 'preview': {
        if (!payload) {
          return NextResponse.json({ success: false, error: 'payload required' }, { status: 400 })
        }
        const mapResult = await previewConnectorMapping(key, payload)
        return NextResponse.json({ success: true, data: mapResult })
      }

      case 'ingest': {
        if (!payload) {
          return NextResponse.json({ success: false, error: 'payload required' }, { status: 400 })
        }
        const result = await ingestConnectorPayload(key, payload, {
          reviewSessionId,
          createCmsRecord: createCmsRecord !== false,
        })
        return NextResponse.json({ success: true, data: result })
      }

      case 'ingest-batch': {
        if (!Array.isArray(payloads) || payloads.length === 0) {
          return NextResponse.json({ success: false, error: 'payloads array required' }, { status: 400 })
        }
        const batch = await ingestConnectorBatch(key, payloads, {
          reviewSessionId,
          createCmsRecord: createCmsRecord !== false,
        })
        return NextResponse.json({ success: true, data: batch })
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Connector POST error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Connector POST failed' },
      { status: 500 }
    )
  }
}
