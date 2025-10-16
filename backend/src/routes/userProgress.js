import express from 'express'
import { body, param, validationResult } from 'express-validator'
import UserProgress from '../models/UserProgress.js'
import Course from '../models/Course.js'
import auth from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

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

// @route   GET /api/v1/user-progress
// @desc    Get all user progress
// @access  Private
router.get('/', auth.authenticate, async (req, res) => {
  try {
    const userProgress = await UserProgress.find({ user: req.user.id })
      .populate('course', 'title thumbnail')
      .sort({ lastAccessedAt: -1 })

    const progressData = userProgress.map(progress => ({
      courseId: progress.course._id,
      courseTitle: progress.course.title,
      courseThumbnail: progress.course.thumbnail,
      ...progress.getProgressSummary()
    }))

    res.json({
      success: true,
      data: progressData
    })
  } catch (error) {
    logger.error('Get user progress error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user progress'
    })
  }
})

// @route   GET /api/v1/user-progress/:courseId
// @desc    Get user progress for specific course
// @access  Private
router.get('/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], handleValidationErrors, auth.authenticate, async (req, res) => {
  try {
    const { courseId } = req.params

    // Check if course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    let userProgress = await UserProgress.findOne({
      user: req.user.id,
      course: courseId
    })

    // If no progress exists, create empty progress
    if (!userProgress) {
      userProgress = new UserProgress({
        user: req.user.id,
        course: courseId,
        completedLessons: [],
        certificates: [],
        totalWatchTime: 0
      })
      await userProgress.save()
    }

    res.json({
      success: true,
      data: {
        courseId,
        ...userProgress.getProgressSummary()
      }
    })
  } catch (error) {
    logger.error('Get course progress error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course progress'
    })
  }
})

// @route   POST /api/v1/user-progress/:courseId/lesson
// @desc    Mark lesson as completed
// @access  Private
router.post('/:courseId/lesson', [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  body('lessonId').notEmpty().withMessage('Lesson ID is required'),
  body('watchTime').optional().isNumeric().withMessage('Watch time must be a number')
], handleValidationErrors, auth.authenticate, async (req, res) => {
  try {
    const { courseId } = req.params
    const { lessonId, watchTime = 0 } = req.body

    // Check if course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    // Find or create user progress
    let userProgress = await UserProgress.findOne({
      user: req.user.id,
      course: courseId
    })

    if (!userProgress) {
      userProgress = new UserProgress({
        user: req.user.id,
        course: courseId,
        completedLessons: [],
        certificates: [],
        totalWatchTime: 0
      })
    }

    // Mark lesson as completed
    await userProgress.markLessonComplete(lessonId, watchTime)

    res.json({
      success: true,
      message: 'Lesson marked as completed',
      data: userProgress.getProgressSummary()
    })
  } catch (error) {
    logger.error('Mark lesson complete error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark lesson as completed'
    })
  }
})

// @route   POST /api/v1/user-progress/:courseId/certificate
// @desc    Add certificate to user progress
// @access  Private
router.post('/:courseId/certificate', [
  param('courseId').isMongoId().withMessage('Invalid course ID'),
  body('certificateId').notEmpty().withMessage('Certificate ID is required'),
  body('courseName').notEmpty().withMessage('Course name is required')
], handleValidationErrors, auth.authenticate, async (req, res) => {
  try {
    const { courseId } = req.params
    const { certificateId, courseName } = req.body

    // Check if course exists
    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }

    // Find or create user progress
    let userProgress = await UserProgress.findOne({
      user: req.user.id,
      course: courseId
    })

    if (!userProgress) {
      userProgress = new UserProgress({
        user: req.user.id,
        course: courseId,
        completedLessons: [],
        certificates: [],
        totalWatchTime: 0
      })
    }

    // Add certificate
    await userProgress.addCertificate(certificateId, courseName)

    res.json({
      success: true,
      message: 'Certificate added successfully',
      data: userProgress.getProgressSummary()
    })
  } catch (error) {
    logger.error('Add certificate error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to add certificate'
    })
  }
})

// @route   DELETE /api/v1/user-progress/:courseId
// @desc    Reset user progress for a course
// @access  Private
router.delete('/:courseId', [
  param('courseId').isMongoId().withMessage('Invalid course ID')
], handleValidationErrors, auth.authenticate, async (req, res) => {
  try {
    const { courseId } = req.params

    await UserProgress.findOneAndDelete({
      user: req.user.id,
      course: courseId
    })

    res.json({
      success: true,
      message: 'Course progress reset successfully'
    })
  } catch (error) {
    logger.error('Reset progress error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to reset progress'
    })
  }
})

export default router