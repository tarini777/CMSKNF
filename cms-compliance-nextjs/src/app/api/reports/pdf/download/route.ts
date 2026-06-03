import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyticsService } from '@/lib/analytics-service'
import { pdfReportService } from '@/lib/pdf-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json({ success: false, error: 'Start date and end date are required' }, { status: 400 })
    }

    const [records, sessions, rules] = await Promise.all([
      prisma.cMSRecord.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reviewSession.findMany({
        where: {
          uploadTime: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      }),
      prisma.companyRule.findMany({ where: { isActive: true } }),
    ])

    if (records.length === 0) {
      return NextResponse.json({ success: false, error: 'No records found for the specified date range' }, { status: 404 })
    }

    const metrics = await analyticsService.generateAnalyticsMetrics(records, sessions, rules)
    const reportData = await analyticsService.generateReport(records, startDate, endDate)
    const pdfBlob = await pdfReportService.generateComplianceReport(reportData, metrics, false)
    const buffer = Buffer.from(await pdfBlob.arrayBuffer())

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cms-compliance-report-${startDate}-${endDate}.pdf"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('Error generating PDF download:', error)
    return NextResponse.json({ success: false, error: 'Failed to generate PDF' }, { status: 500 })
  }
}
