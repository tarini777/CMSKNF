import { canAccessTab, getVisibleTabs, homeTabForPersona } from '@/lib/persona-navigation'
import { PERSONAS, resolvePersonaId } from '@/config/personas'

describe('persona navigation', () => {
  it('compliance officer owns review and transparency tabs', () => {
    expect(canAccessTab('maria', 'review')).toBe(true)
    expect(canAccessTab('maria', 'transparency')).toBe(true)
    expect(canAccessTab('maria', 'rules')).toBe(false)
  })

  it('data analyst owns lineage and upload', () => {
    expect(canAccessTab('derek', 'lineage')).toBe(true)
    expect(canAccessTab('derek', 'upload')).toBe(true)
    expect(canAccessTab('derek', 'rules')).toBe(false)
  })

  it('admin has broad platform access via owned tabs', () => {
    expect(canAccessTab('sam', 'rules')).toBe(true)
    expect(canAccessTab('sam', 'monitoring')).toBe(true)
  })

  it('executive has limited write surface', () => {
    const tabs = getVisibleTabs('priya')
    const owned = tabs.filter((t) => t.access === 'owner').map((t) => t.id)
    expect(owned).toEqual(['dashboard', 'analytics'])
    expect(canAccessTab('priya', 'transparency')).toBe(true)
  })

  it('resolves URL aliases', () => {
    expect(resolvePersonaId('compliance_officer')).toBe('maria')
    expect(resolvePersonaId('data_analyst')).toBe('derek')
  })

  it('defaults home tabs per persona', () => {
    expect(homeTabForPersona('maria')).toBe('review')
    expect(homeTabForPersona('derek')).toBe('lineage')
    expect(homeTabForPersona('sam')).toBe('monitoring')
  })

  it('defines five demo personas', () => {
    expect(Object.keys(PERSONAS).length).toBe(5)
  })
})
