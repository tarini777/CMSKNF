import { NextRequest, NextResponse } from 'next/server'
import { fileStorage } from '@/lib/file-storage'

export async function POST(request: NextRequest) {
  try {
    const result = await fileStorage.cleanupExpiredFiles()

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${result.deletedCount} files deleted.`,
      deletedCount: result.deletedCount
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup files'
    }, { status: 500 })
  }
}
