import { NextRequest, NextResponse } from 'next/server'
import { clinicalTrialsAPIService } from '@/lib/clinicaltrials-api'

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
        const searchResults = await clinicalTrialsAPIService.searchTrials(data.searchParams)
        return NextResponse.json({
          success: true,
          data: searchResults
        })

      case 'search_classic':
        if (!data?.searchParams) {
          return NextResponse.json({
            success: false,
            error: 'Search parameters are required'
          }, { status: 400 })
        }
        const classicResults = await clinicalTrialsAPIService.searchTrialsClassic(data.searchParams)
        return NextResponse.json({
          success: true,
          data: classicResults
        })

      case 'get_trial_details':
        if (!data?.nctId) {
          return NextResponse.json({
            success: false,
            error: 'NCT ID is required'
          }, { status: 400 })
        }
        const trialDetails = await clinicalTrialsAPIService.getTrialDetails(data.nctId)
        return NextResponse.json({
          success: true,
          data: trialDetails
        })

      case 'search_for_cms_record':
        if (!data?.record) {
          return NextResponse.json({
            success: false,
            error: 'CMS record is required'
          }, { status: 400 })
        }
        const cmsTrials = await clinicalTrialsAPIService.searchTrialsForCMSRecord(data.record)
        return NextResponse.json({
          success: true,
          data: cmsTrials
        })

      case 'track_changes':
        if (!data?.nctIds || !data?.previousData) {
          return NextResponse.json({
            success: false,
            error: 'NCT IDs and previous data are required'
          }, { status: 400 })
        }
        const changes = await clinicalTrialsAPIService.trackTrialChanges(
          data.nctIds,
          new Map(Object.entries(data.previousData))
        )
        return NextResponse.json({
          success: true,
          data: changes
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: search, search_classic, get_trial_details, search_for_cms_record, track_changes'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in ClinicalTrials API:', error)
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
    const searchTerm = searchParams.get('search') || 'aspirin'
    const maxStudies = parseInt(searchParams.get('max') || '10')

    switch (action) {
      case 'health':
        const healthStatus = await clinicalTrialsAPIService.getHealthStatus()
        return NextResponse.json({
          success: true,
          data: healthStatus
        })

      case 'search':
        const searchResults = await clinicalTrialsAPIService.searchTrials({
          searchTerms: searchTerm,
          targetFields: [
            'NCTId',
            'BriefTitle',
            'Phase',
            'Status',
            'PrimaryCompletionDate',
            'Condition',
            'InterventionName'
          ],
          maxStudies,
          format: 'json'
        })
        return NextResponse.json({
          success: true,
          data: searchResults
        })

      case 'search_classic':
        const classicResults = await clinicalTrialsAPIService.searchTrialsClassic({
          searchTerms: searchTerm,
          targetFields: [
            'NCTId',
            'BriefTitle',
            'Phase',
            'Status',
            'PrimaryCompletionDate',
            'Condition',
            'InterventionName'
          ],
          maxStudies,
          format: 'json'
        })
        return NextResponse.json({
          success: true,
          data: classicResults
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: health, search, search_classic'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in ClinicalTrials API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
