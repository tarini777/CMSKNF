'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Search, Download, TrendingUp, Building2, Users, DollarSign } from 'lucide-react'
import CompanyProfileDashboard from './CompanyProfileDashboard'
import PhysicianProfileDashboard from './PhysicianProfileDashboard'

interface OpenPaymentsRecord {
  recordId: string
  programYear: string
  paymentPublicationDate: string
  teachingHospitalName?: string
  physicianFirstName?: string
  physicianLastName?: string
  physicianSpecialty?: string
  applicableManufacturerOrApplicableGPOMakingPaymentName?: string
  totalAmountOfPaymentUsdollars?: number
  dateOfPayment?: string
  natureOfPaymentOrTransferOfValue?: string
  formOfPaymentOrTransferOfValue?: string
  recipientState?: string
}

interface OpenPaymentsSearchParams {
  programYear?: string
  physicianName?: string
  teachingHospitalName?: string
  applicableManufacturerName?: string
  natureOfPayment?: string
  formOfPayment?: string
  minAmount?: number
  maxAmount?: number
  state?: string
  specialty?: string
  limit?: number
  offset?: number
}

interface OpenPaymentsAggregation {
  totalPayments: number
  totalAmount: number
  averageAmount: number
  topManufacturers: Array<{
    name: string
    amount: number
    paymentCount: number
  }>
  topSpecialties: Array<{
    specialty: string
    amount: number
    paymentCount: number
  }>
  paymentTypes: Array<{
    type: string
    amount: number
    paymentCount: number
  }>
  states: Array<{
    state: string
    amount: number
    paymentCount: number
  }>
}

interface OpenPaymentsTrend {
  year: string
  totalPayments: number
  totalAmount: number
  averageAmount: number
  uniquePhysicians: number
  uniqueManufacturers: number
}

export default function OpenPaymentsDashboard() {
  const [searchParams, setSearchParams] = useState<OpenPaymentsSearchParams>({
    limit: 50
  })
  const [searchResults, setSearchResults] = useState<{
    payments: OpenPaymentsRecord[]
    totalCount: number
    aggregations: OpenPaymentsAggregation
  } | null>(null)
  const [trends, setTrends] = useState<{
    trends: OpenPaymentsTrend[]
    insights: {
      totalYears: number
      totalAmount: number
      averageAnnualGrowth: number
      peakYear: string
      recentTrend: 'increasing' | 'decreasing' | 'stable'
    }
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('search')

  // Search for payments
  const handleSearch = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          queryParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/open-payments?action=search&${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.data)
      } else {
        setError(data.error || 'Search failed')
      }
    } catch (err) {
      setError('Failed to search Open Payments data')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load payment trends
  const loadTrends = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/open-payments?action=trends')
      const data = await response.json()

      if (data.success) {
        setTrends(data.data)
      } else {
        setError(data.error || 'Failed to load trends')
      }
    } catch (err) {
      setError('Failed to load payment trends')
      console.error('Trends error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Export search results
  const handleExport = async () => {
    if (!searchResults) return

    try {
      const csvContent = generateCSV(searchResults.payments)
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `open-payments-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to export data')
      console.error('Export error:', err)
    }
  }

  // Generate CSV content
  const generateCSV = (payments: OpenPaymentsRecord[]): string => {
    const headers = [
      'Record ID',
      'Program Year',
      'Payment Date',
      'Recipient Name',
      'Recipient Type',
      'Manufacturer',
      'Amount',
      'Nature of Payment',
      'Form of Payment',
      'State',
      'Specialty'
    ]

    const rows = payments.map(payment => [
      payment.recordId,
      payment.programYear,
      payment.dateOfPayment || payment.paymentPublicationDate,
      payment.teachingHospitalName || `${payment.physicianFirstName || ''} ${payment.physicianLastName || ''}`.trim(),
      payment.teachingHospitalName ? 'Teaching Hospital' : 'Physician',
      payment.applicableManufacturerOrApplicableGPOMakingPaymentName,
      payment.totalAmountOfPaymentUsdollars,
      payment.natureOfPaymentOrTransferOfValue,
      payment.formOfPaymentOrTransferOfValue,
      payment.recipientState,
      payment.physicianSpecialty
    ])

    return [headers, ...rows].map(row => row.map(field => `"${field || ''}"`).join(',')).join('\n')
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Load trends on component mount
  useEffect(() => {
    loadTrends()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CMS Open Payments Repository</h2>
          <p className="text-muted-foreground">
            Historical pharmaceutical company payments and aggregate spend data
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadTrends}
            disabled={loading}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Refresh Trends
          </Button>
          {searchResults && (
            <Button
              variant="outline"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">Search Payments</TabsTrigger>
          <TabsTrigger value="company">Company Profiles</TabsTrigger>
          <TabsTrigger value="physician">Physician Profiles</TabsTrigger>
          <TabsTrigger value="trends">Payment Trends</TabsTrigger>
          <TabsTrigger value="aggregations">Aggregations</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Open Payments Data</CardTitle>
              <CardDescription>
                Search through historical pharmaceutical company payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="programYear">Program Year</Label>
                  <Select
                    value={searchParams.programYear || ''}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, programYear: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value="2023">2023</SelectItem>
                      <SelectItem value="2022">2022</SelectItem>
                      <SelectItem value="2021">2021</SelectItem>
                      <SelectItem value="2020">2020</SelectItem>
                      <SelectItem value="2019">2019</SelectItem>
                      <SelectItem value="2018">2018</SelectItem>
                      <SelectItem value="2017">2017</SelectItem>
                      <SelectItem value="2016">2016</SelectItem>
                      <SelectItem value="2015">2015</SelectItem>
                      <SelectItem value="2014">2014</SelectItem>
                      <SelectItem value="2013">2013</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    placeholder="e.g., Pfizer, Johnson & Johnson"
                    value={searchParams.applicableManufacturerName || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, applicableManufacturerName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="physicianName">Physician Name</Label>
                  <Input
                    id="physicianName"
                    placeholder="e.g., John Smith"
                    value={searchParams.physicianName || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, physicianName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="hospitalName">Teaching Hospital</Label>
                  <Input
                    id="hospitalName"
                    placeholder="e.g., Mayo Clinic"
                    value={searchParams.teachingHospitalName || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, teachingHospitalName: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="e.g., CA, NY, TX"
                    value={searchParams.state || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, state: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input
                    id="specialty"
                    placeholder="e.g., Cardiology, Oncology"
                    value={searchParams.specialty || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, specialty: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="minAmount">Min Amount ($)</Label>
                  <Input
                    id="minAmount"
                    type="number"
                    placeholder="0"
                    value={searchParams.minAmount || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, minAmount: parseFloat(e.target.value) || undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="maxAmount">Max Amount ($)</Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    placeholder="1000000"
                    value={searchParams.maxAmount || ''}
                    onChange={(e) => setSearchParams(prev => ({ ...prev, maxAmount: parseFloat(e.target.value) || undefined }))}
                  />
                </div>

                <div>
                  <Label htmlFor="limit">Results Limit</Label>
                  <Select
                    value={searchParams.limit?.toString() || '50'}
                    onValueChange={(value) => setSearchParams(prev => ({ ...prev, limit: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="250">250</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleSearch} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search Payments
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {searchResults && (
            <Card>
              <CardHeader>
                <CardTitle>Search Results</CardTitle>
                <CardDescription>
                  Found {searchResults.totalCount.toLocaleString()} payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {searchResults.payments.map((payment) => (
                    <div key={payment.recordId} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {payment.programYear}
                          </Badge>
                          <Badge variant="secondary">
                            {payment.teachingHospitalName ? 'Hospital' : 'Physician'}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            {formatCurrency(payment.totalAmountOfPaymentUsdollars || 0)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <strong>Recipient:</strong> {
                            payment.teachingHospitalName || 
                            `${payment.physicianFirstName || ''} ${payment.physicianLastName || ''}`.trim()
                          }
                        </div>
                        <div>
                          <strong>Manufacturer:</strong> {payment.applicableManufacturerOrApplicableGPOMakingPaymentName}
                        </div>
                        <div>
                          <strong>Nature:</strong> {payment.natureOfPaymentOrTransferOfValue}
                        </div>
                        <div>
                          <strong>Form:</strong> {payment.formOfPaymentOrTransferOfValue}
                        </div>
                        {payment.physicianSpecialty && (
                          <div>
                            <strong>Specialty:</strong> {payment.physicianSpecialty}
                          </div>
                        )}
                        {payment.recipientState && (
                          <div>
                            <strong>State:</strong> {payment.recipientState}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="company" className="space-y-4">
          <CompanyProfileDashboard />
        </TabsContent>

        <TabsContent value="physician" className="space-y-4">
          <PhysicianProfileDashboard />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          {trends && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Years</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trends.insights.totalYears}</div>
                  <p className="text-xs text-muted-foreground">
                    Years of data available
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
                    {formatCurrency(trends.insights.totalAmount)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All-time payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Annual Growth</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {trends.insights.averageAnnualGrowth.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average annual growth
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Peak Year</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{trends.insights.peakYear}</div>
                  <p className="text-xs text-muted-foreground">
                    Highest payment year
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {trends && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Trends by Year</CardTitle>
                <CardDescription>
                  Historical payment data from CMS Open Payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends.trends.map((trend) => (
                    <div key={trend.year} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{trend.year}</h3>
                        <Badge variant="outline">
                          {formatCurrency(trend.totalAmount)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <strong>Total Payments:</strong> {trend.totalPayments.toLocaleString()}
                        </div>
                        <div>
                          <strong>Average Amount:</strong> {formatCurrency(trend.averageAmount)}
                        </div>
                        <div>
                          <strong>Unique Physicians:</strong> {trend.uniquePhysicians.toLocaleString()}
                        </div>
                        <div>
                          <strong>Unique Manufacturers:</strong> {trend.uniqueManufacturers.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="aggregations" className="space-y-4">
          {searchResults?.aggregations && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Manufacturers</CardTitle>
                  <CardDescription>
                    By total payment amount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchResults.aggregations.topManufacturers.slice(0, 10).map((manufacturer, index) => (
                      <div key={manufacturer.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm">{manufacturer.name}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatCurrency(manufacturer.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {manufacturer.paymentCount} payments
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Specialties</CardTitle>
                  <CardDescription>
                    By total payment amount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchResults.aggregations.topSpecialties.slice(0, 10).map((specialty, index) => (
                      <div key={specialty.specialty} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm">{specialty.specialty}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatCurrency(specialty.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {specialty.paymentCount} payments
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Types</CardTitle>
                  <CardDescription>
                    By nature of payment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchResults.aggregations.paymentTypes.slice(0, 10).map((type, index) => (
                      <div key={type.type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm">{type.type}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatCurrency(type.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {type.paymentCount} payments
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top States</CardTitle>
                  <CardDescription>
                    By total payment amount
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {searchResults.aggregations.states.slice(0, 10).map((state, index) => (
                      <div key={state.state} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="text-sm">{state.state}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            {formatCurrency(state.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {state.paymentCount} payments
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
