import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyticsService } from '@/lib/analytics-service'
import { pdfReportService } from '@/lib/pdf-service'

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

    // Get data for the report
    const [records, sessions, rules] = await Promise.all([
      prisma.cMSRecord.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.reviewSession.findMany({
        where: {
          uploadTime: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }),
      prisma.companyRule.findMany({
        where: { isActive: true }
      })
    ])

    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No records found for the specified date range'
      }, { status: 404 })
    }

    // Generate analytics data
    const metrics = await analyticsService.generateAnalyticsMetrics(records, sessions, rules)
    const reportData = await analyticsService.generateReport(records, startDate, endDate)

    if (body.download === true) {
      const pdfBlob = await pdfReportService.generateComplianceReport(reportData, metrics, false)
      const buffer = Buffer.from(await pdfBlob.arrayBuffer())
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="cms-compliance-report-${startDate}-${endDate}.pdf"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        reportData,
        metrics,
        downloadUrl: `/api/reports/pdf/download?startDate=${startDate}&endDate=${endDate}`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF report:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to generate PDF report'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const type = searchParams.get('type') || 'comprehensive'

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start date and end date are required'
      }, { status: 400 })
    }

    // Get data for the report
    const [records, sessions, rules] = await Promise.all([
      prisma.cMSRecord.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.reviewSession.findMany({
        where: {
          uploadTime: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }),
      prisma.companyRule.findMany({
        where: { isActive: true }
      })
    ])

    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No records found for the specified date range'
      }, { status: 404 })
    }

    // Generate analytics data
    const metrics = await analyticsService.generateAnalyticsMetrics(records, sessions, rules)
    const reportData = await analyticsService.generateReport(records, startDate, endDate)

    // Return structured data for PDF generation
    return NextResponse.json({
      success: true,
      data: {
        reportData,
        metrics,
        generatedAt: new Date().toISOString(),
        recordCount: records.length
      }
    })
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch report data'
    }, { status: 500 })
  }
}
