import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-log'
import { getPerformedBy } from '@/lib/request-user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rule = await prisma.companyRule.findUnique({
      where: { id }
    })

    if (!rule) {
      return NextResponse.json({
        success: false,
        error: 'Rule not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: rule
    })
  } catch (error) {
    console.error('Error fetching rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch rule'
    }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.companyRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 })
    }

    const rule = await prisma.companyRule.update({
      where: { id },
      data: {
        ...body,
        updatedBy: body.updatedBy || (await getPerformedBy()),
        updatedAt: new Date(),
      },
    })

    await createAuditLog({
      action: 'update',
      entityType: 'rule',
      entityId: rule.id,
      oldValues: { name: existing.name, isActive: existing.isActive },
      newValues: { name: rule.name, isActive: rule.isActive },
      performedBy: await getPerformedBy(),
    })

    return NextResponse.json({
      success: true,
      data: rule
    })
  } catch (error) {
    console.error('Error updating rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update rule'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await prisma.companyRule.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Rule not found' }, { status: 404 })
    }

    await prisma.companyRule.delete({
      where: { id },
    })

    await createAuditLog({
      action: 'delete',
      entityType: 'rule',
      entityId: id,
      oldValues: { name: existing.name },
      performedBy: await getPerformedBy(),
    })

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting rule:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete rule'
    }, { status: 500 })
  }
}
