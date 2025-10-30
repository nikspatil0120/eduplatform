import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import Assignment from '../models/Assignment.js'
import AssignmentSubmission from '../models/AssignmentSubmission.js'
import { authenticate as auth } from '../middleware/auth.js'
import cloudinaryService from '../services/cloudinaryService.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many submission requests, please try again later'
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'zip', 'mp4', 'mov']
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

// @route   POST /api/v1/submissions
// @desc    Submit assignment
// @access  Private (Student only)
router.post('/', submissionLimiter, upload.array('files', 10), [
  body('assignmentId').isMongoId().withMessage('Invalid assignment ID'),
  body('submissionText').optional().isLength({ max: 10000 }).withMessage('Submission text cannot exceed 10000 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { assignmentId, submissionText } = req.body

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assignments'
      })
    }

    // Get assignment
    const assignment = await Assignment.findById(assignmentId)
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      })
    }

    // Check if assignment is published
    if (!assignment.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Assignment is not available for submission'
      })
    }

    // Check if already submitted
    const existingSubmission = await AssignmentSubmission.findOne({
      assignmentId,
      studentId: req.user.id
    })

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Assignment already submitted'
      })
    }

    // Check due date
    const now = new Date()
    const isLate = now > assignment.dueDate
    if (isLate && !assignment.allowLateSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Assignment submission deadline has passed'
      })
    }

    // Handle file uploads
    let attachments = []
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const uploadResult = await cloudinaryService.uploadFile(file, {
            folder: `submissions/${assignmentId}/${req.user.id}`,
            metadata: {
              studentId: req.user.id,
              assignmentId,
              submissionDate: now.toISOString()
            }
          })
          attachments.push({
            fileName: uploadResult.fileName,
            originalName: file.originalname,
            fileUrl: uploadResult.url,
            fileSize: file.size,
            mimeType: file.mimetype,
            blobName: uploadResult.blobName
          })
        } catch (uploadError) {
          logger.error('File upload error:', uploadError)
          return res.status(500).json({
            success: false,
            message: `Failed to upload file: ${file.originalname}`
          })
        }
      }
    }

    // Create submission
    const submission = new AssignmentSubmission({
      assignmentId,
      studentId: req.user.id,
      courseId: assignment.courseId,
      submissionText,
      attachments,
      isLate,
      maxPoints: assignment.maxPoints,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        submissionSource: 'web'
      }
    })

    await submission.save()

    // Populate for response
    await submission.populate('studentId', 'name email')
    await submission.populate('assignmentId', 'title dueDate maxPoints')

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      data: submission
    })
  } catch (error) {
    logger.error('Submit assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to submit assignment'
    })
  }
})

// @route   GET /api/v1/submissions/my
// @desc    Get user's submissions
// @access  Private (Student only)
router.get('/my', [
  query('courseId').optional().isMongoId().withMessage('Invalid course ID'),
  query('status').optional().isIn(['submitted', 'graded', 'returned']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their submissions'
      })
    }

    const { courseId, status, page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    const query = { studentId: req.user.id }
    if (courseId) query.courseId = courseId
    if (status) query.status = status

    const submissions = await AssignmentSubmission.find(query)
      .populate('assignmentId', 'title dueDate maxPoints')
      .populate('courseId', 'title')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await AssignmentSubmission.countDocuments(query)

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    logger.error('Get user submissions error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions'
    })
  }
})

// @route   GET /api/v1/submissions/:id
// @desc    Get submission by ID
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid submission ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate('studentId', 'name email profile.avatar')
      .populate('assignmentId', 'title dueDate maxPoints rubric')
      .populate('courseId', 'title')

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      })
    }

    // Check permissions
    const isOwner = submission.studentId._id.toString() === req.user.id
    const isInstructor = req.user.role === 'instructor' || req.user.role === 'admin'

    if (!isOwner && !isInstructor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      })
    }

    res.json({
      success: true,
      data: submission
    })
  } catch (error) {
    logger.error('Get submission error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submission'
    })
  }
})

// @route   PUT /api/v1/submissions/:id/grade
// @desc    Grade submission
// @access  Private (Instructor/Admin only)
router.put('/:id/grade', [
  param('id').isMongoId().withMessage('Invalid submission ID'),
  body('grade').isFloat({ min: 0 }).withMessage('Grade must be a positive number'),
  body('feedback').optional().isLength({ max: 2000 }).withMessage('Feedback cannot exceed 2000 characters')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { grade, feedback } = req.body

    const submission = await AssignmentSubmission.findById(req.params.id)
      .populate('assignmentId')

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      })
    }

    // Check permissions
    if (req.user.role !== 'admin' && submission.assignmentId.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to grade this submission'
      })
    }

    // Validate grade against max points
    if (grade > submission.maxPoints) {
      return res.status(400).json({
        success: false,
        message: `Grade cannot exceed maximum points (${submission.maxPoints})`
      })
    }

    // Grade the submission
    submission.grade = grade
    submission.feedback = {
      text: feedback,
      gradedBy: req.user.id,
      gradedAt: new Date()
    }
    submission.status = 'graded'

    await submission.save()

    res.json({
      success: true,
      message: 'Submission graded successfully',
      data: submission
    })
  } catch (error) {
    logger.error('Grade submission error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to grade submission'
    })
  }
})

// @route   DELETE /api/v1/submissions/:id
// @desc    Delete submission
// @access  Private (Student - own submissions only)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid submission ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.id)

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      })
    }

    // Check permissions
    const isOwner = submission.studentId.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this submission'
      })
    }

    // Check if submission is already graded
    if (submission.status === 'graded' && !isAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete graded submission'
      })
    }

    await AssignmentSubmission.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    })
  } catch (error) {
    logger.error('Delete submission error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission'
    })
  }
})

export default router