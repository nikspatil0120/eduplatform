import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import LearningPath from '../models/LearningPath.js'
import Course from '../models/Course.js'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const learningPathLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many learning path requests, please try again later'
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

// @route   GET /api/v1/learning-paths
// @desc    Get all learning paths
// @access  Private
router.get('/', learningPathLimiter, [
  query('category').optional().isIn(['programming', 'design', 'business', 'data_science', 'marketing', 'other']).withMessage('Invalid category'),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
  query('isPublished').optional().isBoolean().withMessage('Published flag must be boolean'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { category, difficulty, isPublished, page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    // Build query
    const query = {}
    if (category) query.category = category
    if (difficulty) query.difficulty = difficulty
    if (isPublished !== undefined) query.isPublished = isPublished === 'true'

    // Students can only see published paths
    if (req.user.role === 'student') {
      query.isPublished = true
    }

    const learningPaths = await LearningPath.find(query)
      .populate('createdBy', 'name profile.avatar')
      .populate('courses.courseId', 'title description thumbnail duration price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))

    const total = await LearningPath.countDocuments(query)

    res.json({
      success: true,
      data: {
        learningPaths,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    logger.error('Get learning paths error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning paths'
    })
  }
})

// @route   GET /api/v1/learning-paths/:id
// @desc    Get learning path by ID
// @access  Private
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid learning path ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id)
      .populate('createdBy', 'name profile.avatar')
      .populate('courses.courseId', 'title description thumbnail duration price instructor')
      .populate('enrollments.userId', 'name profile.avatar')

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    // Check if student can access unpublished path
    if (req.user.role === 'student' && !learningPath.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Learning path not available'
      })
    }

    // Get user's enrollment status
    let userEnrollment = null
    if (req.user.role === 'student') {
      userEnrollment = learningPath.enrollments.find(
        enrollment => enrollment.userId._id.toString() === req.user.id
      )
    }

    res.json({
      success: true,
      data: {
        learningPath,
        userEnrollment
      }
    })
  } catch (error) {
    logger.error('Get learning path error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning path'
    })
  }
})

// @route   POST /api/v1/learning-paths
// @desc    Create new learning path
// @access  Private (Instructor/Admin only)
router.post('/', learningPathLimiter, [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('category').isIn(['programming', 'design', 'business', 'data_science', 'marketing', 'other']).withMessage('Invalid category'),
  body('difficulty').isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
  body('courses').isArray().withMessage('Courses must be an array'),
  body('estimatedDuration').optional().isInt({ min: 1 }).withMessage('Estimated duration must be a positive integer')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is instructor or admin
    if (!['instructor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors and admins can create learning paths'
      })
    }

    const {
      title,
      description,
      category,
      difficulty,
      courses,
      estimatedDuration,
      prerequisites,
      learningObjectives,
      tags
    } = req.body

    // Validate courses exist
    const courseIds = courses.map(course => course.courseId)
    const existingCourses = await Course.find({ _id: { $in: courseIds } })
    
    if (existingCourses.length !== courseIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more courses not found'
      })
    }

    // Create learning path
    const learningPath = new LearningPath({
      title,
      description,
      category,
      difficulty,
      courses: courses.map((course, index) => ({
        courseId: course.courseId,
        order: course.order || index + 1,
        isRequired: course.isRequired !== false
      })),
      createdBy: req.user.id,
      estimatedDuration,
      prerequisites: prerequisites || [],
      learningObjectives: learningObjectives || [],
      tags: tags || []
    })

    await learningPath.save()

    // Populate for response
    await learningPath.populate('createdBy', 'name profile.avatar')
    await learningPath.populate('courses.courseId', 'title description thumbnail duration price')

    res.status(201).json({
      success: true,
      message: 'Learning path created successfully',
      data: learningPath
    })
  } catch (error) {
    logger.error('Create learning path error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create learning path'
    })
  }
})

// @route   PUT /api/v1/learning-paths/:id
// @desc    Update learning path
// @access  Private (Creator/Admin only)
router.put('/:id', learningPathLimiter, [
  param('id').isMongoId().withMessage('Invalid learning path ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 2000 }).withMessage('Description must be between 1 and 2000 characters'),
  body('category').optional().isIn(['programming', 'design', 'business', 'data_science', 'marketing', 'other']).withMessage('Invalid category'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id)

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    // Check permissions
    const isCreator = learningPath.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this learning path'
      })
    }

    // Update fields
    const updateFields = ['title', 'description', 'category', 'difficulty', 'estimatedDuration', 'prerequisites', 'learningObjectives', 'tags']
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        learningPath[field] = req.body[field]
      }
    })

    // Update courses if provided
    if (req.body.courses) {
      const courseIds = req.body.courses.map(course => course.courseId)
      const existingCourses = await Course.find({ _id: { $in: courseIds } })
      
      if (existingCourses.length !== courseIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more courses not found'
        })
      }

      learningPath.courses = req.body.courses.map((course, index) => ({
        courseId: course.courseId,
        order: course.order || index + 1,
        isRequired: course.isRequired !== false
      }))
    }

    await learningPath.save()

    res.json({
      success: true,
      message: 'Learning path updated successfully',
      data: learningPath
    })
  } catch (error) {
    logger.error('Update learning path error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update learning path'
    })
  }
})

// @route   POST /api/v1/learning-paths/:id/enroll
// @desc    Enroll in learning path
// @access  Private (Student only)
router.post('/:id/enroll', [
  param('id').isMongoId().withMessage('Invalid learning path ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can enroll in learning paths'
      })
    }

    const learningPath = await LearningPath.findById(req.params.id)

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    if (!learningPath.isPublished) {
      return res.status(400).json({
        success: false,
        message: 'Learning path is not available for enrollment'
      })
    }

    await learningPath.enroll(req.user.id)

    res.json({
      success: true,
      message: 'Successfully enrolled in learning path',
      data: learningPath
    })
  } catch (error) {
    logger.error('Enroll in learning path error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to enroll in learning path'
    })
  }
})

// @route   POST /api/v1/learning-paths/:id/unenroll
// @desc    Unenroll from learning path
// @access  Private (Student only)
router.post('/:id/unenroll', [
  param('id').isMongoId().withMessage('Invalid learning path ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can unenroll from learning paths'
      })
    }

    const learningPath = await LearningPath.findById(req.params.id)

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    await learningPath.unenroll(req.user.id)

    res.json({
      success: true,
      message: 'Successfully unenrolled from learning path'
    })
  } catch (error) {
    logger.error('Unenroll from learning path error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to unenroll from learning path'
    })
  }
})

// @route   POST /api/v1/learning-paths/:id/complete-course
// @desc    Mark course as completed in learning path
// @access  Private (Student only)
router.post('/:id/complete-course', [
  param('id').isMongoId().withMessage('Invalid learning path ID'),
  body('courseId').isMongoId().withMessage('Invalid course ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { courseId } = req.body

    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can complete courses'
      })
    }

    const learningPath = await LearningPath.findById(req.params.id)

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    await learningPath.completeCourse(req.user.id, courseId)

    res.json({
      success: true,
      message: 'Course marked as completed',
      data: learningPath
    })
  } catch (error) {
    logger.error('Complete course error:', error)
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete course'
    })
  }
})

// @route   GET /api/v1/learning-paths/:id/progress
// @desc    Get learning path progress for user
// @access  Private (Student only)
router.get('/:id/progress', [
  param('id').isMongoId().withMessage('Invalid learning path ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view progress'
      })
    }

    const learningPath = await LearningPath.findById(req.params.id)
      .populate('courses.courseId', 'title')

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    const progress = learningPath.getProgress(req.user.id)

    res.json({
      success: true,
      data: progress
    })
  } catch (error) {
    logger.error('Get learning path progress error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch progress'
    })
  }
})

// @route   POST /api/v1/learning-paths/:id/publish
// @desc    Publish learning path
// @access  Private (Creator/Admin only)
router.post('/:id/publish', [
  param('id').isMongoId().withMessage('Invalid learning path ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id)

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    // Check permissions
    const isCreator = learningPath.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this learning path'
      })
    }

    await learningPath.publish()

    res.json({
      success: true,
      message: 'Learning path published successfully',
      data: learningPath
    })
  } catch (error) {
    logger.error('Publish learning path error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to publish learning path'
    })
  }
})

// @route   DELETE /api/v1/learning-paths/:id
// @desc    Delete learning path
// @access  Private (Creator/Admin only)
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid learning path ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const learningPath = await LearningPath.findById(req.params.id)

    if (!learningPath) {
      return res.status(404).json({
        success: false,
        message: 'Learning path not found'
      })
    }

    // Check permissions
    const isCreator = learningPath.createdBy.toString() === req.user.id
    const isAdmin = req.user.role === 'admin'
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this learning path'
      })
    }

    await LearningPath.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Learning path deleted successfully'
    })
  } catch (error) {
    logger.error('Delete learning path error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete learning path'
    })
  }
})

// @route   GET /api/v1/learning-paths/my/enrolled
// @desc    Get user's enrolled learning paths
// @access  Private (Student only)
router.get('/my/enrolled', learningPathLimiter, auth, async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view enrolled learning paths'
      })
    }

    const learningPaths = await LearningPath.find({
      'enrollments.userId': req.user.id
    })
      .populate('createdBy', 'name profile.avatar')
      .populate('courses.courseId', 'title description thumbnail duration')
      .sort({ 'enrollments.enrolledAt': -1 })

    // Add progress information
    const pathsWithProgress = learningPaths.map(path => {
      const progress = path.getProgress(req.user.id)
      return {
        ...path.toObject(),
        progress
      }
    })

    res.json({
      success: true,
      data: pathsWithProgress
    })
  } catch (error) {
    logger.error('Get enrolled learning paths error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled learning paths'
    })
  }
})

export default router