import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fileStorage } from '@/lib/file-storage'
import { FileUploadResponse } from '@/types/cms'
import { glossaryService } from '@/lib/glossary-service'
import { analyzeRecordWithCompanyRules } from '@/lib/company-rules-engine'
import { createAuditLog } from '@/lib/audit-log'
import { getPerformedBy } from '@/lib/request-user'
import { recalculateAggregatesForSession } from '@/lib/aggregate-threshold-service'
import { ingestSourceRow } from '@/lib/lineage/ingest-pipeline'
import type { TransparencyAnalysis } from '@/lib/transparency-rules-engine'

function csvField(recordData: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    if (recordData[key]) return recordData[key]
  }
  return ''
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({
        success: false,
        error: 'Only CSV files are allowed'
      }, { status: 400 })
    }

    // Store the file first
    const sessionId = `SESSION_${Date.now()}`
    const storageResult = await fileStorage.storeFile(file, sessionId)
    
    if (!storageResult.success) {
      return NextResponse.json({
        success: false,
        error: `Failed to store file: ${storageResult.error}`
      }, { status: 500 })
    }

    // Read file content for processing
    const fileContent = await file.text()
    const lines = fileContent.split('\n').filter(line => line.trim())
    
    if (lines.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'CSV file must contain at least a header and one data row'
      }, { status: 400 })
    }

    // Parse CSV header
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    
    // Create review session with file storage info
    const reviewSession = await prisma.reviewSession.create({
      data: {
        sessionId,
        filename: file.name,
        originalFilename: file.name,
        filePath: storageResult.filePath,
        fileSize: storageResult.fileSize,
        fileHash: storageResult.fileHash,
        totalRecords: lines.length - 1,
        processedRecords: 0,
        reportableCount: 0,
        nonReportableCount: 0,
        errorCount: 0,
        status: 'pending_review'
      }
    })

    // Process CSV data
    let processedCount = 0
    let reportableCount = 0
    let nonReportableCount = 0
    let errorCount = 0

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const recordData: any = {}
        
        // Map CSV columns to record fields
        headers.forEach((header, index) => {
          const value = values[index] || ''
          recordData[header] = value
        })

        const amount = parseFloat(csvField(recordData, 'total_amount_of_payment_usdollars', 'Total_Amount_of_Payment_USDollars')) || 0
        const paymentCurrency = csvField(recordData, 'payment_currency', 'Payment_Currency', 'Currency') || 'USD'

        const draftRecord = {
          id: `draft_${i}`,
          recordId: csvField(recordData, 'record_id', 'Record_ID') || `REC_${Date.now()}_${i}`,
          coveredRecipientId: csvField(recordData, 'covered_recipient_id', 'Covered_Recipient_ID') || `RECIPIENT_${i}`,
          coveredRecipientName: csvField(recordData, 'covered_recipient_name', 'Covered_Recipient_Name'),
          coveredRecipientType: csvField(recordData, 'covered_recipient_type', 'Covered_Recipient_Type'),
          teachingHospitalName: csvField(recordData, 'teaching_hospital_name', 'Teaching_Hospital_Name'),
          totalAmountOfPaymentUsdollars: amount,
          dateOfPayment: csvField(recordData, 'date_of_payment', 'Date_of_Payment'),
          formOfPaymentOrTransferOfValue: csvField(recordData, 'form_of_payment_or_transfer_of_value', 'Form_of_Payment_or_Transfer_of_Value'),
          natureOfPaymentOrTransferOfValue: csvField(recordData, 'nature_of_payment_or_transfer_of_value', 'Nature_of_Payment_or_Transfer_of_Value'),
          physicianFirstName: csvField(recordData, 'physician_first_name', 'Physician_First_Name'),
          physicianLastName: csvField(recordData, 'physician_last_name', 'Physician_Last_Name'),
          physicianSpecialty: csvField(recordData, 'physician_specialty', 'Physician_Specialty'),
          recipientCity: csvField(recordData, 'recipient_city', 'Recipient_City'),
          recipientState: csvField(recordData, 'recipient_state', 'Recipient_State'),
          recipientZipCode: csvField(recordData, 'recipient_zip_code', 'Recipient_Zip_Code'),
          recipientCountry: csvField(recordData, 'recipient_country', 'Recipient_Country'),
          recipientProvince: csvField(recordData, 'recipient_province', 'Recipient_Province'),
          recipientPostalCode: csvField(recordData, 'recipient_postal_code', 'Recipient_Postal_Code'),
          countryOfTravel: csvField(recordData, 'country_of_travel', 'Country_of_Travel'),
          stateOfTravel: csvField(recordData, 'state_of_travel', 'State_of_Travel'),
          cityOfTravel: csvField(recordData, 'city_of_travel', 'City_of_Travel'),
          applicableManufacturerOrApplicableGpoMakingPaymentName: csvField(
            recordData,
            'applicable_manufacturer_or_applicable_gpo_making_payment_name',
            'Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Name'
          ),
          applicableManufacturerOrApplicableGpoMakingPaymentCountry: csvField(
            recordData,
            'applicable_manufacturer_or_applicable_gpo_making_payment_country',
            'Applicable_Manufacturer_or_Applicable_GPO_Making_Payment_Country'
          ),
          physicianOwnershipIndicator: csvField(recordData, 'physician_ownership_indicator', 'Physician_Ownership_Indicator'),
          thirdPartyPaymentRecipientIndicator: csvField(recordData, 'third_party_payment_recipient_indicator', 'Third_Party_Payment_Recipient_Indicator'),
          nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue: csvField(
            recordData,
            'name_of_third_party_entity_receiving_payment_or_transfer_of_value',
            'Name_of_Third_Party_Entity_Receiving_Payment_or_Transfer_of_Value'
          ),
          thirdPartyEqualsCoveredRecipientIndicator: csvField(
            recordData,
            'third_party_equals_covered_recipient_indicator',
            'Third_Party_Equals_Covered_Recipient_Indicator'
          ),
          productIndicator: csvField(recordData, 'product_indicator', 'Product_Indicator'),
          contextualInformation: csvField(recordData, 'contextual_information', 'Contextual_Information'),
          programYear: csvField(recordData, 'program_year', 'Program_Year'),
          disputeStatusForPublication: csvField(recordData, 'dispute_status_for_publication', 'Dispute_Status_for_Publication'),
          paymentCurrency,
          isReportable: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        const baseAnalysis = await glossaryService.analyzeReportability(draftRecord as any)
        const analysis = (await analyzeRecordWithCompanyRules(
          draftRecord as any,
          baseAnalysis
        )) as TransparencyAnalysis

        const record = await prisma.cMSRecord.create({
          data: {
            recordId: draftRecord.recordId,
            coveredRecipientId: draftRecord.coveredRecipientId,
            coveredRecipientName: draftRecord.coveredRecipientName,
            coveredRecipientType: draftRecord.coveredRecipientType,
            teachingHospitalName: draftRecord.teachingHospitalName || undefined,
            totalAmountOfPaymentUsdollars: analysis.reportingCurrencyValue ?? amount,
            dateOfPayment: draftRecord.dateOfPayment,
            formOfPaymentOrTransferOfValue: draftRecord.formOfPaymentOrTransferOfValue,
            natureOfPaymentOrTransferOfValue: draftRecord.natureOfPaymentOrTransferOfValue,
            physicianFirstName: draftRecord.physicianFirstName,
            physicianLastName: draftRecord.physicianLastName,
            physicianSpecialty: draftRecord.physicianSpecialty,
            physicianPrimaryType: csvField(recordData, 'physician_primary_type', 'Physician_Primary_Type') || undefined,
            recipientCity: draftRecord.recipientCity,
            recipientState: draftRecord.recipientState,
            recipientZipCode: draftRecord.recipientZipCode,
            recipientCountry: draftRecord.recipientCountry || undefined,
            recipientProvince: draftRecord.recipientProvince || undefined,
            recipientPostalCode: draftRecord.recipientPostalCode || undefined,
            countryOfTravel: draftRecord.countryOfTravel || undefined,
            stateOfTravel: draftRecord.stateOfTravel || undefined,
            cityOfTravel: draftRecord.cityOfTravel || undefined,
            applicableManufacturerOrApplicableGpoMakingPaymentName:
              draftRecord.applicableManufacturerOrApplicableGpoMakingPaymentName || undefined,
            applicableManufacturerOrApplicableGpoMakingPaymentCountry:
              draftRecord.applicableManufacturerOrApplicableGpoMakingPaymentCountry || undefined,
            physicianOwnershipIndicator: draftRecord.physicianOwnershipIndicator || undefined,
            thirdPartyPaymentRecipientIndicator: draftRecord.thirdPartyPaymentRecipientIndicator || undefined,
            nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue:
              draftRecord.nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue || undefined,
            thirdPartyEqualsCoveredRecipientIndicator:
              draftRecord.thirdPartyEqualsCoveredRecipientIndicator || undefined,
            productIndicator: draftRecord.productIndicator || undefined,
            contextualInformation: draftRecord.contextualInformation || undefined,
            programYear: draftRecord.programYear || undefined,
            disputeStatusForPublication: draftRecord.disputeStatusForPublication || undefined,
            disputeWorkflowStatus: draftRecord.disputeStatusForPublication?.toLowerCase() === 'yes' ? 'disputed' : 'none',
            paymentCurrency: analysis.paymentCurrency || paymentCurrency,
            exchangeRate: analysis.exchangeRate ?? 1,
            reportingCurrencyValue: analysis.reportingCurrencyValue ?? amount,
            cmsReportCategory: analysis.cmsReportCategory,
            disclosureType: analysis.disclosureType,
            aggregateStatus: analysis.aggregateStatus,
            isReportable: analysis.isReportable,
            reason: analysis.reasoning.join('; '),
            appliedRules: analysis.applicableRules,
            humanDecision: 'pending',
            reviewSessionId: reviewSession.id,
          },
        })

        await ingestSourceRow({
          sourceKey: 'csv_upload',
          rawRow: recordData,
          reviewSessionId: reviewSession.sessionId,
          rowNumber: i,
          externalTransactionId: draftRecord.recordId,
          analysis: analysis as TransparencyAnalysis,
          cmsRecordId: record.id,
        })

        processedCount++
        if (record.isReportable) {
          reportableCount++
        } else {
          nonReportableCount++
        }

      } catch (error) {
        console.error(`Error processing row ${i}:`, error)
        errorCount++
      }
    }

    // Update review session with final counts
    await prisma.reviewSession.update({
      where: { id: reviewSession.id },
      data: {
        processedRecords: processedCount,
        reportableCount,
        nonReportableCount,
        errorCount,
        status: 'completed'
      }
    })

    // Annual aggregate recalculation (US $100 threshold for sub-$10 payments)
    await recalculateAggregatesForSession(reviewSession.id)

    // Refresh counts after aggregate pass
    const finalRecords = await prisma.cMSRecord.findMany({ where: { reviewSessionId: reviewSession.id } })
    reportableCount = finalRecords.filter((r) => r.isReportable).length
    nonReportableCount = finalRecords.filter((r) => !r.isReportable).length

    await prisma.reviewSession.update({
      where: { id: reviewSession.id },
      data: { reportableCount, nonReportableCount },
    })

    await createAuditLog({
      action: 'create',
      entityType: 'session',
      entityId: reviewSession.sessionId,
      newValues: {
        filename: file.name,
        totalRecords: lines.length - 1,
        processedRecords: processedCount,
        reportableCount,
        nonReportableCount,
        errorCount,
      },
      performedBy: await getPerformedBy(),
    })

    const response: FileUploadResponse = {
      success: true,
      sessionId: reviewSession.sessionId,
      totalRecords: lines.length - 1,
      processedRecords: processedCount,
      reportableCount,
      nonReportableCount,
      errorCount
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error processing file upload:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to process file upload'
    }, { status: 500 })
  }
}
