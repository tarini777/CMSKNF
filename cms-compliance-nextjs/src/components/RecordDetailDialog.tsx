'use client'

import { useState, useEffect } from 'react'
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
import { CheckCircle, XCircle, Loader2, Link2 } from 'lucide-react'
import { RecordWithPuf } from '@/types/cms'

interface RecordDetailDialogProps {
  recordId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onDecisionSaved?: () => void
}

const PUF_DISPLAY_FIELDS: Array<{ key: string; label: string }> = [
  { key: 'change_type', label: 'Change Type' },
  { key: 'covered_recipient_npi', label: 'Covered Recipient NPI' },
  { key: 'teaching_hospital_ccn', label: 'Teaching Hospital CCN' },
  { key: 'covered_recipient_type', label: 'Recipient Type' },
  { key: 'related_product_indicator', label: 'Related Product Indicator' },
  { key: 'third_party_payment_recipient_indicator', label: 'Third Party Payment' },
  { key: 'name_of_third_party_entity_receiving_payment_or_transfer_of_value', label: 'Third Party Entity' },
  { key: 'name_of_drug_or_biological_or_device_or_medical_supply_1', label: 'Product 1' },
  { key: 'associated_drug_or_biological_ndc_1', label: 'NDC 1' },
  { key: 'dispute_status_for_publication', label: 'Dispute Status' },
  { key: 'delay_in_publication_indicator', label: 'Delay in Publication' },
]

export default function RecordDetailDialog({
  recordId,
  open,
  onOpenChange,
  onDecisionSaved,
}: RecordDetailDialogProps) {
  const [record, setRecord] = useState<RecordWithPuf | null>(null)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !recordId) {
      setRecord(null)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/records/${recordId}`)
        const data = await response.json()
        if (!cancelled) {
          if (data.success) {
            setRecord(data.data)
          } else {
            setError(data.error || 'Failed to load record')
          }
        }
      } catch {
        if (!cancelled) setError('Network error loading record')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, recordId])

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

  const pufFields = record?.pufFields as Record<string, string> | undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !record ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {error || 'Record not found'}
          </p>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{record.coveredRecipientName}</DialogTitle>
              <DialogDescription>
                Record {record.recordId} · PUF-backed review for CMS Open Payments
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <DetailField label="Recipient ID" value={record.coveredRecipientId} />
              <DetailField label="NPI" value={record.coveredRecipientNpi || record.pufSummary?.coveredRecipientNpi} />
              <DetailField label="Recipient Type" value={record.coveredRecipientType} />
              <DetailField label="Amount" value={formatCurrency(record.totalAmountOfPaymentUsdollars)} />
              <DetailField label="Payment Date" value={record.dateOfPayment} />
              <DetailField label="Form of Payment" value={record.formOfPaymentOrTransferOfValue} />
              <DetailField label="Nature of Payment" value={record.natureOfPaymentOrTransferOfValue} />
              <DetailField
                label="Physician"
                value={[record.physicianFirstName, record.physicianLastName].filter(Boolean).join(' ') || undefined}
              />
              <DetailField label="Specialty" value={record.physicianSpecialty} />
              <DetailField
                label="Location"
                value={[record.recipientCity, record.recipientState, record.recipientCountry].filter(Boolean).join(', ')}
              />
              <DetailField label="Manufacturer" value={record.applicableManufacturerOrApplicableGpoMakingPaymentName} />
              <DetailField label="Program Year" value={record.programYear} />
              <DetailField label="CMS Category" value={record.cmsReportCategory || record.pufSummary?.fileType} />
              <DetailField label="Source System" value={record.sourceSystem || record.lineage?.dataSourceName} />
              <DetailField label="Change Type" value={record.changeType || record.pufSummary?.changeType} />
              <DetailField label="System Reportability" value={record.isReportable ? 'Reportable' : 'Non-Reportable'} />
            </div>

            {record.pufSummary?.hasLineage && (
              <div className="rounded-md border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">PUF Submission Fields</h4>
                  <Badge variant="secondary">
                    {record.pufSummary.fieldCount} of {record.pufSummary.totalFields} populated
                  </Badge>
                </div>
                {pufFields ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {PUF_DISPLAY_FIELDS.map(({ key, label }) => {
                      const value = pufFields[key]
                      if (!value) return null
                      return <DetailField key={key} label={label} value={value} />
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No PUF line linked yet.</p>
                )}
                {record.pufSummary.spendEventId && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    Lineage spend event: {record.pufSummary.spendEventId}
                    {record.lineage?.dedupKey && ` · dedup ${record.lineage.dedupKey.slice(0, 12)}…`}
                  </p>
                )}
              </div>
            )}

            {record.reason && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="font-medium">Rule engine: </span>
                {record.reason}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Badge variant={record.isReportable ? 'outline' : 'secondary'}>
                {record.isReportable ? 'Reportable' : 'Non-Reportable'}
              </Badge>
              {record.humanDecision === 'approve' && (
                <Badge className="bg-green-100 text-green-800">Approved</Badge>
              )}
              {record.humanDecision === 'reject' && <Badge variant="destructive">Rejected</Badge>}
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
              <Button variant="destructive" onClick={() => handleDecision('reject')} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-1" />
                )}
                Reject
              </Button>
              <Button onClick={() => handleDecision('approve')} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                Approve
              </Button>
            </DialogFooter>
          </>
        )}
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
