import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import Assignment from '../models/Assignment.js'
import AssignmentSubmission from '../models/AssignmentSubmission.js'
import Course from '../models/Course.js'
import { authenticate as auth } from '../middleware/auth.js'
import cloudinaryService from '../services/cloudinaryService.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const assignmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many assignment requests, please try again later'
})

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
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

// @route   GET /api/v1/assignments/course/:courseId
// @desc    Get assignments for a course
// @access  Private
router.get('/course/:courseId', assignmentLimiter, [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  query('status').optional().isIn(['published', 'draft']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId } = req.params
    const { status, page = 1, limit = 10 } = req.query
    const skip = (page - 1) * limit

    // Check if user has access to the course
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    // Build query
    const query = { courseId }
    if (status) {
      query.isPublished = status === 'published'
    }

    // Students can only see published assignments
    if (req.user.role === 'student') {
      query.isPublished = true
    }

    const assignments = await Assignment.find(query)
      .populate('instructorId', 'name email profile.avatar')
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await Assignment.countDocuments(query)

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    logger.error('Get course assignments error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignments'
    })
  }
})

// @route   GET /api/v1/assignments/:id
// @desc    Get assignment by ID
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid assignment ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('courseId', 'title')
      .populate('instructorId', 'name email profile.avatar')

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      })
    }

    // Check access permissions
    if (req.user.role === 'student' && !assignment.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Assignment not available'
      })
    }

    // Get user's submission if student
    let userSubmission = null
    if (req.user.role === 'student') {
      userSubmission = await AssignmentSubmission.findOne({
        assignmentId: assignment._id,
        studentId: req.user.id
      })
    }

    res.json({
      success: true,
      data: {
        assignment,
        userSubmission
      }
    })
  } catch (error) {
    logger.error('Get assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assignment'
    })
  }
})

// @route   POST /api/v1/assignments
// @desc    Create new assignment
// @access  Private (Instructor/Admin only)
router.post('/', assignmentLimiter, upload.array('attachments', 5), [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('courseId').isMongoId().withMessage('Invalid course ID'),
  body('dueDate').isISO8601().withMessage('Invalid due date'),
  body('maxPoints').optional().isFloat({ min: 0 }).withMessage('Max points must be a positive number'),
  body('type').optional().isIn(['file_upload', 'text_submission', 'quiz', 'project', 'presentation']).withMessage('Invalid assignment type')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is instructor or admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors and admins can create assignments'
      })
    }

    const {
      title,
      description,
      courseId,
      dueDate,
      maxPoints = 100,
      type = 'file_upload',
      instructions,
      allowLateSubmission = false,
      latePenalty = 0,
      submissionFormat,
      rubric
    } = req.body

    // Verify course exists and user has access
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
            folder: `assignments/${courseId}`,
            metadata: {
              uploadedBy: req.user.id,
              assignmentTitle: title
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
          // Continue with other files
        }
      }
    }

    // Create assignment
    const assignment = new Assignment({
      title,
      description,
      courseId,
      instructorId: req.user.id,
      type,
      instructions,
      attachments,
      dueDate: new Date(dueDate),
      maxPoints,
      allowLateSubmission,
      latePenalty,
      submissionFormat: submissionFormat ? JSON.parse(submissionFormat) : undefined,
      rubric: rubric ? JSON.parse(rubric) : undefined
    })

    await assignment.save()

    // Populate for response
    await assignment.populate('courseId', 'title')
    await assignment.populate('instructorId', 'name email')

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment
    })
  } catch (error) {
    logger.error('Create assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create assignment'
    })
  }
})

// @route   PUT /api/v1/assignments/:id
// @desc    Update assignment
// @access  Private (Instructor/Admin only)
router.put('/:id', assignmentLimiter, [
  param('id').isMongoId().withMessage('Invalid assignment ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('dueDate').optional().isISO8601().withMessage('Invalid due date'),
  body('maxPoints').optional().isFloat({ min: 0 }).withMessage('Max points must be a positive number')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      })
    }

    // Check permissions
    if (req.user.role !== 'admin' && assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this assignment'
      })
    }

    // Update fields
    const updateFields = ['title', 'description', 'instructions', 'dueDate', 'maxPoints', 'allowLateSubmission', 'latePenalty']
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        assignment[field] = req.body[field]
      }
    })

    await assignment.save()

    res.json({
      success: true,
      message: 'Assignment updated successfully',
      data: assignment
    })
  } catch (error) {
    logger.error('Update assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update assignment'
    })
  }
})

// @route   DELETE /api/v1/assignments/:id
// @desc    Delete assignment
// @access  Private (Instructor/Admin only)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid assignment ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      })
    }

    // Check permissions
    if (req.user.role !== 'admin' && assignment.instructorId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this assignment'
      })
    }

    // Delete associated submissions
    await AssignmentSubmission.deleteMany({ assignmentId: assignment._id })

    await Assignment.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    })
  } catch (error) {
    logger.error('Delete assignment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete assignment'
    })
  }
})

export default router