#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { loadDatasetManifest, resolveManifestPath } from '@/lib/storage/dataset-manifest-service'
import { isGDriveConfigured, listGDriveFolderFiles } from '@/lib/storage/gdrive-client'

async function main() {
  const manifestPath = resolveManifestPath(process.argv[2])
  const manifest = loadDatasetManifest(manifestPath)
  const folderId = process.env.GDRIVE_DATASET_FOLDER_ID || manifest.storage.gdriveFolderId

  if (!folderId) {
    throw new Error('Set GDRIVE_DATASET_FOLDER_ID or storage.gdriveFolderId in manifest.json')
  }
  if (!isGDriveConfigured()) {
    throw new Error('Google Drive credentials missing. Set GOOGLE_APPLICATION_CREDENTIALS.')
  }

  const remoteFiles = await listGDriveFolderFiles(folderId)
  const byName = new Map(remoteFiles.map((file) => [file.name, file]))
  let linked = 0

  for (const entry of Object.values(manifest.files)) {
    const remote = byName.get(entry.fileName)
    if (!remote) {
      console.warn(`[sync-gdrive] Missing in Drive folder: ${entry.fileName}`)
      continue
    }
    entry.gdriveFileId = remote.id
    if (remote.size) entry.bytes = Number(remote.size)
    if (remote.md5Checksum) entry.md5 = remote.md5Checksum
    linked += 1
    console.log(`[sync-gdrive] ${entry.key} -> ${remote.id}`)
  }

  manifest.storage.backend = 'gdrive'
  manifest.storage.gdriveFolderId = folderId
  manifest.updatedAt = new Date().toISOString().slice(0, 10)

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`[sync-gdrive] Updated manifest (${linked}/${Object.keys(manifest.files).length} files linked)`)
}

main().catch((error) => {
  console.error('[sync-gdrive] Failed:', error)
  process.exit(1)
})
