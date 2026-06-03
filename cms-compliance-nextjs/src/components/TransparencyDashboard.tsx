'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Download, Calendar, CheckSquare, RefreshCw, Scale, FileText } from 'lucide-react'

interface Milestone {
  id: string
  jurisdiction: string
  title: string
  startDate: string
  endDate: string
  description: string
  actionRequired: string
}

interface ChecklistItem {
  id: string
  label: string
  required: boolean
  completed: boolean
  description: string
}

export default function TransparencyDashboard() {
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [aggregateMsg, setAggregateMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const programYear = new Date().getFullYear()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [calRes, attRes] = await Promise.all([
        fetch(`/api/transparency/calendar?programYear=${programYear}`),
        fetch(`/api/transparency/attestation?programYear=${programYear}`),
      ])
      const cal = await calRes.json()
      const att = await attRes.json()
      if (cal.success) setMilestones(cal.data)
      if (att.success) setChecklist(att.data.checklist)
    } finally {
      setLoading(false)
    }
  }

  const runAggregate = async () => {
    const res = await fetch('/api/transparency/aggregate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ programYear }),
    })
    const data = await res.json()
    setAggregateMsg(data.success ? data.message : data.error)
    loadData()
  }

  const exportCms = () => {
    window.open(`/api/transparency/export?programYear=${programYear}`, '_blank')
  }

  const implementedRules = [
    { id: 'rule_discount_rebate_exempt', label: 'Discount/rebate exemption' },
    { id: 'rule_sample_patient_use_exempt', label: 'Product sample exemption' },
    { id: 'rule_patient_education_exempt', label: 'Patient education exemption' },
    { id: 'rule_support_act_covered_recipient', label: 'SUPPORT Act recipients' },
    { id: 'rule_ownership_investment_reportable', label: 'Ownership → reportable' },
    { id: 'rule_indirect_payment_reportable', label: 'Third-party/indirect payments' },
    { id: 'intl_fr_loi_bertrand_10_eur', label: 'France €10 (Loi Bertrand)' },
    { id: 'rule_annual_aggregate_threshold_100', label: '$100 annual aggregate' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Scale className="w-6 h-6" />
            Transparency Compliance (COM-TRANSP-001)
          </h2>
          <p className="text-muted-foreground">
            CMS Sunshine Act, EFPIA, Loi Bertrand, and UK Disclosure UK rules — program year {programYear}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={runAggregate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recalc Aggregates
          </Button>
          <Button size="sm" onClick={exportCms}>
            <Download className="w-4 h-4 mr-2" />
            CMS CSV Export
          </Button>
        </div>
      </div>

      {aggregateMsg && (
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{aggregateMsg}</p>
      )}

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Active Rules</TabsTrigger>
          <TabsTrigger value="calendar">Submission Calendar</TabsTrigger>
          <TabsTrigger value="attestation">Attestation</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Implemented transparency rules</CardTitle>
              <CardDescription>From CMS Transparency BRD — applied on upload via transparency-rules-engine</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {implementedRules.map((r) => (
                <Badge key={r.id} variant="secondary">
                  {r.label}
                </Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Record fields</CardTitle>
              <CardDescription>Stored per payment after analysis</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-1">
              <p><strong>cmsReportCategory:</strong> general | research | ownership</p>
              <p><strong>disclosureType:</strong> individual | aggregate (EFPIA/UK consent model)</p>
              <p><strong>aggregateStatus:</strong> pending | reportable | non_reportable ($100 annual rule)</p>
              <p><strong>paymentCurrency / exchangeRate:</strong> multi-currency normalization to USD</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Regulatory submission calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-4">
                  {milestones.map((m) => (
                    <div key={m.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{m.jurisdiction}</Badge>
                        <span className="font-medium">{m.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{m.startDate} → {m.endDate}</p>
                      <p className="text-sm mt-2">{m.description}</p>
                      <p className="text-sm mt-1 text-primary">{m.actionRequired}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attestation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5" />
                CMS attestation checklist (REQ-017)
              </CardTitle>
              <CardDescription>Final CMS portal attestation must be completed manually</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-md">
                  <FileText className={`w-4 h-4 mt-0.5 ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <Badge variant={item.completed ? 'default' : 'outline'} className="mt-1">
                      {item.completed ? 'Complete' : 'Pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
