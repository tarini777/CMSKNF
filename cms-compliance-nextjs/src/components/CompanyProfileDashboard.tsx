'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Search, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  MapPin, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download
} from 'lucide-react'

interface CompanyProfile {
  company: {
    name: string
    totalPayments: number
    totalAmount: number
    averageAmount: number
    yearsActive: string[]
    complianceRate: number
    riskLevel: 'low' | 'medium' | 'high'
  }
  summary: {
    paymentTypes: Array<{
      type: string
      count: number
      amount: number
      percentage: number
    }>
    topRecipients: Array<{
      recipient: string
      recipientType: 'physician' | 'hospital'
      amount: number
      paymentCount: number
      specialty?: string
    }>
    yearlyBreakdown: Array<{
      year: string
      amount: number
      paymentCount: number
      uniqueRecipients: number
    }>
    geographicDistribution: Array<{
      state: string
      amount: number
      paymentCount: number
      percentage: number
    }>
  }
  details?: {
    recentPayments: any[]
    topSpecialties: Array<{
      specialty: string
      amount: number
      paymentCount: number
      percentage: number
    }>
    paymentTrends: Array<{
      period: string
      amount: number
      paymentCount: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }>
  }
}

export default function CompanyProfileDashboard() {
  const [companyName, setCompanyName] = useState('')
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeDetails, setIncludeDetails] = useState(false)

  const handleSearch = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('companyName', companyName.trim())
      if (includeDetails) {
        queryParams.append('includeDetails', 'true')
      }

      const response = await fetch(`/api/open-payments?action=company_profile&${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setCompanyProfile(data.data)
      } else {
        setError(data.error || 'Failed to fetch company profile')
      }
    } catch (err) {
      setError('Failed to fetch company profile')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!companyProfile) return

    const csvContent = generateCompanyCSV(companyProfile)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${companyProfile.company.name.replace(/[^a-zA-Z0-9]/g, '_')}_profile.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const generateCompanyCSV = (profile: CompanyProfile): string => {
    const headers = ['Category', 'Item', 'Value', 'Count', 'Amount', 'Percentage']
    const rows: string[][] = []

    // Company overview
    rows.push(['Company', 'Name', profile.company.name, '', '', ''])
    rows.push(['Company', 'Total Payments', '', profile.company.totalPayments.toString(), '', ''])
    rows.push(['Company', 'Total Amount', '', '', profile.company.totalAmount.toString(), ''])
    rows.push(['Company', 'Average Amount', '', '', profile.company.averageAmount.toString(), ''])
    rows.push(['Company', 'Compliance Rate', '', '', '', `${profile.company.complianceRate.toFixed(1)}%`])
    rows.push(['Company', 'Risk Level', profile.company.riskLevel, '', '', ''])

    // Payment types
    profile.summary.paymentTypes.forEach(type => {
      rows.push(['Payment Type', type.type, '', type.count.toString(), type.amount.toString(), `${type.percentage.toFixed(1)}%`])
    })

    // Top recipients
    profile.summary.topRecipients.forEach(recipient => {
      rows.push(['Top Recipient', recipient.recipient, recipient.recipientType, recipient.paymentCount.toString(), recipient.amount.toString(), ''])
    })

    return [headers, ...rows].map(row => row.map(field => `"${field || ''}"`).join(',')).join('\n')
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'default'
      case 'medium': return 'secondary'
      case 'high': return 'destructive'
      default: return 'outline'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Company Profile Analysis</h2>
          <p className="text-muted-foreground">
            On-demand pharmaceutical company payment analysis from CMS Open Payments
          </p>
        </div>
        {companyProfile && (
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Profile
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Search Company Profile</CardTitle>
          <CardDescription>
            Enter a pharmaceutical company name to retrieve comprehensive payment analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="e.g., Pfizer, Johnson & Johnson, Merck"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="includeDetails"
              checked={includeDetails}
              onChange={(e) => setIncludeDetails(e.target.checked)}
            />
            <Label htmlFor="includeDetails" className="text-sm">
              Include detailed payment history and trends
            </Label>
          </div>
        </CardContent>
      </Card>

      {companyProfile && (
        <div className="space-y-6">
          {/* Company Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{companyProfile.company.totalPayments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {companyProfile.company.yearsActive.length} years active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(companyProfile.company.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average: {formatCurrency(companyProfile.company.averageAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {companyProfile.company.complianceRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment compliance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant={getRiskBadgeVariant(companyProfile.company.riskLevel)}>
                    {companyProfile.company.riskLevel.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Compliance risk
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payments">Payment Types</TabsTrigger>
              <TabsTrigger value="recipients">Top Recipients</TabsTrigger>
              <TabsTrigger value="geography">Geographic Distribution</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Company Overview</CardTitle>
                  <CardDescription>
                    {companyProfile.company.name} - Payment Summary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Years Active</h4>
                      <div className="flex flex-wrap gap-2">
                        {companyProfile.company.yearsActive.map(year => (
                          <Badge key={year} variant="outline">{year}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Key Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <div>Total Payments: {companyProfile.company.totalPayments.toLocaleString()}</div>
                        <div>Total Amount: {formatCurrency(companyProfile.company.totalAmount)}</div>
                        <div>Average Payment: {formatCurrency(companyProfile.company.averageAmount)}</div>
                        <div>Compliance Rate: {companyProfile.company.complianceRate.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Payment Types</CardTitle>
                  <CardDescription>
                    Breakdown by nature of payment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {companyProfile.summary.paymentTypes.map((type, index) => (
                      <div key={type.type} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <span className="font-medium">{type.type}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(type.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {type.count} payments ({type.percentage.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recipients" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Recipients</CardTitle>
                  <CardDescription>
                    Highest payment recipients
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {companyProfile.summary.topRecipients.map((recipient, index) => (
                      <div key={recipient.recipient} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <div>
                            <div className="font-medium">{recipient.recipient}</div>
                            <div className="text-sm text-muted-foreground">
                              {recipient.recipientType} {recipient.specialty && `• ${recipient.specialty}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(recipient.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {recipient.paymentCount} payments
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="geography" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Distribution</CardTitle>
                  <CardDescription>
                    Payments by state
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {companyProfile.summary.geographicDistribution.map((state, index) => (
                      <div key={state.state} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{state.state}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(state.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {state.paymentCount} payments ({state.percentage.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Yearly Breakdown</CardTitle>
                  <CardDescription>
                    Payment trends over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {companyProfile.summary.yearlyBreakdown.map((year) => (
                      <div key={year.year} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{year.year}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(year.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {year.paymentCount} payments • {year.uniqueRecipients} recipients
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {companyProfile.details?.paymentTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Trends</CardTitle>
                    <CardDescription>
                      Trend analysis with change indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {companyProfile.details.paymentTrends.map((trend) => (
                        <div key={trend.period} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {getTrendIcon(trend.trend)}
                            <span className="font-medium">{trend.period}</span>
                            <Badge variant="outline">{trend.trend}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(trend.amount)}</div>
                            <div className="text-sm text-muted-foreground">
                              {trend.paymentCount} payments
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
