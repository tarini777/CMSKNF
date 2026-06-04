import { google } from 'googleapis'
import type { Readable } from 'stream'

let driveClient: ReturnType<typeof google.drive> | null = null

function getGoogleAuth(scopes: string[]) {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

  if (inlineJson) {
    const credentials = JSON.parse(inlineJson)
    return new google.auth.GoogleAuth({ credentials, scopes })
  }

  if (credentialsPath) {
    return new google.auth.GoogleAuth({ keyFile: credentialsPath, scopes })
  }

  throw new Error(
    'Google Drive credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_JSON.'
  )
}

function getReadAuth() {
  return getGoogleAuth(['https://www.googleapis.com/auth/drive.readonly'])
}

function getWriteAuth() {
  return getGoogleAuth(['https://www.googleapis.com/auth/drive.file'])
}

export function isGDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
}

export function getDriveClient() {
  if (!driveClient) {
    driveClient = google.drive({ version: 'v3', auth: getReadAuth() })
  }
  return driveClient
}

export async function openGDriveReadStream(fileId: string): Promise<Readable> {
  const drive = getDriveClient()
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  )
  return response.data as Readable
}

export interface GDriveListedFile {
  id: string
  name: string
  size?: string
  md5Checksum?: string
}

export async function listGDriveFolderFiles(folderId: string): Promise<GDriveListedFile[]> {
  const drive = getDriveClient()
  const files: GDriveListedFile[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, size, md5Checksum)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    })

    for (const file of response.data.files || []) {
      if (!file.id || !file.name) continue
      files.push({
        id: file.id,
        name: file.name,
        size: file.size || undefined,
        md5Checksum: file.md5Checksum || undefined,
      })
    }

    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return files
}

export async function uploadLocalFileToGDrive(
  localPath: string,
  fileName: string,
  folderId: string
): Promise<GDriveListedFile> {
  const drive = google.drive({ version: 'v3', auth: getWriteAuth() })

  const { createReadStream } = await import('fs')
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'text/csv',
      body: createReadStream(localPath),
    },
    fields: 'id, name, size, md5Checksum',
    supportsAllDrives: true,
  })

  if (!response.data.id || !response.data.name) {
    throw new Error(`Upload failed for ${fileName}`)
  }

  return {
    id: response.data.id,
    name: response.data.name,
    size: response.data.size || undefined,
    md5Checksum: response.data.md5Checksum || undefined,
  }
}
