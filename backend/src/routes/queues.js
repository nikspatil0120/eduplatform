import express from 'express'
import { param, query, body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import queueService from '../services/queueService.js'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Rate limiting for queue management
const queueLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many queue management requests, please try again later'
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

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    })
  }
  next()
}

// @route   GET /api/v1/queues/status
// @desc    Get queue service status
// @access  Private (Admin only)
router.get('/status', queueLimiter, auth, requireAdmin, async (req, res) => {
  try {
    const status = queueService.getStatus()
    
    res.json({
      success: true,
      data: status
    })
  } catch (error) {
    logger.error('Get queue status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get queue status'
    })
  }
})

// @route   GET /api/v1/queues/stats
// @desc    Get statistics for all queues
// @access  Private (Admin only)
router.get('/stats', queueLimiter, auth, requireAdmin, async (req, res) => {
  try {
    const stats = await queueService.getAllQueueStats()
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Get queue stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics'
    })
  }
})

// @route   GET /api/v1/queues/:queueName/stats
// @desc    Get statistics for a specific queue
// @access  Private (Admin only)
router.get('/:queueName/stats', queueLimiter, [
  param('queueName').isAlpha().withMessage('Invalid queue name')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { queueName } = req.params
    const stats = await queueService.getQueueStats(queueName)
    
    res.json({
      success: true,
      data: {
        queue: queueName,
        stats
      }
    })
  } catch (error) {
    logger.error(`Get queue stats error for ${req.params.queueName}:`, error)
    res.status(500).json({
      success: false,
      message: `Failed to get statistics for queue: ${req.params.queueName}`
    })
  }
})

// @route   POST /api/v1/queues/:queueName/pause
// @desc    Pause a queue
// @access  Private (Admin only)
router.post('/:queueName/pause', queueLimiter, [
  param('queueName').isAlpha().withMessage('Invalid queue name')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { queueName } = req.params
    await queueService.pauseQueue(queueName)
    
    res.json({
      success: true,
      message: `Queue ${queueName} paused successfully`
    })
  } catch (error) {
    logger.error(`Pause queue error for ${req.params.queueName}:`, error)
    res.status(500).json({
      success: false,
      message: `Failed to pause queue: ${req.params.queueName}`
    })
  }
})

// @route   POST /api/v1/queues/:queueName/resume
// @desc    Resume a queue
// @access  Private (Admin only)
router.post('/:queueName/resume', queueLimiter, [
  param('queueName').isAlpha().withMessage('Invalid queue name')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { queueName } = req.params
    await queueService.resumeQueue(queueName)
    
    res.json({
      success: true,
      message: `Queue ${queueName} resumed successfully`
    })
  } catch (error) {
    logger.error(`Resume queue error for ${req.params.queueName}:`, error)
    res.status(500).json({
      success: false,
      message: `Failed to resume queue: ${req.params.queueName}`
    })
  }
})

// @route   POST /api/v1/queues/:queueName/clean
// @desc    Clean completed and failed jobs from a queue
// @access  Private (Admin only)
router.post('/:queueName/clean', queueLimiter, [
  param('queueName').isAlpha().withMessage('Invalid queue name'),
  body('grace').optional().isInt({ min: 0 }).withMessage('Grace period must be a positive integer')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { queueName } = req.params
    const { grace = 5000 } = req.body
    
    await queueService.cleanQueue(queueName, grace)
    
    res.json({
      success: true,
      message: `Queue ${queueName} cleaned successfully`
    })
  } catch (error) {
    logger.error(`Clean queue error for ${req.params.queueName}:`, error)
    res.status(500).json({
      success: false,
      message: `Failed to clean queue: ${req.params.queueName}`
    })
  }
})

// @route   GET /api/v1/queues/:queueName/jobs/:jobId
// @desc    Get job details
// @access  Private (Admin only)
router.get('/:queueName/jobs/:jobId', queueLimiter, [
  param('queueName').isAlpha().withMessage('Invalid queue name'),
  param('jobId').isNumeric().withMessage('Invalid job ID')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { queueName, jobId } = req.params
    const job = await queueService.getJob(queueName, jobId)
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      })
    }
    
    res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        delay: job.delay,
        timestamp: job.timestamp,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        returnvalue: job.returnvalue,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn
      }
    })
  } catch (error) {
    logger.error(`Get job error for ${req.params.queueName}/${req.params.jobId}:`, error)
    res.status(500).json({
      success: false,
      message: 'Failed to get job details'
    })
  }
})

// @route   DELETE /api/v1/queues/:queueName/jobs/:jobId
// @desc    Remove a job from queue
// @access  Private (Admin only)
router.delete('/:queueName/jobs/:jobId', queueLimiter, [
  param('queueName').isAlpha().withMessage('Invalid queue name'),
  param('jobId').isNumeric().withMessage('Invalid job ID')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { queueName, jobId } = req.params
    await queueService.removeJob(queueName, jobId)
    
    res.json({
      success: true,
      message: `Job ${jobId} removed from queue ${queueName}`
    })
  } catch (error) {
    logger.error(`Remove job error for ${req.params.queueName}/${req.params.jobId}:`, error)
    res.status(500).json({
      success: false,
      message: 'Failed to remove job'
    })
  }
})

// @route   POST /api/v1/queues/email/send
// @desc    Add email job to queue
// @access  Private (Admin only)
router.post('/email/send', queueLimiter, [
  body('to').isEmail().withMessage('Valid email address required'),
  body('subject').isLength({ min: 1, max: 200 }).withMessage('Subject must be between 1 and 200 characters'),
  body('template').isLength({ min: 1 }).withMessage('Template is required'),
  body('data').optional().isObject().withMessage('Data must be an object'),
  body('priority').optional().isInt({ min: 0, max: 10 }).withMessage('Priority must be between 0 and 10')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { to, subject, template, data, priority = 0 } = req.body
    
    const job = await queueService.sendEmail({
      to,
      subject,
      template,
      data
    }, { priority })
    
    res.status(201).json({
      success: true,
      message: 'Email job added to queue',
      data: {
        jobId: job.id,
        queue: 'email'
      }
    })
  } catch (error) {
    logger.error('Add email job error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to add email job to queue'
    })
  }
})

// @route   POST /api/v1/queues/notification/send
// @desc    Add notification job to queue
// @access  Private (Admin only)
router.post('/notification/send', queueLimiter, [
  body('userId').isMongoId().withMessage('Valid user ID required'),
  body('type').isIn(['system', 'course', 'assignment', 'discussion', 'grade', 'announcement']).withMessage('Invalid notification type'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  body('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      type,
      title,
      message,
      priority = 'medium',
      actionUrl,
      metadata,
      channels = ['in_app']
    } = req.body
    
    const job = await queueService.sendNotification({
      userId,
      type,
      title,
      message,
      priority,
      actionUrl,
      metadata,
      channels
    })
    
    res.status(201).json({
      success: true,
      message: 'Notification job added to queue',
      data: {
        jobId: job.id,
        queue: 'notification'
      }
    })
  } catch (error) {
    logger.error('Add notification job error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to add notification job to queue'
    })
  }
})

// @route   POST /api/v1/queues/analytics/generate
// @desc    Add analytics generation job to queue
// @access  Private (Admin only)
router.post('/analytics/generate', queueLimiter, [
  body('type').isIn(['user-analytics', 'course-analytics', 'system-analytics', 'revenue-analytics']).withMessage('Invalid analytics type'),
  body('dateRange').optional().isObject().withMessage('Date range must be an object'),
  body('filters').optional().isObject().withMessage('Filters must be an object')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { type, dateRange, filters, userId } = req.body
    
    const job = await queueService.generateAnalytics({
      type,
      dateRange,
      filters,
      userId
    })
    
    res.status(201).json({
      success: true,
      message: 'Analytics generation job added to queue',
      data: {
        jobId: job.id,
        queue: 'analytics'
      }
    })
  } catch (error) {
    logger.error('Add analytics job error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to add analytics job to queue'
    })
  }
})

// @route   POST /api/v1/queues/cleanup/schedule
// @desc    Schedule cleanup job
// @access  Private (Admin only)
router.post('/cleanup/schedule', queueLimiter, [
  body('type').isIn(['old-files', 'expired-sessions', 'old-logs', 'temp-files']).withMessage('Invalid cleanup type'),
  body('options').optional().isObject().withMessage('Options must be an object'),
  body('delay').optional().isInt({ min: 0 }).withMessage('Delay must be a positive integer')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { type, options = {}, delay = 0 } = req.body
    
    const job = await queueService.scheduleCleanup({
      type,
      options
    }, { delay })
    
    res.status(201).json({
      success: true,
      message: 'Cleanup job scheduled',
      data: {
        jobId: job.id,
        queue: 'cleanup',
        delay
      }
    })
  } catch (error) {
    logger.error('Schedule cleanup job error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to schedule cleanup job'
    })
  }
})

// @route   POST /api/v1/queues/backup/schedule
// @desc    Schedule backup job
// @access  Private (Admin only)
router.post('/backup/schedule', queueLimiter, [
  body('type').isIn(['database', 'files', 'full']).withMessage('Invalid backup type'),
  body('destination').isLength({ min: 1 }).withMessage('Destination is required'),
  body('options').optional().isObject().withMessage('Options must be an object'),
  body('delay').optional().isInt({ min: 0 }).withMessage('Delay must be a positive integer')
], handleValidationErrors, auth, requireAdmin, async (req, res) => {
  try {
    const { type, destination, options = {}, delay = 0 } = req.body
    
    const job = await queueService.scheduleBackup({
      type,
      destination,
      options
    }, { delay })
    
    res.status(201).json({
      success: true,
      message: 'Backup job scheduled',
      data: {
        jobId: job.id,
        queue: 'backup',
        delay
      }
    })
  } catch (error) {
    logger.error('Schedule backup job error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to schedule backup job'
    })
  }
})

// @route   GET /api/v1/queues/health
// @desc    Get queue service health status
// @access  Private (Admin only)
router.get('/health', queueLimiter, auth, requireAdmin, async (req, res) => {
  try {
    const isHealthy = queueService.isHealthy()
    const status = queueService.getStatus()
    
    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      healthy: isHealthy,
      status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Queue health check error:', error)
    res.status(503).json({
      success: false,
      healthy: false,
      message: 'Queue service health check failed'
    })
  }
})

export default router