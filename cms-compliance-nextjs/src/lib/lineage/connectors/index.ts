import { CONCUR_CONNECTOR, enrichConcurCanonical } from './concur'
import type {
  ConnectorDefinition,
  ConnectorMapResult,
  SupportedConnectorKey,
} from './types'
import { enrichVeevaCanonical, VEEVA_CRM_CONNECTOR } from './veeva-crm'
import {
  enrichVendorCanonical,
  TMC_CONNECTOR,
  VENDOR_MED_ED_CONNECTOR,
} from './vendor'

export const CONNECTOR_REGISTRY: Record<SupportedConnectorKey, ConnectorDefinition> = {
  concur: CONCUR_CONNECTOR,
  veeva_crm: VEEVA_CRM_CONNECTOR,
  vendor_med_ed: VENDOR_MED_ED_CONNECTOR,
  tmc: TMC_CONNECTOR,
}

export const SUPPORTED_CONNECTOR_KEYS = Object.keys(CONNECTOR_REGISTRY) as SupportedConnectorKey[]

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/\s+/g, '_')
}

function pickUpstream(payload: Record<string, unknown>, field: string): string {
  if (payload[field] != null && payload[field] !== '') return String(payload[field])
  const normalized = normalizeKey(field)
  for (const [k, v] of Object.entries(payload)) {
    if (normalizeKey(k) === normalized && v != null && v !== '') return String(v)
  }
  return ''
}

export function mapConnectorPayload(
  sourceKey: SupportedConnectorKey,
  upstreamPayload: Record<string, unknown>
): ConnectorMapResult {
  const definition = CONNECTOR_REGISTRY[sourceKey]
  if (!definition) {
    throw new Error(`Unsupported connector: ${sourceKey}`)
  }

  const canonicalRow: Record<string, string> = {}
  const mappedSources = new Set<string>()

  for (const mapping of definition.fieldMappings) {
    const value = pickUpstream(upstreamPayload, mapping.sourceField)
    if (value) {
      canonicalRow[mapping.canonicalField] = value
      mappedSources.add(normalizeKey(mapping.sourceField))
    }
  }

  const unmappedFields = Object.keys(upstreamPayload).filter(
    (k) => !mappedSources.has(normalizeKey(k)) && !k.startsWith('_')
  )

  const missingRequired = definition.fieldMappings
    .filter((m) => m.required && !canonicalRow[m.canonicalField])
    .map((m) => m.sourceField)

  let enriched = canonicalRow
  if (sourceKey === 'concur') enriched = enrichConcurCanonical(enriched)
  if (sourceKey === 'veeva_crm') enriched = enrichVeevaCanonical(enriched)
  if (sourceKey === 'vendor_med_ed' || sourceKey === 'tmc') {
    enriched = enrichVendorCanonical(enriched, sourceKey)
  }

  const externalTransactionId =
    enriched.external_transaction_id ||
    enriched.record_id ||
    pickUpstream(upstreamPayload, 'ExpenseId') ||
    pickUpstream(upstreamPayload, 'Call_ID') ||
    pickUpstream(upstreamPayload, 'InvoiceNumber') ||
    `${sourceKey}_${Date.now()}`

  return {
    sourceKey,
    mappingVersion: definition.mappingVersion,
    externalTransactionId,
    canonicalRow: enriched,
    upstreamPayload,
    unmappedFields,
    missingRequired,
  }
}

export function listConnectorDefinitions(): ConnectorDefinition[] {
  return SUPPORTED_CONNECTOR_KEYS.map((key) => CONNECTOR_REGISTRY[key])
}

export function getConnectorDefinition(sourceKey: string): ConnectorDefinition | undefined {
  return CONNECTOR_REGISTRY[sourceKey as SupportedConnectorKey]
}

export function isSupportedConnector(sourceKey: string): sourceKey is SupportedConnectorKey {
  return SUPPORTED_CONNECTOR_KEYS.includes(sourceKey as SupportedConnectorKey)
}
