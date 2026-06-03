import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit-log'

export type DedupReviewStatus = 'none' | 'pending' | 'resolved' | 'dismissed'
export type DedupResolveAction = 'merge' | 'keep_both' | 'split'

export interface DedupClusterMember {
  spendEventId: string
  sourceSystem: string
  sourceName?: string
  amountUsd: number
  paymentDate?: string | null
  natureOfPayment?: string | null
  cmsCategory: string
  status: string
  isPrimaryLine: boolean
  dedupReviewStatus: string
  hcpName?: string
  hcpNpi?: string
  cmsRecordId?: string
  recordId?: string
  isReportable?: boolean
  createdAt: Date
}

export interface DedupClusterView {
  clusterId: string
  crossSourceDedupKey?: string | null
  memberCount: number
  sourceCount: number
  sources: string[]
  totalAmountUsd: number
  dedupReviewStatus: DedupReviewStatus
  members: DedupClusterMember[]
}

const SPEND_EVENT_INCLUDE = {
  dataSource: { select: { sourceKey: true, sourceName: true } },
  hcpMaster: { select: { fullName: true, npi: true } },
  cmsRecord: { select: { id: true, recordId: true, isReportable: true } },
  generalLine: { select: { recordId: true } },
} as const

export async function assignDedupClusterForSpendEvent(
  spendEventId: string,
  crossSourceDedupKey: string,
  sourceSystem: string
): Promise<{ clusterId: string; isCollision: boolean }> {
  const event = await prisma.spendEvent.findUnique({
    where: { id: spendEventId },
    select: { dedupKey: true },
  })
  if (!event) throw new Error(`Spend event not found: ${spendEventId}`)

  const siblings = await prisma.spendEvent.findMany({
    where: {
      crossSourceDedupKey,
      sourceSystem: { not: sourceSystem },
      id: { not: spendEventId },
    },
    select: { id: true, dedupClusterId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (siblings.length === 0) {
    await prisma.spendEvent.update({
      where: { id: spendEventId },
      data: {
        crossSourceDedupKey,
        dedupClusterId: event.dedupKey,
        dedupReviewStatus: 'none',
      },
    })
    return { clusterId: event.dedupKey, isCollision: false }
  }

  const clusterId = siblings[0].dedupClusterId || crossSourceDedupKey
  const memberIds = [spendEventId, ...siblings.map((s) => s.id)]

  await prisma.spendEvent.updateMany({
    where: { id: { in: memberIds } },
    data: {
      crossSourceDedupKey,
      dedupClusterId: clusterId,
      dedupReviewStatus: 'pending',
    },
  })

  return { clusterId, isCollision: true }
}

function clusterReviewStatus(members: Array<{ dedupReviewStatus: string }>): DedupReviewStatus {
  if (members.some((m) => m.dedupReviewStatus === 'pending')) return 'pending'
  if (members.every((m) => m.dedupReviewStatus === 'resolved')) return 'resolved'
  if (members.some((m) => m.dedupReviewStatus === 'dismissed')) return 'dismissed'
  return 'none'
}

function toMember(
  event: Awaited<ReturnType<typeof loadClusterMembers>>[number]
): DedupClusterMember {
  return {
    spendEventId: event.id,
    sourceSystem: event.sourceSystem,
    sourceName: event.dataSource?.sourceName,
    amountUsd: event.amountUsd,
    paymentDate: event.paymentDate,
    natureOfPayment: event.natureOfPayment,
    cmsCategory: event.cmsCategory,
    status: event.status,
    isPrimaryLine: event.isPrimaryLine,
    dedupReviewStatus: event.dedupReviewStatus,
    hcpName: event.hcpMaster?.fullName || undefined,
    hcpNpi: event.hcpMaster?.npi || undefined,
    cmsRecordId: event.cmsRecord?.id,
    recordId: event.cmsRecord?.recordId || event.generalLine?.recordId,
    isReportable: event.cmsRecord?.isReportable,
    createdAt: event.createdAt,
  }
}

async function loadClusterMembers(clusterId: string) {
  return prisma.spendEvent.findMany({
    where: { dedupClusterId: clusterId },
    include: SPEND_EVENT_INCLUDE,
    orderBy: { createdAt: 'asc' },
  })
}

export async function getDedupClusters(options?: {
  status?: 'pending' | 'all'
}): Promise<DedupClusterView[]> {
  const grouped = await prisma.spendEvent.groupBy({
    by: ['dedupClusterId'],
    where: {
      dedupClusterId: { not: null },
      ...(options?.status === 'pending' ? { dedupReviewStatus: 'pending' } : {}),
    },
    _count: { id: true },
    _sum: { amountUsd: true },
  })

  const clusters: DedupClusterView[] = []

  for (const group of grouped) {
    if (!group.dedupClusterId || group._count.id < 2) continue

    const members = await loadClusterMembers(group.dedupClusterId)
    const sources = [...new Set(members.map((m) => m.sourceSystem))]
    if (sources.length < 2) continue

    clusters.push({
      clusterId: group.dedupClusterId,
      crossSourceDedupKey: members[0]?.crossSourceDedupKey,
      memberCount: members.length,
      sourceCount: sources.length,
      sources,
      totalAmountUsd: group._sum.amountUsd ?? members.reduce((s, m) => s + m.amountUsd, 0),
      dedupReviewStatus: clusterReviewStatus(members),
      members: members.map(toMember),
    })
  }

  return clusters.sort((a, b) => {
    if (a.dedupReviewStatus === 'pending' && b.dedupReviewStatus !== 'pending') return -1
    if (b.dedupReviewStatus === 'pending' && a.dedupReviewStatus !== 'pending') return 1
    return b.memberCount - a.memberCount
  })
}

export async function resolveDedupCluster(input: {
  clusterId: string
  action: DedupResolveAction
  primarySpendEventId?: string
  splitSpendEventIds?: string[]
  reviewedBy?: string
}): Promise<DedupClusterView> {
  const members = await loadClusterMembers(input.clusterId)
  if (members.length < 2) {
    throw new Error('Cluster must have at least two spend events')
  }

  const memberIds = members.map((m) => m.id)

  if (input.action === 'split') {
    const splitIds = input.splitSpendEventIds?.length
      ? input.splitSpendEventIds
      : input.primarySpendEventId
        ? [input.primarySpendEventId]
        : []

    if (splitIds.length === 0) {
      throw new Error('splitSpendEventIds or primarySpendEventId required for split')
    }

    for (const id of splitIds) {
      if (!memberIds.includes(id)) {
        throw new Error(`Spend event ${id} is not in cluster ${input.clusterId}`)
      }
      const event = members.find((m) => m.id === id)!
      await prisma.spendEvent.update({
        where: { id },
        data: {
          dedupClusterId: event.dedupKey,
          dedupReviewStatus: 'dismissed',
          isPrimaryLine: true,
        },
      })
    }

    const remaining = members.filter((m) => !splitIds.includes(m.id))
    if (remaining.length === 1) {
      await prisma.spendEvent.update({
        where: { id: remaining[0].id },
        data: { dedupReviewStatus: 'none', isPrimaryLine: true },
      })
    } else if (remaining.length > 1) {
      await prisma.spendEvent.updateMany({
        where: { id: { in: remaining.map((m) => m.id) } },
        data: { dedupReviewStatus: 'pending' },
      })
    }
  } else if (input.action === 'keep_both') {
    await prisma.spendEvent.updateMany({
      where: { id: { in: memberIds } },
      data: { dedupReviewStatus: 'resolved', isPrimaryLine: true },
    })
  } else if (input.action === 'merge') {
    const primaryId =
      input.primarySpendEventId ||
      members.find((m) => m.isPrimaryLine)?.id ||
      members[0].id

    if (!memberIds.includes(primaryId)) {
      throw new Error(`Primary spend event ${primaryId} is not in cluster`)
    }

    await prisma.spendEvent.updateMany({
      where: { id: { in: memberIds } },
      data: { dedupReviewStatus: 'resolved' },
    })

    await prisma.spendEvent.update({
      where: { id: primaryId },
      data: { isPrimaryLine: true },
    })

    const duplicateIds = memberIds.filter((id) => id !== primaryId)
    if (duplicateIds.length > 0) {
      await prisma.spendEvent.updateMany({
        where: { id: { in: duplicateIds } },
        data: { isPrimaryLine: false },
      })

      const primary = members.find((m) => m.id === primaryId)!
      for (const dup of members.filter((m) => duplicateIds.includes(m.id))) {
        if (dup.cmsRecord) {
          await prisma.cMSRecord.update({
            where: { id: dup.cmsRecord.id },
            data: {
              isReportable: false,
              reason: `Duplicate spend — primary line is ${primary.sourceSystem} (${primary.id.slice(0, 8)})`,
            },
          })
        }
      }
    }
  } else {
    throw new Error(`Unknown dedup action: ${input.action}`)
  }

  await createAuditLog({
    action: 'update',
    entityType: 'dedup_cluster',
    entityId: input.clusterId,
    newValues: {
      action: input.action,
      primarySpendEventId: input.primarySpendEventId,
      splitSpendEventIds: input.splitSpendEventIds,
      reviewedBy: input.reviewedBy,
    },
  })

  const updated = await getDedupClusters({ status: 'all' })
  const cluster = updated.find((c) => c.clusterId === input.clusterId)
  if (cluster) return cluster

  const remainingMembers = await loadClusterMembers(input.clusterId)
  if (remainingMembers.length >= 2) {
    return {
      clusterId: input.clusterId,
      crossSourceDedupKey: remainingMembers[0]?.crossSourceDedupKey,
      memberCount: remainingMembers.length,
      sourceCount: new Set(remainingMembers.map((m) => m.sourceSystem)).size,
      sources: [...new Set(remainingMembers.map((m) => m.sourceSystem))],
      totalAmountUsd: remainingMembers.reduce((s, m) => s + m.amountUsd, 0),
      dedupReviewStatus: clusterReviewStatus(remainingMembers),
      members: remainingMembers.map(toMember),
    }
  }

  return {
    clusterId: input.clusterId,
    memberCount: remainingMembers.length,
    sourceCount: 0,
    sources: [],
    totalAmountUsd: 0,
    dedupReviewStatus: 'resolved',
    members: remainingMembers.map(toMember),
  }
}

export async function getDedupStats() {
  const clusters = await getDedupClusters({ status: 'all' })
  const pending = clusters.filter((c) => c.dedupReviewStatus === 'pending')
  return {
    totalClusters: clusters.length,
    pendingClusters: pending.length,
    pendingEvents: pending.reduce((s, c) => s + c.memberCount, 0),
  }
}
