import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaginatedResponse } from '@/types/cms'
import { buildContainsSearch } from '@/lib/sqlite-search'
import {
  buildRecordWithPuf,
  RECORD_SPEND_INCLUDE,
} from '@/lib/lineage/record-view-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const filter = searchParams.get('filter') || 'all'
    const category = searchParams.get('category') || ''
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * perPage

    let whereClause: Record<string, unknown> = {}

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

    if (category && category !== 'all') {
      whereClause.cmsReportCategory = category
    }

    if (search.trim()) {
      whereClause = {
        ...whereClause,
        ...buildContainsSearch(
          [
            'coveredRecipientName',
            'coveredRecipientId',
            'coveredRecipientNpi',
            'physicianFirstName',
            'physicianLastName',
            'sourceSystem',
            'recordId',
          ],
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
              uploadTime: true,
            },
          },
          spendEvent: {
            include: RECORD_SPEND_INCLUDE,
          },
        },
      }),
      prisma.cMSRecord.count({ where: whereClause }),
    ])

    const totalPages = Math.ceil(total / perPage)
    const enriched = records.map((record) =>
      buildRecordWithPuf(record, record.spendEvent)
    )

    const response: PaginatedResponse = {
      success: true,
      data: enriched,
      pagination: {
        page,
        perPage,
        total,
        totalPages,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching records:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch records',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.coveredRecipientId || !body.coveredRecipientName) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: coveredRecipientId, coveredRecipientName',
        },
        { status: 400 }
      )
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
        ...body,
      },
    })

    return NextResponse.json({
      success: true,
      data: record,
    })
  } catch (error) {
    console.error('Error creating record:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create record',
      },
      { status: 500 }
    )
  }
}
