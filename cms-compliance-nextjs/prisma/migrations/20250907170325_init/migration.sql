-- CreateTable
CREATE TABLE "cms_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "coveredRecipientId" TEXT NOT NULL,
    "coveredRecipientName" TEXT NOT NULL,
    "coveredRecipientType" TEXT NOT NULL,
    "teachingHospitalId" TEXT,
    "teachingHospitalName" TEXT,
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
    "totalAmountOfPaymentUsdollars" REAL NOT NULL,
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
    "decisionTime" DATETIME,
    "finalReportable" BOOLEAN,
    "appliedRules" JSONB,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "reviewSessionId" TEXT,
    CONSTRAINT "cms_records_reviewSessionId_fkey" FOREIGN KEY ("reviewSessionId") REFERENCES "review_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "company_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "review_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecords" INTEGER NOT NULL,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "reportableCount" INTEGER NOT NULL DEFAULT 0,
    "nonReportableCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "data_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "reportableCount" INTEGER NOT NULL DEFAULT 0,
    "nonReportableCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "validationSummary" JSONB,
    "uploadedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "reason" TEXT,
    "performedBy" TEXT,
    "performedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLogin" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "cms_records_recordId_key" ON "cms_records"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "review_sessions_sessionId_key" ON "review_sessions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
