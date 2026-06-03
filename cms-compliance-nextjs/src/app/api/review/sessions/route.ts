import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, PaginatedResponse } from '@/types/cms'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const status = searchParams.get('status')

    const skip = (page - 1) * perPage

    // Build where clause
    let whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    const [sessions, total] = await Promise.all([
      prisma.reviewSession.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: { uploadTime: 'desc' },
        include: {
          records: {
            select: {
              id: true,
              isReportable: true,
              humanDecision: true,
              totalAmountOfPaymentUsdollars: true
            }
          }
        }
      }),
      prisma.reviewSession.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(total / perPage)

    const response: PaginatedResponse = {
      success: true,
      data: sessions,
      pagination: {
        page,
        perPage,
        total,
        totalPages
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching review sessions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch review sessions'
    }, { status: 500 })
  }
}
