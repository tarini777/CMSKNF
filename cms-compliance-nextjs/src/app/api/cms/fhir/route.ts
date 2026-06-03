import { NextRequest, NextResponse } from 'next/server'
import { cmsFHIRAPIService } from '@/lib/cms-fhir-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'authenticate':
        const authResult = await cmsFHIRAPIService.authenticate()
        return NextResponse.json({
          success: authResult,
          message: authResult ? 'Successfully authenticated with CMS FHIR API' : 'Authentication failed'
        })

      case 'validate_patient':
        if (!data?.patientId) {
          return NextResponse.json({
            success: false,
            error: 'Patient ID is required'
          }, { status: 400 })
        }
        const patient = await cmsFHIRAPIService.validatePatient(data.patientId)
        return NextResponse.json({
          success: true,
          data: patient
        })

      case 'get_coverage':
        if (!data?.patientId) {
          return NextResponse.json({
            success: false,
            error: 'Patient ID is required'
          }, { status: 400 })
        }
        const coverage = await cmsFHIRAPIService.getPatientCoverage(data.patientId)
        return NextResponse.json({
          success: true,
          data: coverage
        })

      case 'get_eob':
        if (!data?.patientId) {
          return NextResponse.json({
            success: false,
            error: 'Patient ID is required'
          }, { status: 400 })
        }
        const eob = await cmsFHIRAPIService.getExplanationOfBenefits(
          data.patientId,
          data.startDate,
          data.endDate
        )
        return NextResponse.json({
          success: true,
          data: eob
        })

      case 'get_prior_auth':
        if (!data?.patientId) {
          return NextResponse.json({
            success: false,
            error: 'Patient ID is required'
          }, { status: 400 })
        }
        const priorAuth = await cmsFHIRAPIService.getPriorAuthorizations(
          data.patientId,
          data.startDate,
          data.endDate
        )
        return NextResponse.json({
          success: true,
          data: priorAuth
        })

      case 'get_providers':
        const providers = await cmsFHIRAPIService.getProviderDirectory(data || {})
        return NextResponse.json({
          success: true,
          data: providers
        })

      case 'validate_record':
        if (!data?.record) {
          return NextResponse.json({
            success: false,
            error: 'Record data is required'
          }, { status: 400 })
        }
        const validation = await cmsFHIRAPIService.validateCMSRecord(data.record)
        return NextResponse.json({
          success: true,
          data: validation
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: authenticate, validate_patient, get_coverage, get_eob, get_prior_auth, get_providers, validate_record'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in CMS FHIR API:', error)
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

    switch (action) {
      case 'health':
        const healthStatus = await cmsFHIRAPIService.getHealthStatus()
        return NextResponse.json({
          success: true,
          data: healthStatus
        })

      case 'authenticate':
        const authResult = await cmsFHIRAPIService.authenticate()
        return NextResponse.json({
          success: authResult,
          message: authResult ? 'Successfully authenticated with CMS FHIR API' : 'Authentication failed'
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: health, authenticate'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in CMS FHIR API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}
