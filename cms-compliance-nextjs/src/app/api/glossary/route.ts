import { NextRequest, NextResponse } from 'next/server'
import { glossaryService } from '@/lib/glossary-service'
import { internationalComplianceService } from '@/lib/international-compliance-service'
import { REGION_LABELS } from '@/data/international-regulatory-frameworks'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'terms'
    const category = searchParams.get('category')
    const query = searchParams.get('query')

    switch (action) {
      case 'terms':
        const terms = await glossaryService.getGlossaryTerms(category || undefined)
        return NextResponse.json({
          success: true,
          data: { terms }
        })

      case 'search':
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Query parameter is required for search'
          }, { status: 400 })
        }
        const searchResults = await glossaryService.searchGlossaryTerms(query)
        return NextResponse.json({
          success: true,
          data: { terms: searchResults }
        })

      case 'rules':
        const rules = await glossaryService.getReportabilityRules(category || undefined)
        return NextResponse.json({
          success: true,
          data: { rules }
        })

      case 'stats':
        const stats = await glossaryService.getReportabilityStats()
        return NextResponse.json({
          success: true,
          data: {
            ...stats,
            international: internationalComplianceService.getStats(),
          },
        })

      case 'countries':
        const region = searchParams.get('region') || undefined
        const countries = region
          ? internationalComplianceService.getCountriesByRegion(region as keyof typeof REGION_LABELS)
          : internationalComplianceService.getAllCountries()
        return NextResponse.json({
          success: true,
          data: { countries, regions: REGION_LABELS },
        })

      case 'regime':
        const country = searchParams.get('country')
        if (!country) {
          return NextResponse.json({ success: false, error: 'country parameter required' }, { status: 400 })
        }
        const regime = internationalComplianceService.getRegime(country)
        if (!regime) {
          return NextResponse.json({ success: false, error: 'Country not found in framework' }, { status: 404 })
        }
        return NextResponse.json({ success: true, data: { regime } })

      case 'cms-glossary': {
        const cmsCategory = searchParams.get('cmsCategory') as import('@/data/cms-open-payments-glossary').CmsGlossaryCategory | null
        const letter = searchParams.get('letter') || undefined
        const terms = await glossaryService.getCmsOfficialGlossary({
          cmsCategory: cmsCategory || undefined,
          letter,
        })
        return NextResponse.json({
          success: true,
          data: { terms, meta: glossaryService.getCmsGlossaryMeta() },
        })
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported: terms, search, rules, stats, countries, regime, cms-glossary',
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in glossary API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'analyze_reportability':
        if (!data?.record) {
          return NextResponse.json({
            success: false,
            error: 'Record is required for reportability analysis'
          }, { status: 400 })
        }
        const analysis = await glossaryService.analyzeReportability(data.record)
        return NextResponse.json({
          success: true,
          data: analysis
        })

      case 'analyze_jurisdictions':
        if (!data?.record) {
          return NextResponse.json({
            success: false,
            error: 'Record is required for jurisdiction analysis',
          }, { status: 400 })
        }
        const jurisdictions = internationalComplianceService.analyzeMultiJurisdiction(data.record)
        return NextResponse.json({ success: true, data: jurisdictions })

      case 'add_term':
        if (!data?.term) {
          return NextResponse.json({
            success: false,
            error: 'Term data is required'
          }, { status: 400 })
        }
        const newTerm = await glossaryService.addGlossaryTerm(data.term)
        return NextResponse.json({
          success: true,
          data: { term: newTerm }
        })

      case 'add_rule':
        if (!data?.rule) {
          return NextResponse.json({
            success: false,
            error: 'Rule data is required'
          }, { status: 400 })
        }
        const newRule = await glossaryService.addReportabilityRule(data.rule)
        return NextResponse.json({
          success: true,
          data: { rule: newRule }
        })

      case 'update_term':
        if (!data?.id || !data?.updates) {
          return NextResponse.json({
            success: false,
            error: 'Term ID and updates are required'
          }, { status: 400 })
        }
        const updatedTerm = await glossaryService.updateGlossaryTerm(data.id, data.updates)
        if (!updatedTerm) {
          return NextResponse.json({
            success: false,
            error: 'Term not found'
          }, { status: 404 })
        }
        return NextResponse.json({
          success: true,
          data: { term: updatedTerm }
        })

      case 'update_rule':
        if (!data?.id || !data?.updates) {
          return NextResponse.json({
            success: false,
            error: 'Rule ID and updates are required'
          }, { status: 400 })
        }
        const updatedRule = await glossaryService.updateReportabilityRule(data.id, data.updates)
        if (!updatedRule) {
          return NextResponse.json({
            success: false,
            error: 'Rule not found'
          }, { status: 404 })
        }
        return NextResponse.json({
          success: true,
          data: { rule: updatedRule }
        })

      case 'delete_term':
        if (!data?.id) {
          return NextResponse.json({
            success: false,
            error: 'Term ID is required'
          }, { status: 400 })
        }
        const termDeleted = await glossaryService.deleteGlossaryTerm(data.id)
        if (!termDeleted) {
          return NextResponse.json({
            success: false,
            error: 'Term not found'
          }, { status: 404 })
        }
        return NextResponse.json({
          success: true,
          data: { deleted: true }
        })

      case 'delete_rule':
        if (!data?.id) {
          return NextResponse.json({
            success: false,
            error: 'Rule ID is required'
          }, { status: 400 })
        }
        const ruleDeleted = await glossaryService.deleteReportabilityRule(data.id)
        if (!ruleDeleted) {
          return NextResponse.json({
            success: false,
            error: 'Rule not found'
          }, { status: 404 })
        }
        return NextResponse.json({
          success: true,
          data: { deleted: true }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: analyze_reportability, add_term, add_rule, update_term, update_rule, delete_term, delete_rule'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in glossary API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
