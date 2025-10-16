import express from 'express'
import mongoose from 'mongoose'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Assignment from '../models/Assignment.js'
import Enrollment from '../models/Enrollment.js'
import AssignmentSubmission from '../models/AssignmentSubmission.js'
import Discussion from '../models/Discussion.js'
import Notification from '../models/Notification.js'
import { authenticate } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Log all admin route requests
router.use((req, res, next) => {
  console.log(`🔍 Admin route accessed: ${req.method} ${req.path}`)
  console.log(`🔍 Headers:`, req.headers.authorization ? 'Auth header present' : 'No auth header')
  next()
})

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

// Apply auth and admin middleware to all routes
router.use(authenticate)
router.use(requireAdmin)

// Publish Course
router.post('/courses/:id/publish', async (req, res) => {
  try {
    const { id } = req.params
    
    const course = await Course.findById(id)
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      })
    }

    // Update course status to published
    course.settings.isPublished = true
    course.settings.isDraft = false
    await course.save()

    logger.info(`Course published: ${course.title} by admin ${req.user.name}`)

    res.json({
      success: true,
      message: 'Course published successfully',
      course: {
        id: course._id,
        title: course.title,
        status: 'published',
        isPublished: course.settings.isPublished
      }
    })

  } catch (error) {
    logger.error('Error publishing course:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to publish course' 
    })
  }
})

// Get all courses for admin (including drafts)
router.get('/courses', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      level, 
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query

    // Build query for admin - show all courses including drafts
    const query = { isDeleted: false }
    
    if (category && category !== 'all') {
      query.category = category
    }
    
    if (level && level !== 'all') {
      query.level = level
    }
    
    if (status && status !== 'all') {
      query.status = status
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
      .populate('instructor', 'name email profile.avatar')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count for pagination
    const total = await Course.countDocuments(query)
    
    console.log('🔍 Admin courses query:', query)
    console.log('📊 Found courses:', courses.length)
    console.log('📈 Total courses in DB:', total)
    console.log('📋 Sample course:', courses[0])
    
    
    res.json({
      success: true,
      courses: courses.map(course => ({
        _id: course._id,
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        status: course.settings?.isPublished ? 'published' : 'draft',
        instructor: course.instructor,
        enrolledStudents: course.enrolledStudents || [],
        rating: course.stats?.rating || 0,
        price: course.pricing?.price || 0,
        thumbnail: course.media?.thumbnail,
        createdAt: course.createdAt,
        isPublished: course.settings?.isPublished || false
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalCourses: total,
        hasNext: skip + parseInt(limit) < total,
        hasPrev: parseInt(page) > 1
      }
    })

  } catch (error) {
    logger.error('Error fetching admin courses:', error)
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch courses' 
    })
  }
})

// Get single course for admin
router.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).lean()
    if (!course) {
      return res.status(404).json({ message: 'Course not found' })
    }
    res.json({ success: true, course })
  } catch (error) {
    logger.error('Error fetching course:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update course (basic fields + media + curriculum)
router.put('/courses/:id', async (req, res) => {
  try {
    const { title, description, category, level, settings, media, curriculum } = req.body || {}
    const update = {}
    if (title !== undefined) update.title = title
    if (description !== undefined) update.description = description
    if (category !== undefined) update.category = category
    if (level !== undefined) update.level = level
    if (Array.isArray(curriculum)) update.curriculum = curriculum
    if (media && typeof media === 'object') {
      for (const key of Object.keys(media)) {
        update[`media.${key}`] = media[key]
      }
    }
    if (settings && typeof settings === 'object') {
      for (const key of Object.keys(settings)) {
        update[`settings.${key}`] = settings[key]
      }
    }

    const course = await Course.findByIdAndUpdate(req.params.id, update, { new: true })
    if (!course) {
      return res.status(404).json({ message: 'Course not found' })
    }
    res.json({ success: true, course })
  } catch (error) {
    logger.error('Error updating course:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete course (soft delete)
router.delete('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true }
    )
    if (!course) {
      return res.status(404).json({ message: 'Course not found' })
    }
    res.json({ success: true, message: 'Course deleted' })
  } catch (error) {
    logger.error('Error deleting course:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Debug endpoint to check all courses in database
router.get('/debug/courses', async (req, res) => {
  try {
    console.log('🐛 Debug endpoint called')
    const allCourses = await Course.find({}).lean()
    console.log('📊 Total courses found:', allCourses.length)
    console.log('📋 All courses:', allCourses.map(c => ({ id: c._id, title: c.title, category: c.category })))
    
    res.json({
      success: true,
      totalCourses: allCourses.length,
      courses: allCourses.map(course => ({
        id: course._id,
        title: course.title,
        category: course.category,
        level: course.level,
        isPublished: course.settings?.isPublished,
        isDraft: course.settings?.isDraft,
        createdAt: course.createdAt
      }))
    })
  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})

// Dashboard Statistics
router.get('/stats', async (req, res) => {
  try {
    // Active users from Enrollment collection (count unique users)
    const activeUsersResult = await Enrollment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$user' } },
      { $count: 'uniqueUsers' }
    ])
    const activeUsersCount = activeUsersResult.length > 0 ? activeUsersResult[0].uniqueUsers : 0

    // Compute total users, courses and pending assignments
    const [totalUsers, totalCourses, pendingAssignments] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      Course.countDocuments({ isDeleted: false }),
      Assignment.countDocuments({ status: 'pending' })
    ])

    res.json({
      totalUsers,
      activeUsers: activeUsersCount,
      totalCourses,
      pendingAssignments,
      totalRevenue: 0
    })
  } catch (error) {
    logger.error('Error fetching admin stats:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// List users enrolled in any course
// Active users == users enrolled in at least one course
router.get('/stats/active-users', async (req, res) => {
  try {
    // Prefer Enrollment collection for accurate active users
    let userIds = []
    try {
      userIds = await Enrollment.distinct('user', { status: 'active' })
    } catch (e) {
      logger.warn('Enrollment lookup failed, falling back to Course aggregation:', e?.message)
      const agg = await Course.aggregate([
        { $project: { enrolledStudents: 1 } },
        { $unwind: { path: '$enrolledStudents', preserveNullAndEmptyArrays: false } },
        { $match: { $expr: { $eq: [ { $type: '$enrolledStudents' }, 'objectId' ] } } },
        { $group: { _id: null, ids: { $addToSet: '$enrolledStudents' } } }
      ])
      userIds = agg.length ? agg[0].ids : []
    }

    if (userIds.length === 0) {
      return res.json({ users: [] })
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('name email role createdAt')
      .sort({ name: 1 })

    res.json({ users })
  } catch (error) {
    logger.error('Error fetching active users:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get courses a specific user is enrolled in
router.get('/enrollments/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    // Find courses where the userId is present in enrolledStudents
    const courses = await Course.find({ enrolledStudents: userId })
      .select('title category level media.thumbnail createdAt')
      .sort({ createdAt: -1 })

    res.json({
      userId,
      courses
    })
  } catch (error) {
    logger.error('Error fetching user enrollments:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Maintenance: reset all enrollments and zero counters
router.post('/maintenance/reset-enrollments', async (req, res) => {
  try {
    const result = await Course.updateMany({}, {
      $set: {
        enrolledStudents: [],
        'stats.enrollments': 0,
        'stats.completions': 0
      }
    })
    res.json({ success: true, modified: result.modifiedCount })
  } catch (error) {
    logger.error('Error resetting enrollments:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Maintenance: seed a set of sample courses (id/slug titles match frontend demo)
router.post('/maintenance/seed-sample-courses', async (req, res) => {
  try {
    const samples = req.body?.courses || [
      { slug: 'sample-js', title: 'Complete JavaScript Mastery', category: 'programming', level: 'beginner', thumbnail: 'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400' },
      { slug: 'sample-python-ds', title: 'Python for Data Science', category: 'data-science', level: 'intermediate', thumbnail: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400' },
      { slug: 'sample-react', title: 'React.js Complete Guide', category: 'programming', level: 'intermediate', thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400' },
      { slug: 'sample-design-ui', title: 'UI/UX Design Fundamentals', category: 'design', level: 'beginner', thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400' },
      { slug: 'sample-business', title: 'Entrepreneurship Essentials', category: 'business', level: 'beginner', thumbnail: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=400' },
      { slug: 'sample-marketing', title: 'Digital Marketing Fundamentals', category: 'marketing', level: 'beginner', thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400' },
      { slug: 'sample-photo', title: 'Photography Basics', category: 'other', level: 'beginner', thumbnail: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400' },
      { slug: 'sample-music', title: 'Music Production in DAW', category: 'music', level: 'intermediate', thumbnail: 'https://images.unsplash.com/photo-1511974035430-5de47d3b95da?w=400' }
    ]

    // pick an instructor
    const instructor = await User.findOne({ role: { $in: ['instructor', 'admin'] } })
    if (!instructor) {
      return res.status(400).json({ message: 'No instructor/admin user found to assign courses' })
    }

    let upserts = 0
    for (const c of samples) {
      await Course.updateOne(
        { slug: c.slug },
        {
          $set: {
            title: c.title,
            description: `${c.title} - autogenerated sample course`,
            instructor: instructor._id,
            category: c.category || 'other',
            level: c.level || 'beginner',
            pricing: { type: 'free', price: 0 },
            media: { thumbnail: c.thumbnail },
            enrolledStudents: [],
            'settings.isPublished': true,
            isDeleted: false
          }
        },
        { upsert: true }
      )
      upserts += 1
    }

    res.json({ success: true, upserts })
  } catch (error) {
    logger.error('Error seeding sample courses:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// User Management
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status } = req.query
    const query = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (role && role !== 'all') {
      query.role = role
    }
    
    if (status && status !== 'all') {
      query.isActive = status === 'active'
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await User.countDocuments(query)

    // Format users for notification selector
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=ffffff`
    }))

    res.json({
      users: formattedUsers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    logger.error('Error fetching users:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json(user)
  } catch (error) {
    logger.error('Error fetching user:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    logger.info(`Admin ${req.user.id} changed role of user ${user.id} to ${role}`)
    res.json(user)
  } catch (error) {
    logger.error('Error updating user role:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/users/:id/status', async (req, res) => {
  try {
    const { isActive } = req.body
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    logger.info(`Admin ${req.user.id} ${isActive ? 'activated' : 'deactivated'} user ${user.id}`)
    res.json(user)
  } catch (error) {
    logger.error('Error updating user status:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    )
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    logger.info(`Admin ${req.user.id} deleted user ${user.id}`)
    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    logger.error('Error deleting user:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Course Management
router.get('/courses', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, category, status } = req.query
    const query = {}
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }
    
    if (category && category !== 'all') {
      query.category = category
    }
    
    if (status && status !== 'all') {
      query.status = status
    }

    const courses = await Course.find(query)
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Course.countDocuments(query)

    res.json({
      courses,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    logger.error('Error fetching courses:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/courses/:id/approve', async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status: 'published', approvedBy: req.user.id, approvedAt: new Date() },
      { new: true }
    ).populate('instructor', 'name email')
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' })
    }
    
    logger.info(`Admin ${req.user.id} approved course ${course.id}`)
    res.json(course)
  } catch (error) {
    logger.error('Error approving course:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/courses/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'rejected', 
        rejectionReason: reason,
        rejectedBy: req.user.id, 
        rejectedAt: new Date() 
      },
      { new: true }
    ).populate('instructor', 'name email')
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found' })
    }
    
    logger.info(`Admin ${req.user.id} rejected course ${course.id}`)
    res.json(course)
  } catch (error) {
    logger.error('Error rejecting course:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Assignment Management
router.get('/assignments', async (req, res) => {
  try {
    const { page = 1, limit = 10, course, status } = req.query
    const query = {}
    
    if (course) {
      query.course = course
    }
    
    if (status && status !== 'all') {
      query.status = status
    }

    const assignments = await Assignment.find(query)
      .populate('course', 'title')
      .populate('instructor', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Assignment.countDocuments(query)

    res.json({
      assignments,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    logger.error('Error fetching assignments:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Analytics
router.get('/analytics/users', async (req, res) => {
  try {
    const { period = '30d' } = req.query
    const days = parseInt(period.replace('d', ''))
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
    
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ])

    res.json({
      userGrowth,
      roleDistribution
    })
  } catch (error) {
    logger.error('Error fetching user analytics:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/analytics/courses', async (req, res) => {
  try {
    const courseStats = await Course.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" }
        }
      }
    ])
    
    const enrollmentTrends = await Course.aggregate([
      {
        $project: {
          title: 1,
          enrollmentCount: { $size: "$enrolledStudents" },
          createdAt: 1
        }
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 10 }
    ])

    res.json({
      courseStats,
      enrollmentTrends
    })
  } catch (error) {
    logger.error('Error fetching course analytics:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// System Health
router.get('/system/health', async (req, res) => {
  try {
    const dbStatus = await User.db.db.admin().ping()
    
    res.json({
      status: 'healthy',
      database: dbStatus ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    })
  } catch (error) {
    logger.error('Error checking system health:', error)
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date()
    })
  }
})





// Audit Logs
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 50, level, module } = req.query
    
    // This would typically fetch from a logging service or database
    // For now, return mock data
    const logs = [
      {
        id: '1',
        timestamp: new Date(),
        level: 'info',
        module: 'auth',
        message: 'User login successful',
        userId: req.user.id,
        ip: req.ip
      }
    ]
    
    res.json({
      logs,
      totalPages: 1,
      currentPage: page,
      total: logs.length
    })
  } catch (error) {
    logger.error('Error fetching logs:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Notification Management Endpoints

// @route   GET /api/v1/admin/notifications
// @desc    Get all notifications for admin management
// @access  Private (Admin)
router.get('/notifications', authenticate, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query
    const skip = (page - 1) * limit
    
    const query = {}
    if (type) query.type = type
    if (status) query.status = status
    
    const notifications = await Notification.find(query)
      .populate('recipientId', 'name email')
      .populate('senderId', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
    
    const total = await Notification.countDocuments(query)
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    })
  } catch (error) {
    logger.error('Admin get notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    })
  }
})

// Test endpoint without auth
router.post('/test-notifications', async (req, res) => {
  console.log('🧪 TEST endpoint reached!')
  res.json({ success: true, message: 'Test endpoint working' })
})

// Test users endpoint
router.get('/test-users', async (req, res) => {
  try {
    console.log('🧪 TEST users endpoint reached!')
    const allUsers = await User.find({})
    console.log('🧪 Found users:', allUsers.length)
    res.json({ success: true, count: allUsers.length, users: allUsers.slice(0, 2) })
  } catch (error) {
    console.error('🧪 Test users error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
})



// @route   POST /api/v1/admin/notifications
// @desc    Create a new notification (broadcast)
// @access  Private (Admin)
router.post('/notifications', authenticate, requireAdmin, async (req, res) => {
  console.log('🚀 Admin notification endpoint reached!')
  console.log('📨 Request body:', req.body)
  console.log('👤 User:', req.user)
  
  try {
    const {
      title,
      message,
      type = 'announcement',
      priority = 'normal',
      recipients = 'all', // 'all', 'students', 'instructors', or array of user IDs
      actionUrl,
      scheduledFor
    } = req.body
    
    console.log('📋 Extracted data:', { title, message, type, priority, recipients })
    
    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      })
    }
    
    let recipientIds = []
    
    // Determine recipients
    console.log('🔍 Recipients parameter:', recipients)
    
    if (recipients === 'all') {
      const users = await User.find({ isDeleted: false }, '_id')
      recipientIds = users.map(u => u._id)
      console.log('👥 Found users for "all":', recipientIds.length)
    } else if (recipients === 'students') {
      const users = await User.find({ role: 'student', isDeleted: false }, '_id')
      recipientIds = users.map(u => u._id)
      console.log('🎓 Found students:', recipientIds.length)
    } else if (recipients === 'instructors') {
      const users = await User.find({ role: 'instructor', isDeleted: false }, '_id')
      recipientIds = users.map(u => u._id)
      console.log('👨‍🏫 Found instructors:', recipientIds.length)
    } else if (recipients === 'admins') {
      const users = await User.find({ role: 'admin', isDeleted: false }, '_id')
      recipientIds = users.map(u => u._id)
      console.log('👑 Found admins:', recipientIds.length)
    } else if (Array.isArray(recipients)) {
      recipientIds = recipients
      console.log('📋 Using provided recipient IDs:', recipientIds.length)
    }
    
    console.log('📨 Final recipient IDs:', recipientIds)
    
    // Create notifications for all recipients
    const notifications = []
    const notificationService = (await import('../services/notificationService.js')).default
    
    console.log('🚀 Creating notifications for', recipientIds.length, 'recipients')
    
    // Create notifications for all recipients
    if (recipientIds.length > 0) {
      try {
        console.log('🧪 Creating notifications for all recipients...')
        
        const notificationsToCreate = recipientIds.map(recipientId => ({
          recipientId,
          type,
          title,
          message,
          priority,
          status: 'sent' // Set as sent immediately
        }))
        
        const createdNotifications = await Notification.insertMany(notificationsToCreate)
        console.log('✅ Created', createdNotifications.length, 'notifications successfully!')
        
        res.status(201).json({
          success: true,
          message: `Created ${createdNotifications.length} notifications successfully`,
          data: {
            count: createdNotifications.length,
            sample: createdNotifications[0]
          }
        })
        return
      } catch (directError) {
        console.error('❌ Notification creation failed:', directError)
      }
    }
    
    for (const recipientId of recipientIds) {
      try {
        console.log('📝 Creating notification for user:', recipientId)
        const notification = await notificationService.createNotification({
          userId: recipientId,
          type,
          title,
          message,
          priority,
          actionUrl,
          scheduleAt: scheduledFor ? new Date(scheduledFor) : undefined,
          metadata: {
            createdBy: req.user.id,
            broadcast: true
          }
        })
        notifications.push(notification)
        console.log('✅ Notification created successfully for user:', recipientId)
      } catch (error) {
        console.error(`❌ Failed to create notification for user ${recipientId}:`, error.message)
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Created ${notifications.length} notifications`,
      data: notifications[0] // Return first notification as sample
    })
  } catch (error) {
    console.error('❌ Admin create notification error:', error)
    logger.error('Admin create notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
})

// @route   DELETE /api/v1/admin/notifications/:id
// @desc    Delete a notification
// @access  Private (Admin)
router.delete('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const notification = await Notification.findByIdAndDelete(id)
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }
    
    res.json({
      success: true,
      message: 'Notification deleted successfully'
    })
  } catch (error) {
    logger.error('Admin delete notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    })
  }
})

// @route   GET /api/v1/admin/notifications/stats
// @desc    Get notification statistics
// @access  Private (Admin)
router.get('/notifications/stats', async (req, res) => {
  try {
    const [
      totalNotifications,
      unreadNotifications,
      notificationsByType,
      recentActivity
    ] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ readAt: null }),
      Notification.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]),
      Notification.find()
        .populate('recipientId', 'name email')
        .sort({ createdAt: -1 })
        .limit(10)
    ])
    
    res.json({
      success: true,
      data: {
        totalNotifications,
        unreadNotifications,
        notificationsByType,
        recentActivity
      }
    })
  } catch (error) {
    logger.error('Admin notification stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    })
  }
})

export default router