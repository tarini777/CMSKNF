import { buildAttestationChecklist } from '@/lib/submission-calendar'
import { CMS_GENERAL_PUF_HEADERS, CMS_RESEARCH_PUF_REQUIRED_FIELDS } from '@/types/cms-puf'
import { CONNECTOR_REGISTRY, SUPPORTED_CONNECTOR_KEYS } from '@/lib/lineage/connectors'

describe('Sprint C — CMS fidelity', () => {
  it('defines 91 general PUF columns per Jan 2025 dictionary', () => {
    expect(CMS_GENERAL_PUF_HEADERS.length).toBe(91)
  })

  it('defines core research required fields', () => {
    expect(CMS_RESEARCH_PUF_REQUIRED_FIELDS).toContain('clinicaltrials_gov_identifier')
    expect(CMS_RESEARCH_PUF_REQUIRED_FIELDS).toContain('name_of_study')
  })

  it('includes PUF validation in attestation checklist', () => {
    const checklist = buildAttestationChecklist({
      totalRecords: 10,
      reportableRecords: 5,
      disputedRecords: 0,
      unresolvedDisputes: 0,
      exportGenerated: true,
      pufValidated: true,
    })
    expect(checklist.find((c) => c.id === 'puf_validated')?.completed).toBe(true)
  })

  it('registers CTMS and Greenphire research connectors', () => {
    expect(SUPPORTED_CONNECTOR_KEYS).toContain('ctms')
    expect(SUPPORTED_CONNECTOR_KEYS).toContain('greenphire')
    expect(SUPPORTED_CONNECTOR_KEYS).toContain('sap_ap')
    expect(SUPPORTED_CONNECTOR_KEYS).toContain('clm')
    expect(CONNECTOR_REGISTRY.ctms.category).toBe('clinical')
    expect(CONNECTOR_REGISTRY.greenphire.mappingVersion).toContain('greenphire')
  })
})
