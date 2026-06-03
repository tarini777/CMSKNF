import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyticsService } from '@/lib/analytics-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get all data for analytics
    const [records, sessions, rules] = await Promise.all([
      prisma.cMSRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10000 // Limit for performance
      }),
      prisma.reviewSession.findMany({
        orderBy: { uploadTime: 'desc' }
      }),
      prisma.companyRule.findMany({
        where: { isActive: true }
      })
    ])

    // Filter records by date range if provided
    let filteredRecords = records
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      filteredRecords = records.filter(record => {
        const recordDate = new Date(record.createdAt)
        return recordDate >= start && recordDate <= end
      })
    }

    // Generate analytics metrics
    const metrics = await analyticsService.generateAnalyticsMetrics(
      filteredRecords,
      sessions,
      rules
    )

    return NextResponse.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Error generating analytics metrics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate analytics metrics'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startDate, endDate, reportType = 'comprehensive' } = body

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date and end date are required'
      }, { status: 400 })
    }

    // Get records for the specified date range
    const records = await prisma.cMSRecord.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No records found for the specified date range'
      }, { status: 404 })
    }

    // Generate report
    const report = await analyticsService.generateReport(records, startDate, endDate)

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate report'
    }, { status: 500 })
  }
}
