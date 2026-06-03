-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."cms_records" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "coveredRecipientId" TEXT NOT NULL,
    "coveredRecipientName" TEXT NOT NULL,
    "coveredRecipientType" TEXT NOT NULL,
    "teachingHospitalId" TEXT,
    "teachingHospitalName" TEXT,
    "teachingHospitalCcn" TEXT,
    "coveredRecipientNpi" TEXT,
    "physicianProfileId" TEXT,
    "physicianFirstName" TEXT,
    "physicianMiddleName" TEXT,
    "physicianLastName" TEXT,
    "physicianNameSuffix" TEXT,
    "recipientPrimaryBusinessStreetAddressLine1" TEXT,
    "recipientPrimaryBusinessStreetAddressLine2" TEXT,
    "recipientCity" TEXT,
    "recipientState" TEXT,
    "recipientZipCode" TEXT,
    "recipientCountry" TEXT,
    "recipientProvince" TEXT,
    "recipientPostalCode" TEXT,
    "physicianPrimaryType" TEXT,
    "physicianSpecialty" TEXT,
    "physicianLicenseStateCode1" TEXT,
    "physicianLicenseStateCode2" TEXT,
    "physicianLicenseStateCode3" TEXT,
    "physicianLicenseStateCode4" TEXT,
    "physicianLicenseStateCode5" TEXT,
    "submittingApplicableManufacturerOrApplicableGpoName" TEXT,
    "applicableManufacturerOrApplicableGpoMakingPaymentId" TEXT,
    "applicableManufacturerOrApplicableGpoMakingPaymentName" TEXT,
    "applicableManufacturerOrApplicableGpoMakingPaymentState" TEXT,
    "applicableManufacturerOrApplicableGpoMakingPaymentCountry" TEXT,
    "totalAmountOfPaymentUsdollars" DOUBLE PRECISION NOT NULL,
    "dateOfPayment" TEXT,
    "numberOfPaymentsIncludedInTotalAmount" TEXT,
    "formOfPaymentOrTransferOfValue" TEXT,
    "natureOfPaymentOrTransferOfValue" TEXT,
    "cityOfTravel" TEXT,
    "stateOfTravel" TEXT,
    "countryOfTravel" TEXT,
    "physicianOwnershipIndicator" TEXT,
    "thirdPartyPaymentRecipientIndicator" TEXT,
    "nameOfThirdPartyEntityReceivingPaymentOrTransferOfValue" TEXT,
    "charityIndicator" TEXT,
    "thirdPartyEqualsCoveredRecipientIndicator" TEXT,
    "contextualInformation" TEXT,
    "delayInPublicationIndicator" TEXT,
    "disputeStatusForPublication" TEXT,
    "productIndicator" TEXT,
    "relatedProductIndicator" TEXT,
    "changeType" TEXT DEFAULT 'N',
    "sourceSystem" TEXT,
    "nameOfAssociatedCoveredDrugOrBiological1" TEXT,
    "nameOfAssociatedCoveredDrugOrBiological2" TEXT,
    "nameOfAssociatedCoveredDrugOrBiological3" TEXT,
    "nameOfAssociatedCoveredDrugOrBiological4" TEXT,
    "nameOfAssociatedCoveredDrugOrBiological5" TEXT,
    "ndcOfAssociatedCoveredDrugOrBiological1" TEXT,
    "ndcOfAssociatedCoveredDrugOrBiological2" TEXT,
    "ndcOfAssociatedCoveredDrugOrBiological3" TEXT,
    "ndcOfAssociatedCoveredDrugOrBiological4" TEXT,
    "ndcOfAssociatedCoveredDrugOrBiological5" TEXT,
    "nameOfAssociatedCoveredDeviceOrMedicalSupply1" TEXT,
    "nameOfAssociatedCoveredDeviceOrMedicalSupply2" TEXT,
    "nameOfAssociatedCoveredDeviceOrMedicalSupply3" TEXT,
    "nameOfAssociatedCoveredDeviceOrMedicalSupply4" TEXT,
    "nameOfAssociatedCoveredDeviceOrMedicalSupply5" TEXT,
    "programYear" TEXT,
    "paymentPublicationDate" TEXT,
    "isReportable" BOOLEAN NOT NULL DEFAULT false,
    "humanDecision" TEXT,
    "humanReason" TEXT,
    "decisionTime" TIMESTAMP(3),
    "finalReportable" BOOLEAN,
    "appliedRules" JSONB,
    "reason" TEXT,
    "cmsReportCategory" TEXT,
    "paymentCurrency" TEXT DEFAULT 'USD',
    "exchangeRate" DOUBLE PRECISION DEFAULT 1,
    "reportingCurrencyValue" DOUBLE PRECISION,
    "consentForDisclosure" BOOLEAN,
    "disclosureType" TEXT,
    "aggregateStatus" TEXT,
    "recipientAnnualAggregate" DOUBLE PRECISION,
    "disputeWorkflowStatus" TEXT DEFAULT 'none',
    "disputeOpenedAt" TIMESTAMP(3),
    "disputeResolvedAt" TIMESTAMP(3),
    "disputeNotes" TEXT,
    "nppesVerificationStatus" TEXT,
    "nppesVerifiedAt" TIMESTAMP(3),
    "nppesVerificationSource" TEXT,
    "nppesVerificationMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewSessionId" TEXT,
    "spendEventId" TEXT,

    CONSTRAINT "cms_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."company_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jurisdiction_rules" (
    "id" TEXT NOT NULL,
    "jurisdictionCode" TEXT NOT NULL,
    "jurisdictionName" TEXT NOT NULL,
    "perPaymentMin" DOUBLE PRECISION,
    "aggregateAnnualMin" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "fmvTolerancePercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "regulatoryBasis" TEXT,
    "effectiveDate" TEXT NOT NULL,
    "expirationDate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jurisdiction_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fmv_rates" (
    "id" TEXT NOT NULL,
    "natureKey" TEXT NOT NULL,
    "natureLabel" TEXT NOT NULL,
    "specialtyTier" TEXT NOT NULL DEFAULT 'default',
    "rateUsd" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'event',
    "sourceKey" TEXT NOT NULL DEFAULT 'fmv_engine',
    "effectiveDate" TEXT NOT NULL,
    "expirationDate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fmv_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."fmv_specialty_tiers" (
    "id" TEXT NOT NULL,
    "tierKey" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "displayLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fmv_specialty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_runs" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "programYear" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggeredBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resultSummary" JSONB,
    "errorMessage" TEXT,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecords" INTEGER NOT NULL,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "reportableCount" INTEGER NOT NULL DEFAULT 0,
    "nonReportableCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_uploads" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT,
    "totalRecords" INTEGER NOT NULL,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "reportableCount" INTEGER NOT NULL DEFAULT 0,
    "nonReportableCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "validationSummary" JSONB,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "reason" TEXT,
    "performedBy" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."stored_files" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'text/csv',
    "uploadTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retentionDate" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."data_sources" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "sourceCategory" TEXT NOT NULL,
    "connectorVersion" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hcp_master" (
    "id" TEXT NOT NULL,
    "masterKey" TEXT NOT NULL,
    "npi" TEXT,
    "cmsProfileId" TEXT,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "nameSuffix" TEXT,
    "fullName" TEXT,
    "specialty" TEXT,
    "primaryType" TEXT,
    "coveredRecipientType" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "licenseStateCodes" JSONB,
    "teachingHospitalId" TEXT,
    "teachingHospitalName" TEXT,
    "teachingHospitalCcn" TEXT,
    "matchStatus" TEXT NOT NULL DEFAULT 'pending',
    "sourceCrosswalk" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hcp_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."source_transactions" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "externalTransactionId" TEXT,
    "reviewSessionId" TEXT,
    "rowNumber" INTEGER,
    "rawPayload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'received',

    CONSTRAINT "source_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."spend_events" (
    "id" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "sourceTransactionId" TEXT NOT NULL,
    "hcpMasterId" TEXT,
    "dedupKey" TEXT NOT NULL,
    "crossSourceDedupKey" TEXT,
    "dedupClusterId" TEXT,
    "dedupReviewStatus" TEXT NOT NULL DEFAULT 'none',
    "isPrimaryLine" BOOLEAN NOT NULL DEFAULT true,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "paymentCurrency" TEXT NOT NULL DEFAULT 'USD',
    "exchangeRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "paymentDate" TEXT,
    "programYear" TEXT,
    "natureOfPayment" TEXT,
    "formOfPayment" TEXT,
    "cmsCategory" TEXT NOT NULL DEFAULT 'general',
    "sourceSystem" TEXT NOT NULL,
    "normalizationVersion" TEXT NOT NULL DEFAULT '1.0',
    "rulesEngineVersion" TEXT,
    "ruleInputSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'normalized',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spend_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cms_submission_batches" (
    "id" TEXT NOT NULL,
    "batchKey" TEXT NOT NULL,
    "programYear" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "attestedAt" TIMESTAMP(3),
    "attestedBy" TEXT,
    "exportHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_submission_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cms_general_payment_lines" (
    "id" TEXT NOT NULL,
    "spendEventId" TEXT NOT NULL,
    "submissionBatchId" TEXT,
    "pufFields" JSONB NOT NULL,
    "recordId" TEXT NOT NULL,
    "programYear" TEXT NOT NULL,
    "coveredRecipientNpi" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "dateOfPayment" TEXT,
    "natureOfPayment" TEXT,
    "disputeStatus" TEXT,
    "changeType" TEXT NOT NULL DEFAULT 'N',
    "isReportable" BOOLEAN NOT NULL DEFAULT false,
    "rulesEngineVersion" TEXT,
    "ruleInputSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_general_payment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cms_research_payment_lines" (
    "id" TEXT NOT NULL,
    "spendEventId" TEXT NOT NULL,
    "submissionBatchId" TEXT,
    "pufFields" JSONB NOT NULL,
    "recordId" TEXT NOT NULL,
    "programYear" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "nameOfStudy" TEXT,
    "clinicalTrialsId" TEXT,
    "preclinicalIndicator" TEXT,
    "isReportable" BOOLEAN NOT NULL DEFAULT false,
    "rulesEngineVersion" TEXT,
    "ruleInputSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_research_payment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cms_ownership_payment_lines" (
    "id" TEXT NOT NULL,
    "spendEventId" TEXT NOT NULL,
    "submissionBatchId" TEXT,
    "pufFields" JSONB NOT NULL,
    "recordId" TEXT NOT NULL,
    "programYear" TEXT NOT NULL,
    "physicianNpi" TEXT,
    "totalAmountInvested" DOUBLE PRECISION,
    "valueOfInterest" DOUBLE PRECISION,
    "isReportable" BOOLEAN NOT NULL DEFAULT false,
    "rulesEngineVersion" TEXT,
    "ruleInputSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cms_ownership_payment_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_records_recordId_key" ON "public"."cms_records"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "cms_records_spendEventId_key" ON "public"."cms_records"("spendEventId");

-- CreateIndex
CREATE INDEX "jurisdiction_rules_jurisdictionCode_isActive_idx" ON "public"."jurisdiction_rules"("jurisdictionCode", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "jurisdiction_rules_jurisdictionCode_effectiveDate_key" ON "public"."jurisdiction_rules"("jurisdictionCode", "effectiveDate");

-- CreateIndex
CREATE INDEX "fmv_rates_isActive_natureKey_idx" ON "public"."fmv_rates"("isActive", "natureKey");

-- CreateIndex
CREATE UNIQUE INDEX "fmv_rates_natureKey_specialtyTier_effectiveDate_key" ON "public"."fmv_rates"("natureKey", "specialtyTier", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "fmv_specialty_tiers_tierKey_key" ON "public"."fmv_specialty_tiers"("tierKey");

-- CreateIndex
CREATE INDEX "job_runs_jobKey_startedAt_idx" ON "public"."job_runs"("jobKey", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_sessions_sessionId_key" ON "public"."review_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_filePath_key" ON "public"."stored_files"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_fileHash_key" ON "public"."stored_files"("fileHash");

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_sourceKey_key" ON "public"."data_sources"("sourceKey");

-- CreateIndex
CREATE UNIQUE INDEX "hcp_master_masterKey_key" ON "public"."hcp_master"("masterKey");

-- CreateIndex
CREATE INDEX "hcp_master_npi_idx" ON "public"."hcp_master"("npi");

-- CreateIndex
CREATE INDEX "hcp_master_cmsProfileId_idx" ON "public"."hcp_master"("cmsProfileId");

-- CreateIndex
CREATE INDEX "source_transactions_reviewSessionId_idx" ON "public"."source_transactions"("reviewSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "source_transactions_dataSourceId_payloadHash_key" ON "public"."source_transactions"("dataSourceId", "payloadHash");

-- CreateIndex
CREATE INDEX "spend_events_dedupKey_idx" ON "public"."spend_events"("dedupKey");

-- CreateIndex
CREATE INDEX "spend_events_crossSourceDedupKey_idx" ON "public"."spend_events"("crossSourceDedupKey");

-- CreateIndex
CREATE INDEX "spend_events_dedupClusterId_idx" ON "public"."spend_events"("dedupClusterId");

-- CreateIndex
CREATE INDEX "spend_events_dedupReviewStatus_idx" ON "public"."spend_events"("dedupReviewStatus");

-- CreateIndex
CREATE INDEX "spend_events_programYear_idx" ON "public"."spend_events"("programYear");

-- CreateIndex
CREATE UNIQUE INDEX "cms_submission_batches_batchKey_key" ON "public"."cms_submission_batches"("batchKey");

-- CreateIndex
CREATE UNIQUE INDEX "cms_general_payment_lines_spendEventId_key" ON "public"."cms_general_payment_lines"("spendEventId");

-- CreateIndex
CREATE INDEX "cms_general_payment_lines_programYear_idx" ON "public"."cms_general_payment_lines"("programYear");

-- CreateIndex
CREATE INDEX "cms_general_payment_lines_isReportable_idx" ON "public"."cms_general_payment_lines"("isReportable");

-- CreateIndex
CREATE UNIQUE INDEX "cms_research_payment_lines_spendEventId_key" ON "public"."cms_research_payment_lines"("spendEventId");

-- CreateIndex
CREATE INDEX "cms_research_payment_lines_programYear_idx" ON "public"."cms_research_payment_lines"("programYear");

-- CreateIndex
CREATE UNIQUE INDEX "cms_ownership_payment_lines_spendEventId_key" ON "public"."cms_ownership_payment_lines"("spendEventId");

-- CreateIndex
CREATE INDEX "cms_ownership_payment_lines_programYear_idx" ON "public"."cms_ownership_payment_lines"("programYear");

-- AddForeignKey
ALTER TABLE "public"."cms_records" ADD CONSTRAINT "cms_records_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "public"."review_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_records" ADD CONSTRAINT "cms_records_spendEventId_fkey" FOREIGN KEY ("spendEventId") REFERENCES "public"."spend_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."source_transactions" ADD CONSTRAINT "source_transactions_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "public"."data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."spend_events" ADD CONSTRAINT "spend_events_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "public"."data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."spend_events" ADD CONSTRAINT "spend_events_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "public"."source_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."spend_events" ADD CONSTRAINT "spend_events_hcpMasterId_fkey" FOREIGN KEY ("hcpMasterId") REFERENCES "public"."hcp_master"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_general_payment_lines" ADD CONSTRAINT "cms_general_payment_lines_spendEventId_fkey" FOREIGN KEY ("spendEventId") REFERENCES "public"."spend_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_general_payment_lines" ADD CONSTRAINT "cms_general_payment_lines_submissionBatchId_fkey" FOREIGN KEY ("submissionBatchId") REFERENCES "public"."cms_submission_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_research_payment_lines" ADD CONSTRAINT "cms_research_payment_lines_spendEventId_fkey" FOREIGN KEY ("spendEventId") REFERENCES "public"."spend_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_research_payment_lines" ADD CONSTRAINT "cms_research_payment_lines_submissionBatchId_fkey" FOREIGN KEY ("submissionBatchId") REFERENCES "public"."cms_submission_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_ownership_payment_lines" ADD CONSTRAINT "cms_ownership_payment_lines_spendEventId_fkey" FOREIGN KEY ("spendEventId") REFERENCES "public"."spend_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cms_ownership_payment_lines" ADD CONSTRAINT "cms_ownership_payment_lines_submissionBatchId_fkey" FOREIGN KEY ("submissionBatchId") REFERENCES "public"."cms_submission_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

