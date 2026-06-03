'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  CheckCircle,
  GitMerge,
  RefreshCw,
  Split,
  Users,
  Zap,
} from 'lucide-react'

interface DedupClusterMember {
  spendEventId: string
  sourceSystem: string
  sourceName?: string
  amountUsd: number
  paymentDate?: string | null
  natureOfPayment?: string | null
  hcpName?: string
  hcpNpi?: string
  recordId?: string
  isReportable?: boolean
  isPrimaryLine: boolean
  dedupReviewStatus: string
}

interface DedupCluster {
  clusterId: string
  crossSourceDedupKey?: string | null
  memberCount: number
  sourceCount: number
  sources: string[]
  totalAmountUsd: number
  dedupReviewStatus: string
  members: DedupClusterMember[]
}

interface DedupStats {
  totalClusters: number
  pendingClusters: number
  pendingEvents: number
}

export default function DedupDashboard() {
  const [clusters, setClusters] = useState<DedupCluster[]>([])
  const [stats, setStats] = useState<DedupStats | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [primaryByCluster, setPrimaryByCluster] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/lineage?action=dedup-clusters&status=${showAll ? 'all' : 'pending'}`)
      const json = await res.json()
      if (json.success) {
        setClusters(json.data.clusters)
        setStats(json.data.stats)
        const defaults: Record<string, string> = {}
        for (const cluster of json.data.clusters as DedupCluster[]) {
          const primary =
            cluster.members.find((m) => m.isPrimaryLine)?.spendEventId || cluster.members[0]?.spendEventId
          if (primary) defaults[cluster.clusterId] = primary
        }
        setPrimaryByCluster((prev) => ({ ...defaults, ...prev }))
      } else {
        setError(json.error || 'Failed to load dedup clusters')
      }
    } catch {
      setError('Network error loading dedup clusters')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [showAll])

  const resolveCluster = async (
    clusterId: string,
    resolveAction: 'merge' | 'keep_both' | 'split',
    options?: { splitSpendEventIds?: string[] }
  ) => {
    setActing(clusterId)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/lineage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-dedup',
          clusterId,
          resolveAction,
          primarySpendEventId: primaryByCluster[clusterId],
          splitSpendEventIds: options?.splitSpendEventIds,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage(`Cluster ${clusterId.slice(0, 8)}… marked as ${resolveAction}`)
        await load()
      } else {
        setError(json.error || 'Failed to resolve cluster')
      }
    } catch {
      setError('Network error resolving cluster')
    } finally {
      setActing(null)
    }
  }

  const simulateCollision = async () => {
    setActing('simulate')
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/lineage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate-dedup-collision' }),
      })
      const json = await res.json()
      if (json.success) {
        setMessage('Ingested Concur + Cvent sample dinner — collision detected')
        setShowAll(false)
        await load()
      } else {
        setError(json.error || 'Simulation failed')
      }
    } catch {
      setError('Network error during simulation')
    } finally {
      setActing(null)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Cross-Source Deduplication
            </CardTitle>
            <CardDescription>
              Review collisions when Concur, Cvent, and other systems describe the same transfer of value
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={simulateCollision}
              disabled={acting === 'simulate'}
            >
              <Zap className="w-4 h-4 mr-2" />
              Simulate Concur + Cvent
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Pending only' : 'Show resolved'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile label="Cross-source clusters" value={stats.totalClusters} />
            <StatTile label="Pending review" value={stats.pendingClusters} highlight={stats.pendingClusters > 0} />
            <StatTile label="Events in queue" value={stats.pendingEvents} />
          </div>
        )}

        {message && (
          <div className="rounded-md bg-green-50 text-green-800 text-sm p-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Loading clusters…
          </div>
        ) : clusters.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground space-y-3">
            <Users className="w-10 h-10 mx-auto opacity-40" />
            <p>No cross-source dedup clusters{showAll ? '' : ' pending review'}.</p>
            <p className="text-sm">
              Ingest the same HCP payment from two sources (e.g. Concur expense + Cvent meal allocation) to
              create a cluster.
            </p>
          </div>
        ) : (
          clusters.map((cluster) => (
            <div key={cluster.clusterId} className="rounded-lg border p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">Cluster {cluster.clusterId.slice(0, 12)}…</span>
                    <Badge variant={cluster.dedupReviewStatus === 'pending' ? 'destructive' : 'secondary'}>
                      {cluster.dedupReviewStatus}
                    </Badge>
                    <Badge variant="outline">{cluster.sourceCount} sources</Badge>
                    <Badge variant="outline">{cluster.memberCount} lines</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {cluster.sources.join(' + ')} · {formatCurrency(cluster.totalAmountUsd)} combined
                  </p>
                </div>
                {cluster.dedupReviewStatus === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => resolveCluster(cluster.clusterId, 'merge')}
                      disabled={acting === cluster.clusterId}
                    >
                      <GitMerge className="w-4 h-4 mr-1" />
                      Merge (keep primary)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resolveCluster(cluster.clusterId, 'keep_both')}
                      disabled={acting === cluster.clusterId}
                    >
                      Keep both
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const primary = primaryByCluster[cluster.clusterId]
                        const splitIds = cluster.members
                          .filter((m) => m.spendEventId !== primary)
                          .map((m) => m.spendEventId)
                        resolveCluster(cluster.clusterId, 'split', { splitSpendEventIds: splitIds })
                      }}
                      disabled={acting === cluster.clusterId}
                    >
                      <Split className="w-4 h-4 mr-1" />
                      Split non-primary
                    </Button>
                  </div>
                )}
              </div>

              {cluster.dedupReviewStatus === 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cluster.members.map((member) => (
                    <label
                      key={member.spendEventId}
                      className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer ${
                        primaryByCluster[cluster.clusterId] === member.spendEventId
                          ? 'border-primary bg-primary/5'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`primary-${cluster.clusterId}`}
                        value={member.spendEventId}
                        checked={primaryByCluster[cluster.clusterId] === member.spendEventId}
                        onChange={() =>
                          setPrimaryByCluster((prev) => ({
                            ...prev,
                            [cluster.clusterId]: member.spendEventId,
                          }))
                        }
                        className="mt-1"
                      />
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{member.sourceName || member.sourceSystem}</span>
                          {member.isPrimaryLine && (
                            <Badge variant="outline" className="text-xs">
                              current primary
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm">{member.hcpName || 'Unknown HCP'}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          NPI {member.hcpNpi || '—'} · {member.paymentDate || 'no date'}
                        </p>
                        <p className="text-sm">
                          {formatCurrency(member.amountUsd)} · {member.natureOfPayment || '—'}
                        </p>
                        {member.recordId && (
                          <p className="text-xs text-muted-foreground">Record {member.recordId}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {cluster.dedupReviewStatus !== 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cluster.members.map((member) => (
                    <div key={member.spendEventId} className="rounded-md border p-3 text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.sourceName || member.sourceSystem}</span>
                        {member.isPrimaryLine && <Badge className="text-xs">Primary</Badge>}
                      </div>
                      <p>{member.hcpName} · {formatCurrency(member.amountUsd)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

function StatTile({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: boolean
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-orange-300 bg-orange-50' : ''}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}
