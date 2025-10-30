import { v2 as cloudinary } from 'cloudinary'
import { logger } from '../utils/logger.js'

class CloudinaryService {
  constructor() {
    this.initialized = false
  }

  initialize() {
    try {
      if (process.env.CLOUDINARY_CLOUD_NAME && 
          process.env.CLOUDINARY_API_KEY && 
          process.env.CLOUDINARY_API_SECRET) {
        
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        })
        
        this.initialized = true
        logger.info('✅ Cloudinary service initialized successfully')
      } else {
        logger.warn('⚠️ Cloudinary credentials not provided, file upload will be disabled')
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Cloudinary service:', error)
    }
  }

  async uploadFile(file, options = {}) {
    try {
      if (!this.initialized) {
        this.initialize()
      }

      if (!this.initialized) {
        throw new Error('Cloudinary service not initialized')
      }

      const {
        folder = 'eduplatform',
        isPublic = true,
        metadata = {}
      } = options

      // Convert buffer to base64 for Cloudinary upload
      const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`

      const uploadOptions = {
        folder,
        resource_type: 'auto',
        quality: 'auto:good',
        fetch_format: 'auto',
        context: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          ...metadata
        }
      }

      const result = await cloudinary.uploader.upload(base64File, uploadOptions)

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        fileName: file.originalname,
        originalName: file.originalname,
        size: result.bytes,
        contentType: file.mimetype,
        format: result.format,
        width: result.width,
        height: result.height,
        metadata: result.context
      }

    } catch (error) {
      logger.error('Cloudinary upload error:', error)
      throw new Error(`Failed to upload file: ${error.message}`)
    }
  }

  async uploadMultipleFiles(files, options = {}) {
    try {
      if (!this.initialized) {
        this.initialize()
      }

      const uploadPromises = files.map(file => this.uploadFile(file, options))
      const results = await Promise.allSettled(uploadPromises)

      const successful = []
      const failed = []

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value)
        } else {
          failed.push({
            file: files[index].originalname,
            error: result.reason.message
          })
        }
      })

      return {
        success: failed.length === 0,
        successful,
        failed,
        total: files.length
      }

    } catch (error) {
      logger.error('Multiple file upload error:', error)
      throw error
    }
  }

  async deleteFile(publicId) {
    try {
      if (!this.initialized) {
        this.initialize()
      }

      if (!this.initialized) {
        throw new Error('Cloudinary service not initialized')
      }

      const result = await cloudinary.uploader.destroy(publicId)

      return {
        success: result.result === 'ok',
        deleted: result.result === 'ok'
      }

    } catch (error) {
      logger.error('Cloudinary deletion error:', error)
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  async getFileInfo(publicId) {
    try {
      if (!this.initialized) {
        this.initialize()
      }

      if (!this.initialized) {
        throw new Error('Cloudinary service not initialized')
      }

      const result = await cloudinary.api.resource(publicId)

      return {
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        format: result.format,
        width: result.width,
        height: result.height,
        createdAt: result.created_at,
        metadata: result.context
      }

    } catch (error) {
      if (error.http_code === 404) {
        return {
          success: false,
          error: 'File not found'
        }
      }
      
      logger.error('Get file info error:', error)
      throw error
    }
  }

  async generateSecureUrl(publicId, options = {}) {
    try {
      if (!this.initialized) {
        this.initialize()
      }

      if (!this.initialized) {
        throw new Error('Cloudinary service not initialized')
      }

      const {
        expiresIn = 3600, // 1 hour default
        transformation = {}
      } = options

      const expiresAt = Math.floor(Date.now() / 1000) + expiresIn

      const secureUrl = cloudinary.utils.private_download_url(publicId, 'image', {
        expires_at: expiresAt,
        ...transformation
      })

      return {
        success: true,
        secureUrl,
        expiresAt: new Date(expiresAt * 1000)
      }

    } catch (error) {
      logger.error('Generate secure URL error:', error)
      throw error
    }
  }

  // Helper method to get optimized image URL
  getOptimizedUrl(publicId, options = {}) {
    if (!this.initialized) {
      return null
    }

    const {
      width,
      height,
      crop = 'fill',
      quality = 'auto:good',
      format = 'auto'
    } = options

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format
    })
  }

  // Helper method to get video URL
  getVideoUrl(publicId, options = {}) {
    if (!this.initialized) {
      return null
    }

    const {
      quality = 'auto',
      format = 'auto'
    } = options

    return cloudinary.url(publicId, {
      resource_type: 'video',
      quality,
      fetch_format: format
    })
  }
}

// Create singleton instance
const cloudinaryService = new CloudinaryService()

export default cloudinaryService