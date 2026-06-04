import {
  buildNppesApiUrl,
  parseNppesRecord,
  type NppesRecord,
} from '@/lib/nppes-api-client'

describe('nppes-api-client', () => {
  it('builds v2.1 API URL with number', () => {
    const url = buildNppesApiUrl({ number: '1234567890', limit: 1 })
    expect(url).toContain('version=2.1')
    expect(url).toContain('number=1234567890')
    expect(url).toContain('limit=1')
  })

  it('builds search URL with enumeration_type and name', () => {
    const url = buildNppesApiUrl({
      enumeration_type: 'NPI-1',
      first_name: 'John',
      last_name: 'Smith',
      limit: 10,
    })
    expect(url).toContain('enumeration_type=NPI-1')
    expect(url).toContain('first_name=John')
    expect(url).toContain('last_name=Smith')
  })

  it('parses individual provider record', () => {
    const record: NppesRecord = {
      number: '1234567890',
      enumeration_type: 'NPI-1',
      basic: {
        first_name: 'Jane',
        last_name: 'Doe',
        credential: 'MD',
        status: 'A',
      },
      taxonomies: [{ desc: 'Internal Medicine', primary: true }],
      addresses: [
        { address_purpose: 'LOCATION', address_1: '123 Main', city: 'Boston', state: 'MA', postal_code: '02101' },
      ],
    }
    const parsed = parseNppesRecord(record)
    expect(parsed.recipientType).toBe('individual')
    expect(parsed.firstName).toBe('Jane')
    expect(parsed.specialty).toBe('Internal Medicine')
    expect(parsed.city).toBe('Boston')
  })

  it('parses organizational provider record', () => {
    const record: NppesRecord = {
      number: '1987654321',
      enumeration_type: 'NPI-2',
      basic: { organization_name: 'General Hospital', status: 'A' },
      addresses: [{ address_purpose: 'LOCATION', city: 'Chicago', state: 'IL' }],
    }
    const parsed = parseNppesRecord(record)
    expect(parsed.recipientType).toBe('organization')
    expect(parsed.organizationName).toBe('General Hospital')
  })
})
