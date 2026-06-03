'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { CMSRecord } from '@/types/cms'

interface RecordDetailDialogProps {
  record: CMSRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecisionSaved?: () => void
}

export default function RecordDetailDialog({
  record,
  open,
  onOpenChange,
  onDecisionSaved,
}: RecordDetailDialogProps) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!record) return

    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/records/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          humanDecision: decision,
          humanReason: reason || undefined,
          finalReportable: decision === 'approve' ? record.isReportable : false,
        }),
      })

      const data = await response.json()
      if (!data.success) {
        setError(data.error || 'Failed to save decision')
        return
      }

      setReason('')
      onOpenChange(false)
      onDecisionSaved?.()
    } catch {
      setError('Network error while saving decision')
    } finally {
      setSaving(false)
    }
  }

  if (!record) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record.coveredRecipientName}</DialogTitle>
          <DialogDescription>
            Record {record.recordId} · Review and approve or reject for CMS reporting
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <DetailField label="Recipient ID" value={record.coveredRecipientId} />
          <DetailField label="Recipient Type" value={record.coveredRecipientType} />
          <DetailField label="Amount" value={formatCurrency(record.totalAmountOfPaymentUsdollars)} />
          <DetailField label="Payment Date" value={record.dateOfPayment || '—'} />
          <DetailField label="Form of Payment" value={record.formOfPaymentOrTransferOfValue} />
          <DetailField label="Nature of Payment" value={record.natureOfPaymentOrTransferOfValue} />
          <DetailField label="Physician" value={[record.physicianFirstName, record.physicianLastName].filter(Boolean).join(' ') || '—'} />
          <DetailField label="Specialty" value={record.physicianSpecialty} />
          <DetailField label="Location" value={[record.recipientCity, record.recipientState, record.recipientCountry].filter(Boolean).join(', ') || '—'} />
          {record.recipientProvince && (
            <DetailField label="Province (International)" value={record.recipientProvince} />
          )}
          {record.countryOfTravel && (
            <DetailField
              label="Travel Destination"
              value={[record.cityOfTravel, record.stateOfTravel, record.countryOfTravel].filter(Boolean).join(', ')}
            />
          )}
          <DetailField label="Manufacturer" value={record.applicableManufacturerOrApplicableGpoMakingPaymentName} />
          <DetailField label="Program Year" value={record.programYear} />
          <DetailField label="System Reportability" value={record.isReportable ? 'Reportable' : 'Non-Reportable'} />
          {record.cmsReportCategory && (
            <DetailField label="CMS Category" value={record.cmsReportCategory} />
          )}
          {record.disclosureType && (
            <DetailField label="Disclosure Type" value={record.disclosureType} />
          )}
          {record.aggregateStatus && (
            <DetailField label="Aggregate Status" value={record.aggregateStatus} />
          )}
          {record.paymentCurrency && record.paymentCurrency !== 'USD' && (
            <DetailField label="Currency (→ USD)" value={`${record.paymentCurrency} @ ${record.exchangeRate}`} />
          )}
          {record.disputeWorkflowStatus && record.disputeWorkflowStatus !== 'none' && (
            <DetailField label="Dispute Status" value={record.disputeWorkflowStatus} />
          )}
        </div>

        {record.reason && (
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Rule engine: </span>
            {record.reason}
          </div>
        )}

        <div className="flex gap-2">
          <Badge variant={record.isReportable ? 'outline' : 'secondary'}>
            {record.isReportable ? 'Reportable' : 'Non-Reportable'}
          </Badge>
          {record.humanDecision === 'approve' && (
            <Badge className="bg-green-100 text-green-800">Approved</Badge>
          )}
          {record.humanDecision === 'reject' && (
            <Badge variant="destructive">Rejected</Badge>
          )}
          {(!record.humanDecision || record.humanDecision === 'pending') && (
            <Badge variant="secondary">Pending Review</Badge>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="decision-reason">Decision notes (optional)</Label>
          <Textarea
            id="decision-reason"
            placeholder="Add context for auditors..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleDecision('reject')}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
            Reject
          </Button>
          <Button onClick={() => handleDecision('approve')} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wide">{label}</p>
      <p className="font-medium">{value || '—'}</p>
    </div>
  )
}
