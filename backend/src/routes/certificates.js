import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import Certificate from '../models/Certificate.js'
import Course from '../models/Course.js'
import LearningPath from '../models/LearningPath.js'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const certificateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many certificate requests, please try again later'
})

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    })
  }
  next()
}

// @route   GET /api/v1/certificates/my
// @desc    Get user's certificates
// @access  Private (Student only)
router.get('/my', certificateLimiter, [
  query('type').optional().isIn(['course_completion', 'learning_path_completion', 'achievement', 'custom']).withMessage('Invalid type'),
  query('status').optional().isIn(['issued', 'revoked']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their certificates'
      })
    }

    const { type, status, page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    // Build query
    const query = { userId: req.user.id }
    if (type) query.type = type
    if (status) query.status = status

    const certificates = await Certificate.find(query)
      .populate('courseId', 'title description thumbnail')
      .populate('learningPathId', 'title description')
      .populate('issuedBy', 'name profile.avatar')
      .sort({ issuedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Certificate.countDocuments(query)

    res.json({
      success: true,
      data: {
        certificates,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    logger.error('Get user certificates error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates'
    })
  }
})

// @route   GET /api/v1/certificates/:id
// @desc    Get certificate by ID
// @access  Public (for verification)
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid certificate ID')
], handleValidationErrors, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('userId', 'name profile.avatar')
      .populate('courseId', 'title description')
      .populate('learningPathId', 'title description')
      .populate('issuedBy', 'name profile.avatar')

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      })
    }

    // Check if certificate is revoked
    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Certificate has been revoked',
        data: {
          certificate: {
            _id: certificate._id,
            status: certificate.status,
            revokedAt: certificate.revokedAt,
            revokedReason: certificate.revokedReason
          }
        }
      })
    }

    res.json({
      success: true,
      data: certificate
    })
  } catch (error) {
    logger.error('Get certificate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate'
    })
  }
})

// @route   POST /api/v1/certificates/issue
// @desc    Issue certificate
// @access  Private (Instructor/Admin only)
router.post('/issue', certificateLimiter, [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('type').isIn(['course_completion', 'learning_path_completion', 'achievement', 'custom']).withMessage('Invalid type'),
  body('courseId').optional().isMongoId().withMessage('Invalid course ID'),
  body('learningPathId').optional().isMongoId().withMessage('Invalid learning path ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is instructor or admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors and admins can issue certificates'
      })
    }

    const {
      userId,
      type,
      courseId,
      learningPathId,
      title,
      description,
      customData
    } = req.body

    // Validate based on type
    if (type === 'course_completion' && !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required for course completion certificates'
      })
    }

    if (type === 'learning_path_completion' && !learningPathId) {
      return res.status(400).json({
        success: false,
        message: 'Learning path ID is required for learning path completion certificates'
      })
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      userId,
      type,
      courseId: courseId || null,
      learningPathId: learningPathId || null,
      status: 'issued'
    })

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already issued for this user and resource'
      })
    }

    // Verify course or learning path exists
    if (courseId) {
      const course = await Course.findById(courseId)
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found'
        })
      }
    }

    if (learningPathId) {
      const learningPath = await LearningPath.findById(learningPathId)
      if (!learningPath) {
        return res.status(404).json({
          success: false,
          message: 'Learning path not found'
        })
      }
    }

    // Create certificate
    const certificate = new Certificate({
      userId,
      type,
      courseId: courseId || undefined,
      learningPathId: learningPathId || undefined,
      title,
      description,
      issuedBy: req.user.id,
      customData: customData ? JSON.parse(customData) : undefined
    })

    await certificate.save()

    // Generate certificate
    await certificate.generateCertificate()

    // Populate for response
    await certificate.populate('userId', 'name profile.avatar')
    await certificate.populate('courseId', 'title description')
    await certificate.populate('learningPathId', 'title description')
    await certificate.populate('issuedBy', 'name profile.avatar')

    res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: certificate
    })
  } catch (error) {
    logger.error('Issue certificate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to issue certificate'
    })
  }
})

// @route   POST /api/v1/certificates/:id/revoke
// @desc    Revoke certificate
// @access  Private (Admin only)
router.post('/:id/revoke', [
  param('id').isMongoId().withMessage('Invalid certificate ID'),
  body('reason').trim().isLength({ min: 1, max: 500 }).withMessage('Reason must be between 1 and 500 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can revoke certificates'
      })
    }

    const { reason } = req.body
    const certificate = await Certificate.findById(req.params.id)

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      })
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Certificate is already revoked'
      })
    }

    await certificate.revoke(reason, req.user.id)

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    })
  } catch (error) {
    logger.error('Revoke certificate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to revoke certificate'
    })
  }
})

// @route   GET /api/v1/certificates/verify/:certificateNumber
// @desc    Verify certificate by certificate number
// @access  Public
router.get('/verify/:certificateNumber', [
  param('certificateNumber').isLength({ min: 1 }).withMessage('Certificate number is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { certificateNumber } = req.params
    const certificate = await Certificate.findOne({ certificateNumber })
      .populate('userId', 'name profile.avatar')
      .populate('courseId', 'title description')
      .populate('learningPathId', 'title description')
      .populate('issuedBy', 'name profile.avatar')

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
        isValid: false
      })
    }

    const isValid = certificate.verify()

    res.json({
      success: true,
      isValid,
      data: {
        certificate: isValid ? certificate : null,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        revokedAt: certificate.revokedAt,
        revokedReason: certificate.revokedReason
      }
    })
  } catch (error) {
    logger.error('Verify certificate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify certificate'
    })
  }
})

// @route   GET /api/v1/certificates/:id/download
// @desc    Download certificate PDF
// @access  Private
router.get('/:id/download', [
  param('id').isMongoId().withMessage('Invalid certificate ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      })
    }

    // Check permissions
    const isOwner = certificate.userId.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this certificate'
      })
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot download revoked certificate'
      })
    }

    // Generate download URL if certificate file exists
    if (certificate.certificateUrl) {
      res.json({
        success: true,
        data: {
          downloadUrl: certificate.certificateUrl,
          fileName: `certificate-${certificate.certificateNumber}.pdf`
        }
      })
    } else {
      // Generate certificate if not exists
      await certificate.generateCertificate()
      res.json({
        success: true,
        data: {
          downloadUrl: certificate.certificateUrl,
          fileName: `certificate-${certificate.certificateNumber}.pdf`
        }
      })
    }
  } catch (error) {
    logger.error('Download certificate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate'
    })
  }
})

// @route   GET /api/v1/certificates/analytics/overview
// @desc    Get certificate analytics overview
// @access  Private (Admin only)
router.get('/analytics/overview', certificateLimiter, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view certificate analytics'
      })
    }

    const { startDate, endDate } = req.query
    const analytics = await Certificate.getAnalytics({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    })

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    logger.error('Get certificate analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate analytics'
    })
  }
})

// @route   GET /api/v1/certificates/bulk-issue
// @desc    Bulk issue certificates
// @access  Private (Admin only)
router.post('/bulk-issue', certificateLimiter, [
  body('certificates').isArray().withMessage('Certificates must be an array'),
  body('certificates.*.userId').isMongoId().withMessage('Invalid user ID'),
  body('certificates.*.type').isIn(['course_completion', 'learning_path_completion', 'achievement', 'custom']).withMessage('Invalid type')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can bulk issue certificates'
      })
    }

    const { certificates } = req.body
    const results = {
      success: [],
      failed: []
    }

    for (const certData of certificates) {
      try {
        // Check if certificate already exists
        const existingCertificate = await Certificate.findOne({
          userId: certData.userId,
          type: certData.type,
          courseId: certData.courseId || null,
          learningPathId: certData.learningPathId || null,
          status: 'issued'
        })

        if (existingCertificate) {
          results.failed.push({
            userId: certData.userId,
            reason: 'Certificate already exists'
          })
          continue
        }

        const certificate = new Certificate({
          ...certData,
          issuedBy: req.user.id
        })

        await certificate.save()
        await certificate.generateCertificate()

        results.success.push(certificate._id)
      } catch (error) {
        results.failed.push({
          userId: certData.userId,
          reason: error.message
        })
      }
    }

    res.json({
      success: true,
      message: `Bulk certificate issuance completed. ${results.success.length} successful, ${results.failed.length} failed.`,
      data: results
    })
  } catch (error) {
    logger.error('Bulk issue certificates error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to bulk issue certificates'
    })
  }
})

export default router