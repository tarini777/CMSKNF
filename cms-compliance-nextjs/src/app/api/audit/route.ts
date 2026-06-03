import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildContainsSearch } from '@/lib/sqlite-search'
import { getSessionUser } from '@/lib/auth'
import { hasPermission } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (user && !hasPermission(user.role, 'audit:read')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const perPage = Math.min(parseInt(searchParams.get('per_page') || '50'), 200)
    const entityType = searchParams.get('entityType')
    const action = searchParams.get('action')
    const exportFormat = searchParams.get('export')
    const search = searchParams.get('search') || ''

    const skip = (page - 1) * perPage
    const whereClause: Record<string, unknown> = {}

    if (entityType) whereClause.entityType = entityType
    if (action) whereClause.action = action

    if (search.trim()) {
      Object.assign(whereClause, buildContainsSearch(['entityId', 'reason', 'performedBy'], search))
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        skip: exportFormat ? 0 : skip,
        take: exportFormat ? 10000 : perPage,
        orderBy: { performedAt: 'desc' },
      }),
      prisma.auditLog.count({ where: whereClause }),
    ])

    if (exportFormat === 'csv') {
      const header = 'id,action,entityType,entityId,performedBy,performedAt,reason\n'
      const rows = logs
        .map((log) =>
          [
            log.id,
            log.action,
            log.entityType,
            log.entityId,
            log.performedBy || '',
            log.performedAt.toISOString(),
            (log.reason || '').replace(/"/g, '""'),
          ]
            .map((v) => `"${v}"`)
            .join(',')
        )
        .join('\n')

      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        perPage,
        total,
        totalPages: Math.ceil(total / perPage),
      },
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
