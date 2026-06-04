#!/usr/bin/env tsx
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import {
  loadDatasetManifest,
  resolveManifestPath,
  resolveRepoDatabaseRoot,
} from '@/lib/storage/dataset-manifest-service'
import { isGDriveConfigured, uploadLocalFileToGDrive } from '@/lib/storage/gdrive-client'

async function main() {
  const manifestPath = resolveManifestPath(process.argv[2])
  const manifest = loadDatasetManifest(manifestPath)
  const folderId = process.env.GDRIVE_DATASET_FOLDER_ID || manifest.storage.gdriveFolderId
  const databaseRoot = resolveRepoDatabaseRoot(manifest, manifestPath)

  if (!folderId) {
    throw new Error('Set GDRIVE_DATASET_FOLDER_ID before uploading datasets.')
  }
  if (!isGDriveConfigured()) {
    throw new Error('Google Drive credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS.')
  }

  let uploaded = 0
  for (const entry of Object.values(manifest.files)) {
    const localPath = path.join(databaseRoot, entry.relativePath)
    if (!existsSync(localPath)) {
      console.warn(`[upload-gdrive] Skip missing local file: ${localPath}`)
      continue
    }
    if (entry.gdriveFileId) {
      console.log(`[upload-gdrive] Skip existing ${entry.fileName} (${entry.gdriveFileId})`)
      continue
    }

    console.log(`[upload-gdrive] Uploading ${entry.fileName} (${entry.bytes} bytes)...`)
    const remote = await uploadLocalFileToGDrive(localPath, entry.fileName, folderId)
    entry.gdriveFileId = remote.id
    if (remote.size) entry.bytes = Number(remote.size)
    if (remote.md5Checksum) entry.md5 = remote.md5Checksum
    uploaded += 1
  }

  manifest.storage.backend = 'gdrive'
  manifest.storage.gdriveFolderId = folderId
  manifest.updatedAt = new Date().toISOString().slice(0, 10)
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`[upload-gdrive] Uploaded ${uploaded} files and updated manifest`)
}

main().catch((error) => {
  console.error('[upload-gdrive] Failed:', error)
  process.exit(1)
})
