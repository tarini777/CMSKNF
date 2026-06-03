import { NextRequest, NextResponse } from 'next/server'
import { pubmedAPIService } from '@/lib/pubmed-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'search':
        if (!data?.searchParams) {
          return NextResponse.json({
            success: false,
            error: 'Search parameters are required'
          }, { status: 400 })
        }
        const searchResults = await pubmedAPIService.searchArticles(data.searchParams)
        return NextResponse.json({
          success: true,
          data: searchResults
        })

      case 'get_article_details':
        if (!data?.pmid) {
          return NextResponse.json({
            success: false,
            error: 'PMID is required'
          }, { status: 400 })
        }
        const articleDetails = await pubmedAPIService.getArticleDetails(data.pmid)
        return NextResponse.json({
          success: true,
          data: articleDetails
        })

      case 'search_for_cms_record':
        if (!data?.record) {
          return NextResponse.json({
            success: false,
            error: 'CMS record is required'
          }, { status: 400 })
        }
        const cmsArticles = await pubmedAPIService.searchArticlesForCMSRecord(data.record)
        return NextResponse.json({
          success: true,
          data: cmsArticles
        })

      case 'get_citations':
        if (!data?.pmids || !Array.isArray(data.pmids)) {
          return NextResponse.json({
            success: false,
            error: 'PMID array is required'
          }, { status: 400 })
        }
        const citations = await pubmedAPIService.getCitations(data.pmids)
        return NextResponse.json({
          success: true,
          data: citations
        })

      case 'get_related_articles':
        if (!data?.pmid) {
          return NextResponse.json({
            success: false,
            error: 'PMID is required'
          }, { status: 400 })
        }
        const relatedArticles = await pubmedAPIService.getRelatedArticles(data.pmid)
        return NextResponse.json({
          success: true,
          data: relatedArticles
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: search, get_article_details, search_for_cms_record, get_citations, get_related_articles'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in PubMed API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'
    const query = searchParams.get('query') || 'aspirin'
    const maxResults = parseInt(searchParams.get('max') || '10')
    const pmid = searchParams.get('pmid')

    switch (action) {
      case 'health':
        const healthStatus = await pubmedAPIService.getHealthStatus()
        return NextResponse.json({
          success: true,
          data: healthStatus
        })

      case 'search':
        const searchResults = await pubmedAPIService.searchArticles({
          query,
          maxResults,
          sortBy: 'relevance'
        })
        return NextResponse.json({
          success: true,
          data: searchResults
        })

      case 'get_article_details':
        if (!pmid) {
          return NextResponse.json({
            success: false,
            error: 'PMID parameter is required'
          }, { status: 400 })
        }
        const articleDetails = await pubmedAPIService.getArticleDetails(pmid)
        return NextResponse.json({
          success: true,
          data: articleDetails
        })

      case 'get_citations':
        if (!pmid) {
          return NextResponse.json({
            success: false,
            error: 'PMID parameter is required'
          }, { status: 400 })
        }
        const citations = await pubmedAPIService.getCitations([pmid])
        return NextResponse.json({
          success: true,
          data: citations
        })

      case 'get_related_articles':
        if (!pmid) {
          return NextResponse.json({
            success: false,
            error: 'PMID parameter is required'
          }, { status: 400 })
        }
        const relatedArticles = await pubmedAPIService.getRelatedArticles(pmid)
        return NextResponse.json({
          success: true,
          data: relatedArticles
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: health, search, get_article_details, get_citations, get_related_articles'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in PubMed API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
