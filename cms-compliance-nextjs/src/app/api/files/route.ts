import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/file-storage'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const files = await fileStorage.listFiles(limit, offset)
    const stats = await fileStorage.getStorageStats()

    return NextResponse.json({
      success: true,
      files,
      stats,
      pagination: {
        limit,
        offset,
        total: stats.totalFiles
      }
    })
  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to list files'
    }, { status: 500 })
  }
}
