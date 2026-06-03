import { NextRequest, NextResponse } from 'next/server'
import { historicalPaymentsService } from '@/lib/historical-payments-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'import':
        if (!data?.source || !data?.data) {
          return NextResponse.json({
            success: false,
            error: 'Source and data are required for import'
          }, { status: 400 })
        }
        const importResult = await historicalPaymentsService.importHistoricalData(data.source, data.data)
        return NextResponse.json({
          success: true,
          data: importResult
        })

      case 'search':
        const searchResult = await historicalPaymentsService.searchHistoricalPayments(data?.filters || {})
        return NextResponse.json({
          success: true,
          data: searchResult
        })

      case 'export':
        if (!data?.filters) {
          return NextResponse.json({
            success: false,
            error: 'Filters are required for export'
          }, { status: 400 })
        }
        const exportResult = await historicalPaymentsService.exportHistoricalData(
          data.filters,
          data.format || 'csv'
        )
        return NextResponse.json({
          success: true,
          data: exportResult
        })

      case 'compare_companies':
        if (!data?.companyNames || !Array.isArray(data.companyNames)) {
          return NextResponse.json({
            success: false,
            error: 'Company names array is required'
          }, { status: 400 })
        }
        const comparisonResult = await historicalPaymentsService.comparePharmaCompanies(data.companyNames)
        return NextResponse.json({
          success: true,
          data: comparisonResult
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: import, search, export, compare_companies'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in historical payments API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'search'
    const pharmaCompany = searchParams.get('pharmaCompany')
    const reportingPeriod = searchParams.get('reportingPeriod')
    const timeRange = searchParams.get('timeRange') as 'yearly' | 'quarterly' | 'monthly' || 'yearly'

    switch (action) {
      case 'search':
        const filters: any = {}
        if (pharmaCompany) filters.pharmaCompany = pharmaCompany
        if (searchParams.get('recipientName')) filters.recipientName = searchParams.get('recipientName')
        if (searchParams.get('startDate') && searchParams.get('endDate')) {
          filters.dateRange = {
            startDate: searchParams.get('startDate'),
            endDate: searchParams.get('endDate')
          }
        }
        if (searchParams.get('minAmount') && searchParams.get('maxAmount')) {
          filters.amountRange = {
            minAmount: parseFloat(searchParams.get('minAmount')!),
            maxAmount: parseFloat(searchParams.get('maxAmount')!)
          }
        }
        if (searchParams.get('therapeuticArea')) filters.therapeuticArea = searchParams.get('therapeuticArea')
        if (searchParams.get('complianceStatus')) filters.complianceStatus = searchParams.get('complianceStatus')
        if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit')!)
        if (searchParams.get('offset')) filters.offset = parseInt(searchParams.get('offset')!)

        const searchResult = await historicalPaymentsService.searchHistoricalPayments(filters)
        return NextResponse.json({
          success: true,
          data: searchResult
        })

      case 'aggregate_spend':
        if (!pharmaCompany) {
          return NextResponse.json({
            success: false,
            error: 'Pharma company is required'
          }, { status: 400 })
        }
        const aggregateResult = await historicalPaymentsService.getAggregateSpendSummary(
          pharmaCompany,
          reportingPeriod || undefined
        )
        return NextResponse.json({
          success: true,
          data: aggregateResult
        })

      case 'therapeutic_analysis':
        const therapeuticResult = await historicalPaymentsService.getTherapeuticAreaAnalysis()
        return NextResponse.json({
          success: true,
          data: therapeuticResult
        })

      case 'compliance_trends':
        const trendsResult = await historicalPaymentsService.getComplianceTrends(timeRange)
        return NextResponse.json({
          success: true,
          data: trendsResult
        })

      case 'data_quality':
        const qualityResult = await historicalPaymentsService.getDataQualityMetrics()
        return NextResponse.json({
          success: true,
          data: qualityResult
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: search, aggregate_spend, therapeutic_analysis, compliance_trends, data_quality'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in historical payments API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
