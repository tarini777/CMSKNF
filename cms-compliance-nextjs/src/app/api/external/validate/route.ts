import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { externalAPIService } from '@/lib/external-apis'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { recordId, sessionId, batchMode = false } = body

    if (batchMode) {
      // Batch validation for multiple records
      let records
      
      if (sessionId) {
        records = await prisma.cMSRecord.findMany({
          where: { reviewSessionId: sessionId }
        })
      } else {
        records = await prisma.cMSRecord.findMany({
          take: 100 // Limit for performance
        })
      }

      if (records.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No records found for validation'
        }, { status: 404 })
      }

      const validationResults = await externalAPIService.batchValidateRecords(records)
      
      // Update records with validation results
      const updatePromises = Array.from(validationResults.entries()).map(async ([recordId, results]) => {
        return prisma.cMSRecord.update({
          where: { id: recordId },
          data: {
            appliedRules: {
              externalValidation: {
                results,
                validatedAt: new Date().toISOString()
              }
            }
          }
        })
      })

      await Promise.all(updatePromises)

      return NextResponse.json({
        success: true,
        data: {
          totalRecords: records.length,
          validationResults: Object.fromEntries(validationResults)
        }
      })
    } else {
      // Single record validation
      if (!recordId) {
        return NextResponse.json({
          success: false,
          error: 'Record ID is required for single record validation'
        }, { status: 400 })
      }

      const record = await prisma.cMSRecord.findUnique({
        where: { id: recordId }
      })

      if (!record) {
        return NextResponse.json({
          success: false,
          error: 'Record not found'
        }, { status: 404 })
      }

      const externalData = await externalAPIService.getExternalData(record)

      // Update record with validation results
      await prisma.cMSRecord.update({
        where: { id: recordId },
        data: {
          appliedRules: {
            externalValidation: {
              results: externalData,
              validatedAt: new Date().toISOString()
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          recordId,
          externalData
        }
      })
    }
  } catch (error) {
    console.error('Error in external validation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to perform external validation'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const recordId = searchParams.get('recordId')
    const sessionId = searchParams.get('sessionId')

    let records

    if (recordId) {
      records = await prisma.cMSRecord.findMany({
        where: { id: recordId }
      })
    } else if (sessionId) {
      records = await prisma.cMSRecord.findMany({
        where: { reviewSessionId: sessionId }
      })
    } else {
      records = await prisma.cMSRecord.findMany({
        where: {
          appliedRules: {
            path: ['externalValidation'],
            not: null
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 50
      })
    }

    const validationResults = records.map(record => ({
      recordId: record.id,
      coveredRecipientName: record.coveredRecipientName,
      totalAmountOfPaymentUsdollars: record.totalAmountOfPaymentUsdollars,
      externalValidation: record.appliedRules?.externalValidation
    }))

    return NextResponse.json({
      success: true,
      data: validationResults
    })
  } catch (error) {
    console.error('Error fetching validation results:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch validation results'
    }, { status: 500 })
  }
}
