import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import Discussion from '../models/Discussion.js'
import DiscussionReply from '../models/DiscussionReply.js'
import Course from '../models/Course.js'
import { authenticate as auth } from '../middleware/auth.js'
import cloudinaryService from '../services/cloudinaryService.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const discussionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many discussion requests, please try again later'
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'txt']
    const fileExtension = file.originalname.split('.').pop().toLowerCase()
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new Error(`File type .${fileExtension} is not allowed`), false)
    }
  }
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

// @route   GET /api/v1/discussions/course/:courseId
// @desc    Get discussions for a course
// @access  Private
router.get('/course/:courseId', discussionLimiter, [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  query('type').optional().isIn(['general', 'announcement', 'question', 'assignment_help', 'study_group']).withMessage('Invalid type'),
  query('sortBy').optional().isIn(['recent', 'activity', 'replies']).withMessage('Invalid sort option'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { type, sortBy = 'recent', page = 1, limit = 20 } = req.query

    // Check if user has access to the course
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    const skip = (page - 1) * limit

    // Build query
    const query = { courseId }
    if (type) query.type = type

    // Build sort
    let sort = {}
    switch (sortBy) {
      case 'activity':
        sort = { lastActivity: -1 }
        break
      case 'replies':
        sort = { replyCount: -1 }
        break
      default:
        sort = { createdAt: -1 }
    }

    const discussions = await Discussion.find(query)
      .populate('createdBy', 'name profile.avatar role')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Discussion.countDocuments(query)

    res.json({
      success: true,
      data: {
        discussions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    logger.error('Get course discussions error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discussions'
    })
  }
})

// @route   GET /api/v1/discussions/:id
// @desc    Get discussion by ID with replies
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid discussion ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
      .populate('createdBy', 'name profile.avatar role')
      .populate('courseId', 'title')

    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      })
    }

    // Increment view count
    discussion.viewCount = (discussion.viewCount || 0) + 1
    await discussion.save()

    // Get replies
    const replies = await DiscussionReply.find({ discussionId: discussion._id })
      .populate('createdBy', 'name profile.avatar role')
      .sort({ createdAt: 1 })

    res.json({
      success: true,
      data: {
        discussion,
        replies
      }
    })
  } catch (error) {
    logger.error('Get discussion error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch discussion'
    })
  }
})

// @route   POST /api/v1/discussions
// @desc    Create new discussion
// @access  Private
router.post('/', discussionLimiter, upload.array('attachments', 3), [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('courseId').isMongoId().withMessage('Invalid course ID'),
  body('type').optional().isIn(['general', 'announcement', 'question', 'assignment_help', 'study_group']).withMessage('Invalid type'),
  body('category').optional().isIn(['lecture', 'assignment', 'exam', 'project', 'general', 'technical_help']).withMessage('Invalid category'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('isAnonymous').optional().isBoolean().withMessage('Anonymous flag must be boolean')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const {
      title,
      description,
      courseId,
      type = 'general',
      category = 'general',
      tags = [],
      isAnonymous = false,
      visibility = 'public'
    } = req.body

    // Check if course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    // Handle file attachments
    let attachments = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await cloudinaryService.uploadFile(file, {
            folder: `discussions/${courseId}`,
            metadata: {
              uploadedBy: req.user.id,
              discussionTitle: title
            }
          })
          attachments.push({
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.url,
            fileSize: file.size,
            mimeType: file.mimetype
          })
        } catch (uploadError) {
          logger.error('File upload error:', uploadError)
        }
      }
    }

    // Create discussion
    const discussion = new Discussion({
      title,
      description,
      courseId,
      createdBy: req.user.id,
      type,
      category,
      tags: Array.isArray(tags) ? tags : [],
      isAnonymous,
      visibility,
      attachments
    })

    await discussion.save()

    // Populate for response
    await discussion.populate('createdBy', 'name profile.avatar role')
    await discussion.populate('courseId', 'title')

    res.status(201).json({
      success: true,
      message: 'Discussion created successfully',
      data: discussion
    })
  } catch (error) {
    logger.error('Create discussion error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create discussion'
    })
  }
})

// @route   PUT /api/v1/discussions/:id
// @desc    Update discussion
// @access  Private (Owner/Admin only)
router.put('/:id', discussionLimiter, [
  param('id').isMongoId().withMessage('Invalid discussion ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters'),
  body('tags').optional().isArray().withMessage('Tags must be an array')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      })
    }

    // Check permissions
    const isOwner = discussion.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this discussion'
      })
    }

    // Update fields
    const updateFields = ['title', 'description', 'category', 'tags']
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        discussion[field] = req.body[field]
      }
    })

    await discussion.save()

    res.json({
      success: true,
      message: 'Discussion updated successfully',
      data: discussion
    })
  } catch (error) {
    logger.error('Update discussion error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update discussion'
    })
  }
})

// @route   POST /api/v1/discussions/:id/pin
// @desc    Pin/unpin discussion
// @access  Private (Instructor/Admin only)
router.post('/:id/pin', [
  param('id').isMongoId().withMessage('Invalid discussion ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      })
    }

    // Check permissions
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors and admins can pin discussions'
      })
    }

    discussion.isPinned = !discussion.isPinned
    await discussion.save()

    res.json({
      success: true,
      message: `Discussion ${discussion.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: { isPinned: discussion.isPinned }
    })
  } catch (error) {
    logger.error('Pin discussion error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to pin/unpin discussion'
    })
  }
})

// @route   DELETE /api/v1/discussions/:id
// @desc    Delete discussion
// @access  Private (Owner/Admin only)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid discussion ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const discussion = await Discussion.findById(req.params.id)
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      })
    }

    // Check permissions
    const isOwner = discussion.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this discussion'
      })
    }

    // Delete all replies
    await DiscussionReply.deleteMany({ discussionId: discussion._id })

    await Discussion.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Discussion deleted successfully'
    })
  } catch (error) {
    logger.error('Delete discussion error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete discussion'
    })
  }
})

// @route   GET /api/v1/discussions/search
// @desc    Search discussions
// @access  Private
router.get('/search', [
  query('q').isLength({ min: 1 }).withMessage('Search query is required'),
  query('courseId').isMongoId().withMessage('Invalid course ID'),
  query('type').optional().isIn(['general', 'announcement', 'question', 'assignment_help', 'study_group']).withMessage('Invalid type'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { q, courseId, type, limit = 10 } = req.query

    const query = {
      courseId,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ]
    }

    if (type) {
      query.type = type
    }

    const discussions = await Discussion.find(query)
      .populate('createdBy', 'name profile.avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))

    res.json({
      success: true,
      data: discussions
    })
  } catch (error) {
    logger.error('Search discussions error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search discussions'
    })
  }
})

export default router