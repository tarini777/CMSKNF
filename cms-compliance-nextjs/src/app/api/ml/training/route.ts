import { NextRequest, NextResponse } from 'next/server'
import { mlTrainingService } from '@/lib/ml-training-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      startDate, 
      endDate, 
      trainingOptions = {},
      action = 'train'
    } = body

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date and end date are required'
      }, { status: 400 })
    }

    let result

    switch (action) {
      case 'train':
        result = await mlTrainingService.trainModelWithHistoricalData(
          new Date(startDate),
          new Date(endDate),
          trainingOptions
        )
        break
      
      case 'retrain':
        // For retraining, we would typically get new data from the request
        const newData = body.newData || []
        result = await mlTrainingService.retrainModel(newData)
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use "train" or "retrain"'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: result.success,
      data: result
    })
  } catch (error) {
    console.error('Error in ML training:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform ML training'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'performance'

    let data

    switch (type) {
      case 'performance':
        data = mlTrainingService.getCurrentModelPerformance()
        break
      
      case 'history':
        data = mlTrainingService.getModelPerformanceHistory()
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid type. Use "performance" or "history"'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching ML training data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch ML training data'
    }, { status: 500 })
  }
}
