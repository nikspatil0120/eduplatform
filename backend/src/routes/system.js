import express from 'express'
import { query, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import { authenticate as auth } from '../middleware/auth.js'
import realtimeService from '../services/realtimeService.js'
import schedulerService from '../services/schedulerService.js'
import { logger } from '../utils/logger.js'
import mongoose from 'mongoose'
import os from 'os'

const router = express.Router()

// Rate limiting for system endpoints
const systemLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many system requests, please try again later'
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

// @route   GET /api/v1/system/health
// @desc    Get system health status
// @access  Public
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {}
    }

    // Check database connection (simplified)
    try {
      if (mongoose.connection.readyState === 1) {
        health.services.database = {
          status: 'healthy',
          type: 'MongoDB',
          connected: true
        }
      } else {
        health.services.database = {
          status: 'unhealthy',
          type: 'MongoDB',
          connected: false
        }
        health.status = 'degraded'
      }
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        type: 'MongoDB',
        connected: false,
        error: error.message
      }
      health.status = 'degraded'
    }

    // Basic system info
    health.system = {
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      platform: {
        type: os.type(),
        arch: os.arch(),
        nodeVersion: process.version
      }
    }

    const statusCode = health.status === 'healthy' ? 200 : 503
    res.status(statusCode).json(health)
  } catch (error) {
    logger.error('Health check error:', error)
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    })
  }
})

// @route   GET /api/v1/system/stats
// @desc    Get detailed system statistics
// @access  Private (Admin only)
router.get('/stats', systemLimiter, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view system statistics'
      })
    }

    const stats = {
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: process.uptime(),
        formatted: formatUptime(process.uptime())
      },
      database: {},
      realtime: {},
      scheduler: {},
      system: {},
      collections: {}
    }

    // Database statistics
    try {
      const dbStats = await mongoose.connection.db.stats()
      stats.database = {
        collections: dbStats.collections,
        dataSize: Math.round(dbStats.dataSize / 1024 / 1024), // MB
        storageSize: Math.round(dbStats.storageSize / 1024 / 1024), // MB
        indexes: dbStats.indexes,
        indexSize: Math.round(dbStats.indexSize / 1024 / 1024), // MB
        objects: dbStats.objects
      }

      // Collection statistics
      const collections = ['users', 'courses', 'assignments', 'discussions', 'notifications', 'certificates']
      for (const collectionName of collections) {
        try {
          const count = await mongoose.connection.db.collection(collectionName).countDocuments()
          stats.collections[collectionName] = count
        } catch (error) {
          stats.collections[collectionName] = 0
        }
      }
    } catch (error) {
      stats.database.error = error.message
    }

    // Real-time service statistics
    try {
      stats.realtime = realtimeService.getConnectionStats()
    } catch (error) {
      stats.realtime.error = error.message
    }

    // Scheduler statistics
    try {
      stats.scheduler = schedulerService.getTaskStatus()
    } catch (error) {
      stats.scheduler.error = error.message
    }

    // System statistics
    stats.system = {
      memory: {
        process: {
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024),
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
        },
        system: {
          total: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
          free: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
          used: Math.round((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024) // GB
        }
      },
      cpu: {
        count: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        loadAverage: os.loadavg(),
        usage: process.cpuUsage()
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        hostname: os.hostname(),
        nodeVersion: process.version,
        pid: process.pid
      },
      network: os.networkInterfaces()
    }

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('System stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics'
    })
  }
})

// @route   GET /api/v1/system/logs
// @desc    Get system logs
// @access  Private (Admin only)
router.get('/logs', systemLimiter, [
  query('level').optional().isIn(['error', 'warn', 'info', 'debug']).withMessage('Invalid log level'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view system logs'
      })
    }

    const { level, limit = 100, startDate, endDate } = req.query

    // This is a placeholder implementation
    // In a real system, you would read from your log files or log aggregation service
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System logs endpoint accessed',
        metadata: {
          userId: req.user.id,
          ip: req.ip
        }
      }
    ]

    res.json({
      success: true,
      data: {
        logs,
        filters: {
          level,
          limit: parseInt(limit),
          startDate,
          endDate
        },
        total: logs.length
      }
    })
  } catch (error) {
    logger.error('System logs error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system logs'
    })
  }
})

// @route   POST /api/v1/system/scheduler/restart/:taskName
// @desc    Restart a scheduled task
// @access  Private (Admin only)
router.post('/scheduler/restart/:taskName', systemLimiter, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage scheduled tasks'
      })
    }

    const { taskName } = req.params
    schedulerService.restartTask(taskName)

    res.json({
      success: true,
      message: `Task ${taskName} restarted successfully`
    })
  } catch (error) {
    logger.error('Restart task error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to restart task'
    })
  }
})

// @route   POST /api/v1/system/scheduler/stop/:taskName
// @desc    Stop a scheduled task
// @access  Private (Admin only)
router.post('/scheduler/stop/:taskName', systemLimiter, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage scheduled tasks'
      })
    }

    const { taskName } = req.params
    schedulerService.stopTask(taskName)

    res.json({
      success: true,
      message: `Task ${taskName} stopped successfully`
    })
  } catch (error) {
    logger.error('Stop task error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to stop task'
    })
  }
})

// @route   GET /api/v1/system/realtime/stats
// @desc    Get real-time service statistics
// @access  Private (Admin only)
router.get('/realtime/stats', systemLimiter, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view real-time statistics'
      })
    }

    const stats = realtimeService.getConnectionStats()

    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    logger.error('Real-time stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time statistics'
    })
  }
})

// @route   POST /api/v1/system/broadcast
// @desc    Broadcast system announcement
// @access  Private (Admin only)
router.post('/broadcast', systemLimiter, [
  query('title').isLength({ min: 1, max: 200 }).withMessage('Title must be between 1 and 200 characters'),
  query('message').isLength({ min: 1, max: 1000 }).withMessage('Message must be between 1 and 1000 characters'),
  query('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('Invalid announcement type')
], handleValidationErrors, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can broadcast system announcements'
      })
    }

    const { title, message, type = 'info' } = req.body

    await realtimeService.broadcastSystemAnnouncement({
      title,
      message,
      type
    })

    res.json({
      success: true,
      message: 'System announcement broadcasted successfully'
    })
  } catch (error) {
    logger.error('Broadcast announcement error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to broadcast announcement'
    })
  }
})

// @route   GET /api/v1/system/database/collections
// @desc    Get database collection information
// @access  Private (Admin only)
router.get('/database/collections', systemLimiter, auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can view database information'
      })
    }

    const collections = await mongoose.connection.db.listCollections().toArray()
    const collectionStats = {}

    for (const collection of collections) {
      try {
        const stats = await mongoose.connection.db.collection(collection.name).stats()
        collectionStats[collection.name] = {
          count: stats.count,
          size: Math.round(stats.size / 1024), // KB
          avgObjSize: Math.round(stats.avgObjSize),
          storageSize: Math.round(stats.storageSize / 1024), // KB
          indexes: stats.nindexes,
          indexSize: Math.round(stats.totalIndexSize / 1024) // KB
        }
      } catch (error) {
        collectionStats[collection.name] = {
          error: error.message
        }
      }
    }

    res.json({
      success: true,
      data: {
        collections: collectionStats,
        totalCollections: collections.length
      }
    })
  } catch (error) {
    logger.error('Database collections error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch database collection information'
    })
  }
})

// Helper function to format uptime
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${days}d ${hours}h ${minutes}m ${secs}s`
}

export default router