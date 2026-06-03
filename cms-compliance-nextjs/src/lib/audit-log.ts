import { prisma } from '@/lib/prisma'

export type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject'
export type AuditEntityType = 'record' | 'rule' | 'session'

interface CreateAuditLogParams {
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  reason?: string
  performedBy?: string
}

export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValues: (params.oldValues ?? undefined) as never,
        newValues: (params.newValues ?? undefined) as never,
        reason: params.reason,
        performedBy: params.performedBy ?? 'system',
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    return null
  }
}
