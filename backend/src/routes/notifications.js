import express from 'express'
import { body, validationResult, param, query } from 'express-validator'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import Notification from '../models/Notification.js'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many notification requests, please try again later'
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

// @route   GET /api/v1/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', notificationLimiter, [
  query('type').optional().isIn(['system', 'course', 'assignment', 'discussion', 'grade', 'announcement']).withMessage('Invalid type'),
  query('status').optional().isIn(['unread', 'read', 'archived']).withMessage('Invalid status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const { type, status, unreadOnly, page = 1, limit = 20 } = req.query
    const skip = (page - 1) * limit

    const options = {
      type,
      unreadOnly: unreadOnly === 'true',
      limit: parseInt(limit),
      skip
    }

    // Build query - ensure proper ObjectId conversion
    const query = { recipientId: new mongoose.Types.ObjectId(req.user.id) }
    if (type) query.type = type
    if (unreadOnly === 'true') query.readAt = null
    
    console.log('🔍 Notifications query:', query)
    console.log('👤 Current user ID:', req.user.id)
    console.log('👤 Current user ID type:', typeof req.user.id)
    console.log('👤 Current user object:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name
    })
    
    const notifications = await Notification.find(query)
      .populate('senderId', 'name profile.avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
    
    console.log('📨 Found notifications:', notifications.length)
    
    // Debug: Check all notifications in database
    const allNotifications = await Notification.find({}).limit(5)
    console.log('🗃️ Sample notifications in DB:', allNotifications.map(n => ({
      id: n._id,
      recipientId: n.recipientId,
      title: n.title,
      status: n.status,
      createdAt: n.createdAt
    })))
    
    // Also check if any notifications exist for this specific user
    const userNotifications = await Notification.find({ recipientId: new mongoose.Types.ObjectId(req.user.id) })
    console.log('👤 User specific notifications:', userNotifications.length)
    
    // Get total count for pagination
    const countQuery = { recipientId: new mongoose.Types.ObjectId(req.user.id) }
    if (type) countQuery.type = type
    if (status) countQuery.status = status
    
    const total = await Notification.countDocuments(countQuery)

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(req.user.id),
      readAt: null
    })

    res.json({
      success: true,
      data: notifications,
      meta: {
        unreadCount,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    })
  } catch (error) {
    logger.error('Get notifications error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    })
  }
})

// @route   GET /api/v1/notifications/unread-count
// @desc    Get unread notification count
// @access  Private
router.get('/unread-count', notificationLimiter, auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: new mongoose.Types.ObjectId(req.user.id),
      readAt: null
    })

    res.json({
      success: true,
      data: { count }
    })
  } catch (error) {
    logger.error('Get unread count error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unread count'
    })
  }
})

// @route   POST /api/v1/notifications
// @desc    Create notification (Admin/System only)
// @access  Private (Admin only)
router.post('/', notificationLimiter, [
  body('userId').isMongoId().withMessage('Invalid user ID'),
  body('type').isIn(['system', 'course', 'assignment', 'discussion', 'grade', 'announcement']).withMessage('Invalid type'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create notifications'
      })
    }

    const {
      userId,
      type,
      title,
      message,
      priority = 'medium',
      actionUrl,
      metadata
    } = req.body

    const notification = new Notification({
      recipientId: userId,
      senderId: req.user.id,
      type,
      title,
      message,
      priority,
      context: {
        relatedUrl: actionUrl,
        metadata: metadata ? JSON.parse(metadata) : undefined
      }
    })

    await notification.save()

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    })
  } catch (error) {
    logger.error('Create notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create notification'
    })
  }
})

// @route   POST /api/v1/notifications/broadcast
// @desc    Broadcast notification to multiple users
// @access  Private (Admin only)
router.post('/broadcast', notificationLimiter, [
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('type').isIn(['system', 'course', 'assignment', 'discussion', 'grade', 'announcement']).withMessage('Invalid type'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('message').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can broadcast notifications'
      })
    }

    const {
      userIds,
      type,
      title,
      message,
      priority = 'medium',
      actionUrl,
      metadata
    } = req.body

    const notifications = userIds.map(userId => ({
      recipientId: userId,
      senderId: req.user.id,
      type,
      title,
      message,
      priority,
      context: {
        relatedUrl: actionUrl,
        metadata: metadata ? JSON.parse(metadata) : undefined
      }
    }))

    await Notification.insertMany(notifications)

    res.status(201).json({
      success: true,
      message: `Notification broadcast to ${userIds.length} users successfully`,
      data: { count: userIds.length }
    })
  } catch (error) {
    logger.error('Broadcast notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast notification'
    })
  }
})

// @route   PUT /api/v1/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', [
  param('id').isMongoId().withMessage('Invalid notification ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    // Check if notification belongs to user
    if (notification.recipientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      })
    }

    await notification.markAsRead()

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    })
  } catch (error) {
    logger.error('Mark notification as read error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read'
    })
  }
})

// @route   PUT /api/v1/notifications/mark-all-read
// @desc    Mark all notifications as read
// @access  Private
router.put('/mark-all-read', notificationLimiter, auth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: new mongoose.Types.ObjectId(req.user.id), readAt: null },
      { 
        readAt: new Date()
      }
    )

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: { count: result.modifiedCount }
    })
  } catch (error) {
    logger.error('Mark all notifications as read error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark notifications as read'
    })
  }
})

// @route   PUT /api/v1/notifications/:id/archive
// @desc    Archive notification
// @access  Private
router.put('/:id/archive', [
  param('id').isMongoId().withMessage('Invalid notification ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    // Check if notification belongs to user
    if (notification.recipientId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      })
    }

    await notification.dismiss()

    res.json({
      success: true,
      message: 'Notification archived',
      data: notification
    })
  } catch (error) {
    logger.error('Archive notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to archive notification'
    })
  }
})

// @route   DELETE /api/v1/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid notification ID')
], handleValidationErrors, auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id)

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      })
    }

    // Check if notification belongs to user or user is admin
    const isOwner = notification.recipientId.toString() === req.user.id.toString()
    const isAdmin = req.user.role === 'admin'
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      })
    }

    await Notification.findByIdAndDelete(req.params.id)

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    })
  } catch (error) {
    logger.error('Delete notification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification'
    })
  }
})

// @route   GET /api/v1/notifications/preferences
// @desc    Get user notification preferences
// @access  Private
router.get('/preferences', notificationLimiter, auth, async (req, res) => {
  try {
    // For now, return default preferences - this would typically come from User model
    const preferences = {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      types: {
        course_enrollment: true,
        course_completion: true,
        assignment_created: true,
        assignment_graded: true,
        announcement: true,
        system_maintenance: true
      }
    }

    res.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    logger.error('Get notification preferences error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification preferences'
    })
  }
})

// @route   PUT /api/v1/notifications/preferences
// @desc    Update user notification preferences
// @access  Private
router.put('/preferences', notificationLimiter, [
  body('emailNotifications').optional().isBoolean().withMessage('Email notifications must be boolean'),
  body('pushNotifications').optional().isBoolean().withMessage('Push notifications must be boolean'),
  body('smsNotifications').optional().isBoolean().withMessage('SMS notifications must be boolean'),
  body('types').optional().isObject().withMessage('Types must be an object')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // For now, just return the updated preferences - this would typically update User model
    const preferences = {
      emailNotifications: req.body.emailNotifications ?? true,
      pushNotifications: req.body.pushNotifications ?? true,
      smsNotifications: req.body.smsNotifications ?? false,
      types: req.body.types || {}
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: preferences
    })
  } catch (error) {
    logger.error('Update notification preferences error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences'
    })
  }
})

// @route   GET /api/v1/notifications/analytics
// @desc    Get notification analytics (Admin only)
// @access  Private (Admin only)
router.get('/analytics', notificationLimiter, [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('type').optional().isIn(['system', 'course', 'assignment', 'discussion', 'grade', 'announcement']).withMessage('Invalid type')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view notification analytics'
      })
    }

    const { startDate, endDate, type } = req.query
    const analytics = await Notification.getAnalytics({
      dateRange: startDate && endDate ? {
        start: startDate,
        end: endDate
      } : undefined,
      type
    })

    res.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    logger.error('Get notification analytics error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification analytics'
    })
  }
})



export default router