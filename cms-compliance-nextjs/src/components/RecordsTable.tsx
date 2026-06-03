'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react'
import { CMSRecord, PaginatedResponse } from '@/types/cms'
import RecordDetailDialog from './RecordDetailDialog'

interface RecordsTableProps {
  onRecordSelect?: (record: CMSRecord) => void
}

export default function RecordsTable({ onRecordSelect }: RecordsTableProps) {
  const [records, setRecords] = useState<CMSRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewRecord, setViewRecord] = useState<CMSRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0
  })
  const [filters, setFilters] = useState({
    search: '',
    filter: 'all'
  })
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])

  useEffect(() => {
    fetchRecords()
  }, [pagination.page, filters])

  const fetchRecords = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        per_page: pagination.perPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.filter !== 'all' && { filter: filters.filter })
      })

      const response = await fetch(`/api/records?${params}`)
      const data: PaginatedResponse = await response.json()

      if (data.success) {
        setRecords(data.data)
        setPagination(data.pagination)
        setError(null)
      } else {
        setError('Failed to fetch records')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleFilterChange = (value: string) => {
    setFilters(prev => ({ ...prev, filter: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    )
  }

  const handleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([])
    } else {
      setSelectedRecords(records.map(r => r.id))
    }
  }

  const getStatusBadge = (record: CMSRecord) => {
    if (record.humanDecision === 'approve') {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
    } else if (record.humanDecision === 'reject') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
    } else {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
    }
  }

  const getReportabilityBadge = (record: CMSRecord) => {
    return record.isReportable 
      ? <Badge variant="outline" className="border-blue-200 text-blue-800">Reportable</Badge>
      : <Badge variant="outline" className="border-orange-200 text-orange-800">Non-Reportable</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString()
  }

  const openRecordDetail = (record: CMSRecord) => {
    setViewRecord(record)
    setDetailOpen(true)
    onRecordSelect?.(record)
  }

  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedRecords.length === 0) return

    setBulkLoading(true)
    try {
      const response = await fetch('/api/records/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordIds: selectedRecords, action }),
      })
      const data = await response.json()
      if (data.success) {
        setSelectedRecords([])
        fetchRecords()
      } else {
        setError(data.error || 'Bulk action failed')
      }
    } catch {
      setError('Network error during bulk action')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CMS Records</CardTitle>
        <CardDescription>
          Review and manage CMS compliance records
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search records..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filters.filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="reportable">Reportable</SelectItem>
              <SelectItem value="non_reportable">Non-Reportable</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedRecords.length > 0 && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">
              {selectedRecords.length} record(s) selected
            </span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')} disabled={bulkLoading}>
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve Selected
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')} disabled={bulkLoading}>
              <XCircle className="w-4 h-4 mr-1" />
              Reject Selected
            </Button>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export Selected
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading records...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">
            Error: {error}
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === records.length && records.length > 0}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reportability</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(record.id)}
                          onChange={() => handleSelectRecord(record.id)}
                          className="rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{record.coveredRecipientName}</div>
                          <div className="text-sm text-muted-foreground">
                            {record.coveredRecipientId}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(record.totalAmountOfPaymentUsdollars)}
                      </TableCell>
                      <TableCell>
                        {record.dateOfPayment ? formatDate(record.dateOfPayment) : '-'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record)}
                      </TableCell>
                      <TableCell>
                        {getReportabilityBadge(record)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`View record ${record.recordId}`}
                          title="View record details"
                          onClick={() => openRecordDetail(record)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.perPage) + 1} to{' '}
                {Math.min(pagination.page * pagination.perPage, pagination.total)} of{' '}
                {pagination.total} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
        <RecordDetailDialog
          record={viewRecord}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onDecisionSaved={fetchRecords}
        />
      </CardContent>
    </Card>
  )
}
