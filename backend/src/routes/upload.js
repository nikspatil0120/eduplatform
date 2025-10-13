import express from 'express'
import multer from 'multer'
import { authenticate as auth } from '../middleware/auth.js'
import azureStorageService from '../services/azureStorage.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'mp4', 'mov', 'avi'
    ]
    
    const fileExtension = file.originalname.split('.').pop().toLowerCase()
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new Error(`File type .${fileExtension} is not allowed`), false)
    }
  }
})

// Single file upload
router.post('/single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      })
    }

    const options = {
      folder: req.body.folder || 'general',
      isPublic: req.body.isPublic === 'true',
      metadata: {
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString()
      }
    }

    const result = await azureStorageService.uploadFile(req.file, options)

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: result
    })
  } catch (error) {
    logger.error('File upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload file'
    })
  }
})

// Multiple files upload
router.post('/multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      })
    }

    const options = {
      folder: req.body.folder || 'general',
      isPublic: req.body.isPublic === 'true',
      metadata: {
        uploadedBy: req.user.id,
        uploadedAt: new Date().toISOString()
      }
    }

    const result = await azureStorageService.uploadMultipleFiles(req.files, options)

    res.json({
      success: true,
      message: `${result.successful.length} files uploaded successfully`,
      files: result.successful,
      failed: result.failed
    })
  } catch (error) {
    logger.error('Multiple file upload error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files'
    })
  }
})

// Get file info
router.get('/info/:blobName(*)', auth, async (req, res) => {
  try {
    const blobName = req.params.blobName
    const result = await azureStorageService.getFileInfo(blobName)

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      })
    }

    res.json({
      success: true,
      file: result
    })
  } catch (error) {
    logger.error('Get file info error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get file information'
    })
  }
})

// Delete file
router.delete('/:blobName(*)', auth, async (req, res) => {
  try {
    const blobName = req.params.blobName
    const result = await azureStorageService.deleteFile(blobName)

    res.json({
      success: result.success,
      message: result.success ? 'File deleted successfully' : 'File not found'
    })
  } catch (error) {
    logger.error('Delete file error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete file'
    })
  }
})

// Generate secure access URL
router.post('/secure-url', auth, async (req, res) => {
  try {
    const { blobName, expiresIn = 3600 } = req.body

    if (!blobName) {
      return res.status(400).json({
        success: false,
        message: 'Blob name is required'
      })
    }

    const result = await azureStorageService.generateSasUrl(blobName, {
      permissions: 'r',
      expiresIn
    })

    res.json({
      success: true,
      secureUrl: result.sasUrl,
      expiresAt: result.expiresAt
    })
  } catch (error) {
    logger.error('Generate secure URL error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to generate secure URL'
    })
  }
})

export default router