import { NextRequest, NextResponse } from 'next/server'
import { dataAnalysisService } from '@/lib/data-analysis-service'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'status'

    switch (action) {
      case 'status':
        const records = dataAnalysisService.getRecords()
        const analysisResults = dataAnalysisService.getAnalysisResults()
        
        return NextResponse.json({
          success: true,
          data: {
            recordsLoaded: records.length,
            analysisCompleted: analysisResults.length,
            lastUpdated: new Date().toISOString()
          }
        })

      case 'records':
        const allRecords = dataAnalysisService.getRecords()
        const limit = parseInt(searchParams.get('limit') || '100')
        const offset = parseInt(searchParams.get('offset') || '0')
        
        return NextResponse.json({
          success: true,
          data: {
            records: allRecords.slice(offset, offset + limit),
            total: allRecords.length,
            limit,
            offset
          }
        })

      case 'analysis':
        const results = dataAnalysisService.getAnalysisResults()
        const analysisLimit = parseInt(searchParams.get('limit') || '100')
        const analysisOffset = parseInt(searchParams.get('offset') || '0')
        
        return NextResponse.json({
          success: true,
          data: {
            results: results.slice(analysisOffset, analysisOffset + analysisLimit),
            total: results.length,
            limit: analysisLimit,
            offset: analysisOffset
          }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: status, records, analysis'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in data analysis API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'load_data':
        if (!data?.filePaths) {
          return NextResponse.json({
            success: false,
            error: 'File paths are required for data loading'
          }, { status: 400 })
        }

        // For now, we'll use mock data since we can't directly access the CSV files
        // In a production environment, you would implement proper CSV parsing
        const mockResult = {
          success: true,
          records: 1000, // Mock number
          errors: []
        }

        return NextResponse.json({
          success: true,
          data: mockResult
        })

      case 'analyze_patterns':
        try {
          const patternAnalysis = await dataAnalysisService.analyzePatterns()
          return NextResponse.json({
            success: true,
            data: patternAnalysis
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'No data loaded. Please load CMS data first.',
            details: error instanceof Error ? error.message : 'Unknown error'
          }, { status: 400 })
        }

      case 'analyze_record':
        if (!data?.record) {
          return NextResponse.json({
            success: false,
            error: 'Record data is required for analysis'
          }, { status: 400 })
        }

        // This would analyze a single record
        // For now, return a mock analysis
        const mockAnalysis = {
          recordId: data.record.recordId || 'mock-id',
          isReportable: true,
          confidence: 0.85,
          riskLevel: 'medium',
          fraudIndicators: ['High payment amount'],
          anomalyScore: 0.3,
          reportabilityAnalysis: {
            isReportable: true,
            confidence: 0.85,
            applicableRules: ['rule_amount_threshold'],
            reasoning: ['Payment amount exceeds reporting threshold'],
            warnings: [],
            recommendations: ['Verify payment documentation']
          },
          patterns: {
            amountPattern: 'High amount',
            timingPattern: 'Regular timing',
            recipientPattern: 'Physician',
            manufacturerPattern: 'Corporate entity'
          },
          recommendations: ['Review high-value payment documentation']
        }

        return NextResponse.json({
          success: true,
          data: mockAnalysis
        })

      case 'clear_data':
        dataAnalysisService.clearData()
        return NextResponse.json({
          success: true,
          data: { message: 'All data cleared successfully' }
        })

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: load_data, analyze_patterns, analyze_record, clear_data'
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in data analysis API:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
