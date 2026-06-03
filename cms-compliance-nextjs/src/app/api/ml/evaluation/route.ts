import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mlService } from '@/lib/ml-service'

export async function GET() {
  try {
    const records = await prisma.cMSRecord.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
    })

    if (records.length < 10) {
      return NextResponse.json({
        success: true,
        data: {
          status: 'insufficient_data',
          sampleSize: records.length,
          minimumRequired: 10,
          message: 'Upload more records to run ML evaluation',
        },
      })
    }

    const features = records.map((r) => ({
      amount: r.totalAmountOfPaymentUsdollars,
      isReportable: r.isReportable ? 1 : 0,
      hasDecision: r.humanDecision && r.humanDecision !== 'pending' ? 1 : 0,
    }))

    const anomalies = await mlService.detectAnomalies(records.slice(0, 100))
    const anomalyRate = anomalies.filter((a) => a.isAnomaly).length / Math.max(anomalies.length, 1)
    const agreementWithRules = records.filter(
      (r) => r.humanDecision === 'approve' && r.isReportable
    ).length / Math.max(records.filter((r) => r.humanDecision === 'approve').length, 1)

    return NextResponse.json({
      success: true,
      data: {
        status: 'evaluated',
        sampleSize: records.length,
        anomalyRate: Number((anomalyRate * 100).toFixed(2)),
        ruleAgreementRate: Number((agreementWithRules * 100).toFixed(2)),
        modelType: 'Isolation Forest',
        targetAccuracy: Number(process.env.ML_ACCURACY_THRESHOLD || '0.9') * 100,
        evaluatedAt: new Date().toISOString(),
        featureCount: Object.keys(features[0] || {}).length,
      },
    })
  } catch (error) {
    console.error('ML evaluation error:', error)
    return NextResponse.json({ success: false, error: 'ML evaluation failed' }, { status: 500 })
  }
}
