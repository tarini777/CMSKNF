/*
  Warnings:

  - Added the required column `originalFilename` to the `data_uploads` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalFilename` to the `review_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "stored_files" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'text/csv',
    "uploadTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessed" DATETIME,
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "retentionDate" DATETIME,
    "uploadedBy" TEXT,
    "sessionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_data_uploads" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_data_uploads" ("createdAt", "errorCount", "fileSize", "filename", "originalFilename", "id", "nonReportableCount", "processedRecords", "reportableCount", "status", "totalRecords", "updatedAt", "uploadedBy", "validationSummary") SELECT "createdAt", "errorCount", "fileSize", "filename", "filename", "id", "nonReportableCount", "processedRecords", "reportableCount", "status", "totalRecords", "updatedAt", "uploadedBy", "validationSummary" FROM "data_uploads";
DROP TABLE "data_uploads";
ALTER TABLE "new_data_uploads" RENAME TO "data_uploads";
CREATE TABLE "new_review_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "filePath" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
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
INSERT INTO "new_review_sessions" ("createdAt", "createdBy", "errorCount", "filename", "originalFilename", "id", "nonReportableCount", "processedRecords", "reportableCount", "sessionId", "status", "totalRecords", "updatedAt", "uploadTime") SELECT "createdAt", "createdBy", "errorCount", "filename", "filename", "id", "nonReportableCount", "processedRecords", "reportableCount", "sessionId", "status", "totalRecords", "updatedAt", "uploadTime" FROM "review_sessions";
DROP TABLE "review_sessions";
ALTER TABLE "new_review_sessions" RENAME TO "review_sessions";
CREATE UNIQUE INDEX "review_sessions_sessionId_key" ON "review_sessions"("sessionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_filePath_key" ON "stored_files"("filePath");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_fileHash_key" ON "stored_files"("fileHash");
