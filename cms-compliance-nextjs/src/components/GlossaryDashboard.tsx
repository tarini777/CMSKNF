'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Search, 
  BookOpen, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Edit,
  Trash2,
  FileText,
  Scale,
  Globe
} from 'lucide-react'

interface GlossaryTerm {
  id: string
  term: string
  definition: string
  category: 'payment_type' | 'recipient_type' | 'product_type' | 'compliance_term' | 'regulatory_term'
  reportability: 'reportable' | 'non_reportable' | 'conditional' | 'exempt'
  conditions?: string[]
  examples?: string[]
  regulatoryBasis?: string
  cmsCategory?: string
  programYearNote?: string
  sortLetter?: string
  source?: string
  lastUpdated: string
  version: string
}

interface ReportabilityRule {
  id: string
  name: string
  description: string
  category: 'amount_threshold' | 'payment_type' | 'recipient_type' | 'product_type' | 'geographic' | 'temporal'
  conditions: {
    field: string
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in'
    value: any
    logicalOperator?: 'AND' | 'OR'
  }[]
  result: 'reportable' | 'non_reportable' | 'conditional'
  priority: number
  effectiveDate: string
  expirationDate?: string
  regulatoryBasis: string
  lastUpdated: string
}

interface ReportabilityAnalysis {
  isReportable: boolean
  confidence: number
  applicableRules: string[]
  reasoning: string[]
  warnings: string[]
  recommendations: string[]
  glossaryMatches: {
    term: string
    definition: string
    reportability: string
  }[]
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
  )
}

export default function GlossaryDashboard() {
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([])
  const [cmsTerms, setCmsTerms] = useState<GlossaryTerm[]>([])
  const [cmsMeta, setCmsMeta] = useState<{ letters: string[]; categories: string[]; sourceUrl: string; totalOfficialTerms: number } | null>(null)
  const [cmsLetter, setCmsLetter] = useState<string>('all')
  const [cmsCategory, setCmsCategory] = useState<string>('all')
  const [reportabilityRules, setReportabilityRules] = useState<ReportabilityRule[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('cms-glossary')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [analysisResult, setAnalysisResult] = useState<ReportabilityAnalysis | null>(null)
  const [internationalCountries, setInternationalCountries] = useState<any[]>([])
  const [intlRegionFilter, setIntlRegionFilter] = useState<string>('all')
  const [intlSearch, setIntlSearch] = useState('')

  const [testRecord, setTestRecord] = useState({
    totalAmountOfPaymentUsdollars: 5000,
    natureOfPaymentOrTransferOfValue: 'Consulting Fee',
    coveredRecipientName: 'Dr. John Smith',
    coveredRecipientType: 'Covered Recipient Physician',
    recipientCountry: 'United Kingdom',
    dateOfPayment: '2024-01-15',
  })

  useEffect(() => {
    loadGlossaryData()
  }, [])

  const loadGlossaryData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [termsResponse, rulesResponse, statsResponse, countriesResponse, cmsResponse] = await Promise.all([
        fetch('/api/glossary?action=terms'),
        fetch('/api/glossary?action=rules'),
        fetch('/api/glossary?action=stats'),
        fetch('/api/glossary?action=countries'),
        fetch('/api/glossary?action=cms-glossary'),
      ])

      const [termsData, rulesData, statsData, countriesData, cmsData] = await Promise.all([
        termsResponse.json(),
        rulesResponse.json(),
        statsResponse.json(),
        countriesResponse.json(),
        cmsResponse.json(),
      ])

      if (termsData.success) {
        setGlossaryTerms(termsData.data.terms)
      }
      if (rulesData.success) {
        setReportabilityRules(rulesData.data.rules)
      }
      if (statsData.success) {
        setStats(statsData.data)
      }
      if (countriesData.success) {
        setInternationalCountries(countriesData.data.countries)
      }
      if (cmsData.success) {
        setCmsTerms(cmsData.data.terms)
        setCmsMeta(cmsData.data.meta)
      }
    } catch (err) {
      setError('Failed to load glossary data')
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCmsGlossary = async () => {
    const params = new URLSearchParams({ action: 'cms-glossary' })
    if (cmsLetter !== 'all') params.set('letter', cmsLetter)
    if (cmsCategory !== 'all') params.set('cmsCategory', cmsCategory)
    const res = await fetch(`/api/glossary?${params}`)
    const data = await res.json()
    if (data.success) {
      setCmsTerms(data.data.terms)
      setCmsMeta(data.data.meta)
    }
  }

  useEffect(() => {
    if (activeTab === 'cms-glossary') {
      loadCmsGlossary()
    }
  }, [activeTab, cmsLetter, cmsCategory])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadGlossaryData()
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/glossary?action=search&query=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (data.success) {
        setGlossaryTerms(data.data.terms)
      } else {
        setError(data.error || 'Search failed')
      }
    } catch (err) {
      setError('Failed to search glossary')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeReportability = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/glossary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'analyze_reportability',
          data: { record: testRecord }
        })
      })

      const data = await response.json()

      if (data.success) {
        setAnalysisResult(data.data)
      } else {
        setError(data.error || 'Analysis failed')
      }
    } catch (err) {
      setError('Failed to analyze reportability')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getReportabilityBadgeVariant = (reportability: string) => {
    switch (reportability) {
      case 'reportable': return 'default'
      case 'non_reportable': return 'secondary'
      case 'conditional': return 'outline'
      case 'exempt': return 'destructive'
      default: return 'outline'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'payment_type': return <FileText className="h-4 w-4" />
      case 'recipient_type': return <Shield className="h-4 w-4" />
      case 'regulatory_term': return <Scale className="h-4 w-4" />
      case 'compliance_term': return <CheckCircle className="h-4 w-4" />
      default: return <BookOpen className="h-4 w-4" />
    }
  }

  const filteredTerms = glossaryTerms.filter(
    (term) => !selectedCategory || selectedCategory === 'all' || term.category === selectedCategory
  )

  const filteredRules = reportabilityRules.filter(
    (rule) => !selectedCategory || selectedCategory === 'all' || rule.category === selectedCategory
  )

  const filteredCmsTerms = cmsTerms.filter((term) => {
    const q = searchQuery.toLowerCase()
    if (!q) return true
    return (
      term.term.toLowerCase().includes(q) ||
      term.definition.toLowerCase().includes(q) ||
      term.programYearNote?.toLowerCase().includes(q)
    )
  })

  const filteredIntl = internationalCountries.filter((c) => {
    const matchesRegion = intlRegionFilter === 'all' || c.region === intlRegionFilter
    const q = intlSearch.toLowerCase()
    const matchesSearch =
      !q ||
      c.countryName.toLowerCase().includes(q) ||
      c.sunshineActEquivalent.toLowerCase().includes(q) ||
      c.regimeName.toLowerCase().includes(q)
    return matchesRegion && matchesSearch
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Glossary</h2>
          <p className="text-xs text-muted-foreground">Open Payments terms & reportability</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadGlossaryData} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5 mr-1.5" />}
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="flex flex-wrap gap-2">
          <StatPill label="CMS terms" value={String(stats.cmsOfficialTerms ?? cmsMeta?.totalOfficialTerms ?? '—')} />
          <StatPill label="Rules" value={String(stats.totalRules)} />
          <StatPill label="Reportable" value={String(stats.reportableTerms)} />
          <StatPill label="Excluded" value={String(stats.nonReportableTerms)} />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="cms-glossary" className="text-xs">CMS A–T</TabsTrigger>
          <TabsTrigger value="terms" className="text-xs">All terms</TabsTrigger>
          <TabsTrigger value="rules" className="text-xs">Rules</TabsTrigger>
          <TabsTrigger value="international" className="text-xs">Global</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="cms-glossary" className="mt-3 space-y-3">
          <div className="flex flex-col lg:flex-row gap-2">
            <Select value={cmsCategory} onValueChange={setCmsCategory}>
              <SelectTrigger className="w-full lg:w-48 h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="Nature of Payment">Nature of Payment</SelectItem>
                <SelectItem value="Type of Payment">Type of Payment</SelectItem>
                <SelectItem value="General definitions">General definitions</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant={cmsLetter === 'all' ? 'default' : 'outline'} className="h-7 px-2 text-xs" onClick={() => setCmsLetter('all')}>
              All
            </Button>
            {(cmsMeta?.letters ?? []).map((letter) => (
              <Button
                key={letter}
                size="sm"
                variant={cmsLetter === letter ? 'default' : 'outline'}
                className="h-7 w-7 p-0 text-xs"
                onClick={() => setCmsLetter(letter)}
              >
                {letter}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredCmsTerms.map((term) => (
              <details key={term.id} className="rounded-lg border bg-card group">
                <summary className="flex items-center gap-2 px-3 py-2.5 cursor-pointer list-none text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">{term.sortLetter}</Badge>
                  <span className="font-medium truncate flex-1">{term.term}</span>
                  {term.cmsCategory && (
                    <Badge variant="secondary" className="text-[9px] shrink-0 hidden sm:inline-flex">
                      {term.cmsCategory}
                    </Badge>
                  )}
                </summary>
                <div className="px-3 pb-3 pt-0 text-sm text-muted-foreground border-t">
                  <p className="leading-relaxed">{term.definition}</p>
                  {term.programYearNote && (
                    <p className="text-xs text-amber-800 mt-2">{term.programYearNote}</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="terms" className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search terms…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="h-9 flex-1 min-w-[12rem]"
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="payment_type">Payment</SelectItem>
                <SelectItem value="recipient_type">Recipient</SelectItem>
                <SelectItem value="regulatory_term">Regulatory</SelectItem>
                <SelectItem value="compliance_term">Compliance</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSearch} disabled={loading} className="h-9">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          <div className="space-y-2">
            {filteredTerms.map((term) => (
              <div key={term.id} className="rounded-lg border bg-card px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getCategoryIcon(term.category)}
                    <span className="font-medium text-sm truncate">{term.term}</span>
                  </div>
                  <Badge variant={getReportabilityBadgeVariant(term.reportability)} className="text-[10px] shrink-0">
                    {term.reportability.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{term.definition}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportability Rules</CardTitle>
              <CardDescription>
                Official CMS Open Payments reportability rules based on 21 CFR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <Label htmlFor="ruleCategory">Rule Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="amount_threshold">Amount Threshold</SelectItem>
                      <SelectItem value="payment_type">Payment Type</SelectItem>
                      <SelectItem value="recipient_type">Recipient Type</SelectItem>
                      <SelectItem value="product_type">Product Type</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {filteredRules.map((rule) => (
              <Card key={rule.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{rule.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Priority: {rule.priority}</Badge>
                      <Badge variant={getReportabilityBadgeVariant(rule.result)}>
                        {rule.result.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    {rule.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Conditions:</h4>
                    <div className="space-y-2">
                      {rule.conditions.map((condition, index) => (
                        <div key={index} className="text-sm bg-muted p-2 rounded">
                          <strong>{condition.field}</strong> {condition.operator} <strong>{condition.value}</strong>
                          {condition.logicalOperator && (
                            <span className="ml-2 text-muted-foreground">
                              {condition.logicalOperator}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Regulatory Basis:</strong> {rule.regulatoryBasis}
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Effective Date:</strong> {rule.effectiveDate}
                    {rule.expirationDate && (
                      <span> | <strong>Expires:</strong> {rule.expirationDate}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="international" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                International Transparency Regimes
              </CardTitle>
              <CardDescription>
                Americas & Europe (+ UK): EFPIA, ABPI Disclosure UK, Loi Bertrand, Brazil Lei 13.331, and national equivalents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  placeholder="Search country or regime..."
                  value={intlSearch}
                  onChange={(e) => setIntlSearch(e.target.value)}
                  className="flex-1"
                />
                <Select value={intlRegionFilter} onValueChange={setIntlRegionFilter}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="north_america">North America</SelectItem>
                    <SelectItem value="central_america">Central America</SelectItem>
                    <SelectItem value="caribbean">Caribbean</SelectItem>
                    <SelectItem value="south_america">South America</SelectItem>
                    <SelectItem value="united_kingdom">United Kingdom</SelectItem>
                    <SelectItem value="western_europe">Western Europe</SelectItem>
                    <SelectItem value="northern_europe">Northern Europe</SelectItem>
                    <SelectItem value="southern_europe">Southern Europe</SelectItem>
                    <SelectItem value="eastern_europe">Eastern Europe & Balkans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {stats?.international && (
                <p className="text-sm text-muted-foreground">
                  {stats.international.totalCountries} countries catalogued · {stats.international.efpiaAligned} EFPIA-aligned ·{' '}
                  {stats.international.mandatoryLegal} mandatory legal regimes
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            {filteredIntl.map((country) => (
              <Card key={country.countryCode}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">
                      {country.countryName} ({country.countryCode})
                    </CardTitle>
                    <Badge variant="outline">{country.regimeType.replace(/_/g, ' ')}</Badge>
                  </div>
                  <CardDescription>{country.sunshineActEquivalent}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p><strong>Regime:</strong> {country.regimeName}</p>
                  <p><strong>Legal basis:</strong> {country.legalBasis}</p>
                  {country.reportingThreshold && (
                    <p>
                      <strong>Threshold:</strong>{' '}
                      {country.reportingThreshold.notes ||
                        `${country.reportingThreshold.currency} ${country.reportingThreshold.perTransferMin ?? 'individual disclosure'}`}
                    </p>
                  )}
                  <p><strong>CMS overlap:</strong> {country.cmsOpenPaymentsOverlap}</p>
                  <div className="flex flex-wrap gap-1">
                    {country.nationalNotes.slice(0, 2).map((note: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{note}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="mt-3 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <Label htmlFor="amount" className="text-xs">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={testRecord.totalAmountOfPaymentUsdollars}
                    onChange={(e) => setTestRecord(prev => ({ ...prev, totalAmountOfPaymentUsdollars: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="nature">Nature of Payment</Label>
                  <Input
                    id="nature"
                    value={testRecord.natureOfPaymentOrTransferOfValue}
                    onChange={(e) => setTestRecord(prev => ({ ...prev, natureOfPaymentOrTransferOfValue: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={testRecord.coveredRecipientName}
                    onChange={(e) => setTestRecord(prev => ({ ...prev, coveredRecipientName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="recipientCountry">Recipient Country</Label>
                  <Input
                    id="recipientCountry"
                    placeholder="e.g. United Kingdom, France, Brazil"
                    value={testRecord.recipientCountry}
                    onChange={(e) => setTestRecord(prev => ({ ...prev, recipientCountry: e.target.value }))}
                  />
                </div>
              </div>

          <Button onClick={handleAnalyzeReportability} disabled={loading} size="sm" className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Scale className="h-4 w-4 mr-2" />
                Run test
              </>
            )}
          </Button>

          {analysisResult && (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Result</span>
                <Badge variant={analysisResult.isReportable ? 'default' : 'secondary'}>
                  {analysisResult.isReportable ? 'Reportable' : 'Excluded'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Confidence {(analysisResult.confidence * 100).toFixed(0)}%
              </p>
              {analysisResult.reasoning.length > 0 && (
                <ul className="text-xs space-y-1">
                  {analysisResult.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              {analysisResult.warnings.length > 0 && (
                <ul className="text-xs space-y-1">
                  {analysisResult.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
