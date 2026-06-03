/** Connector field-mapping types for upstream systems → canonical CMS raw row. */

export type SupportedConnectorKey = 'concur' | 'veeva_crm' | 'vendor_med_ed' | 'tmc'

export interface ConnectorFieldMapping {
  /** Upstream field name (case-insensitive match) */
  sourceField: string
  /** Canonical key consumed by puf-field-mapper / CMS PUF */
  canonicalField: string
  required?: boolean
  notes?: string
}

export interface ConnectorDefinition {
  sourceKey: SupportedConnectorKey
  displayName: string
  category: string
  mappingVersion: string
  description: string
  /** Field map: upstream → CMS-canonical raw row keys (snake_case) */
  fieldMappings: ConnectorFieldMapping[]
  /** Example upstream payload for docs / simulator */
  sampleUpstreamPayload: Record<string, string>
}

export interface ConnectorMapResult {
  sourceKey: SupportedConnectorKey
  mappingVersion: string
  externalTransactionId: string
  canonicalRow: Record<string, string>
  upstreamPayload: Record<string, unknown>
  unmappedFields: string[]
  missingRequired: string[]
}

export interface ConnectorIngestResult {
  sourceTransactionId: string
  spendEventId: string
  hcpMasterId: string | null
  pufLineId: string
  cmsCategory: string
  cmsRecordId?: string
  isReportable: boolean
  mappingVersion: string
}
