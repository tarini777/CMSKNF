import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/file-storage'
import { readFile } from 'fs/promises'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const file = await fileStorage.getFileBySessionId(sessionId)

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File not found for this session'
      }, { status: 404 })
    }

    // Read file content
    const fileContent = await readFile(file.filePath, 'utf-8')

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `attachment; filename="${file.originalFilename}"`,
        'Content-Length': file.fileSize.toString(),
        'X-File-Hash': file.fileHash,
        'X-File-Size': file.fileSize.toString(),
        'X-Upload-Time': file.uploadTime.toISOString(),
        'X-Session-Id': sessionId
      }
    })
  } catch (error) {
    console.error('Error retrieving file by session:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve file'
    }, { status: 500 })
  }
}
