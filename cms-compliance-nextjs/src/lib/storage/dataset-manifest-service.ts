import { readFileSync, existsSync } from 'fs'
import path from 'path'
import type { CmsPufDatasetSources, DatasetManifest } from '@/types/dataset-manifest'

const DEFAULT_MANIFEST_RELATIVE = path.join('..', 'database', 'manifest.json')

export function resolveManifestPath(customPath?: string): string {
  if (customPath) return path.resolve(customPath)
  if (process.env.CMS_DATASET_MANIFEST_PATH) {
    return path.resolve(process.env.CMS_DATASET_MANIFEST_PATH)
  }
  return path.resolve(process.cwd(), DEFAULT_MANIFEST_RELATIVE)
}

export function loadDatasetManifest(manifestPath?: string): DatasetManifest {
  const resolved = resolveManifestPath(manifestPath)
  if (!existsSync(resolved)) {
    throw new Error(
      `Dataset manifest not found at ${resolved}. Create database/manifest.json or set CMS_DATASET_MANIFEST_PATH.`
    )
  }
  return JSON.parse(readFileSync(resolved, 'utf8')) as DatasetManifest
}

export function resolveRepoDatabaseRoot(manifest: DatasetManifest, manifestPath?: string): string {
  if (manifest.storage.desktopSyncRoot) {
    return path.resolve(manifest.storage.desktopSyncRoot)
  }
  if (process.env.CMS_DATASET_DESKTOP_SYNC_ROOT) {
    return path.resolve(process.env.CMS_DATASET_DESKTOP_SYNC_ROOT)
  }
  const resolvedManifest = resolveManifestPath(manifestPath)
  return path.resolve(path.dirname(resolvedManifest), manifest.storage.localRoot || 'database')
}

function resolveFileEntry(
  manifest: DatasetManifest,
  fileKey: string,
  repoDatabaseRoot: string,
  backendOverride?: 'local' | 'gdrive'
): CmsPufDatasetSources['profiles'] {
  const entry = manifest.files[fileKey]
  if (!entry) {
    throw new Error(`Unknown dataset file key: ${fileKey}`)
  }

  const backend =
    backendOverride ||
    (process.env.CMS_DATASET_STORAGE as 'local' | 'gdrive' | undefined) ||
    (manifest.storage.backend === 'auto'
      ? entry.gdriveFileId
        ? 'gdrive'
        : 'local'
      : manifest.storage.backend)

  const useGdrive = backend === 'gdrive' && !!entry.gdriveFileId
  const localPath = path.join(repoDatabaseRoot, entry.relativePath)

  if (useGdrive) {
    return {
      key: entry.key,
      fileName: entry.fileName,
      backend: 'gdrive',
      gdriveFileId: entry.gdriveFileId || undefined,
      bytes: entry.bytes,
      approxRows: entry.approxRows,
    }
  }

  if (!existsSync(localPath) && !manifest.storage.localFallbackEnabled) {
    throw new Error(
      `Dataset ${entry.fileName} is not on Google Drive (missing gdriveFileId) and local fallback is disabled.`
    )
  }

  return {
    key: entry.key,
    fileName: entry.fileName,
    backend: 'local',
    localPath,
    bytes: entry.bytes,
    approxRows: entry.approxRows,
  }
}

export function resolveCmsPufDatasetSources(
  manifestPath?: string,
  backendOverride?: 'local' | 'gdrive'
): { manifest: DatasetManifest; sources: CmsPufDatasetSources; repoDatabaseRoot: string } {
  const manifest = loadDatasetManifest(manifestPath)
  const repoDatabaseRoot = resolveRepoDatabaseRoot(manifest, manifestPath)

  const profiles = resolveFileEntry(
    manifest,
    manifest.importMapping.profiles,
    repoDatabaseRoot,
    backendOverride
  )

  const years: CmsPufDatasetSources['years'] = {}
  for (const [year, mapping] of Object.entries(manifest.importMapping.programYears)) {
    years[year] = {
      general: resolveFileEntry(manifest, mapping.general, repoDatabaseRoot, backendOverride),
      research: resolveFileEntry(manifest, mapping.research, repoDatabaseRoot, backendOverride),
      ownership: resolveFileEntry(manifest, mapping.ownership, repoDatabaseRoot, backendOverride),
      ...(mapping.removed
        ? { removed: resolveFileEntry(manifest, mapping.removed, repoDatabaseRoot, backendOverride) }
        : {}),
    }
  }

  return { manifest, sources: { profiles, years }, repoDatabaseRoot }
}

export function summarizeManifest(manifest: DatasetManifest) {
  const files = Object.values(manifest.files)
  return {
    version: manifest.version,
    updatedAt: manifest.updatedAt,
    publication: manifest.publication,
    storage: manifest.storage,
    desktopSyncRoot: manifest.storage.desktopSyncRoot || process.env.CMS_DATASET_DESKTOP_SYNC_ROOT || null,
    fileCount: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    totalApproxRows: files.reduce((sum, file) => sum + (file.approxRows || 0), 0),
    gdriveLinked: files.filter((file) => !!file.gdriveFileId).length,
    files: files.map((file) => ({
      key: file.key,
      fileName: file.fileName,
      category: file.category,
      programYear: file.programYear,
      paymentType: file.paymentType,
      bytes: file.bytes,
      approxRows: file.approxRows,
      gdriveFileId: file.gdriveFileId,
      relativePath: file.relativePath,
    })),
  }
}
