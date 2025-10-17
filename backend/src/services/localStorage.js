import fs from 'fs'
import path from 'path'
import { logger } from '../utils/logger.js'

class LocalStorageService {
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads')
    this.ensureUploadsDirectory()
  }

  ensureUploadsDirectory() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true })
    }
  }

  async uploadFile(file, options = {}) {
    try {
      const folder = options.folder || 'general'
      const folderPath = path.join(this.uploadsDir, folder)
      
      // Ensure folder exists
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true })
      }

      // Generate unique filename
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      const extension = path.extname(file.originalname)
      const filename = file.fieldname + '-' + uniqueSuffix + extension
      const filePath = path.join(folderPath, filename)

      // Write file to disk
      if (file.buffer) {
        // If file has buffer (from memory storage)
        fs.writeFileSync(filePath, file.buffer)
      } else if (file.path) {
        // If file already exists on disk
        fs.copyFileSync(file.path, filePath)
      }

      return {
        fileName: filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        url: `/uploads/${folder}/${filename}`,
        path: filePath,
        ...options.metadata
      }
    } catch (error) {
      logger.error('Local storage upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }

  async deleteFile(filename, folder = 'general') {
    try {
      const filePath = path.join(this.uploadsDir, folder, filename)
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return { success: true, message: 'File deleted successfully' }
      } else {
        return { success: false, message: 'File not found' }
      }
    } catch (error) {
      logger.error('Local storage delete error:', error)
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  async getFileInfo(filename, folder = 'general') {
    try {
      const filePath = path.join(this.uploadsDir, folder, filename)
      
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found')
      }

      const stats = fs.statSync(filePath)
      
      return {
        fileName: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: `/uploads/${folder}/${filename}`,
        path: filePath
      }
    } catch (error) {
      logger.error('Local storage get file info error:', error)
      throw new Error(`Failed to get file info: ${error.message}`)
    }
  }
}

export default new LocalStorageService()