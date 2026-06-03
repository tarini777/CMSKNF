import { buildCrossSourceDedupKey, buildDedupKey } from '@/lib/lineage/hcp-master-service'
import { mapRawToGeneralPuf } from '@/lib/lineage/puf-field-mapper'
import { mapConnectorPayload } from '@/lib/lineage/connectors'
import { CONCUR_CONNECTOR } from '@/lib/lineage/connectors/concur'
import { CVENT_CONNECTOR } from '@/lib/lineage/connectors/cvent'
import { enrichConcurCanonical } from '@/lib/lineage/connectors/concur'
import { enrichCventCanonical } from '@/lib/lineage/connectors/cvent'

describe('buildCrossSourceDedupKey', () => {
  it('matches Concur and Cvent canonical rows for the same dinner', () => {
    const concurMap = mapConnectorPayload('concur', CONCUR_CONNECTOR.sampleUpstreamPayload)
    const cventMap = mapConnectorPayload('cvent', CVENT_CONNECTOR.sampleUpstreamPayload)

    const concurPuf = mapRawToGeneralPuf(enrichConcurCanonical(concurMap.canonicalRow))
    const cventPuf = mapRawToGeneralPuf(enrichCventCanonical(cventMap.canonicalRow))

    const concurKey = buildCrossSourceDedupKey(concurPuf, 125.5, '2024-03-15')
    const cventKey = buildCrossSourceDedupKey(cventPuf, 125.5, '2024-03-15')

    expect(concurKey).toBe(cventKey)
  })

  it('differs from source-specific dedupKey', () => {
    const concurMap = mapConnectorPayload('concur', CONCUR_CONNECTOR.sampleUpstreamPayload)
    const puf = mapRawToGeneralPuf(enrichConcurCanonical(concurMap.canonicalRow))

    const sourceKey = buildDedupKey('concur', puf, 125.5, '2024-03-15')
    const crossKey = buildCrossSourceDedupKey(puf, 125.5, '2024-03-15')

    expect(sourceKey).not.toBe(crossKey)
  })

  it('does not match different amounts', () => {
    const raw = {
      covered_recipient_npi: '1234567890',
      covered_recipient_last_name: 'Doe',
      date_of_payment: '2024-03-15',
      nature_of_payment_or_transfer_of_value: 'Food and Beverage',
    }
    const puf = mapRawToGeneralPuf(raw)

    const keyA = buildCrossSourceDedupKey(puf, 100, '2024-03-15')
    const keyB = buildCrossSourceDedupKey(puf, 200, '2024-03-15')

    expect(keyA).not.toBe(keyB)
  })
})

describe('cvent connector', () => {
  it('maps sample to Food and Beverage nature', () => {
    const result = mapConnectorPayload('cvent', CVENT_CONNECTOR.sampleUpstreamPayload)
    expect(result.missingRequired).toEqual([])
    expect(result.canonicalRow.nature_of_payment_or_transfer_of_value).toBe('Food and Beverage')
    expect(result.canonicalRow.covered_recipient_npi).toBe('1234567890')
  })
})
