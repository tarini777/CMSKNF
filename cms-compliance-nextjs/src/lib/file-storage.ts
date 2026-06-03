import { createHash } from 'crypto'
import { writeFile, mkdir, stat, unlink } from 'fs/promises'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface FileStorageResult {
  success: boolean
  filePath?: string
  fileHash?: string
  fileSize?: number
  error?: string
}

export class FileStorageManager {
  private uploadDir: string
  private processedDir: string

  constructor() {
    this.uploadDir = join(process.cwd(), 'uploads', 'csv-files')
    this.processedDir = join(process.cwd(), 'uploads', 'processed')
  }

  /**
   * Store a CSV file and return metadata
   */
  async storeFile(
    file: File,
    sessionId?: string,
    uploadedBy?: string
  ): Promise<FileStorageResult> {
    try {
      // Ensure directories exist
      await mkdir(this.uploadDir, { recursive: true })
      await mkdir(this.processedDir, { recursive: true })

      // Generate unique filename with timestamp
      const timestamp = Date.now()
      const originalName = file.name
      const fileExtension = originalName.split('.').pop() || 'csv'
      const uniqueFilename = `upload_${timestamp}_${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = join(this.uploadDir, uniqueFilename)

      // Read file content
      const fileContent = await file.text()
      const fileBuffer = Buffer.from(fileContent, 'utf-8')
      
      // Calculate file hash for integrity verification
      const fileHash = createHash('sha256').update(fileBuffer).digest('hex')
      
      // Write file to disk
      await writeFile(filePath, fileBuffer)

      // Get file stats
      const stats = await stat(filePath)
      const fileSize = stats.size

      // Store file metadata in database
      try {
        const storedFile = await prisma.storedFile.create({
          data: {
            filename: uniqueFilename,
            originalFilename: originalName,
            filePath: filePath,
            fileSize: fileSize,
            fileHash: fileHash,
            mimeType: file.type || 'text/csv',
            sessionId: sessionId,
            uploadedBy: uploadedBy,
            retentionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days retention
          }
        })
        console.log('File stored successfully:', storedFile.id)
      } catch (dbError) {
        console.error('Database error:', dbError)
        throw dbError
      }

      return {
        success: true,
        filePath: filePath,
        fileHash: fileHash,
        fileSize: fileSize
      }
    } catch (error) {
      console.error('Error storing file:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Retrieve file by ID
   */
  async getFileById(fileId: string) {
    try {
      const file = await prisma.storedFile.findUnique({
        where: { id: fileId }
      })

      if (!file || !file.isActive) {
        return null
      }

      // Update access tracking
      await prisma.storedFile.update({
        where: { id: fileId },
        data: {
          lastAccessed: new Date(),
          accessCount: { increment: 1 }
        }
      })

      return file
    } catch (error) {
      console.error('Error retrieving file:', error)
      return null
    }
  }

  /**
   * Get file by session ID
   */
  async getFileBySessionId(sessionId: string) {
    try {
      return await prisma.storedFile.findFirst({
        where: { 
          sessionId: sessionId,
          isActive: true
        }
      })
    } catch (error) {
      console.error('Error retrieving file by session:', error)
      return null
    }
  }

  /**
   * List all stored files
   */
  async listFiles(limit: number = 50, offset: number = 0) {
    try {
      return await prisma.storedFile.findMany({
        where: { isActive: true },
        orderBy: { uploadTime: 'desc' },
        take: limit,
        skip: offset
      })
    } catch (error) {
      console.error('Error listing files:', error)
      return []
    }
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(fileId: string) {
    try {
      const file = await prisma.storedFile.findUnique({
        where: { id: fileId }
      })

      if (!file) {
        return { success: false, error: 'File not found' }
      }

      // Soft delete in database
      await prisma.storedFile.update({
        where: { id: fileId },
        data: { isActive: false }
      })

      // Optionally delete physical file
      try {
        await unlink(file.filePath)
      } catch (unlinkError) {
        console.warn('Could not delete physical file:', unlinkError)
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting file:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Clean up expired files
   */
  async cleanupExpiredFiles() {
    try {
      const expiredFiles = await prisma.storedFile.findMany({
        where: {
          isActive: true,
          retentionDate: {
            lt: new Date()
          }
        }
      })

      let deletedCount = 0
      for (const file of expiredFiles) {
        const result = await this.deleteFile(file.id)
        if (result.success) {
          deletedCount++
        }
      }

      return { success: true, deletedCount }
    } catch (error) {
      console.error('Error cleaning up files:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const totalFiles = await prisma.storedFile.count({
        where: { isActive: true }
      })

      const totalSize = await prisma.storedFile.aggregate({
        where: { isActive: true },
        _sum: { fileSize: true }
      })

      const recentUploads = await prisma.storedFile.count({
        where: {
          isActive: true,
          uploadTime: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })

      return {
        totalFiles,
        totalSizeBytes: totalSize._sum.fileSize || 0,
        recentUploads
      }
    } catch (error) {
      console.error('Error getting storage stats:', error)
      return {
        totalFiles: 0,
        totalSizeBytes: 0,
        recentUploads: 0
      }
    }
  }
}

export const fileStorage = new FileStorageManager()
