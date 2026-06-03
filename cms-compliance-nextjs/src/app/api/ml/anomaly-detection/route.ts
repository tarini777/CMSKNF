import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mlService } from '@/lib/ml-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, recordIds } = body

    let records

    if (sessionId) {
      // Get records from specific session
      records = await prisma.cMSRecord.findMany({
        where: { reviewSessionId: sessionId }
      })
    } else if (recordIds && Array.isArray(recordIds)) {
      // Get specific records
      records = await prisma.cMSRecord.findMany({
        where: { id: { in: recordIds } }
      })
    } else {
      // Get all records for training
      records = await prisma.cMSRecord.findMany({
        take: 1000 // Limit for performance
      })
    }

    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No records found for analysis'
      }, { status: 404 })
    }

    // Train model if not already trained
    if (!mlService['isModelTrained']) {
      await mlService.trainAnomalyDetectionModel(records)
    }

    // Detect anomalies
    const anomalyResults = mlService.detectAnomalies(records)

    // Calculate data quality score
    const qualityScore = mlService.calculateDataQualityScore(records)

    // Update records with anomaly detection results
    const updatePromises = records.map(async (record, index) => {
      const result = anomalyResults[index]
      return prisma.cMSRecord.update({
        where: { id: record.id },
        data: {
          appliedRules: {
            anomalyDetection: {
              isAnomaly: result.isAnomaly,
              anomalyScore: result.anomalyScore,
              confidence: result.confidence,
              riskLevel: result.riskLevel,
              reasons: result.reasons,
              detectedAt: new Date().toISOString()
            }
          }
        }
      })
    })

    await Promise.all(updatePromises)

    // Generate summary statistics
    const summary = {
      totalRecords: records.length,
      anomaliesDetected: anomalyResults.filter(r => r.isAnomaly).length,
      highRiskRecords: anomalyResults.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical').length,
      averageAnomalyScore: anomalyResults.reduce((sum, r) => sum + r.anomalyScore, 0) / anomalyResults.length,
      dataQualityScore: qualityScore.overallScore,
      topAnomalyReasons: this.getTopAnomalyReasons(anomalyResults)
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        qualityScore,
        anomalyResults: anomalyResults.map((result, index) => ({
          recordId: records[index].id,
          ...result
        }))
      }
    })
  } catch (error) {
    console.error('Error in anomaly detection:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform anomaly detection'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    // Get recent anomaly detection results
    const records = await prisma.cMSRecord.findMany({
      where: {
        ...(sessionId && { reviewSessionId: sessionId }),
        appliedRules: {
          path: ['anomalyDetection'],
          not: null
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 100
    })

    const anomalyResults = records.map(record => ({
      recordId: record.id,
      coveredRecipientName: record.coveredRecipientName,
      totalAmountOfPaymentUsdollars: record.totalAmountOfPaymentUsdollars,
      anomalyDetection: record.appliedRules?.anomalyDetection
    }))

    return NextResponse.json({
      success: true,
      data: anomalyResults
    })
  } catch (error) {
    console.error('Error fetching anomaly results:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch anomaly results'
    }, { status: 500 })
  }
}

function getTopAnomalyReasons(anomalyResults: any[]): string[] {
  const reasonCounts: { [key: string]: number } = {}
  
  anomalyResults.forEach(result => {
    result.reasons.forEach((reason: string) => {
      reasonCounts[reason] = (reasonCounts[reason] || 0) + 1
    })
  })

  return Object.entries(reasonCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([reason]) => reason)
}
