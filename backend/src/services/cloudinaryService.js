import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'
import { logger } from '../utils/logger.js'

// Configure Cloudinary
console.log('🔧 Configuring Cloudinary with:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
})

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Configure multer for memory storage
const storage = multer.memoryStorage()
export const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

class CloudinaryService {
  /**
   * Upload image to Cloudinary
   * @param {Buffer} buffer - Image buffer
   * @param {string} folder - Cloudinary folder
   * @param {string} publicId - Public ID for the image
   * @returns {Promise<Object>} Upload result
   */
  async uploadImage(buffer, folder = 'profile-pictures', publicId = null) {
    try {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        }

        if (publicId) {
          uploadOptions.public_id = publicId
          uploadOptions.overwrite = true
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error)
              reject(error)
            } else {
              logger.info('Image uploaded successfully:', result.public_id)
              resolve(result)
            }
          }
        )

        uploadStream.end(buffer)
      })
    } catch (error) {
      logger.error('Error uploading to Cloudinary:', error)
      throw error
    }
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Public ID of the image to delete
   * @returns {Promise<Object>} Deletion result
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId)
      logger.info('Image deleted successfully:', publicId)
      return result
    } catch (error) {
      logger.error('Error deleting from Cloudinary:', error)
      throw error
    }
  }

  /**
   * Get optimized image URL
   * @param {string} publicId - Public ID of the image
   * @param {Object} options - Transformation options
   * @returns {string} Optimized image URL
   */
  getOptimizedUrl(publicId, options = {}) {
    const defaultOptions = {
      width: 400,
      height: 400,
      crop: 'fill',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto'
    }

    const transformOptions = { ...defaultOptions, ...options }
    return cloudinary.url(publicId, transformOptions)
  }

  /**
   * Generate upload signature for client-side uploads
   * @param {Object} params - Upload parameters
   * @returns {Object} Signature and timestamp
   */
  generateSignature(params) {
    const timestamp = Math.round(new Date().getTime() / 1000)
    const signature = cloudinary.utils.api_sign_request(
      { ...params, timestamp },
      process.env.CLOUDINARY_API_SECRET
    )

    return {
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME
    }
  }
}

export default new CloudinaryService()