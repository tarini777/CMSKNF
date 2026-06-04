import { NextRequest, NextResponse } from 'next/server'
import { NPPES_MDM_CONNECTOR } from '@/lib/lineage/connectors/nppes-mdm'
import {
  nppesHealthCheck,
  nppesLookupByNumber,
  nppesSearch,
  parseNppesRecord,
  type NppesSearchCriteria,
} from '@/lib/nppes-api-client'
import { verifyNpi } from '@/lib/nppes-service'

export async function GET() {
  const health = await nppesHealthCheck()
  return NextResponse.json({
    success: true,
    data: {
      connector: NPPES_MDM_CONNECTOR,
      health,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action = 'verify', npi, firstName, lastName, coveredRecipientName, criteria } = body

    switch (action) {
      case 'verify': {
        if (!npi) {
          return NextResponse.json({ success: false, error: 'npi required for verify' }, { status: 400 })
        }
        const result = await verifyNpi(npi, { firstName, lastName, coveredRecipientName })
        return NextResponse.json({ success: true, data: result })
      }

      case 'lookup': {
        if (!npi) {
          return NextResponse.json({ success: false, error: 'npi required for lookup' }, { status: 400 })
        }
        const cleaned = String(npi).replace(/\D/g, '')
        if (cleaned.length !== 10) {
          return NextResponse.json({ success: false, error: 'NPI must be 10 digits' }, { status: 400 })
        }
        const record = await nppesLookupByNumber(cleaned)
        return NextResponse.json({
          success: true,
          data: {
            found: !!record,
            provider: record ? parseNppesRecord(record) : null,
            raw: record,
          },
        })
      }

      case 'search': {
        const searchCriteria = (criteria || body) as NppesSearchCriteria
        const hasCriterion =
          searchCriteria.number ||
          searchCriteria.first_name ||
          searchCriteria.last_name ||
          searchCriteria.organization_name ||
          searchCriteria.taxonomy_description ||
          searchCriteria.city ||
          searchCriteria.postal_code ||
          (searchCriteria.country_code && searchCriteria.country_code !== 'US')

        if (!hasCriterion) {
          return NextResponse.json(
            {
              success: false,
              error:
                'At least one search criterion required (number, name, organization_name, taxonomy, city, postal_code, or non-US country_code)',
            },
            { status: 400 }
          )
        }

        const response = await nppesSearch(searchCriteria)
        return NextResponse.json({
          success: true,
          data: {
            result_count: response.result_count,
            providers: response.results.map(parseNppesRecord),
            results: response.results,
          },
        })
      }

      case 'health': {
        const health = await nppesHealthCheck()
        return NextResponse.json({ success: health.ok, data: health })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action — use verify, lookup, search, or health' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('NPPES connector error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'NPPES connector failed' },
      { status: 500 }
    )
  }
}
