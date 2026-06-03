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
  User, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  MapPin, 
  Calendar,
  Stethoscope,
  Download
} from 'lucide-react'

interface PhysicianProfile {
  physician: {
    name: string
    specialty?: string
    state?: string
    totalPayments: number
    totalAmount: number
    averageAmount: number
    yearsActive: string[]
    topManufacturers: Array<{
      manufacturer: string
      amount: number
      paymentCount: number
      percentage: number
    }>
  }
  summary: {
    paymentTypes: Array<{
      type: string
      count: number
      amount: number
      percentage: number
    }>
    yearlyBreakdown: Array<{
      year: string
      amount: number
      paymentCount: number
      uniqueManufacturers: number
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
    paymentTrends: Array<{
      period: string
      amount: number
      paymentCount: number
      trend: 'increasing' | 'decreasing' | 'stable'
    }>
    associatedProducts: Array<{
      product: string
      amount: number
      paymentCount: number
      percentage: number
    }>
  }
}

export default function PhysicianProfileDashboard() {
  const [physicianName, setPhysicianName] = useState('')
  const [physicianProfile, setPhysicianProfile] = useState<PhysicianProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeDetails, setIncludeDetails] = useState(false)

  const handleSearch = async () => {
    if (!physicianName.trim()) {
      setError('Please enter a physician name')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('physicianName', physicianName.trim())
      if (includeDetails) {
        queryParams.append('includeDetails', 'true')
      }

      const response = await fetch(`/api/open-payments?action=physician_profile&${queryParams}`)
      const data = await response.json()

      if (data.success) {
        setPhysicianProfile(data.data)
      } else {
        setError(data.error || 'Failed to fetch physician profile')
      }
    } catch (err) {
      setError('Failed to fetch physician profile')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    if (!physicianProfile) return

    const csvContent = generatePhysicianCSV(physicianProfile)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${physicianProfile.physician.name.replace(/[^a-zA-Z0-9]/g, '_')}_profile.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  const generatePhysicianCSV = (profile: PhysicianProfile): string => {
    const headers = ['Category', 'Item', 'Value', 'Count', 'Amount', 'Percentage']
    const rows: string[][] = []

    // Physician overview
    rows.push(['Physician', 'Name', profile.physician.name, '', '', ''])
    rows.push(['Physician', 'Specialty', profile.physician.specialty || 'Unknown', '', '', ''])
    rows.push(['Physician', 'State', profile.physician.state || 'Unknown', '', '', ''])
    rows.push(['Physician', 'Total Payments', '', profile.physician.totalPayments.toString(), '', ''])
    rows.push(['Physician', 'Total Amount', '', '', profile.physician.totalAmount.toString(), ''])
    rows.push(['Physician', 'Average Amount', '', '', profile.physician.averageAmount.toString(), ''])

    // Top manufacturers
    profile.physician.topManufacturers.forEach(manufacturer => {
      rows.push(['Top Manufacturer', manufacturer.manufacturer, '', manufacturer.paymentCount.toString(), manufacturer.amount.toString(), `${manufacturer.percentage.toFixed(1)}%`])
    })

    // Payment types
    profile.summary.paymentTypes.forEach(type => {
      rows.push(['Payment Type', type.type, '', type.count.toString(), type.amount.toString(), `${type.percentage.toFixed(1)}%`])
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'decreasing': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
      default: return <Calendar className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Physician Profile Analysis</h2>
          <p className="text-muted-foreground">
            On-demand physician payment analysis from CMS Open Payments
          </p>
        </div>
        {physicianProfile && (
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
          <CardTitle>Search Physician Profile</CardTitle>
          <CardDescription>
            Enter a physician name to retrieve comprehensive payment analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="physicianName">Physician Name</Label>
              <Input
                id="physicianName"
                placeholder="e.g., John Smith, Dr. Jane Doe"
                value={physicianName}
                onChange={(e) => setPhysicianName(e.target.value)}
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
              Include detailed payment history and associated products
            </Label>
          </div>
        </CardContent>
      </Card>

      {physicianProfile && (
        <div className="space-y-6">
          {/* Physician Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{physicianProfile.physician.totalPayments.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {physicianProfile.physician.yearsActive.length} years active
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
                  {formatCurrency(physicianProfile.physician.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average: {formatCurrency(physicianProfile.physician.averageAmount)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Specialty</CardTitle>
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {physicianProfile.physician.specialty || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Medical specialty
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Location</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {physicianProfile.physician.state || 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Practice state
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="manufacturers">Top Manufacturers</TabsTrigger>
              <TabsTrigger value="payments">Payment Types</TabsTrigger>
              <TabsTrigger value="geography">Geographic Distribution</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="products">Associated Products</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Physician Overview</CardTitle>
                  <CardDescription>
                    {physicianProfile.physician.name} - Payment Summary
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Years Active</h4>
                      <div className="flex flex-wrap gap-2">
                        {physicianProfile.physician.yearsActive.map(year => (
                          <Badge key={year} variant="outline">{year}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Key Metrics</h4>
                      <div className="space-y-1 text-sm">
                        <div>Total Payments: {physicianProfile.physician.totalPayments.toLocaleString()}</div>
                        <div>Total Amount: {formatCurrency(physicianProfile.physician.totalAmount)}</div>
                        <div>Average Payment: {formatCurrency(physicianProfile.physician.averageAmount)}</div>
                        <div>Top Manufacturers: {physicianProfile.physician.topManufacturers.length}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manufacturers" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top Manufacturers</CardTitle>
                  <CardDescription>
                    Pharmaceutical companies making payments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {physicianProfile.physician.topManufacturers.map((manufacturer, index) => (
                      <div key={manufacturer.manufacturer} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{manufacturer.manufacturer}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(manufacturer.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {manufacturer.paymentCount} payments ({manufacturer.percentage.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                    ))}
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
                    {physicianProfile.summary.paymentTypes.map((type, index) => (
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
                    {physicianProfile.summary.geographicDistribution.map((state, index) => (
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
                    {physicianProfile.summary.yearlyBreakdown.map((year) => (
                      <div key={year.year} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{year.year}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(year.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {year.paymentCount} payments • {year.uniqueManufacturers} manufacturers
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {physicianProfile.details?.paymentTrends && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Trends</CardTitle>
                    <CardDescription>
                      Trend analysis with change indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {physicianProfile.details.paymentTrends.map((trend) => (
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

            <TabsContent value="products" className="space-y-4">
              {physicianProfile.details?.associatedProducts && (
                <Card>
                  <CardHeader>
                    <CardTitle>Associated Products</CardTitle>
                    <CardDescription>
                      Drugs and medical devices associated with payments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {physicianProfile.details.associatedProducts.map((product, index) => (
                        <div key={product.product} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                            <span className="font-medium">{product.product}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(product.amount)}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.paymentCount} payments ({product.percentage.toFixed(1)}%)
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
