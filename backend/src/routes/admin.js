import express from 'express'
import User from '../models/User.js'
import Course from '../models/Course.js'
import Assignment from '../models/Assignment.js'
import AssignmentSubmission from '../models/AssignmentSubmission.js'
import Discussion from '../models/Discussion.js'
import Notification from '../models/Notification.js'
import { authenticate } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

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

// Dashboard Statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalCourses,
      pendingAssignments,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Course.countDocuments(),
      AssignmentSubmission.countDocuments({ status: 'pending' }),
      // Mock revenue calculation - replace with actual payment data
      Promise.resolve(89432)
    ])

    res.json({
      totalUsers,
      activeUsers,
      totalCourses,
      pendingAssignments,
      totalRevenue
    })
  } catch (error) {
    logger.error('Error fetching admin stats:', error)
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

    res.json({
      users,
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

// Notifications Management
router.post('/notifications', async (req, res) => {
  try {
    const { title, message, type, recipients } = req.body
    
    const notification = new Notification({
      title,
      message,
      type,
      recipients,
      sender: req.user.id,
      createdAt: new Date()
    })
    
    await notification.save()
    
    logger.info(`Admin ${req.user.id} created notification: ${title}`)
    res.status(201).json(notification)
  } catch (error) {
    logger.error('Error creating notification:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/notifications', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query
    
    const notifications = await Notification.find()
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const total = await Notification.countDocuments()

    res.json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    })
  } catch (error) {
    logger.error('Error fetching notifications:', error)
    res.status(500).json({ message: 'Server error' })
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

export default router