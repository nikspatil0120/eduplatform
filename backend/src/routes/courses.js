import express from 'express'
import Course from '../models/Course.js'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Get all courses
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      level, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build query
    const query = { isDeleted: false }
    
    if (category && category !== 'all') {
      query.category = category
    }
    
    if (level && level !== 'all') {
      query.level = level
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit)
    
    // Build sort object
    const sort = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Fetch courses with pagination
    const courses = await Course.find(query)
      .populate('instructor', 'name profile.avatar profile.bio')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count for pagination
    const total = await Course.countDocuments(query)
    
    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    })
  } catch (error) {
    logger.error('Get courses error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    })
  }
})

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const course = await Course.findOne({ 
      _id: id, 
      isDeleted: false 
    })
    .populate('instructor', 'name profile.avatar profile.bio')
    .lean()
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }
    
    res.json({
      success: true,
      data: course
    })
  } catch (error) {
    logger.error('Get course error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch course'
    })
  }
})

// Enroll in course (simplified for now - just return success)
router.post('/:id/enroll', async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if course exists
    const course = await Course.findOne({ _id: id, isDeleted: false })
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      })
    }
    
    // For now, just return success (in a real app, you'd save enrollment to database)
    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      data: {
        courseId: id,
        courseName: course.title,
        enrolledAt: new Date()
      }
    })
  } catch (error) {
    logger.error('Course enrollment error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to enroll in course'
    })
  }
})

export default router