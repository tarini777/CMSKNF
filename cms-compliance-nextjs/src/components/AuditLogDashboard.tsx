'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Download, FileText, Search } from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  entityType: string
  entityId: string
  performedBy?: string
  performedAt: string
  reason?: string
}

export default function AuditLogDashboard() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [search])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ page: '1', per_page: '50' })
      if (search) params.set('search', search)
      const response = await fetch(`/api/audit?${params}`)
      const data = await response.json()
      if (data.success) {
        setLogs(data.data)
        setError(null)
      } else {
        setError(data.error || 'Failed to load audit logs')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    window.open(`/api/audit?export=csv`, '_blank')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Audit Trail
              </CardTitle>
              <CardDescription>Immutable log of compliance actions for regulatory review (FR-006)</CardDescription>
            </div>
            <Button onClick={exportCsv} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by entity ID, user, or reason..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={fetchLogs} variant="secondary">
              Refresh
            </Button>
          </div>

          {error && <p className="text-destructive mb-4">{error}</p>}

          {loading ? (
            <p className="text-muted-foreground">Loading audit logs...</p>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground">No audit entries yet. Upload data or approve records to populate.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">{new Date(log.performedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.action}</Badge>
                    </TableCell>
                    <TableCell>{log.entityType}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[120px] truncate">{log.entityId}</TableCell>
                    <TableCell>{log.performedBy || 'system'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {log.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
