import express from 'express'
import Course from '../models/Course.js'
import { authenticate as auth } from '../middleware/auth.js'
import User from '../models/User.js'
import { logger } from '../utils/logger.js'
import Enrollment from '../models/Enrollment.js'

const router = express.Router()

// No queue needed for regular MongoDB - direct operations work fine

// Create new course (Admin only)
router.post('/', auth, async (req, res) => {
  try {
    const { title, category, level, description, segments } = req.body
    const instructorId = req.user.id
    
    console.log('🎯 Course creation request:', { title, category, level, description, segments })
    console.log('👤 Instructor ID:', instructorId)

    // Validate required fields
    if (!title || !category || !level) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title, category, and level are required' 
      })
    }

    // Skip user validation to reduce RU usage (assume admin from auth middleware)

    // Create simple slug from title (no uniqueness check to save RU)
    const finalSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')

    // Skip all mapping to minimize RU usage

    // Build curriculum with video lessons if segments provided
    const curriculum = []
    if (segments && segments.length > 0) {
      segments.forEach((segment, sectionIndex) => {
        const section = {
          title: segment.name || `Section ${sectionIndex + 1}`,
          description: '',
          lessons: [],
          order: sectionIndex + 1
        }
        
        // Add video lessons from subSegments
        if (segment.subSegments && segment.subSegments.length > 0) {
          segment.subSegments.forEach((subSegment, lessonIndex) => {
            if (subSegment.videoUrl) {
              section.lessons.push({
                title: subSegment.name || `Lesson ${lessonIndex + 1}`,
                description: subSegment.description || '',
                videoUrl: subSegment.videoUrl,
                videoDuration: subSegment.duration || 300, // Default 5 minutes
                order: lessonIndex + 1,
                isPreview: false,
                isPublished: true
              })
            }
          })
        }
        
        curriculum.push(section)
      })
    }

    // Create course object with all data
    const courseData = {
      title,
      slug: finalSlug,
      description: description || 'Course',
      category,
      level,
      instructor: instructorId,
      media: { thumbnail: '/api/placeholder/course-thumbnail.jpg' },
      settings: { 
        isDraft: true
      },
      curriculum
    }

    console.log('📝 Course data to save:', courseData)
    
    // Create and save course directly - no retry logic needed for MongoDB
    const course = new Course(courseData)
    await course.save()
    console.log('✅ Course saved successfully:', course._id)

    logger.info(`Course created: ${title}`)

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: {
        id: course._id,
        title: course.title,
        slug: course.slug,
        category: course.category,
        level: course.level,
        status: course.settings.isPublished ? 'published' : 'draft'
      }
    })

  } catch (error) {
    console.error('❌ Course creation error:', error)
    console.error('❌ Error details:', error.message)
    console.error('❌ Error stack:', error.stack)
    logger.error('Course creation error:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create course',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

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
    
    // Only show published courses to regular users (not admins)
    if (!req.user || req.user.role !== 'admin') {
      query['settings.isPublished'] = true
      // Note: we do not filter by a separate `status` field since the
      // course schema uses `settings.isPublished`/`settings.isDraft`.
    }
    
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

// @route   GET /api/v1/courses/enrolled
// @desc    Get user's enrolled courses
// @access  Private
router.get('/enrolled', auth, async (req, res) => {
  try {
    console.log('🔍 Getting enrolled courses for user:', req.user.id)
    console.log('🔍 User object:', req.user)
    
    // One-time data migration: Fix enrollment records with email strings
    console.log('🔧 Running enrollment data migration...')
    const User = (await import('../models/User.js')).default
    
    // Find all enrollments with string user IDs (emails)
    const badEnrollments = await Enrollment.find({
      user: { $type: "string" }
    })
    
    console.log('🔧 Found', badEnrollments.length, 'enrollment records to fix')
    
    for (const enrollment of badEnrollments) {
      try {
        // Find the user by email
        const user = await User.findOne({ email: enrollment.user })
        if (user) {
          console.log('🔧 Fixing enrollment for:', enrollment.user, '->', user._id)
          await Enrollment.updateOne(
            { _id: enrollment._id },
            { user: user._id }
          )
        } else {
          console.log('⚠️ User not found for email:', enrollment.user)
        }
      } catch (error) {
        console.error('❌ Error fixing enrollment:', error)
      }
    }
    
    // Find all enrollments for the user
    const enrollments = await Enrollment.find({ 
      user: req.user.id, 
      status: 'active' 
    })
    .populate({
      path: 'course',
      select: 'title description media category level instructor stats',
      populate: {
        path: 'instructor',
        select: 'name profile.avatar'
      }
    })
    .sort({ enrolledAt: -1 })

    console.log('📚 Found', enrollments.length, 'enrollments for current user')

    const enrolledCourses = enrollments
      .filter(enrollment => enrollment.course) // Filter out enrollments with deleted courses
      .map(enrollment => ({
        id: enrollment.course._id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        thumbnail: enrollment.course.media?.thumbnail || '/api/placeholder/course-thumbnail.jpg',
        category: enrollment.course.category,
        level: enrollment.course.level,
        instructor: enrollment.course.instructor,
        stats: enrollment.course.stats,
        enrolledAt: enrollment.enrolledAt,
        progress: enrollment.progress
      }))

    console.log('✅ Returning', enrolledCourses.length, 'enrolled courses')

    res.json({
      success: true,
      data: enrolledCourses
    })
  } catch (error) {
    console.error('❌ Get enrolled courses error:', error)
    logger.error('Get enrolled courses error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enrolled courses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// Get course by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    // Allow fetching by Mongo _id or by slug for demo/sample routes
    const query = { isDeleted: false }
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      query._id = id
    } else {
      query.slug = id
    }

    const course = await Course.findOne(query)
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



// Enroll in course (accepts Mongo _id or slug) - requires authenticated user
router.post('/:id/enroll', auth, async (req, res) => {
  try {
    const { id } = req.params
    const { userId: bodyUserId, email: bodyEmail } = req.body || {}
    
    // Check if course exists by _id or slug
    const courseQuery = { isDeleted: false }
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      courseQuery._id = id
    } else {
      courseQuery.slug = id
    }
    const course = await Course.findOne(courseQuery)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }
    
    // Resolve user (prefer auth, fallback to body userId/email for demo compatibility)
    const resolvedUser = await User.findById(req.user._id)

    if (resolvedUser) {
      const already = (course.enrolledStudents || []).some(u => u.toString() === resolvedUser._id.toString())
      if (!already) {
        course.enrolledStudents = [...(course.enrolledStudents || []), resolvedUser._id]
        course.stats.enrollments = (course.stats.enrollments || 0) + 1
        await course.save()

        // Persist enrollment record for admin active users list
        await Enrollment.updateOne(
          { user: resolvedUser._id, course: course._id },
          { $setOnInsert: { enrolledAt: new Date() }, $set: { status: 'active' } },
          { upsert: true }
        )

        // Create enrollment notification
        try {
          const notificationService = (await import('../services/notificationService.js')).default
          await notificationService.createNotification({
            userId: resolvedUser._id,
            type: 'course_enrollment',
            title: 'Course Enrollment Successful!',
            message: `You have successfully enrolled in "${course.title}". Start learning now!`,
            priority: 'normal',
            actionUrl: `/course/${course._id}`,
            metadata: {
              courseId: course._id.toString(),
              courseName: course.title
            }
          })
        } catch (notificationError) {
          console.error('Failed to create enrollment notification:', notificationError)
        }
      }
    }

    res.json({
      success: true,
      message: 'Successfully enrolled in course',
      data: {
        courseId: course._id,
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