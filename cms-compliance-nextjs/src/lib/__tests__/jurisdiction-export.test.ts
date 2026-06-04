import {
  buildJurisdictionRulesFromFrameworks,
} from '@/lib/jurisdiction-seed-service'
import {
  recordMatchesJurisdiction,
  resolveExportTemplate,
} from '@/lib/jurisdiction-export-service'
import { getAllInternationalRegimes } from '@/data/international-regulatory-frameworks'

describe('jurisdiction seed service', () => {
  it('builds rules for all 78 national regimes', () => {
    const rules = buildJurisdictionRulesFromFrameworks()
    expect(rules).toHaveLength(78)
    expect(rules.some((r) => r.jurisdictionCode === 'US')).toBe(true)
    expect(rules.some((r) => r.jurisdictionCode === 'FR')).toBe(true)
    expect(rules.some((r) => r.jurisdictionCode === 'GB')).toBe(true)
  })
})

describe('jurisdiction export service', () => {
  it('matches recipients by country name and alias', () => {
    expect(recordMatchesJurisdiction({ recipientCountry: 'France' }, 'FR')).toBe(true)
    expect(recordMatchesJurisdiction({ recipientCountry: 'United Kingdom' }, 'GB')).toBe(true)
    expect(recordMatchesJurisdiction({ recipientCountry: 'Germany' }, 'FR')).toBe(false)
  })

  it('resolves export templates for specialized and standard jurisdictions', () => {
    expect(resolveExportTemplate('FR')).toBe('fr_transparence')
    expect(resolveExportTemplate('GB')).toBe('uk_disclosure')
    expect(resolveExportTemplate('DE')).toBe('efpia_standard')
    expect(resolveExportTemplate('BR')).toBe('national_standard')
  })

  it('covers every catalogued regime', () => {
    expect(getAllInternationalRegimes()).toHaveLength(78)
    for (const regime of getAllInternationalRegimes()) {
      expect(resolveExportTemplate(regime.countryCode)).toBeTruthy()
    }
  })
})
