import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { PaginatedResponse } from '@/types/cms'
import { buildContainsSearch } from '@/lib/sqlite-search'
import { createAuditLog } from '@/lib/audit-log'
import { getPerformedBy } from '@/lib/request-user'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = parseInt(searchParams.get('per_page') || '20')
    const search = searchParams.get('search') || ''
    const active = searchParams.get('active')

    const skip = (page - 1) * perPage

    let whereClause: Record<string, unknown> = {}

    if (active === 'true' || active === 'false') {
      whereClause.isActive = active === 'true'
    }

    if (search.trim()) {
      whereClause = { ...whereClause, ...buildContainsSearch(['name', 'description'], search) }
    }

    const [rules, total] = await Promise.all([
      prisma.companyRule.findMany({
        where: whereClause,
        skip,
        take: perPage,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.companyRule.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(total / perPage)

    const response: PaginatedResponse = {
      success: true,
      data: rules,
      pagination: {
        page,
        perPage,
        total,
        totalPages
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch rules'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    if (!body.name || !body.description || !body.ruleType) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, description, ruleType'
      }, { status: 400 })
    }

    const rule = await prisma.companyRule.create({
      data: {
        name: body.name,
        description: body.description,
        ruleType: body.ruleType,
        conditions: body.conditions || {},
        isActive: body.isActive !== undefined ? body.isActive : true,
        priority: body.priority || 0,
        createdBy: body.createdBy || (await getPerformedBy()),
      },
    })

    await createAuditLog({
      action: 'create',
      entityType: 'rule',
      entityId: rule.id,
      newValues: { name: rule.name, ruleType: rule.ruleType, isActive: rule.isActive },
      performedBy: await getPerformedBy(),
    })

    return NextResponse.json({
      success: true,
      data: rule
    })
  } catch (error) {
    console.error('Error creating rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create rule'
    }, { status: 500 })
  }
}
