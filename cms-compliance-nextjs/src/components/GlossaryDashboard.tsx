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

export default function GlossaryDashboard() {
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>([])
  const [reportabilityRules, setReportabilityRules] = useState<ReportabilityRule[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('terms')
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
      const [termsResponse, rulesResponse, statsResponse, countriesResponse] = await Promise.all([
        fetch('/api/glossary?action=terms'),
        fetch('/api/glossary?action=rules'),
        fetch('/api/glossary?action=stats'),
        fetch('/api/glossary?action=countries'),
      ])

      const [termsData, rulesData, statsData, countriesData] = await Promise.all([
        termsResponse.json(),
        rulesResponse.json(),
        statsResponse.json(),
        countriesResponse.json(),
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
    } catch (err) {
      setError('Failed to load glossary data')
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

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

  const filteredTerms = glossaryTerms.filter(term => 
    !selectedCategory || term.category === selectedCategory
  )

  const filteredRules = reportabilityRules.filter(rule => 
    !selectedCategory || rule.category === selectedCategory
  )

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CMS Glossary & Rules Engine</h2>
          <p className="text-muted-foreground">
            Official CMS Open Payments glossary terms and reportability rules based on 21 CFR
          </p>
        </div>
        <Button onClick={loadGlossaryData} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <BookOpen className="h-4 w-4 mr-2" />
              Refresh Data
            </>
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Terms</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTerms}</div>
              <p className="text-xs text-muted-foreground">
                Glossary entries
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rules</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
              <p className="text-xs text-muted-foreground">
                Reportability rules
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reportable Terms</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reportableTerms}</div>
              <p className="text-xs text-muted-foreground">
                Reportable categories
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Non-Reportable</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.nonReportableTerms}</div>
              <p className="text-xs text-muted-foreground">
                Exempt categories
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="terms">Glossary Terms</TabsTrigger>
          <TabsTrigger value="rules">Reportability Rules</TabsTrigger>
          <TabsTrigger value="international">Americas & Europe</TabsTrigger>
          <TabsTrigger value="analysis">Reportability Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Glossary Terms</CardTitle>
              <CardDescription>
                Official CMS Open Payments glossary based on 21 CFR definitions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Terms</Label>
                  <Input
                    id="search"
                    placeholder="Search glossary terms, definitions, or examples..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="payment_type">Payment Types</SelectItem>
                      <SelectItem value="recipient_type">Recipient Types</SelectItem>
                      <SelectItem value="regulatory_term">Regulatory Terms</SelectItem>
                      <SelectItem value="compliance_term">Compliance Terms</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            {filteredTerms.map((term) => (
              <Card key={term.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(term.category)}
                      <CardTitle className="text-lg">{term.term}</CardTitle>
                    </div>
                    <Badge variant={getReportabilityBadgeVariant(term.reportability)}>
                      {term.reportability.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                  <CardDescription>
                    {term.definition}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {term.conditions && term.conditions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Conditions:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {term.conditions.map((condition, index) => (
                          <li key={index}>• {condition}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {term.examples && term.examples.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Examples:</h4>
                      <div className="flex flex-wrap gap-2">
                        {term.examples.map((example, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {term.regulatoryBasis && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Regulatory Basis:</strong> {term.regulatoryBasis}
                    </div>
                  )}
                </CardContent>
              </Card>
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

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reportability Analysis</CardTitle>
              <CardDescription>
                Test payment records against CMS Open Payments reportability rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Payment Amount ($)</Label>
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
              
              <Button onClick={handleAnalyzeReportability} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Scale className="h-4 w-4 mr-2" />
                    Analyze Reportability
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {analysisResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Analysis Results</CardTitle>
                  <Badge variant={analysisResult.isReportable ? 'default' : 'secondary'}>
                    {analysisResult.isReportable ? 'REPORTABLE' : 'NON-REPORTABLE'}
                  </Badge>
                </div>
                <CardDescription>
                  Confidence: {(analysisResult.confidence * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysisResult.reasoning.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Reasoning:</h4>
                    <ul className="text-sm space-y-1">
                      {analysisResult.reasoning.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.warnings.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Warnings:</h4>
                    <ul className="text-sm space-y-1">
                      {analysisResult.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Recommendations:</h4>
                    <ul className="text-sm space-y-1">
                      {analysisResult.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                          {recommendation}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.glossaryMatches.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Matching Glossary Terms:</h4>
                    <div className="space-y-2">
                      {analysisResult.glossaryMatches.map((match, index) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <strong>{match.term}</strong>
                            <Badge variant={getReportabilityBadgeVariant(match.reportability)}>
                              {match.reportability.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{match.definition}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(analysisResult as any).jurisdictionAnalysis?.applicableJurisdictions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Applicable National Regimes:</h4>
                    <div className="space-y-2">
                      {(analysisResult as any).jurisdictionAnalysis.applicableJurisdictions.map((j: any, index: number) => (
                        <div key={index} className="border rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="h-4 w-4" />
                            <strong>{j.countryName}</strong>
                            <Badge variant={j.isReportable ? 'default' : 'secondary'}>
                              {j.sunshineActEquivalent}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{j.regimeName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
