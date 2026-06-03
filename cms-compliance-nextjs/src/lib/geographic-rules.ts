/** US states, DC, and territories recognized for CMS Open Payments domestic addressing */
export const US_STATE_AND_TERRITORY_CODES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
  'PR', 'GU', 'VI', 'AS', 'MP', 'UM',
])

export const US_COUNTRY_ALIASES = new Set([
  'US',
  'USA',
  'U.S.',
  'U.S.A.',
  'UNITED STATES',
  'UNITED STATES OF AMERICA',
])

export function normalizeCountry(country?: string | null): string {
  if (!country?.trim()) return ''
  return country.trim().toUpperCase().replace(/\./g, '')
}

export function isUnitedStatesCountry(country?: string | null): boolean {
  const normalized = normalizeCountry(country)
  if (!normalized) return true // CMS files often leave country blank for domestic recipients
  return US_COUNTRY_ALIASES.has(normalized)
}

export function isOutsideUnitedStates(country?: string | null): boolean {
  const normalized = normalizeCountry(country)
  if (!normalized) return false
  return !US_COUNTRY_ALIASES.has(normalized)
}

export function isValidUsStateOrTerritory(state?: string | null): boolean {
  if (!state?.trim()) return false
  return US_STATE_AND_TERRITORY_CODES.has(state.trim().toUpperCase())
}

export function describeRecipientLocation(record: {
  recipientCountry?: string | null
  recipientState?: string | null
  recipientProvince?: string | null
  countryOfTravel?: string | null
  stateOfTravel?: string | null
}): {
  isDomestic: boolean
  isForeignRecipient: boolean
  isTravelOutsideUs: boolean
  locationLabel: string
} {
  const isDomestic = isUnitedStatesCountry(record.recipientCountry)
  const isForeignRecipient = isOutsideUnitedStates(record.recipientCountry)
  const isTravelOutsideUs =
    !!record.countryOfTravel && isOutsideUnitedStates(record.countryOfTravel)

  const locationLabel = isForeignRecipient
    ? `${record.recipientProvince || record.recipientState || 'Unknown region'}, ${record.recipientCountry}`
    : `${record.recipientState || 'Unknown state'}, United States`

  return { isDomestic, isForeignRecipient, isTravelOutsideUs, locationLabel }
}
