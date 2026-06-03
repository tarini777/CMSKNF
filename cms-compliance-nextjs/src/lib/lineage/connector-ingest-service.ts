import { prisma } from '@/lib/prisma'
import { analyzeRecordWithCompanyRules } from '@/lib/company-rules-engine'
import { glossaryService } from '@/lib/glossary-service'
import type { CMSRecord } from '@/types/cms'
import type { TransparencyAnalysis } from '@/lib/transparency-rules-engine'
import {
  isSupportedConnector,
  mapConnectorPayload,
  type SupportedConnectorKey,
} from '@/lib/lineage/connectors'
import type { ConnectorIngestResult, ConnectorMapResult } from '@/lib/lineage/connectors/types'
import { ingestSourceRow } from '@/lib/lineage/ingest-pipeline'
import { normalizeRawRow } from '@/lib/lineage/puf-field-mapper'
import { extractCmsRecordFieldsFromCanonical } from '@/lib/lineage/record-view-service'

export function buildDraftRecordFromCanonicalRow(
  canonicalRow: Record<string, string>,
  recordIdPrefix: string
): CMSRecord {
  const r = normalizeRawRow(canonicalRow)
  const amount = parseFloat(r.total_amount_of_payment_usdollars || '0') || 0
  const first = r.covered_recipient_first_name || ''
  const last = r.covered_recipient_last_name || ''
  const fullName = [first, last].filter(Boolean).join(' ').trim()

  return {
    id: 'draft',
    recordId: r.record_id || `${recordIdPrefix}_${Date.now()}`,
    coveredRecipientId: r.covered_recipient_npi || r.covered_recipient_profile_id || fullName || 'UNKNOWN',
    coveredRecipientName: fullName || r.covered_recipient_full_name || 'Unknown',
    coveredRecipientType: r.covered_recipient_type || 'Covered Recipient Physician',
    teachingHospitalName: r.teaching_hospital_name,
    physicianProfileId: r.covered_recipient_profile_id,
    physicianFirstName: first || undefined,
    physicianLastName: last || undefined,
    physicianSpecialty: r.covered_recipient_specialty_1,
    recipientCity: r.recipient_city,
    recipientState: r.recipient_state,
    recipientZipCode: r.recipient_zip_code,
    recipientCountry: r.recipient_country,
    recipientProvince: r.recipient_province,
    recipientPostalCode: r.recipient_postal_code,
    totalAmountOfPaymentUsdollars: amount,
    dateOfPayment: r.date_of_payment,
    formOfPaymentOrTransferOfValue: r.form_of_payment_or_transfer_of_value,
    natureOfPaymentOrTransferOfValue: r.nature_of_payment_or_transfer_of_value,
    cityOfTravel: r.city_of_travel,
    stateOfTravel: r.state_of_travel,
    countryOfTravel: r.country_of_travel,
    thirdPartyPaymentRecipientIndicator: r.third_party_payment_recipient_indicator,
    nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue:
      r.name_of_third_party_entity_receiving_payment_or_transfer_of_value,
    thirdPartyEqualsCoveredRecipientIndicator: r.third_party_equals_covered_recipient_indicator,
    contextualInformation: r.contextual_information,
    productIndicator: r.related_product_indicator,
    programYear: r.program_year,
    paymentCurrency: r.payment_currency || 'USD',
    isReportable: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function previewConnectorMapping(
  sourceKey: SupportedConnectorKey,
  upstreamPayload: Record<string, unknown>
): Promise<ConnectorMapResult> {
  if (!isSupportedConnector(sourceKey)) {
    throw new Error(`Unsupported connector: ${sourceKey}`)
  }
  return mapConnectorPayload(sourceKey, upstreamPayload)
}

export interface ConnectorIngestOptions {
  reviewSessionId?: string
  createCmsRecord?: boolean
  skipIfDuplicate?: boolean
}

export async function ingestConnectorPayload(
  sourceKey: SupportedConnectorKey,
  upstreamPayload: Record<string, unknown>,
  options: ConnectorIngestOptions = {}
): Promise<ConnectorIngestResult & { mapResult: ConnectorMapResult }> {
  const mapResult = await previewConnectorMapping(sourceKey, upstreamPayload)

  if (mapResult.missingRequired.length > 0) {
    throw new Error(`Missing required fields: ${mapResult.missingRequired.join(', ')}`)
  }

  const rawRow: Record<string, string> = {
    ...mapResult.canonicalRow,
    _connector_meta: JSON.stringify({
      sourceKey,
      mappingVersion: mapResult.mappingVersion,
      externalTransactionId: mapResult.externalTransactionId,
    }),
    _upstream_payload: JSON.stringify(upstreamPayload),
  }

  const draft = buildDraftRecordFromCanonicalRow(mapResult.canonicalRow, sourceKey.toUpperCase())
  const baseAnalysis = await glossaryService.analyzeReportability(draft)
  const analysis = (await analyzeRecordWithCompanyRules(
    draft,
    baseAnalysis
  )) as TransparencyAnalysis

  let cmsRecordId: string | undefined

  if (options.createCmsRecord !== false) {
    const pufFields = extractCmsRecordFieldsFromCanonical(mapResult.canonicalRow, sourceKey)
    const record = await prisma.cMSRecord.create({
      data: {
        recordId: draft.recordId,
        coveredRecipientId: draft.coveredRecipientId,
        coveredRecipientName: draft.coveredRecipientName,
        coveredRecipientType: draft.coveredRecipientType,
        teachingHospitalName: draft.teachingHospitalName,
        teachingHospitalCcn: pufFields.teachingHospitalCcn,
        coveredRecipientNpi: pufFields.coveredRecipientNpi,
        physicianProfileId: pufFields.physicianProfileId,
        changeType: pufFields.changeType,
        relatedProductIndicator: pufFields.relatedProductIndicator,
        sourceSystem: sourceKey,
        nameOfAssociatedCoveredDrugOrBiological1: pufFields.nameOfAssociatedCoveredDrugOrBiological1,
        ndcOfAssociatedCoveredDrugOrBiological1: pufFields.ndcOfAssociatedCoveredDrugOrBiological1,
        totalAmountOfPaymentUsdollars: analysis.reportingCurrencyValue ?? draft.totalAmountOfPaymentUsdollars,
        dateOfPayment: draft.dateOfPayment,
        formOfPaymentOrTransferOfValue: draft.formOfPaymentOrTransferOfValue,
        natureOfPaymentOrTransferOfValue: draft.natureOfPaymentOrTransferOfValue,
        physicianFirstName: draft.physicianFirstName,
        physicianLastName: draft.physicianLastName,
        physicianSpecialty: draft.physicianSpecialty,
        recipientCity: draft.recipientCity,
        recipientState: draft.recipientState,
        recipientCountry: draft.recipientCountry,
        cityOfTravel: draft.cityOfTravel,
        stateOfTravel: draft.stateOfTravel,
        countryOfTravel: draft.countryOfTravel,
        thirdPartyPaymentRecipientIndicator: draft.thirdPartyPaymentRecipientIndicator,
        nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue:
          draft.nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue,
        thirdPartyEqualsCoveredRecipientIndicator: draft.thirdPartyEqualsCoveredRecipientIndicator,
        contextualInformation: draft.contextualInformation,
        productIndicator: draft.productIndicator,
        programYear: draft.programYear,
        paymentCurrency: analysis.paymentCurrency || 'USD',
        exchangeRate: analysis.exchangeRate ?? 1,
        reportingCurrencyValue: analysis.reportingCurrencyValue ?? draft.totalAmountOfPaymentUsdollars,
        cmsReportCategory: analysis.cmsReportCategory,
        disclosureType: analysis.disclosureType,
        aggregateStatus: analysis.aggregateStatus,
        isReportable: analysis.isReportable,
        reason: analysis.reasoning.join('; '),
        appliedRules: analysis.applicableRules,
        humanDecision: 'pending',
      },
    })
    cmsRecordId = record.id
  }

  const ingestResult = await ingestSourceRow({
    sourceKey,
    rawRow,
    reviewSessionId: options.reviewSessionId,
    externalTransactionId: mapResult.externalTransactionId,
    analysis,
    cmsRecordId,
  })

  await prisma.sourceTransaction.update({
    where: { id: ingestResult.sourceTransactionId },
    data: { status: 'processed' },
  })

  return {
    ...ingestResult,
    cmsRecordId,
    isReportable: analysis.isReportable,
    mappingVersion: mapResult.mappingVersion,
    mapResult,
  }
}

export async function ingestConnectorBatch(
  sourceKey: SupportedConnectorKey,
  payloads: Record<string, unknown>[],
  options?: ConnectorIngestOptions
) {
  const results: Array<ConnectorIngestResult & { mapResult: ConnectorMapResult }> = []
  const errors: Array<{ index: number; error: string }> = []

  for (let i = 0; i < payloads.length; i++) {
    try {
      const result = await ingestConnectorPayload(sourceKey, payloads[i], options)
      results.push(result)
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Ingest failed',
      })
    }
  }

  return { results, errors, successCount: results.length, errorCount: errors.length }
}
