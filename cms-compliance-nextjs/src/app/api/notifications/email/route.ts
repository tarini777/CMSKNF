import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emailService } from '@/lib/email-service'
import { mlService } from '@/lib/ml-service'
import { readJsonField } from '@/lib/prisma-json'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, recipients, options = {} } = body

    if (!type || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({
        success: false,
        error: 'Type and recipients array are required'
      }, { status: 400 })
    }

    let result = false

    switch (type) {
      case 'anomaly_alert':
        result = await handleAnomalyAlert(recipients, options)
        break
      
      case 'daily_summary':
        result = await handleDailySummary(recipients)
        break
      
      case 'compliance_report':
        result = await handleComplianceReport(recipients, options)
        break
      
      case 'batch_anomaly_alert':
        result = await handleBatchAnomalyAlert(recipients, options)
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid notification type'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: result,
      message: result ? 'Email sent successfully' : 'Failed to send email'
    })
  } catch (error) {
    console.error('Error sending email notification:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send email notification'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'daily_summary'
    const recipients = searchParams.get('recipients')?.split(',') || []

    if (recipients.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Recipients are required'
      }, { status: 400 })
    }

    let result = false

    switch (type) {
      case 'daily_summary':
        result = await handleDailySummary(recipients)
        break
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid notification type'
        }, { status: 400 })
    }

    return NextResponse.json({
      success: result,
      message: result ? 'Email sent successfully' : 'Failed to send email'
    })
  } catch (error) {
    console.error('Error sending email notification:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to send email notification'
    }, { status: 500 })
  }
}

async function handleAnomalyAlert(recipients: string[], options: any) {
  try {
    const { recordId, anomalyResult } = options

    if (!recordId || !anomalyResult) {
      throw new Error('Record ID and anomaly result are required')
    }

    const record = await prisma.cMSRecord.findUnique({
      where: { id: recordId }
    })

    if (!record) {
      throw new Error('Record not found')
    }

    const alert = {
      recordId: record.id,
      record,
      anomalyResult,
      severity: anomalyResult.riskLevel,
      detectedAt: new Date()
    }

    return await emailService.sendAnomalyAlert(alert, recipients)
  } catch (error) {
    console.error('Error handling anomaly alert:', error)
    return false
  }
}

async function handleDailySummary(recipients: string[]) {
  try {
    // Get data for the last 24 hours
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const [records, sessions] = await Promise.all([
      prisma.cMSRecord.findMany({
        where: {
          createdAt: {
            gte: yesterday
          }
        }
      }),
      prisma.reviewSession.findMany({
        where: {
          uploadTime: {
            gte: yesterday
          }
        }
      })
    ])

    // Calculate summary metrics
    const anomaliesDetected = records.filter(
      (r) => (readJsonField(r.appliedRules, 'anomalyDetection') as { isAnomaly?: boolean } | undefined)?.isAnomaly
    ).length
    const complianceScore = records.length > 0 
      ? Math.round((records.filter(r => r.isReportable).length / records.length) * 100)
      : 100

    // Get top anomaly types
    const anomalyTypes: { [key: string]: number } = {}
    records.forEach(record => {
      const anomaly = readJsonField(record.appliedRules, 'anomalyDetection') as { reasons?: string[] } | undefined
      const reasons = anomaly?.reasons || []
      reasons.forEach((reason: string) => {
        anomalyTypes[reason] = (anomalyTypes[reason] || 0) + 1
      })
    })

    const topAnomalies = Object.entries(anomalyTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const summary = {
      totalRecords: records.length,
      anomaliesDetected,
      complianceScore,
      topAnomalies
    }

    return await emailService.sendDailySummary(summary, recipients)
  } catch (error) {
    console.error('Error handling daily summary:', error)
    return false
  }
}

async function handleComplianceReport(recipients: string[], options: any) {
  try {
    const { startDate, endDate, reportData } = options

    if (!startDate || !endDate || !reportData) {
      throw new Error('Start date, end date, and report data are required')
    }

    // In a real implementation, you would generate the PDF here
    // For now, we'll just send the email without attachment
    return await emailService.sendComplianceReport(reportData, recipients)
  } catch (error) {
    console.error('Error handling compliance report:', error)
    return false
  }
}

async function handleBatchAnomalyAlert(recipients: string[], options: any) {
  try {
    const { recordIds, severity } = options

    if (!recordIds || !Array.isArray(recordIds)) {
      throw new Error('Record IDs array is required')
    }

    // Get records with anomaly detection results
    const recordsRaw = await prisma.cMSRecord.findMany({
      where: {
        id: { in: recordIds },
        appliedRules: { not: undefined },
      },
    })
    const records = recordsRaw.filter((r) => readJsonField(r.appliedRules, 'anomalyDetection') != null)

    if (records.length === 0) {
      throw new Error('No records with anomaly data found')
    }

    // Create alerts
    const alerts = records.map(record => {
      const anomalyResult = readJsonField(record.appliedRules, 'anomalyDetection') as {
        riskLevel?: string
      } | undefined
      return {
        recordId: record.id,
        record,
        anomalyResult,
        severity: anomalyResult?.riskLevel || 'medium',
        detectedAt: new Date(record.updatedAt),
      }
    })

    // Filter by severity if specified
    const filteredAlerts = severity 
      ? alerts.filter(alert => alert.severity === severity)
      : alerts

    return await emailService.sendBatchAnomalyAlerts(
      filteredAlerts.filter((a) => a.anomalyResult != null) as Parameters<
        typeof emailService.sendBatchAnomalyAlerts
      >[0],
      recipients
    )
  } catch (error) {
    console.error('Error handling batch anomaly alert:', error)
    return false
  }
}
