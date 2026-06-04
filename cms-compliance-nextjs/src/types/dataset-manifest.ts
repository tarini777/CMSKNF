export type DatasetStorageBackend = 'local' | 'gdrive' | 'auto'

export type DatasetFileCategory = 'mdm' | 'payments'

export type DatasetPaymentType = 'general' | 'research' | 'ownership' | 'removed'

export interface DatasetFileEntry {
  key: string
  category: DatasetFileCategory
  programYear?: string | null
  paymentType?: DatasetPaymentType
  fileName: string
  relativePath: string
  bytes: number
  approxRows?: number
  contentType: string
  gdriveFileId?: string | null
  md5?: string | null
}

export interface DatasetManifest {
  version: string
  updatedAt: string
  publication: {
    id: string
    label: string
  }
  storage: {
    backend: DatasetStorageBackend
    mode?: 'desktop_sync' | 'api'
    desktopSyncRoot?: string
    gdriveFolderId?: string
    localFallbackEnabled: boolean
    localRoot: string
  }
  files: Record<string, DatasetFileEntry>
  importMapping: {
    profiles: string
    programYears: Record<
      string,
      {
        general: string
        research: string
        ownership: string
        removed?: string
      }
    >
  }
}

export interface ResolvedDatasetSource {
  key: string
  fileName: string
  backend: 'local' | 'gdrive'
  localPath?: string
  gdriveFileId?: string
  bytes: number
  approxRows?: number
}

export interface CmsPufDatasetSources {
  profiles: ResolvedDatasetSource
  years: Record<
    string,
    {
      general: ResolvedDatasetSource
      research: ResolvedDatasetSource
      ownership: ResolvedDatasetSource
      removed?: ResolvedDatasetSource
    }
  >
}
