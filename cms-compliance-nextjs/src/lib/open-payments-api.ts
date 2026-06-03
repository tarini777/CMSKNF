import { CMSRecord } from '@/types/cms'

export interface OpenPaymentsRecord {
  recordId: string;
  programYear: string;
  paymentPublicationDate: string;
  teachingHospitalCCN?: string;
  teachingHospitalName?: string;
  teachingHospitalState?: string
  physicianProfileId?: string
  physicianFirstName?: string
  physicianMiddleName?: string
  physicianLastName?: string
  physicianNameSuffix?: string
  recipientPrimaryBusinessStreetAddressLine1?: string
  recipientPrimaryBusinessStreetAddressLine2?: string
  recipientCity?: string
  recipientState?: string
  recipientZipCode?: string
  recipientCountry?: string
  recipientProvince?: string
  recipientPostalCode?: string
  physicianPrimaryType?: string
  physicianSpecialty?: string
  physicianLicenseStateCode1?: string
  physicianLicenseStateCode2?: string
  physicianLicenseStateCode3?: string
  physicianLicenseStateCode4?: string
  physicianLicenseStateCode5?: string
  submittingApplicableManufacturerOrApplicableGPOName?: string
  applicableManufacturerOrApplicableGPOMakingPaymentId?: string
  applicableManufacturerOrApplicableGPOMakingPaymentName?: string
  applicableManufacturerOrApplicableGPOMakingPaymentState?: string
  applicableManufacturerOrApplicableGPOMakingPaymentCountry?: string
  totalAmountOfPaymentUsdollars?: number
  dateOfPayment?: string
  numberOfPaymentsIncludedInTotalAmount?: number
  formOfPaymentOrTransferOfValue?: string
  natureOfPaymentOrTransferOfValue?: string
  cityOfTravel?: string
  stateOfTravel?: string
  countryOfTravel?: string
  physicianOwnershipIndicator?: string
  thirdPartyPaymentRecipientIndicator?: string
  nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue?: string
  charityIndicator?: string
  thirdPartyEqualsCoveredRecipientIndicator?: string
  contextualInformation?: string
  delayInPublicationIndicator?: string
  recordId?: string
  disputeStatusForPublication?: string
  productIndicator?: string
  nameOfAssociatedCoveredDrugOrBiological1?: string
  nameOfAssociatedCoveredDrugOrBiological2?: string
  nameOfAssociatedCoveredDrugOrBiological3?: string
  nameOfAssociatedCoveredDrugOrBiological4?: string
  nameOfAssociatedCoveredDrugOrBiological5?: string
  ndcOfAssociatedCoveredDrugOrBiological1?: string
  ndcOfAssociatedCoveredDrugOrBiological2?: string
  ndcOfAssociatedCoveredDrugOrBiological3?: string
  ndcOfAssociatedCoveredDrugOrBiological4?: string
  ndcOfAssociatedCoveredDrugOrBiological5?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply1?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply2?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply3?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply4?: string
  nameOfAssociatedCoveredDeviceOrMedicalSupply5?: string
  programYear?: string
  paymentPublicationDate?: string
}

export interface OpenPaymentsSearchParams {
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

export interface OpenPaymentsAggregation {
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

export interface OpenPaymentsTrend {
  year: string
  totalPayments: number
  totalAmount: number
  averageAmount: number
  uniquePhysicians: number
  uniqueManufacturers: number
}

export class OpenPaymentsAPIService {
  readonly BASE_URL =
    process.env.OPEN_PAYMENTS_API_BASE_URL || 'https://openpaymentsdata.cms.gov/api/1'
  readonly DOCS_URL = 'https://openpaymentsdata.cms.gov/about/api'
  private readonly API_TIMEOUT = parseInt(process.env.OPEN_PAYMENTS_API_TIMEOUT || '60000', 10)
  private readonly FILTERED_QUERY_TIMEOUT = parseInt(process.env.OPEN_PAYMENTS_FILTER_TIMEOUT || '120000', 10)
  private readonly DEFAULT_LIMIT = parseInt(process.env.OPEN_PAYMENTS_DEFAULT_LIMIT || '50', 10)
  private readonly MAX_LIMIT = Math.min(parseInt(process.env.OPEN_PAYMENTS_MAX_RESULTS || '500', 10), 500)
  private datasetCache: { expiresAt: number; datasets: Array<{ identifier: string; title: string }> } | null = null

  private async fetchJson<T>(url: string, timeoutMs = this.API_TIMEOUT): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  private normalizeDatasetList(payload: unknown): Array<{
    identifier: string
    title: string
    description?: string
    modified?: string
  }> {
    if (Array.isArray(payload)) return payload
    if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown[] }).data)) {
      return (payload as { data: Array<{ identifier: string; title: string }> }).data
    }
    return []
  }

  private isOpenPaymentsDataset(title?: string): boolean {
    const normalized = (title || '').toLowerCase()
    return (
      normalized.includes('general payment') ||
      normalized.includes('research payment') ||
      normalized.includes('ownership payment')
    )
  }

  private findDataset(
    datasets: Array<{ identifier: string; title: string }>,
    category: 'general' | 'research' | 'ownership',
    programYear?: string
  ) {
    const matcher =
      category === 'general'
        ? /general payment/i
        : category === 'research'
          ? /research payment/i
          : /ownership payment/i

    const matches = datasets.filter((d) => matcher.test(d.title || ''))
    if (programYear) {
      return matches.find((d) => d.title?.includes(programYear))
    }
    return matches.sort((a, b) => (b.title || '').localeCompare(a.title || ''))[0]
  }

  private buildQueryParams(
    params: { limit?: number; offset?: number },
    conditions: Array<{ property: string; value: string; operator: string }> = []
  ): URLSearchParams {
    const query = new URLSearchParams()
    query.set('limit', String(Math.min(params.limit ?? this.DEFAULT_LIMIT, this.MAX_LIMIT)))
    query.set('offset', String(params.offset ?? 0))
    query.set('count', 'true')
    query.set('results', 'true')
    query.set('format', 'json')
    conditions.forEach((condition, index) => {
      query.set(`conditions[${index}][property]`, condition.property)
      query.set(`conditions[${index}][value]`, condition.value)
      query.set(`conditions[${index}][operator]`, condition.operator)
    })
    return query
  }

  private buildSearchConditions(params: OpenPaymentsSearchParams) {
    const conditions: Array<{ property: string; value: string; operator: string }> = []

    if (params.applicableManufacturerName) {
      conditions.push({
        property: 'applicable_manufacturer_or_applicable_gpo_making_payment_name',
        value: params.applicableManufacturerName,
        operator: 'contains',
      })
    }
    if (params.physicianName) {
      const parts = params.physicianName.trim().split(/\s+/)
      const lastName = parts.length > 1 ? parts[parts.length - 1] : params.physicianName
      conditions.push({
        property: 'covered_recipient_last_name',
        value: lastName,
        operator: 'contains',
      })
    }
    if (params.teachingHospitalName) {
      conditions.push({
        property: 'teaching_hospital_name',
        value: params.teachingHospitalName,
        operator: 'contains',
      })
    }
    if (params.state) {
      conditions.push({ property: 'recipient_state', value: params.state, operator: '=' })
    }
    if (params.natureOfPayment) {
      conditions.push({
        property: 'nature_of_payment_or_transfer_of_value',
        value: params.natureOfPayment,
        operator: 'contains',
      })
    }
    if (params.formOfPayment) {
      conditions.push({
        property: 'form_of_payment_or_transfer_of_value',
        value: params.formOfPayment,
        operator: 'contains',
      })
    }
    if (params.specialty) {
      conditions.push({
        property: 'covered_recipient_specialty_1',
        value: params.specialty,
        operator: 'contains',
      })
    }
    if (params.minAmount !== undefined) {
      conditions.push({
        property: 'total_amount_of_payment_usdollars',
        value: String(params.minAmount),
        operator: '>=',
      })
    }
    if (params.maxAmount !== undefined) {
      conditions.push({
        property: 'total_amount_of_payment_usdollars',
        value: String(params.maxAmount),
        operator: '<=',
      })
    }

    return conditions
  }

  private async getOpenPaymentsDatasets() {
    const now = Date.now()
    if (this.datasetCache && this.datasetCache.expiresAt > now) {
      return this.datasetCache.datasets
    }

    const datasetsPayload = await this.fetchJson<unknown>(
      `${this.BASE_URL}/metastore/schemas/dataset/items`
    )
    const datasets = this.normalizeDatasetList(datasetsPayload).filter((item) =>
      this.isOpenPaymentsDataset(item.title)
    )

    this.datasetCache = {
      datasets,
      expiresAt: now + 5 * 60 * 1000,
    }

    return datasets
  }

  async getHealthStatus(): Promise<{
    isHealthy: boolean
    responseTime: number
    lastCheck: string
    baseUrl: string
    docsUrl: string
    datasetCount?: number
    latestProgramYear?: string
    latestGeneralDatasetId?: string
    sampleRecordCount?: number
    error?: string
  }> {
    const startTime = Date.now()
    try {
      await this.fetchJson(`${this.BASE_URL}/metastore/schemas`)

      const datasets = await this.getOpenPaymentsDatasets()
      const latestGeneral = this.findDataset(datasets, 'general')
      let sampleRecordCount: number | undefined

      if (latestGeneral) {
        const query = this.buildQueryParams({ limit: 1, offset: 0 })
        const probe = await this.fetchJson<{ count?: number }>(
          `${this.BASE_URL}/datastore/query/${latestGeneral.identifier}/0?${query}`
        )
        sampleRecordCount = probe.count
      }

      return {
        isHealthy: datasets.length > 0,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        baseUrl: this.BASE_URL,
        docsUrl: this.DOCS_URL,
        datasetCount: datasets.length,
        latestProgramYear: latestGeneral ? this.extractProgramYear(latestGeneral.title) : undefined,
        latestGeneralDatasetId: latestGeneral?.identifier,
        sampleRecordCount,
      }
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString(),
        baseUrl: this.BASE_URL,
        docsUrl: this.DOCS_URL,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get available datasets from the Open Payments API
   */
  async getAvailableDatasets(): Promise<{
    datasets: Array<{
      identifier: string
      title: string
      description: string
      modified: string
      programYear?: string
      category?: 'general' | 'research' | 'ownership'
    }>
  }> {
    try {
      const data = await this.fetchJson<unknown>(`${this.BASE_URL}/metastore/schemas/dataset/items`)

      const openPaymentsDatasets = this.normalizeDatasetList(data)
        .filter((item) => this.isOpenPaymentsDataset(item.title))
        .map((item) => ({
          identifier: item.identifier,
          title: item.title,
          description: item.description || '',
          modified: item.modified || '',
          programYear: this.extractProgramYear(item.title),
          category: /general payment/i.test(item.title)
            ? ('general' as const)
            : /research payment/i.test(item.title)
              ? ('research' as const)
              : ('ownership' as const),
        }))

      return { datasets: openPaymentsDatasets }
    } catch (error) {
      console.error('Error fetching available datasets:', error)
      throw error
    }
  }

  /**
   * Search Open Payments data
   */
  async searchPayments(params: OpenPaymentsSearchParams): Promise<{
    payments: OpenPaymentsRecord[]
    totalCount: number
    aggregations: OpenPaymentsAggregation
    source: 'live' | 'mock'
    datasetId?: string
  }> {
    try {
      const datasets = await this.getOpenPaymentsDatasets()
      const generalPaymentsDataset = this.findDataset(datasets, 'general', params.programYear)

      if (!generalPaymentsDataset) {
        console.log('No general payments dataset found, using mock data')
        return { ...this.getMockPaymentData(params), source: 'mock' }
      }

      const conditions = this.buildSearchConditions(params)
      const query = this.buildQueryParams(
        { limit: params.limit, offset: params.offset },
        conditions
      )
      const timeoutMs = conditions.length > 0 ? this.FILTERED_QUERY_TIMEOUT : this.API_TIMEOUT

      const data = await this.fetchJson<{ results?: unknown[]; count?: number }>(
        `${this.BASE_URL}/datastore/query/${generalPaymentsDataset.identifier}/0?${query}`,
        timeoutMs
      )

      const payments = this.parseOpenPaymentsRecords(data.results || [])

      return {
        payments,
        totalCount: data.count ?? payments.length,
        aggregations: this.calculateAggregations(payments),
        source: 'live',
        datasetId: generalPaymentsDataset.identifier,
      }
    } catch (error) {
      console.error('Error searching Open Payments:', error)
      return { ...this.getMockPaymentData(params), source: 'mock' }
    }
  }

  /**
   * Get mock payment data for demo purposes
   */
  private getMockPaymentData(params: OpenPaymentsSearchParams): {
    payments: OpenPaymentsRecord[]
    totalCount: number
    aggregations: OpenPaymentsAggregation
  } {
    const mockPayments: OpenPaymentsRecord[] = [
      {
        recordId: '1',
        programYear: '2024',
        paymentPublicationDate: '2024-09-07',
        physicianProfileId: '123456789',
        physicianFirstName: 'Sarah',
        physicianLastName: 'Johnson',
        physicianSpecialty: 'Cardiology',
        recipientState: 'CA',
        applicableManufacturerOrApplicableGPOMakingPaymentName: 'Gilead Sciences',
        totalAmountOfPaymentUsdollars: 150000,
        dateOfPayment: '2024-08-15',
        natureOfPaymentOrTransferOfValue: 'Consulting Fee',
        formOfPaymentOrTransferOfValue: 'Cash or cash equivalent',
        disputeStatusForPublication: 'No',
        contextualInformation: 'High-value consulting for Phase III trial design'
      },
      {
        recordId: '2',
        programYear: '2024',
        paymentPublicationDate: '2024-09-07',
        physicianProfileId: '987654321',
        physicianFirstName: 'Michael',
        physicianLastName: 'Chen',
        physicianSpecialty: 'Neurology',
        recipientState: 'NY',
        applicableManufacturerOrApplicableGPOMakingPaymentName: 'Gilead Sciences',
        totalAmountOfPaymentUsdollars: 75000,
        dateOfPayment: '2024-07-20',
        natureOfPaymentOrTransferOfValue: 'Research',
        formOfPaymentOrTransferOfValue: 'Cash or cash equivalent',
        disputeStatusForPublication: 'No',
        contextualInformation: 'Principal Investigator for NCT04567890'
      },
      {
        recordId: '3',
        programYear: '2024',
        paymentPublicationDate: '2024-09-07',
        physicianProfileId: '456789123',
        physicianFirstName: 'Emily',
        physicianLastName: 'Rodriguez',
        physicianSpecialty: 'Oncology',
        recipientState: 'TX',
        applicableManufacturerOrApplicableGPOMakingPaymentName: 'Gilead Sciences',
        totalAmountOfPaymentUsdollars: 8.50,
        dateOfPayment: '2024-08-10',
        natureOfPaymentOrTransferOfValue: 'Food and Beverage',
        formOfPaymentOrTransferOfValue: 'In-kind items and services',
        disputeStatusForPublication: 'No',
        contextualInformation: 'Educational lunch meeting'
      }
    ]

    // Filter mock data based on search parameters
    let filteredPayments = mockPayments

    if (params.applicableManufacturerName) {
      filteredPayments = filteredPayments.filter(p => 
        p.applicableManufacturerOrApplicableGPOMakingPaymentName?.toLowerCase().includes(params.applicableManufacturerName!.toLowerCase())
      )
    }

    if (params.physicianName) {
      filteredPayments = filteredPayments.filter(p => 
        `${p.physicianFirstName} ${p.physicianLastName}`.toLowerCase().includes(params.physicianName!.toLowerCase())
      )
    }

    if (params.programYear) {
      filteredPayments = filteredPayments.filter(p => p.programYear === params.programYear)
    }

    if (params.minAmount) {
      filteredPayments = filteredPayments.filter(p => (p.totalAmountOfPaymentUsdollars || 0) >= params.minAmount!)
    }

    if (params.maxAmount) {
      filteredPayments = filteredPayments.filter(p => (p.totalAmountOfPaymentUsdollars || 0) <= params.maxAmount!)
    }

    // Apply limit and offset
    const offset = params.offset || 0
    const limit = params.limit || 50
    const paginatedPayments = filteredPayments.slice(offset, offset + limit)

    return {
      payments: paginatedPayments,
      totalCount: filteredPayments.length,
      aggregations: this.calculateAggregations(paginatedPayments)
    }
  }

  /**
   * Get payments by specific dataset ID
   */
  async getPaymentsByDataset(
    datasetId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    payments: OpenPaymentsRecord[]
    totalCount: number
  }> {
    try {
      const query = this.buildQueryParams({ limit, offset })
      const data = await this.fetchJson<{ results?: unknown[]; count?: number }>(
        `${this.BASE_URL}/datastore/query/${datasetId}/0?${query}`
      )

      return {
        payments: this.parseOpenPaymentsRecords(data.results || []),
        totalCount: data.count ?? (data.results || []).length,
      }
    } catch (error) {
      console.error(`Error fetching dataset ${datasetId}:`, error)
      throw error
    }
  }

  /**
   * Get payment trends over time
   */
  async getPaymentTrends(): Promise<{
    trends: OpenPaymentsTrend[]
    insights: {
      totalYears: number
      totalAmount: number
      averageAnnualGrowth: number
      peakYear: string
      recentTrend: 'increasing' | 'decreasing' | 'stable'
    }
  }> {
    try {
      // Get available datasets first
      const { datasets } = await this.getAvailableDatasets()
      
      const trends: OpenPaymentsTrend[] = []
      let totalAmount = 0

      // Process each year's dataset
      for (const dataset of datasets) {
        if (dataset.programYear) {
          try {
            const { payments } = await this.getPaymentsByDataset(dataset.identifier, 1000, 0)
            
            const yearTotal = payments.reduce((sum, payment) => 
              sum + (payment.totalAmountOfPaymentUsdollars || 0), 0
            )
            
            const uniquePhysicians = new Set(
              payments.map(p => p.physicianProfileId).filter(Boolean)
            ).size
            
            const uniqueManufacturers = new Set(
              payments.map(p => p.applicableManufacturerOrApplicableGPOMakingPaymentId).filter(Boolean)
            ).size

            trends.push({
              year: dataset.programYear,
              totalPayments: payments.length,
              totalAmount: yearTotal,
              averageAmount: payments.length > 0 ? yearTotal / payments.length : 0,
              uniquePhysicians,
              uniqueManufacturers
            })

            totalAmount += yearTotal
          } catch (error) {
            console.warn(`Failed to process dataset ${dataset.identifier}:`, error)
          }
        }
      }

      // Sort by year
      trends.sort((a, b) => a.year.localeCompare(b.year))

      // Calculate insights
      const insights = this.calculateTrendInsights(trends, totalAmount)

      return { trends, insights }
    } catch (error) {
      console.error('Error getting payment trends:', error)
      // Return mock trends data for demo purposes
      return this.getMockTrendsData()
    }
  }

  /**
   * Get mock trends data for demo purposes
   */
  private getMockTrendsData(): {
    trends: OpenPaymentsTrend[]
    insights: {
      totalYears: number
      totalAmount: number
      averageAnnualGrowth: number
      peakYear: string
      recentTrend: 'increasing' | 'decreasing' | 'stable'
    }
  } {
    const mockTrends: OpenPaymentsTrend[] = [
      {
        year: '2021',
        totalAmount: 3800000000,
        totalPayments: 1250000,
        uniquePhysicians: 450000,
        averageAmount: 3040,
        topManufacturer: 'Gilead Sciences',
        topSpecialty: 'Oncology'
      },
      {
        year: '2022',
        totalAmount: 4100000000,
        totalPayments: 1320000,
        uniquePhysicians: 465000,
        averageAmount: 3106,
        topManufacturer: 'Gilead Sciences',
        topSpecialty: 'Oncology'
      },
      {
        year: '2023',
        totalAmount: 4350000000,
        totalPayments: 1380000,
        uniquePhysicians: 480000,
        averageAmount: 3152,
        topManufacturer: 'Gilead Sciences',
        topSpecialty: 'Oncology'
      },
      {
        year: '2024',
        totalAmount: 4520000000,
        totalPayments: 1420000,
        uniquePhysicians: 495000,
        averageAmount: 3183,
        topManufacturer: 'Gilead Sciences',
        topSpecialty: 'Oncology'
      }
    ]

    const insights = {
      totalYears: mockTrends.length,
      totalAmount: 16770000000,
      averageAnnualGrowth: 6.2,
      peakYear: '2024',
      recentTrend: 'increasing' as const
    }

    return { trends: mockTrends, insights }
  }

  /**
   * Search payments for a specific CMS record (for validation)
   */
  async searchPaymentsForCMSRecord(record: CMSRecord): Promise<OpenPaymentsRecord[]> {
    try {
      const searchParams: OpenPaymentsSearchParams = {
        limit: 50
      }

      // Try to match by physician name if available
      if (record.providerName) {
        searchParams.physicianName = record.providerName
      }

      // Try to match by amount range
      if (record.amount) {
        const amount = record.amount
        searchParams.minAmount = amount * 0.9 // 10% tolerance
        searchParams.maxAmount = amount * 1.1
      }

      // Try to match by date if available
      if (record.date) {
        const year = new Date(record.date).getFullYear().toString()
        searchParams.programYear = year
      }

      const result = await this.searchPayments(searchParams)
      return result.payments
    } catch (error) {
      console.error('Error searching payments for CMS record:', error)
      return []
    }
  }

  /**
   * Get comprehensive company profile with on-demand data retrieval
   */
  async getCompanyProfile(companyName: string, includeDetails: boolean = false): Promise<{
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
      recentPayments: OpenPaymentsRecord[]
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
  }> {
    try {
      // Get comprehensive data for the company
      const result = await this.searchPayments({
        applicableManufacturerName: companyName,
        limit: includeDetails ? 2000 : 1000
      })

      const payments = result.payments
      const totalAmount = payments.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0)

      // Get years active
      const yearsActive = [...new Set(payments.map(p => p.programYear).filter(Boolean))].sort()

      // Calculate compliance rate (simplified - based on dispute status)
      const disputedPayments = payments.filter(p => p.disputeStatusForPublication === 'Yes').length
      const complianceRate = payments.length > 0 ? ((payments.length - disputedPayments) / payments.length) * 100 : 100

      // Determine risk level based on compliance and payment patterns
      const riskLevel = this.calculateCompanyRiskLevel(payments, complianceRate)

      // Group by payment type with percentages
      const paymentTypes = this.groupByField(payments, 'natureOfPaymentOrTransferOfValue')
        .map(group => ({
          type: group.key,
          count: group.items.length,
          amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
          percentage: totalAmount > 0 ? (group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0) / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      // Group by recipient with enhanced details
      const topRecipients = this.groupByField(payments, 'physicianLastName')
        .map(group => ({
          recipient: `${group.items[0].physicianFirstName || ''} ${group.key}`.trim(),
          recipientType: group.items[0].teachingHospitalName ? 'hospital' as const : 'physician' as const,
          amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
          paymentCount: group.items.length,
          specialty: group.items[0].physicianSpecialty
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 15)

      // Group by year with unique recipients
      const yearlyBreakdown = this.groupByField(payments, 'programYear')
        .map(group => {
          const uniqueRecipients = new Set(
            group.items.map(p => p.physicianProfileId || p.teachingHospitalName).filter(Boolean)
          ).size
          
          return {
            year: group.key,
            amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
            paymentCount: group.items.length,
            uniqueRecipients
          }
        })
        .sort((a, b) => a.year.localeCompare(b.year))

      // Geographic distribution
      const geographicDistribution = this.groupByField(payments, 'recipientState')
        .map(group => ({
          state: group.key,
          amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
          paymentCount: group.items.length,
          percentage: totalAmount > 0 ? (group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0) / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      const companyProfile = {
        company: {
          name: companyName,
          totalPayments: payments.length,
          totalAmount,
          averageAmount: payments.length > 0 ? totalAmount / payments.length : 0,
          yearsActive,
          complianceRate,
          riskLevel
        },
        summary: {
          paymentTypes,
          topRecipients,
          yearlyBreakdown,
          geographicDistribution
        }
      }

      // Add detailed information if requested
      if (includeDetails) {
        const details = await this.getCompanyDetails(payments, companyName)
        return { ...companyProfile, details }
      }

      return companyProfile
    } catch (error) {
      console.error('Error getting company profile:', error)
      // Return mock company profile for demo purposes
      return this.getMockCompanyProfile(companyName)
    }
  }

  /**
   * Get comprehensive physician profile with on-demand data retrieval
   */
  async getPhysicianProfile(physicianName: string, includeDetails: boolean = false): Promise<{
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
      recentPayments: OpenPaymentsRecord[]
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
  }> {
    try {
      // Search for physician payments
      const result = await this.searchPayments({
        physicianName: physicianName,
        limit: includeDetails ? 2000 : 1000
      })

      const payments = result.payments
      const totalAmount = payments.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0)

      // Get physician details from first payment
      const firstPayment = payments[0]
      const specialty = firstPayment?.physicianSpecialty
      const state = firstPayment?.recipientState

      // Get years active
      const yearsActive = [...new Set(payments.map(p => p.programYear).filter(Boolean))].sort()

      // Group by manufacturer with percentages
      const topManufacturers = this.groupByField(payments, 'applicableManufacturerOrApplicableGPOMakingPaymentName')
        .map(group => ({
          manufacturer: group.key,
          amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
          paymentCount: group.items.length,
          percentage: totalAmount > 0 ? (group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0) / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      // Group by payment type with percentages
      const paymentTypes = this.groupByField(payments, 'natureOfPaymentOrTransferOfValue')
        .map(group => ({
          type: group.key,
          count: group.items.length,
          amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
          percentage: totalAmount > 0 ? (group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0) / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      // Group by year with unique manufacturers
      const yearlyBreakdown = this.groupByField(payments, 'programYear')
        .map(group => {
          const uniqueManufacturers = new Set(
            group.items.map(p => p.applicableManufacturerOrApplicableGPOMakingPaymentName).filter(Boolean)
          ).size
          
          return {
            year: group.key,
            amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
            paymentCount: group.items.length,
            uniqueManufacturers
          }
        })
        .sort((a, b) => a.year.localeCompare(b.year))

      // Geographic distribution
      const geographicDistribution = this.groupByField(payments, 'recipientState')
        .map(group => ({
          state: group.key,
          amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
          paymentCount: group.items.length,
          percentage: totalAmount > 0 ? (group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0) / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount)

      const physicianProfile = {
        physician: {
          name: physicianName,
          specialty,
          state,
          totalPayments: payments.length,
          totalAmount,
          averageAmount: payments.length > 0 ? totalAmount / payments.length : 0,
          yearsActive,
          topManufacturers
        },
        summary: {
          paymentTypes,
          yearlyBreakdown,
          geographicDistribution
        }
      }

      // Add detailed information if requested
      if (includeDetails) {
        const details = await this.getPhysicianDetails(payments, physicianName)
        return { ...physicianProfile, details }
      }

      return physicianProfile
    } catch (error) {
      console.error('Error getting physician profile:', error)
      // Return mock physician profile for demo purposes
      return this.getMockPhysicianProfile(physicianName)
    }
  }

  /**
   * Get mock company profile for demo purposes
   */
  private getMockCompanyProfile(companyName: string): any {
    return {
      company: {
        name: companyName,
        totalPayments: 45200000,
        totalAmount: 45200000,
        averageAmount: 3183,
        yearsActive: ['2021', '2022', '2023', '2024'],
        complianceRate: 98.7,
        riskLevel: 'low' as const
      },
      paymentTypes: {
        'Research': 25000000,
        'Consulting Fee': 12000000,
        'Education': 5000000,
        'Food and Beverage': 2000000,
        'Travel and Lodging': 1200000
      },
      topRecipients: [
        { name: 'Dr. Sarah Johnson', amount: 150000, type: 'Consulting Fee' },
        { name: 'Dr. Michael Chen', amount: 75000, type: 'Research' },
        { name: 'Dr. Emily Rodriguez', amount: 45000, type: 'Education' }
      ],
      geographicDistribution: {
        'CA': 35.2,
        'NY': 18.7,
        'TX': 12.3,
        'FL': 8.9,
        'Other': 24.9
      },
      yearOverYearTrend: {
        '2021': 38000000,
        '2022': 41000000,
        '2023': 43500000,
        '2024': 45200000
      }
    }
  }

  /**
   * Get mock physician profile for demo purposes
   */
  private getMockPhysicianProfile(physicianName: string): any {
    return {
      physician: {
        name: physicianName,
        specialty: 'Cardiology',
        totalPayments: 125000,
        totalAmount: 125000,
        averageAmount: 3125,
        yearsActive: ['2021', '2022', '2023', '2024'],
        complianceRate: 100,
        riskLevel: 'low' as const
      },
      paymentSources: [
        { manufacturer: 'Gilead Sciences', amount: 150000, type: 'Consulting Fee' },
        { manufacturer: 'Pfizer', amount: 25000, type: 'Research' },
        { manufacturer: 'Merck', amount: 15000, type: 'Education' }
      ],
      paymentHistory: [
        { year: '2021', amount: 45000 },
        { year: '2022', amount: 52000 },
        { year: '2023', amount: 68000 },
        { year: '2024', amount: 125000 }
      ],
      riskLevel: 'Medium',
      fraudIndicators: [],
      complianceStatus: 'Compliant'
    }
  }

  /**
   * Get company details for comprehensive profile
   */
  private async getCompanyDetails(payments: OpenPaymentsRecord[], companyName: string) {
    // Get recent payments (last 2 years)
    const currentYear = new Date().getFullYear()
    const recentPayments = payments
      .filter(p => parseInt(p.programYear || '0') >= currentYear - 2)
      .sort((a, b) => (b.dateOfPayment || b.paymentPublicationDate || '').localeCompare(a.dateOfPayment || a.paymentPublicationDate || ''))
      .slice(0, 50)

    // Group by specialty
    const topSpecialties = this.groupByField(payments, 'physicianSpecialty')
      .map(group => ({
        specialty: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length,
        percentage: payments.length > 0 ? (group.items.length / payments.length) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // Calculate payment trends
    const paymentTrends = this.calculatePaymentTrends(payments)

    return {
      recentPayments,
      topSpecialties,
      paymentTrends
    }
  }

  /**
   * Get physician details for comprehensive profile
   */
  private async getPhysicianDetails(payments: OpenPaymentsRecord[], physicianName: string) {
    // Get recent payments (last 2 years)
    const currentYear = new Date().getFullYear()
    const recentPayments = payments
      .filter(p => parseInt(p.programYear || '0') >= currentYear - 2)
      .sort((a, b) => (b.dateOfPayment || b.paymentPublicationDate || '').localeCompare(a.dateOfPayment || a.paymentPublicationDate || ''))
      .slice(0, 50)

    // Calculate payment trends
    const paymentTrends = this.calculatePaymentTrends(payments)

    // Group by associated products
    const associatedProducts = this.groupByField(payments, 'nameOfAssociatedCoveredDrugOrBiological1')
      .filter(group => group.key && group.key !== 'Unknown')
      .map(group => ({
        product: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length,
        percentage: payments.length > 0 ? (group.items.length / payments.length) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    return {
      recentPayments,
      paymentTrends,
      associatedProducts
    }
  }

  /**
   * Calculate company risk level
   */
  private calculateCompanyRiskLevel(payments: OpenPaymentsRecord[], complianceRate: number): 'low' | 'medium' | 'high' {
    const disputedPayments = payments.filter(p => p.disputeStatusForPublication === 'Yes').length
    const delayedPayments = payments.filter(p => p.delayInPublicationIndicator === 'Yes').length
    const totalIssues = disputedPayments + delayedPayments
    const issueRate = payments.length > 0 ? (totalIssues / payments.length) * 100 : 0

    if (complianceRate >= 95 && issueRate <= 2) return 'low'
    if (complianceRate >= 85 && issueRate <= 5) return 'medium'
    return 'high'
  }

  /**
   * Calculate payment trends
   */
  private calculatePaymentTrends(payments: OpenPaymentsRecord[]) {
    const yearlyData = this.groupByField(payments, 'programYear')
      .map(group => ({
        period: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return yearlyData.map((data, index) => {
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
      
      if (index > 0) {
        const previousAmount = yearlyData[index - 1].amount
        const change = (data.amount - previousAmount) / previousAmount
        
        if (change > 0.1) trend = 'increasing'
        else if (change < -0.1) trend = 'decreasing'
      }
      
      return { ...data, trend }
    })
  }

  /**
   * Parse Open Payments records from API response
   */
  private parseOpenPaymentsRecords(records: any[]): OpenPaymentsRecord[] {
    return records.map(record => ({
      recordId: record.record_id || record.Record_ID,
      programYear: record.program_year || record.Program_Year,
      paymentPublicationDate: record.payment_publication_date || record.Payment_Publication_Date,
      teachingHospitalCCN: record.teaching_hospital_ccn || record.Teaching_Hospital_CCN,
      teachingHospitalName: record.teaching_hospital_name || record.Teaching_Hospital_Name,
      teachingHospitalState: record.teaching_hospital_state || record.Teaching_Hospital_State,
      physicianProfileId:
        record.covered_recipient_profile_id ||
        record.physician_profile_id ||
        record.Physician_Profile_ID,
      physicianFirstName:
        record.covered_recipient_first_name ||
        record.physician_first_name ||
        record.Physician_First_Name,
      physicianMiddleName:
        record.covered_recipient_middle_name ||
        record.physician_middle_name ||
        record.Physician_Middle_Name,
      physicianLastName:
        record.covered_recipient_last_name ||
        record.physician_last_name ||
        record.Physician_Last_Name,
      physicianNameSuffix:
        record.covered_recipient_name_suffix ||
        record.physician_name_suffix ||
        record.Physician_Name_Suffix,
      recipientPrimaryBusinessStreetAddressLine1: record.recipient_primary_business_street_address_line1 || record.Recipient_Primary_Business_Street_Address_Line1,
      recipientPrimaryBusinessStreetAddressLine2: record.recipient_primary_business_street_address_line2 || record.Recipient_Primary_Business_Street_Address_Line2,
      recipientCity: record.recipient_city || record.Recipient_City,
      recipientState: record.recipient_state || record.Recipient_State,
      recipientZipCode: record.recipient_zip_code || record.Recipient_Zip_Code,
      recipientCountry: record.recipient_country || record.Recipient_Country,
      recipientProvince: record.recipient_province || record.Recipient_Province,
      recipientPostalCode: record.recipient_postal_code || record.Recipient_Postal_Code,
      physicianPrimaryType:
        record.covered_recipient_primary_type_1 ||
        record.physician_primary_type ||
        record.Physician_Primary_Type,
      physicianSpecialty:
        record.covered_recipient_specialty_1 ||
        record.physician_specialty ||
        record.Physician_Specialty,
      physicianLicenseStateCode1: record.physician_license_state_code1 || record.Physician_License_State_Code1,
      physicianLicenseStateCode2: record.physician_license_state_code2 || record.Physician_License_State_Code2,
      physicianLicenseStateCode3: record.physician_license_state_code3 || record.Physician_License_State_Code3,
      physicianLicenseStateCode4: record.physician_license_state_code4 || record.Physician_License_State_Code4,
      physicianLicenseStateCode5: record.physician_license_state_code5 || record.Physician_License_State_Code5,
      submittingApplicableManufacturerOrApplicableGPOName: record.submitting_applicable_manufacturer_or_applicable_gpo_name || record.Submitting_Applicable_Manufacturer_or_Applicable_GPO_Name,
      applicableManufacturerOrApplicableGPOMakingPaymentId: record.applicable_manufacturer_or_applicable_gpo_making_payment_id || record.Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_ID,
      applicableManufacturerOrApplicableGPOMakingPaymentName: record.applicable_manufacturer_or_applicable_gpo_making_payment_name || record.Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Name,
      applicableManufacturerOrApplicableGPOMakingPaymentState: record.applicable_manufacturer_or_applicable_gpo_making_payment_state || record.Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_State,
      applicableManufacturerOrApplicableGPOMakingPaymentCountry: record.applicable_manufacturer_or_applicable_gpo_making_payment_country || record.Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Country,
      totalAmountOfPaymentUsdollars: parseFloat(record.total_amount_of_payment_usdollars || record.Total_Amount_of_Payment_USDollars || '0'),
      dateOfPayment: record.date_of_payment || record.Date_of_Payment,
      numberOfPaymentsIncludedInTotalAmount: parseInt(record.number_of_payments_included_in_total_amount || record.Number_of_Payments_Included_in_Total_Amount || '1'),
      formOfPaymentOrTransferOfValue: record.form_of_payment_or_transfer_of_value || record.Form_of_Payment_or_Transfer_of_Value,
      natureOfPaymentOrTransferOfValue: record.nature_of_payment_or_transfer_of_value || record.Nature_of_Payment_or_Transfer_of_Value,
      cityOfTravel: record.city_of_travel || record.City_of_Travel,
      stateOfTravel: record.state_of_travel || record.State_of_Travel,
      countryOfTravel: record.country_of_travel || record.Country_of_Travel,
      physicianOwnershipIndicator: record.physician_ownership_indicator || record.Physician_Ownership_Indicator,
      thirdPartyPaymentRecipientIndicator: record.third_party_payment_recipient_indicator || record.Third_Party_Payment_Recipient_Indicator,
      nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue: record.name_of_third_party_entity_receiving_payment_or_transfer_of_value || record.Name_of_Third_Party_Entity_Receiving_Payment_or_Transfer_of_Value,
      charityIndicator: record.charity_indicator || record.Charity_Indicator,
      thirdPartyEqualsCoveredRecipientIndicator: record.third_party_equals_covered_recipient_indicator || record.Third_Party_Equals_Covered_Recipient_Indicator,
      contextualInformation: record.contextual_information || record.Contextual_Information,
      delayInPublicationIndicator: record.delay_in_publication_indicator || record.Delay_in_Publication_Indicator,
      disputeStatusForPublication: record.dispute_status_for_publication || record.Dispute_Status_for_Publication,
      productIndicator: record.product_indicator || record.Product_Indicator,
      nameOfAssociatedCoveredDrugOrBiological1: record.name_of_associated_covered_drug_or_biological1 || record.Name_of_Associated_Covered_Drug_or_Biological1,
      nameOfAssociatedCoveredDrugOrBiological2: record.name_of_associated_covered_drug_or_biological2 || record.Name_of_Associated_Covered_Drug_or_Biological2,
      nameOfAssociatedCoveredDrugOrBiological3: record.name_of_associated_covered_drug_or_biological3 || record.Name_of_Associated_Covered_Drug_or_Biological3,
      nameOfAssociatedCoveredDrugOrBiological4: record.name_of_associated_covered_drug_or_biological4 || record.Name_of_Associated_Covered_Drug_or_Biological4,
      nameOfAssociatedCoveredDrugOrBiological5: record.name_of_associated_covered_drug_or_biological5 || record.Name_of_Associated_Covered_Drug_or_Biological5,
      ndcOfAssociatedCoveredDrugOrBiological1: record.ndc_of_associated_covered_drug_or_biological1 || record.NDC_of_Associated_Covered_Drug_or_Biological1,
      ndcOfAssociatedCoveredDrugOrBiological2: record.ndc_of_associated_covered_drug_or_biological2 || record.NDC_of_Associated_Covered_Drug_or_Biological2,
      ndcOfAssociatedCoveredDrugOrBiological3: record.ndc_of_associated_covered_drug_or_biological3 || record.NDC_of_Associated_Covered_Drug_or_Biological3,
      ndcOfAssociatedCoveredDrugOrBiological4: record.ndc_of_associated_covered_drug_or_biological4 || record.NDC_of_Associated_Covered_Drug_or_Biological4,
      ndcOfAssociatedCoveredDrugOrBiological5: record.ndc_of_associated_covered_drug_or_biological5 || record.NDC_of_Associated_Covered_Drug_or_Biological5,
      nameOfAssociatedCoveredDeviceOrMedicalSupply1: record.name_of_associated_covered_device_or_medical_supply1 || record.Name_of_Associated_Covered_Device_or_Medical_Supply1,
      nameOfAssociatedCoveredDeviceOrMedicalSupply2: record.name_of_associated_covered_device_or_medical_supply2 || record.Name_of_Associated_Covered_Device_or_Medical_Supply2,
      nameOfAssociatedCoveredDeviceOrMedicalSupply3: record.name_of_associated_covered_device_or_medical_supply3 || record.Name_of_Associated_Covered_Device_or_Medical_Supply3,
      nameOfAssociatedCoveredDeviceOrMedicalSupply4: record.name_of_associated_covered_device_or_medical_supply4 || record.Name_of_Associated_Covered_Device_or_Medical_Supply4,
      nameOfAssociatedCoveredDeviceOrMedicalSupply5: record.name_of_associated_covered_device_or_medical_supply5 || record.Name_of_Associated_Covered_Device_or_Medical_Supply5
    }))
  }

  /**
   * Calculate aggregations from payment records
   */
  private calculateAggregations(payments: OpenPaymentsRecord[]): OpenPaymentsAggregation {
    const totalAmount = payments.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0)
    
    const topManufacturers = this.groupByField(payments, 'applicableManufacturerOrApplicableGPOMakingPaymentName')
      .map(group => ({
        name: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    const topSpecialties = this.groupByField(payments, 'physicianSpecialty')
      .map(group => ({
        specialty: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    const paymentTypes = this.groupByField(payments, 'natureOfPaymentOrTransferOfValue')
      .map(group => ({
        type: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length
      }))
      .sort((a, b) => b.amount - a.amount)

    const states = this.groupByField(payments, 'recipientState')
      .map(group => ({
        state: group.key,
        amount: group.items.reduce((sum, p) => sum + (p.totalAmountOfPaymentUsdollars || 0), 0),
        paymentCount: group.items.length
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    return {
      totalPayments: payments.length,
      totalAmount,
      averageAmount: payments.length > 0 ? totalAmount / payments.length : 0,
      topManufacturers,
      topSpecialties,
      paymentTypes,
      states
    }
  }

  /**
   * Group records by a specific field
   */
  private groupByField(records: OpenPaymentsRecord[], field: keyof OpenPaymentsRecord) {
    const groups = new Map<string, OpenPaymentsRecord[]>()
    
    records.forEach(record => {
      const key = record[field] as string || 'Unknown'
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(record)
    })

    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }))
  }

  /**
   * Extract program year from dataset title
   */
  private extractProgramYear(title: string): string | undefined {
    const match = title.match(/(\d{4})/)
    return match ? match[1] : undefined
  }

  /**
   * Calculate trend insights
   */
  private calculateTrendInsights(trends: OpenPaymentsTrend[], totalAmount: number) {
    if (trends.length === 0) {
      return {
        totalYears: 0,
        totalAmount: 0,
        averageAnnualGrowth: 0,
        peakYear: '',
        recentTrend: 'stable' as const
      }
    }

    const totalYears = trends.length
    const peakYear = trends.reduce((max, trend) => 
      trend.totalAmount > max.totalAmount ? trend : max
    ).year

    // Calculate average annual growth
    let totalGrowth = 0
    let growthPeriods = 0
    for (let i = 1; i < trends.length; i++) {
      const current = trends[i].totalAmount
      const previous = trends[i - 1].totalAmount
      if (previous > 0) {
        totalGrowth += (current - previous) / previous
        growthPeriods++
      }
    }
    const averageAnnualGrowth = growthPeriods > 0 ? (totalGrowth / growthPeriods) * 100 : 0

    // Determine recent trend
    let recentTrend: 'increasing' | 'decreasing' | 'stable' = 'stable'
    if (trends.length >= 2) {
      const last = trends[trends.length - 1].totalAmount
      const secondLast = trends[trends.length - 2].totalAmount
      const change = (last - secondLast) / secondLast
      
      if (change > 0.05) recentTrend = 'increasing'
      else if (change < -0.05) recentTrend = 'decreasing'
    }

    return {
      totalYears,
      totalAmount,
      averageAnnualGrowth,
      peakYear,
      recentTrend
    }
  }
}

// Export singleton instance
export const openPaymentsAPIService = new OpenPaymentsAPIService()
