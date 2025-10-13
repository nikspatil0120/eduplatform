import express from 'express'
import { body, validationResult, param } from 'express-validator'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import Discussion from '../models/Discussion.js'
import DiscussionReply from '../models/DiscussionReply.js'
import { authenticate as auth } from '../middleware/auth.js'
import azureStorageService from '../services/azureStorage.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const replyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many reply requests, please try again later'
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt']
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

// @route   POST /api/v1/replies
// @desc    Create reply to discussion
// @access  Private
router.post('/', replyLimiter, upload.array('attachments', 2), [
  body('discussionId').isMongoId().withMessage('Invalid discussion ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters'),
  body('parentReplyId').optional().isMongoId().withMessage('Invalid parent reply ID'),
  body('isAnonymous').optional().isBoolean().withMessage('Anonymous flag must be boolean')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { discussionId, content, parentReplyId, isAnonymous = false } = req.body

    // Check if discussion exists and is not locked
    const discussion = await Discussion.findById(discussionId)
    if (!discussion) {
      return res.status(404).json({
        success: false,
        message: 'Discussion not found'
      })
    }

    if (discussion.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Discussion is locked and cannot accept new replies'
      })
    }

    // If replying to another reply, check if it exists
    if (parentReplyId) {
      const parentReply = await DiscussionReply.findById(parentReplyId)
      if (!parentReply || parentReply.discussionId.toString() !== discussionId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent reply'
        })
      }
    }

    // Handle file attachments
    let attachments = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await azureStorageService.uploadFile(file, {
            folder: `discussions/${discussionId}/replies`,
            metadata: {
              uploadedBy: req.user.id,
              discussionId
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

    // Create reply
    const reply = new DiscussionReply({
      discussionId,
      content,
      createdBy: req.user.id,
      parentReplyId: parentReplyId || null,
      isAnonymous,
      attachments
    })

    await reply.save()

    // Update discussion reply count and last activity
    await Discussion.findByIdAndUpdate(discussionId, {
      $inc: { replyCount: 1 },
      lastActivity: new Date()
    })

    // Populate for response
    await reply.populate('createdBy', 'name profile.avatar role')

    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      data: reply
    })
  } catch (error) {
    logger.error('Create reply error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create reply'
    })
  }
})

// @route   PUT /api/v1/replies/:id
// @desc    Update reply
// @access  Private (Owner/Admin only)
router.put('/:id', replyLimiter, [
  param('id').isMongoId().withMessage('Invalid reply ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Content must be between 1 and 2000 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { content } = req.body
    const reply = await DiscussionReply.findById(req.params.id)

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      })
    }

    // Check permissions
    const isOwner = reply.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this reply'
      })
    }

    reply.content = content
    reply.isEdited = true
    reply.editedAt = new Date()
    await reply.save()

    res.json({
      success: true,
      message: 'Reply updated successfully',
      data: reply
    })
  } catch (error) {
    logger.error('Update reply error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update reply'
    })
  }
})

// @route   POST /api/v1/replies/:id/vote
// @desc    Vote on reply (upvote/downvote)
// @access  Private
router.post('/:id/vote', [
  param('id').isMongoId().withMessage('Invalid reply ID'),
  body('type').isIn(['upvote', 'downvote']).withMessage('Vote type must be upvote or downvote')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { type } = req.body
    const reply = await DiscussionReply.findById(req.params.id)

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      })
    }

    await reply.vote(req.user.id, type)

    res.json({
      success: true,
      message: 'Vote recorded successfully',
      data: {
        upvotes: reply.upvotes.length,
        downvotes: reply.downvotes.length,
        score: reply.score
      }
    })
  } catch (error) {
    logger.error('Vote reply error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to record vote'
    })
  }
})

// @route   POST /api/v1/replies/:id/mark-solution
// @desc    Mark reply as solution
// @access  Private (Discussion owner/Instructor/Admin only)
router.post('/:id/mark-solution', [
  param('id').isMongoId().withMessage('Invalid reply ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const reply = await DiscussionReply.findById(req.params.id)
      .populate('discussionId')

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      })
    }

    const discussion = reply.discussionId

    // Check permissions
    const isDiscussionOwner = discussion.createdBy.toString() === req.user.id
    const isInstructor = ['instructor', 'admin'].includes(req.user.role)
    if (!isDiscussionOwner && !isInstructor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark solution'
      })
    }

    await reply.markAsSolution()

    res.json({
      success: true,
      message: 'Reply marked as solution successfully',
      data: reply
    })
  } catch (error) {
    logger.error('Mark solution error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark reply as solution'
    })
  }
})

// @route   DELETE /api/v1/replies/:id
// @desc    Delete reply
// @access  Private (Owner/Admin only)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid reply ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const reply = await DiscussionReply.findById(req.params.id)

    if (!reply) {
      return res.status(404).json({
        success: false,
        message: 'Reply not found'
      })
    }

    // Check permissions
    const isOwner = reply.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this reply'
      })
    }

    // Delete child replies
    await DiscussionReply.deleteMany({ parentReplyId: reply._id })

    // Delete attachments from storage
    for (const attachment of reply.attachments) {
      try {
        await azureStorageService.deleteFile(attachment.fileName)
      } catch (deleteError) {
        logger.error('File deletion error:', deleteError)
      }
    }

    // Update discussion reply count
    await Discussion.findByIdAndUpdate(reply.discussionId, {
      $inc: { replyCount: -1 }
    })

    await DiscussionReply.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Reply deleted successfully'
    })
  } catch (error) {
    logger.error('Delete reply error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete reply'
    })
  }
})

export default router