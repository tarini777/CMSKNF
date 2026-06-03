import { NextRequest, NextResponse } from 'next/server'
import { apiMonitoringService } from '@/lib/api-monitoring-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service')
    const type = searchParams.get('type') || 'dashboard'

    let data

    switch (type) {
      case 'dashboard':
        data = apiMonitoringService.getDashboardData()
        break
      
      case 'status':
        if (service) {
          data = apiMonitoringService.getServiceStatus(service as 'cms' | 'pubmed' | 'clinicaltrials')
        } else {
          data = apiMonitoringService.getMonitoringStatus()
        }
        break
      
      case 'alerts':
        const activeOnly = searchParams.get('active') === 'true'
        data = activeOnly 
          ? apiMonitoringService.getActiveAlerts()
          : apiMonitoringService.getAllAlerts()
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type. Use "dashboard", "status", or "alerts"'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching monitoring data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch monitoring data'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, service, config } = body

    switch (action) {
      case 'start':
        if (!service) {
          return NextResponse.json({
            success: false,
            error: 'Service is required for start action'
          }, { status: 400 })
        }
        apiMonitoringService.startMonitoring(service)
        break
      
      case 'stop':
        if (!service) {
          return NextResponse.json({
            success: false,
            error: 'Service is required for stop action'
          }, { status: 400 })
        }
        apiMonitoringService.stopMonitoring(service)
        break
      
      case 'start_all':
        apiMonitoringService.startAllMonitoring()
        break
      
      case 'stop_all':
        apiMonitoringService.stopAllMonitoring()
        break
      
      case 'update_config':
        if (!config) {
          return NextResponse.json({
            success: false,
            error: 'Config is required for update_config action'
          }, { status: 400 })
        }
        apiMonitoringService.updateConfig(config)
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Action ${action} completed successfully`
    })
  } catch (error) {
    console.error('Error performing monitoring action:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform monitoring action'
    }, { status: 500 })
  }
}
