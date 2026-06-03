import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import type { CmsGeneralPufFields } from '@/types/cms-puf'

export const DEFAULT_DATA_SOURCES = [
  { sourceKey: 'csv_upload', sourceName: 'CSV Upload', sourceCategory: 'upload' },
  { sourceKey: 'sap_ap', sourceName: 'SAP Accounts Payable', sourceCategory: 'financial' },
  { sourceKey: 'oracle_gl', sourceName: 'Oracle General Ledger', sourceCategory: 'financial' },
  { sourceKey: 'concur', sourceName: 'SAP Concur T&E', sourceCategory: 'travel' },
  { sourceKey: 'amex_pcard', sourceName: 'Corporate Card (Amex)', sourceCategory: 'financial' },
  { sourceKey: 'veeva_crm', sourceName: 'Veeva CRM', sourceCategory: 'crm' },
  { sourceKey: 'salesforce_hc', sourceName: 'Salesforce Health Cloud', sourceCategory: 'crm' },
  { sourceKey: 'cvent', sourceName: 'Cvent Events', sourceCategory: 'crm' },
  { sourceKey: 'speaker_bureau', sourceName: 'Speaker Bureau Platform', sourceCategory: 'crm' },
  { sourceKey: 'clm', sourceName: 'Contract Lifecycle Management', sourceCategory: 'contracting' },
  { sourceKey: 'fmv_engine', sourceName: 'FMV Rate Engine', sourceCategory: 'contracting' },
  { sourceKey: 'grants_mgmt', sourceName: 'Medical Grants Management', sourceCategory: 'grants' },
  { sourceKey: 'ctms', sourceName: 'Veeva CTMS / Clinical Payments', sourceCategory: 'clinical' },
  { sourceKey: 'greenphire', sourceName: 'Greenphire Clinical Payments', sourceCategory: 'clinical' },
  { sourceKey: 'sample_mgmt', sourceName: 'Sample Accountability System', sourceCategory: 'samples' },
  { sourceKey: 'msl_platform', sourceName: 'Medical Affairs / MSL Platform', sourceCategory: 'medical_affairs' },
  { sourceKey: 'vendor_med_ed', sourceName: 'Third-Party Med-Ed Vendor', sourceCategory: 'vendor' },
  { sourceKey: 'tmc', sourceName: 'Travel Management Company', sourceCategory: 'vendor' },
  { sourceKey: 'veeva_open_data', sourceName: 'Veeva OpenData MDM', sourceCategory: 'mdm' },
  { sourceKey: 'iqvia_onekey', sourceName: 'IQVIA OneKey', sourceCategory: 'mdm' },
  { sourceKey: 'nppes', sourceName: 'NPPES NPI Registry', sourceCategory: 'mdm' },
] as const

export async function ensureDefaultDataSources() {
  for (const source of DEFAULT_DATA_SOURCES) {
    await prisma.dataSource.upsert({
      where: { sourceKey: source.sourceKey },
      update: { sourceName: source.sourceName, sourceCategory: source.sourceCategory, isActive: true },
      create: { ...source, isActive: true },
    })
  }
}

export async function getDataSourceByKey(sourceKey: string) {
  await ensureDefaultDataSources()
  return prisma.dataSource.findUnique({ where: { sourceKey } })
}

export function hashPayload(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}

export interface HcpResolutionInput {
  npi?: string
  cmsProfileId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  nameSuffix?: string
  fullName?: string
  specialty?: string
  primaryType?: string
  coveredRecipientType?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  province?: string
  postalCode?: string
  licenseStateCodes?: string[]
  teachingHospitalId?: string
  teachingHospitalName?: string
  teachingHospitalCcn?: string
  sourceCrosswalk?: Record<string, string>
}

function buildMasterKey(input: HcpResolutionInput): string {
  if (input.npi) return `npi:${input.npi}`
  if (input.cmsProfileId) return `profile:${input.cmsProfileId}`
  const name = [input.lastName, input.firstName, input.state].filter(Boolean).join('|').toLowerCase()
  return `name:${name || 'unknown'}`
}

export async function resolveOrCreateHcpMaster(input: HcpResolutionInput) {
  const masterKey = buildMasterKey(input)
  const fullName =
    input.fullName ||
    [input.firstName, input.middleName, input.lastName, input.nameSuffix].filter(Boolean).join(' ').trim()

  const matchStatus = input.npi ? 'verified_nppes' : input.cmsProfileId ? 'verified_cms' : 'pending'

  return prisma.hcpMaster.upsert({
    where: { masterKey },
    update: {
      npi: input.npi || undefined,
      cmsProfileId: input.cmsProfileId || undefined,
      firstName: input.firstName || undefined,
      middleName: input.middleName || undefined,
      lastName: input.lastName || undefined,
      nameSuffix: input.nameSuffix || undefined,
      fullName: fullName || undefined,
      specialty: input.specialty || undefined,
      primaryType: input.primaryType || undefined,
      coveredRecipientType: input.coveredRecipientType || undefined,
      addressLine1: input.addressLine1 || undefined,
      addressLine2: input.addressLine2 || undefined,
      city: input.city || undefined,
      state: input.state || undefined,
      zipCode: input.zipCode || undefined,
      country: input.country || undefined,
      province: input.province || undefined,
      postalCode: input.postalCode || undefined,
      licenseStateCodes: input.licenseStateCodes || undefined,
      teachingHospitalId: input.teachingHospitalId || undefined,
      teachingHospitalName: input.teachingHospitalName || undefined,
      teachingHospitalCcn: input.teachingHospitalCcn || undefined,
      sourceCrosswalk: input.sourceCrosswalk || undefined,
      matchStatus,
    },
    create: {
      masterKey,
      npi: input.npi,
      cmsProfileId: input.cmsProfileId,
      firstName: input.firstName,
      middleName: input.middleName,
      lastName: input.lastName,
      nameSuffix: input.nameSuffix,
      fullName,
      specialty: input.specialty,
      primaryType: input.primaryType,
      coveredRecipientType: input.coveredRecipientType,
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      country: input.country,
      province: input.province,
      postalCode: input.postalCode,
      licenseStateCodes: input.licenseStateCodes,
      teachingHospitalId: input.teachingHospitalId,
      teachingHospitalName: input.teachingHospitalName,
      teachingHospitalCcn: input.teachingHospitalCcn,
      sourceCrosswalk: input.sourceCrosswalk,
      matchStatus,
    },
  })
}

export function hcpInputFromGeneralPuf(puf: CmsGeneralPufFields, sourceKey?: string): HcpResolutionInput {
  const licenseCodes = [
    puf.covered_recipient_license_state_code1,
    puf.covered_recipient_license_state_code2,
    puf.covered_recipient_license_state_code3,
    puf.covered_recipient_license_state_code4,
    puf.covered_recipient_license_state_code5,
  ].filter(Boolean) as string[]

  return {
    npi: puf.covered_recipient_npi,
    cmsProfileId: puf.covered_recipient_profile_id,
    firstName: puf.covered_recipient_first_name,
    middleName: puf.covered_recipient_middle_name,
    lastName: puf.covered_recipient_last_name,
    nameSuffix: puf.covered_recipient_name_suffix,
    specialty: puf.covered_recipient_specialty_1,
    primaryType: puf.covered_recipient_primary_type_1,
    coveredRecipientType: puf.covered_recipient_type,
    addressLine1: puf.recipient_primary_business_street_address_line1,
    addressLine2: puf.recipient_primary_business_street_address_line2,
    city: puf.recipient_city,
    state: puf.recipient_state,
    zipCode: puf.recipient_zip_code,
    country: puf.recipient_country,
    province: puf.recipient_province,
    postalCode: puf.recipient_postal_code,
    licenseStateCodes: licenseCodes,
    teachingHospitalId: puf.teaching_hospital_id,
    teachingHospitalName: puf.teaching_hospital_name,
    teachingHospitalCcn: puf.teaching_hospital_ccn,
    sourceCrosswalk: sourceKey ? { [sourceKey]: puf.record_id || '' } : undefined,
  }
}

export function buildDedupKey(
  sourceKey: string,
  puf: CmsGeneralPufFields,
  amount: number,
  date?: string
): string {
  const parts = [
    sourceKey,
    puf.record_id,
    puf.covered_recipient_npi || puf.covered_recipient_profile_id,
    puf.covered_recipient_last_name,
    date || puf.date_of_payment,
    puf.nature_of_payment_or_transfer_of_value,
    amount.toFixed(2),
  ]
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32)
}
