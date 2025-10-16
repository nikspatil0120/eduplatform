// Load environment variables FIRST
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'

// Import configurations and middleware
import { connectDatabase } from './config/database.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { logger } from './utils/logger.js'

// Import routes
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import courseRoutes from './routes/courses.js'
import quizRoutes from './routes/quizzes.js'
import noteRoutes from './routes/notes.js'
import paymentRoutes from './routes/payments.js'
import uploadRoutes from './routes/upload.js'
import assignmentRoutes from './routes/assignments.js'
import submissionRoutes from './routes/submissions.js'
import discussionRoutes from './routes/discussions.js'
import replyRoutes from './routes/replies.js'
import notificationRoutes from './routes/notifications.js'
import profileRoutes from './routes/profile.js'
import learningPathRoutes from './routes/learningPaths.js'
import certificateRoutes from './routes/certificates.js'
import chatRoutes from './routes/chat.js'
import systemRoutes from './routes/system.js'
import queueRoutes from './routes/queues.js'
import adminRoutes from './routes/admin.js'
import userProgressRoutes from './routes/userProgress.js'

// __filename and __dirname already declared above

const app = express()
const PORT = process.env.PORT || 3001

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'none'"],
    },
  },
}))

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3002',
      'https://your-production-domain.com'
    ]
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
// Ensure preflight responses for all routes
app.options('*', cors(corsOptions))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000) / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/api/', limiter)

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }))
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  })
})

// API routes
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`

app.use(`${API_PREFIX}/auth`, authRoutes)
app.use(`${API_PREFIX}/users`, userRoutes)
app.use(`${API_PREFIX}/courses`, courseRoutes)
app.use(`${API_PREFIX}/quizzes`, quizRoutes)
app.use(`${API_PREFIX}/notes`, noteRoutes)
app.use(`${API_PREFIX}/payments`, paymentRoutes)
app.use(`${API_PREFIX}/upload`, uploadRoutes)
app.use(`${API_PREFIX}/assignments`, assignmentRoutes)
app.use(`${API_PREFIX}/submissions`, submissionRoutes)
app.use(`${API_PREFIX}/discussions`, discussionRoutes)
app.use(`${API_PREFIX}/replies`, replyRoutes)
app.use(`${API_PREFIX}/notifications`, notificationRoutes)
app.use(`${API_PREFIX}/profile`, profileRoutes)
app.use(`${API_PREFIX}/learning-paths`, learningPathRoutes)
app.use(`${API_PREFIX}/certificates`, certificateRoutes)
app.use(`${API_PREFIX}/chat`, chatRoutes)
app.use(`${API_PREFIX}/system`, systemRoutes)
app.use(`${API_PREFIX}/queues`, queueRoutes)
app.use(`${API_PREFIX}/admin`, adminRoutes)
app.use(`${API_PREFIX}/user-progress`, userProgressRoutes)

// API Documentation endpoint
app.get(`${API_PREFIX}/docs`, (req, res) => {
  res.json({
    success: true,
    message: 'EduPlatform API Documentation',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      auth: {
        'POST /auth/send-otp': 'Send OTP to email for authentication',
        'POST /auth/verify-otp': 'Verify OTP and login/signup',
        'POST /auth/resend-otp': 'Resend OTP',
        'POST /auth/register': 'Register with email/password',
        'POST /auth/login': 'Login with email/password',
        'POST /auth/google': 'Google OAuth login (ID token)',
        'POST /auth/google-oauth': 'Google OAuth login (user info)',
        'POST /auth/refresh': 'Refresh access token',
        'POST /auth/forgot-password': 'Send password reset email',
        'POST /auth/reset-password': 'Reset password with token',
        'POST /auth/verify-email': 'Verify email address',
        'POST /auth/logout': 'Logout user'
      },
      users: {
        'GET /users/profile': 'Get user profile',
        'PUT /users/profile': 'Update user profile'
      },
      courses: {
        'GET /courses': 'Get all courses',
        'GET /courses/:id': 'Get course by ID',
        'POST /courses/:id/enroll': 'Enroll in course'
      },
      upload: {
        'POST /upload/single': 'Upload single file',
        'POST /upload/multiple': 'Upload multiple files',
        'GET /upload/info/:blobName': 'Get file info',
        'DELETE /upload/:blobName': 'Delete file',
        'POST /upload/secure-url': 'Generate secure access URL'
      },
      quizzes: {
        'GET /quizzes/course/:courseId': 'Get quiz by course ID',
        'POST /quizzes/:id/submit': 'Submit quiz answers'
      },
      notes: {
        'GET /notes': 'Get user notes',
        'POST /notes': 'Create new note',
        'PUT /notes/:id': 'Update note',
        'DELETE /notes/:id': 'Delete note'
      },
      analytics: {
        'GET /analytics/user': 'Get user analytics',
        'GET /analytics/courses': 'Get course analytics (admin only)'
      },
      assignments: {
        'GET /assignments/course/:courseId': 'Get assignments for a course',
        'GET /assignments/:id': 'Get assignment by ID',
        'POST /assignments': 'Create new assignment (instructor/admin)',
        'PUT /assignments/:id': 'Update assignment (instructor/admin)',
        'POST /assignments/:id/publish': 'Publish assignment (instructor/admin)',
        'DELETE /assignments/:id': 'Delete assignment (instructor/admin)',
        'GET /assignments/:id/submissions': 'Get assignment submissions (instructor/admin)',
        'GET /assignments/:id/analytics': 'Get assignment analytics (instructor/admin)'
      },
      submissions: {
        'POST /submissions': 'Submit assignment (student)',
        'GET /submissions/my': 'Get user submissions (student)',
        'GET /submissions/:id': 'Get submission by ID',
        'PUT /submissions/:id/grade': 'Grade submission (instructor/admin)',
        'POST /submissions/:id/peer-review': 'Add peer review (student)',
        'DELETE /submissions/:id': 'Delete submission',
        'GET /submissions/:id/download/:fileIndex': 'Download submission file'
      },
      discussions: {
        'GET /discussions/course/:courseId': 'Get course discussions',
        'GET /discussions/:id': 'Get discussion by ID',
        'POST /discussions': 'Create new discussion',
        'PUT /discussions/:id': 'Update discussion',
        'POST /discussions/:id/pin': 'Pin/unpin discussion (instructor/admin)',
        'POST /discussions/:id/lock': 'Lock/unlock discussion (instructor/admin)',
        'DELETE /discussions/:id': 'Delete discussion',
        'GET /discussions/search': 'Search discussions',
        'GET /discussions/trending/:courseId': 'Get trending discussions',
        'POST /discussions/:id/poll/vote': 'Vote on discussion poll'
      },
      replies: {
        'POST /replies': 'Create reply to discussion',
        'PUT /replies/:id': 'Update reply',
        'POST /replies/:id/vote': 'Vote on reply (upvote/downvote)',
        'POST /replies/:id/mark-solution': 'Mark reply as solution',
        'DELETE /replies/:id': 'Delete reply'
      },
      notifications: {
        'GET /notifications': 'Get user notifications',
        'GET /notifications/unread-count': 'Get unread notification count',
        'POST /notifications': 'Create notification (admin)',
        'POST /notifications/broadcast': 'Broadcast notification (admin)',
        'PUT /notifications/:id/read': 'Mark notification as read',
        'PUT /notifications/mark-all-read': 'Mark all notifications as read',
        'PUT /notifications/:id/archive': 'Archive notification',
        'DELETE /notifications/:id': 'Delete notification',
        'GET /notifications/preferences': 'Get notification preferences',
        'PUT /notifications/preferences': 'Update notification preferences',
        'GET /notifications/analytics': 'Get notification analytics (admin)'
      },
      profile: {
        'POST /profile/upload-avatar': 'Upload profile picture',
        'DELETE /profile/delete-avatar': 'Delete profile picture',
        'PUT /profile/update': 'Update profile information'
      },
      learningPaths: {
        'GET /learning-paths': 'Get all learning paths',
        'GET /learning-paths/:id': 'Get learning path by ID',
        'POST /learning-paths': 'Create new learning path (instructor/admin)',
        'PUT /learning-paths/:id': 'Update learning path',
        'POST /learning-paths/:id/enroll': 'Enroll in learning path (student)',
        'POST /learning-paths/:id/unenroll': 'Unenroll from learning path (student)',
        'POST /learning-paths/:id/complete-course': 'Mark course as completed (student)',
        'GET /learning-paths/:id/progress': 'Get learning path progress (student)',
        'POST /learning-paths/:id/publish': 'Publish learning path',
        'DELETE /learning-paths/:id': 'Delete learning path',
        'GET /learning-paths/my/enrolled': 'Get enrolled learning paths (student)'
      },
      certificates: {
        'GET /certificates/my': 'Get user certificates (student)',
        'GET /certificates/:id': 'Get certificate by ID (public for verification)',
        'POST /certificates/issue': 'Issue certificate (instructor/admin)',
        'POST /certificates/:id/revoke': 'Revoke certificate (admin)',
        'GET /certificates/verify/:certificateNumber': 'Verify certificate by number (public)',
        'GET /certificates/:id/download': 'Download certificate PDF',
        'GET /certificates/analytics/overview': 'Get certificate analytics (admin)',
        'POST /certificates/bulk-issue': 'Bulk issue certificates (admin)'
      },
      chat: {
        'POST /chat/messages': 'Send chat message',
        'GET /chat/messages/:courseId': 'Get chat messages for course',
        'PUT /chat/messages/:id': 'Edit chat message',
        'DELETE /chat/messages/:id': 'Delete chat message',
        'POST /chat/messages/:id/reactions': 'Add reaction to message',
        'DELETE /chat/messages/:id/reactions': 'Remove reaction from message',
        'POST /chat/typing': 'Handle typing indicator',
        'POST /chat/join/:courseId': 'Join course chat',
        'POST /chat/leave/:courseId': 'Leave course chat',
        'GET /chat/analytics/:courseId': 'Get chat analytics (instructor/admin)',
        'GET /chat/search': 'Search messages (admin)',
        'DELETE /chat/cleanup': 'Cleanup old messages (admin)'
      },
      userProgress: {
        'GET /user-progress': 'Get all user progress',
        'GET /user-progress/:courseId': 'Get user progress for specific course',
        'POST /user-progress/:courseId/lesson': 'Mark lesson as completed',
        'POST /user-progress/:courseId/certificate': 'Add certificate to user progress',
        'DELETE /user-progress/:courseId': 'Reset user progress for a course'
      },
      realtime: {
        'WebSocket /socket.io': 'Real-time communication via Socket.IO',
        'Events': 'join_course, leave_course, send_message, typing, add_reaction, join_live_class, screen_share, whiteboard_draw'
      },
      system: {
        'GET /system/health': 'Get system health status (public)',
        'GET /system/stats': 'Get detailed system statistics (admin)',
        'GET /system/logs': 'Get system logs (admin)',
        'POST /system/scheduler/restart/:taskName': 'Restart scheduled task (admin)',
        'POST /system/scheduler/stop/:taskName': 'Stop scheduled task (admin)',
        'GET /system/realtime/stats': 'Get real-time service statistics (admin)',
        'POST /system/broadcast': 'Broadcast system announcement (admin)',
        'GET /system/database/collections': 'Get database collection info (admin)'
      },
      queues: {
        'GET /queues/status': 'Get queue service status (admin)',
        'GET /queues/stats': 'Get all queue statistics (admin)',
        'GET /queues/:queueName/stats': 'Get specific queue statistics (admin)',
        'POST /queues/:queueName/pause': 'Pause queue (admin)',
        'POST /queues/:queueName/resume': 'Resume queue (admin)',
        'POST /queues/:queueName/clean': 'Clean queue (admin)',
        'GET /queues/:queueName/jobs/:jobId': 'Get job details (admin)',
        'DELETE /queues/:queueName/jobs/:jobId': 'Remove job (admin)',
        'POST /queues/email/send': 'Add email job (admin)',
        'POST /queues/notification/send': 'Add notification job (admin)',
        'POST /queues/analytics/generate': 'Generate analytics (admin)',
        'POST /queues/cleanup/schedule': 'Schedule cleanup (admin)',
        'POST /queues/backup/schedule': 'Schedule backup (admin)',
        'GET /queues/health': 'Queue service health check (admin)'
      }
    },
    baseUrl: `http://localhost:${PORT}${API_PREFIX}`,
    authentication: 'Bearer token required for protected endpoints'
  })
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../../frontend/dist')))
  
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../../frontend/dist/index.html'))
  })
}

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, shutting down gracefully`)
  
  try {
    // Close queue service
    const queueService = (await import('./services/queueService.js')).default
    await queueService.close()
    logger.info('Queue service closed')
    
    // Close scheduler service
    const schedulerService = (await import('./services/schedulerService.js')).default
    schedulerService.stopAllTasks()
    logger.info('Scheduler service stopped')
    
    // Close real-time service
    const realtimeService = (await import('./services/realtimeService.js')).default
    await realtimeService.disconnect()
    logger.info('Real-time service disconnected')
    
  } catch (error) {
    logger.error('Error during graceful shutdown:', error)
  }
  
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase()
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`)
      logger.info(`📚 API Documentation: http://localhost:${PORT}${API_PREFIX}/docs`)
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`)
    })

    // Initialize real-time service
    const realtimeService = (await import('./services/realtimeService.js')).default
    realtimeService.initialize(server)
    logger.info('🔄 Real-time service initialized')

    // Initialize scheduler service
    const schedulerService = (await import('./services/schedulerService.js')).default
    schedulerService.initialize()
    logger.info('⏰ Scheduler service initialized')

    // Initialize queue service
    const queueService = (await import('./services/queueService.js')).default
    if (queueService.isHealthy()) {
      logger.info('📋 Queue service initialized and healthy')
    } else {
      logger.warn('📋 Queue service initialized but not healthy (Redis may not be available)')
    }

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT

      switch (error.code) {
        case 'EACCES':
          logger.error(`${bind} requires elevated privileges`)
          process.exit(1)
          break
        case 'EADDRINUSE':
          logger.error(`${bind} is already in use`)
          process.exit(1)
          break
        default:
          throw error
      }
    })

    return server
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export default app