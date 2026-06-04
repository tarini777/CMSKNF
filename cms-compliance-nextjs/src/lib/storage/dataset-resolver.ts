import { createReadStream, existsSync } from 'fs'
import type { Readable } from 'stream'
import type { ResolvedDatasetSource } from '@/types/dataset-manifest'
import { isGDriveConfigured, openGDriveReadStream } from '@/lib/storage/gdrive-client'

export async function openDatasetReadStream(source: ResolvedDatasetSource): Promise<Readable> {
  if (source.backend === 'gdrive') {
    if (!source.gdriveFileId) {
      throw new Error(`Dataset ${source.key} is configured for Google Drive but has no gdriveFileId`)
    }
    if (!isGDriveConfigured()) {
      throw new Error(
        `Dataset ${source.key} requires Google Drive credentials (GOOGLE_APPLICATION_CREDENTIALS).`
      )
    }
    return openGDriveReadStream(source.gdriveFileId)
  }

  if (!source.localPath || !existsSync(source.localPath)) {
    throw new Error(
      `Local dataset missing for ${source.fileName}. Upload to Google Drive and run npm run datasets:sync-gdrive, or restore ${source.localPath}.`
    )
  }

  return createReadStream(source.localPath)
}

export function describeDatasetSource(source: ResolvedDatasetSource): string {
  if (source.backend === 'gdrive') {
    return `gdrive:${source.gdriveFileId} (${source.fileName})`
  }
  return `local:${source.localPath}`
}
