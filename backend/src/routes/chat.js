import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import chatService from '../services/chatService.js'
import { authenticate as auth } from '../middleware/auth.js'
import azureStorageService from '../services/azureStorage.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting for chat
const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 messages per minute
  message: 'Too many messages, please slow down'
})

// Configure multer for file uploads in chat
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
      cb(new Error(`File type .${fileExtension} is not allowed in chat`), false)
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

// @route   POST /api/v1/chat/messages
// @desc    Send chat message
// @access  Private
router.post('/messages', chatLimiter, upload.array('attachments', 3), [
  body('courseId').isMongoId().withMessage('Invalid course ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters'),
  body('type').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type'),
  body('replyTo').optional().isMongoId().withMessage('Invalid reply message ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId, content, type = 'text', replyTo } = req.body

    // Handle file attachments
    let attachments = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await azureStorageService.uploadFile(file, {
            folder: `chat/${courseId}`,
            metadata: {
              uploadedBy: req.user.id,
              courseId,
              messageType: 'chat'
            }
          })
          attachments.push({
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.url,
            fileSize: file.size,
            mimeType: file.mimetype
          })
        } catch (uploadError) {
          logger.error('File upload error in chat:', uploadError)
        }
      }
    }

    const message = await chatService.sendMessage({
      courseId,
      senderId: req.user.id,
      content,
      type,
      attachments,
      replyTo: replyTo || undefined,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    })

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    })
  } catch (error) {
    logger.error('Send chat message error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send message'
    })
  }
})

// @route   GET /api/v1/chat/messages/:courseId
// @desc    Get chat messages for a course
// @access  Private
router.get('/messages/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('before').optional().isISO8601().withMessage('Invalid before date'),
  query('after').optional().isISO8601().withMessage('Invalid after date'),
  query('search').optional().isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { page = 1, limit = 50, before, after, search } = req.query

    const result = await chatService.getMessages(courseId, {
      page: parseInt(page),
      limit: parseInt(limit),
      before,
      after,
      search
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Get chat messages error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages'
    })
  }
})

// @route   PUT /api/v1/chat/messages/:id
// @desc    Edit chat message
// @access  Private
router.put('/messages/:id', [
  param('id').isMongoId().withMessage('Invalid message ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Message content must be between 1 and 2000 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { id } = req.params
    const { content } = req.body

    const message = await chatService.editMessage(id, req.user.id, content)

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: message
    })
  } catch (error) {
    logger.error('Edit chat message error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to edit message'
    })
  }
})

// @route   DELETE /api/v1/chat/messages/:id
// @desc    Delete chat message
// @access  Private
router.delete('/messages/:id', [
  param('id').isMongoId().withMessage('Invalid message ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { id } = req.params
    const isAdmin = req.user.role === 'admin'

    const message = await chatService.deleteMessage(id, req.user.id, isAdmin)

    res.json({
      success: true,
      message: 'Message deleted successfully',
      data: message
    })
  } catch (error) {
    logger.error('Delete chat message error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete message'
    })
  }
})

// @route   POST /api/v1/chat/messages/:id/reactions
// @desc    Add reaction to message
// @access  Private
router.post('/messages/:id/reactions', [
  param('id').isMongoId().withMessage('Invalid message ID'),
  body('emoji').isLength({ min: 1, max: 10 }).withMessage('Invalid emoji')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { id } = req.params
    const { emoji } = req.body

    const message = await chatService.addReaction(id, req.user.id, emoji)

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: message
    })
  } catch (error) {
    logger.error('Add reaction error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to add reaction'
    })
  }
})

// @route   DELETE /api/v1/chat/messages/:id/reactions
// @desc    Remove reaction from message
// @access  Private
router.delete('/messages/:id/reactions', [
  param('id').isMongoId().withMessage('Invalid message ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { id } = req.params

    const message = await chatService.removeReaction(id, req.user.id)

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: message
    })
  } catch (error) {
    logger.error('Remove reaction error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to remove reaction'
    })
  }
})

// @route   POST /api/v1/chat/typing
// @desc    Handle typing indicator
// @access  Private
router.post('/typing', [
  body('courseId').isMongoId().withMessage('Invalid course ID'),
  body('isTyping').isBoolean().withMessage('isTyping must be boolean')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId, isTyping } = req.body

    await chatService.handleTyping(courseId, req.user.id, isTyping)

    res.json({
      success: true,
      message: 'Typing status updated'
    })
  } catch (error) {
    logger.error('Handle typing error:', error)
    res.status(400).json({
      success: false,
      message: 'Failed to update typing status'
    })
  }
})

// @route   POST /api/v1/chat/join/:courseId
// @desc    Join course chat
// @access  Private
router.post('/join/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId } = req.params

    await chatService.joinCourseChat(courseId, req.user.id)

    res.json({
      success: true,
      message: 'Joined course chat successfully'
    })
  } catch (error) {
    logger.error('Join course chat error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to join course chat'
    })
  }
})

// @route   POST /api/v1/chat/leave/:courseId
// @desc    Leave course chat
// @access  Private
router.post('/leave/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId } = req.params

    await chatService.leaveCourseChat(courseId, req.user.id)

    res.json({
      success: true,
      message: 'Left course chat successfully'
    })
  } catch (error) {
    logger.error('Leave course chat error:', error)
    res.status(400).json({
      success: false,
      message: 'Failed to leave course chat'
    })
  }
})

// @route   GET /api/v1/chat/analytics/:courseId
// @desc    Get chat analytics for course
// @access  Private (Instructor/Admin only)
router.get('/analytics/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is instructor or admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors and admins can view chat analytics'
      })
    }

    const { courseId } = req.params
    const { startDate, endDate } = req.query

    const analytics = await chatService.getChatAnalytics(courseId, {
      startDate,
      endDate
    })

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    logger.error('Get chat analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chat analytics'
    })
  }
})

// @route   GET /api/v1/chat/search
// @desc    Search messages across courses
// @access  Private (Admin only)
router.get('/search', [
  query('q').isLength({ min: 1, max: 100 }).withMessage('Search query must be between 1 and 100 characters'),
  query('courseId').optional().isMongoId().withMessage('Invalid course ID'),
  query('userId').optional().isMongoId().withMessage('Invalid user ID'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can search across all messages'
      })
    }

    const { q, courseId, userId, startDate, endDate, page = 1, limit = 20 } = req.query

    const result = await chatService.searchMessages(q, {
      courseId,
      userId,
      startDate,
      endDate,
      page: parseInt(page),
      limit: parseInt(limit)
    })

    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    logger.error('Search messages error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search messages'
    })
  }
})

// @route   DELETE /api/v1/chat/cleanup
// @desc    Cleanup old messages
// @access  Private (Admin only)
router.delete('/cleanup', [
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can cleanup messages'
      })
    }

    const { days = 90 } = req.query
    const deletedCount = await chatService.cleanupOldMessages(parseInt(days))

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old messages`,
      data: { deletedCount }
    })
  } catch (error) {
    logger.error('Cleanup messages error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup messages'
    })
  }
})

export default router