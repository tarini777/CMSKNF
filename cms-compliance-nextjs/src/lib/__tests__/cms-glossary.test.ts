import { CMS_OPEN_PAYMENTS_GLOSSARY } from '@/data/cms-open-payments-glossary'
import { buildCmsOfficialGlossaryTerms } from '@/lib/cms-glossary-mapper'

describe('CMS Open Payments glossary', () => {
  it('includes Acquisitions through Travel and lodging', () => {
    const terms = CMS_OPEN_PAYMENTS_GLOSSARY.map((e) => e.term)
    expect(terms).toContain('Acquisitions')
    expect(terms).toContain('Travel and Lodging')
    expect(terms).toContain('Applicable Manufacturers')
    expect(terms).toContain('Covered Recipient')
    expect(terms).toContain('Research Payment')
  })

  it('marks Program Year 2021+ notes for Acquisitions', () => {
    const acquisitions = CMS_OPEN_PAYMENTS_GLOSSARY.find((e) => e.id === 'cms_acquisitions')
    expect(acquisitions?.programYearNote).toMatch(/2021/)
  })

  it('maps to glossary service terms with cms_official source', () => {
    const mapped = buildCmsOfficialGlossaryTerms()
    expect(mapped.length).toBe(CMS_OPEN_PAYMENTS_GLOSSARY.length)
    expect(mapped.every((t) => t.source === 'cms_official')).toBe(true)
    expect(mapped.find((t) => t.id === 'cms_travel_lodging')?.cmsCategory).toBe('Nature of Payment')
  })
})
