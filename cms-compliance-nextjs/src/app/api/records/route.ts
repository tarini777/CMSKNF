import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaginatedResponse } from '@/types/cms'
import { buildContainsSearch } from '@/lib/sqlite-search'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * perPage

    // Build where clause based on filters
    let whereClause: any = {}
    
    if (filter === 'reportable') {
      whereClause.isReportable = true
    } else if (filter === 'non_reportable') {
      whereClause.isReportable = false
    } else if (filter === 'pending') {
      whereClause.humanDecision = 'pending'
    } else if (filter === 'approved') {
      whereClause.humanDecision = 'approve'
    } else if (filter === 'rejected') {
      whereClause.humanDecision = 'reject'
    }

    // Add search functionality
    if (search.trim()) {
      whereClause = {
        ...whereClause,
        ...buildContainsSearch(
          ['coveredRecipientName', 'coveredRecipientId', 'physicianFirstName', 'physicianLastName'],
          search
        ),
      }
    }

    const [records, total] = await Promise.all([
      prisma.cMSRecord.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewSession: {
            select: {
              sessionId: true,
              filename: true,
              uploadTime: true
            }
          }
        }
      }),
      prisma.cMSRecord.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(total / perPage)

    const response: PaginatedResponse = {
      success: true,
      data: records,
      pagination: {
        page,
        perPage,
        total,
        totalPages
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching records:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch records'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.coveredRecipientId || !body.coveredRecipientName) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: coveredRecipientId, coveredRecipientName'
      }, { status: 400 })
    }

    const record = await prisma.cMSRecord.create({
      data: {
        recordId: body.recordId || `REC_${Date.now()}`,
        coveredRecipientId: body.coveredRecipientId,
        coveredRecipientName: body.coveredRecipientName,
        coveredRecipientType: body.coveredRecipientType || '',
        totalAmountOfPaymentUsdollars: parseFloat(body.totalAmountOfPaymentUsdollars) || 0,
        isReportable: body.isReportable || false,
        humanDecision: body.humanDecision || 'pending',
        ...body
      }
    })

    return NextResponse.json({
      success: true,
      data: record
    })
  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create record'
    }, { status: 500 })
  }
}
