import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/file-storage'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id
    const file = await fileStorage.getFileById(fileId)

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'File not found'
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
        'X-Upload-Time': file.uploadTime.toISOString()
      }
    })
  } catch (error) {
    console.error('Error retrieving file:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve file'
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id
    const result = await fileStorage.deleteFile(fileId)

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete file'
    }, { status: 500 })
  }
}
