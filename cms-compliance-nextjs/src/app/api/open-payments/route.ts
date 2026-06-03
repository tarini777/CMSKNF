import { NextRequest, NextResponse } from 'next/server'
import { openPaymentsAPIService } from '@/lib/open-payments-api'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'

    switch (action) {
      case 'health':
        const healthResult = await openPaymentsAPIService.getHealthStatus()
        return NextResponse.json({
          success: true,
          data: healthResult
        })

      case 'datasets':
        const datasetsResult = await openPaymentsAPIService.getAvailableDatasets()
        return NextResponse.json({
          success: true,
          data: datasetsResult
        })

      case 'search':
        const searchParams_obj: any = {}
        
        if (searchParams.get('programYear')) searchParams_obj.programYear = searchParams.get('programYear')
        if (searchParams.get('physicianName')) searchParams_obj.physicianName = searchParams.get('physicianName')
        if (searchParams.get('teachingHospitalName')) searchParams_obj.teachingHospitalName = searchParams.get('teachingHospitalName')
        if (searchParams.get('applicableManufacturerName')) searchParams_obj.applicableManufacturerName = searchParams.get('applicableManufacturerName')
        if (searchParams.get('natureOfPayment')) searchParams_obj.natureOfPayment = searchParams.get('natureOfPayment')
        if (searchParams.get('formOfPayment')) searchParams_obj.formOfPayment = searchParams.get('formOfPayment')
        if (searchParams.get('minAmount')) searchParams_obj.minAmount = parseFloat(searchParams.get('minAmount')!)
        if (searchParams.get('maxAmount')) searchParams_obj.maxAmount = parseFloat(searchParams.get('maxAmount')!)
        if (searchParams.get('state')) searchParams_obj.state = searchParams.get('state')
        if (searchParams.get('specialty')) searchParams_obj.specialty = searchParams.get('specialty')
        if (searchParams.get('limit')) searchParams_obj.limit = parseInt(searchParams.get('limit')!)
        if (searchParams.get('offset')) searchParams_obj.offset = parseInt(searchParams.get('offset')!)

        const searchResult = await openPaymentsAPIService.searchPayments(searchParams_obj)
        return NextResponse.json({
          success: true,
          data: searchResult
        })

      case 'dataset':
        const datasetId = searchParams.get('datasetId')
        if (!datasetId) {
          return NextResponse.json({
            success: false,
            error: 'Dataset ID is required'
          }, { status: 400 })
        }

        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')

        const datasetResult = await openPaymentsAPIService.getPaymentsByDataset(datasetId, limit, offset)
        return NextResponse.json({
          success: true,
          data: datasetResult
        })

      case 'trends':
        const trendsResult = await openPaymentsAPIService.getPaymentTrends()
        return NextResponse.json({
          success: true,
          data: trendsResult
        })

      case 'company_profile':
        const companyName = searchParams.get('companyName')
        if (!companyName) {
          return NextResponse.json({
            success: false,
            error: 'Company name is required'
          }, { status: 400 })
        }

        const includeDetails = searchParams.get('includeDetails') === 'true'
        const companyResult = await openPaymentsAPIService.getCompanyProfile(companyName, includeDetails)
        return NextResponse.json({
          success: true,
          data: companyResult
        })

      case 'physician_profile':
        const physicianName = searchParams.get('physicianName')
        if (!physicianName) {
          return NextResponse.json({
            success: false,
            error: 'Physician name is required'
          }, { status: 400 })
        }

        const includePhysicianDetails = searchParams.get('includeDetails') === 'true'
        const physicianResult = await openPaymentsAPIService.getPhysicianProfile(physicianName, includePhysicianDetails)
        return NextResponse.json({
          success: true,
          data: physicianResult
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: health, datasets, search, dataset, trends, company_profile, physician_profile'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in Open Payments API:', error)
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
      case 'search':
        if (!data?.searchParams) {
          return NextResponse.json({
            success: false,
            error: 'Search parameters are required'
          }, { status: 400 })
        }

        const searchResult = await openPaymentsAPIService.searchPayments(data.searchParams)
        return NextResponse.json({
          success: true,
          data: searchResult
        })

      case 'search_for_cms_record':
        if (!data?.cmsRecord) {
          return NextResponse.json({
            success: false,
            error: 'CMS record is required'
          }, { status: 400 })
        }

        const cmsSearchResult = await openPaymentsAPIService.searchPaymentsForCMSRecord(data.cmsRecord)
        return NextResponse.json({
          success: true,
          data: {
            payments: cmsSearchResult,
            count: cmsSearchResult.length
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: search, search_for_cms_record'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in Open Payments API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
