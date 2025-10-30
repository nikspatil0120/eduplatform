import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
// SignalR service removed - using Socket.IO only
import notificationService from './notificationService.js'
// Chat service removed - not used in this project
import { logger } from '../utils/logger.js'

class RealtimeService {
  constructor() {
    this.io = null
    this.connectedUsers = new Map() // userId -> socket mapping
    this.userSockets = new Map() // socketId -> userId mapping
    this.courseRooms = new Map() // courseId -> Set of userIds
    this.useSignalR = false // SignalR not used in this project
  }

  // Initialize Socket.IO server
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]
        
        if (!token) {
          return next(new Error('Authentication token required'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const User = (await import('../models/User.js')).default
        const user = await User.findById(decoded.id).select('name email role profile')
        
        if (!user) {
          return next(new Error('User not found'))
        }

        socket.userId = user._id.toString()
        socket.user = user
        next()
      } catch (error) {
        logger.error('Socket authentication error:', error)
        next(new Error('Authentication failed'))
      }
    })

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket)
    })

    logger.info('Real-time service initialized with Socket.IO')
  }

  // Handle new socket connection
  handleConnection(socket) {
    const userId = socket.userId
    
    // Store user connection
    this.connectedUsers.set(userId, socket)
    this.userSockets.set(socket.id, userId)

    logger.info(`User ${userId} connected via Socket.IO`)

    // Join user to their personal room
    socket.join(`user_${userId}`)

    // Handle course joining
    socket.on('join_course', async (courseId) => {
      await this.handleJoinCourse(socket, courseId)
    })

    // Handle course leaving
    socket.on('leave_course', async (courseId) => {
      await this.handleLeaveCourse(socket, courseId)
    })

    // Handle chat messages
    socket.on('send_message', async (data) => {
      await this.handleChatMessage(socket, data)
    })

    // Handle typing indicators
    socket.on('typing', async (data) => {
      await this.handleTyping(socket, data)
    })

    // Handle message reactions
    socket.on('add_reaction', async (data) => {
      await this.handleAddReaction(socket, data)
    })

    // Handle live class events
    socket.on('join_live_class', async (data) => {
      await this.handleJoinLiveClass(socket, data)
    })

    // Handle screen sharing
    socket.on('screen_share', async (data) => {
      await this.handleScreenShare(socket, data)
    })

    // Handle whiteboard events
    socket.on('whiteboard_draw', async (data) => {
      await this.handleWhiteboardDraw(socket, data)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket)
    })

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to real-time service',
      userId: userId,
      timestamp: new Date()
    })
  }

  // Handle user joining a course
  async handleJoinCourse(socket, courseId) {
    try {
      const userId = socket.userId

      // Verify user has access to course
      const Course = (await import('../models/Course.js')).default
      const course = await Course.findById(courseId)
      
      if (!course) {
        socket.emit('error', { message: 'Course not found' })
        return
      }

      // Check if user is enrolled or is instructor
      const isEnrolled = course.enrolledStudents.some(
        enrollment => enrollment.studentId.toString() === userId
      )
      const isInstructor = course.instructor.toString() === userId

      if (!isEnrolled && !isInstructor) {
        socket.emit('error', { message: 'Not authorized to join this course' })
        return
      }

      // Join course room
      socket.join(`course_${courseId}`)
      
      // Track course membership
      if (!this.courseRooms.has(courseId)) {
        this.courseRooms.set(courseId, new Set())
      }
      this.courseRooms.get(courseId).add(userId)

      // Chat functionality not implemented in this project

      // Notify others in the course
      socket.to(`course_${courseId}`).emit('user_joined_course', {
        userId,
        userName: socket.user.name,
        timestamp: new Date()
      })

      socket.emit('joined_course', {
        courseId,
        message: 'Successfully joined course',
        timestamp: new Date()
      })

      logger.info(`User ${userId} joined course ${courseId}`)
    } catch (error) {
      logger.error('Handle join course error:', error)
      socket.emit('error', { message: 'Failed to join course' })
    }
  }

  // Handle user leaving a course
  async handleLeaveCourse(socket, courseId) {
    try {
      const userId = socket.userId

      // Leave course room
      socket.leave(`course_${courseId}`)
      
      // Remove from course tracking
      if (this.courseRooms.has(courseId)) {
        this.courseRooms.get(courseId).delete(userId)
      }

      // Chat functionality not implemented in this project

      // Notify others in the course
      socket.to(`course_${courseId}`).emit('user_left_course', {
        userId,
        userName: socket.user.name,
        timestamp: new Date()
      })

      socket.emit('left_course', {
        courseId,
        message: 'Successfully left course',
        timestamp: new Date()
      })

      logger.info(`User ${userId} left course ${courseId}`)
    } catch (error) {
      logger.error('Handle leave course error:', error)
      socket.emit('error', { message: 'Failed to leave course' })
    }
  }

  // Handle chat message
  async handleChatMessage(socket, data) {
    try {
      const { courseId, content, type = 'text', replyTo } = data
      const userId = socket.userId

      // Chat functionality not implemented in this project
      socket.emit('error', { message: 'Chat feature not available' })

    } catch (error) {
      logger.error('Handle chat message error:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  }

  // Handle typing indicator
  async handleTyping(socket, data) {
    try {
      const { courseId, isTyping } = data
      const userId = socket.userId

      // Chat functionality not implemented in this project
    } catch (error) {
      logger.error('Handle typing error:', error)
    }
  }

  // Handle message reaction
  async handleAddReaction(socket, data) {
    try {
      const { messageId, emoji } = data
      const userId = socket.userId

      // Chat functionality not implemented in this project
      socket.emit('error', { message: 'Chat reactions not available' })
    } catch (error) {
      logger.error('Handle add reaction error:', error)
      socket.emit('error', { message: 'Failed to add reaction' })
    }
  }

  // Handle joining live class
  async handleJoinLiveClass(socket, data) {
    try {
      const { classId, courseId } = data
      const userId = socket.userId

      // Join live class room
      socket.join(`live_class_${classId}`)

      // Notify others in the class
      socket.to(`live_class_${classId}`).emit('user_joined_live_class', {
        userId,
        userName: socket.user.name,
        userAvatar: socket.user.profile?.avatar,
        timestamp: new Date()
      })

      socket.emit('joined_live_class', {
        classId,
        message: 'Successfully joined live class',
        timestamp: new Date()
      })

      logger.info(`User ${userId} joined live class ${classId}`)
    } catch (error) {
      logger.error('Handle join live class error:', error)
      socket.emit('error', { message: 'Failed to join live class' })
    }
  }

  // Handle screen sharing
  async handleScreenShare(socket, data) {
    try {
      const { classId, isSharing, streamData } = data
      const userId = socket.userId

      // Broadcast screen share status to live class
      socket.to(`live_class_${classId}`).emit('screen_share_update', {
        userId,
        userName: socket.user.name,
        isSharing,
        streamData,
        timestamp: new Date()
      })

      logger.info(`User ${userId} ${isSharing ? 'started' : 'stopped'} screen sharing in class ${classId}`)
    } catch (error) {
      logger.error('Handle screen share error:', error)
    }
  }

  // Handle whiteboard drawing
  async handleWhiteboardDraw(socket, data) {
    try {
      const { classId, drawData } = data
      const userId = socket.userId

      // Broadcast drawing data to live class
      socket.to(`live_class_${classId}`).emit('whiteboard_update', {
        userId,
        userName: socket.user.name,
        drawData,
        timestamp: new Date()
      })
    } catch (error) {
      logger.error('Handle whiteboard draw error:', error)
    }
  }

  // Handle disconnection
  handleDisconnection(socket) {
    const userId = this.userSockets.get(socket.id)
    
    if (userId) {
      // Remove from tracking
      this.connectedUsers.delete(userId)
      this.userSockets.delete(socket.id)

      // Remove from all course rooms
      for (const [courseId, userSet] of this.courseRooms.entries()) {
        if (userSet.has(userId)) {
          userSet.delete(userId)
          
          // Notify course members
          socket.to(`course_${courseId}`).emit('user_disconnected', {
            userId,
            timestamp: new Date()
          })
        }
      }

      logger.info(`User ${userId} disconnected from Socket.IO`)
    }
  }

  // Send notification to user
  async sendNotificationToUser(userId, notification) {
    try {
      if (this.useSignalR) {
        // SignalR not implemented
      } else {
        const socket = this.connectedUsers.get(userId)
        if (socket) {
          socket.emit('notification', {
            id: notification._id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            priority: notification.priority,
            actionUrl: notification.actionUrl,
            createdAt: notification.createdAt
          })
        }
      }
    } catch (error) {
      logger.error('Send notification to user error:', error)
    }
  }

  // Send message to course
  async sendMessageToCourse(courseId, event, data) {
    try {
      if (this.useSignalR) {
        // SignalR not implemented
      } else {
        this.io.to(`course_${courseId}`).emit(event, data)
      }
    } catch (error) {
      logger.error('Send message to course error:', error)
    }
  }

  // Send assignment update
  async sendAssignmentUpdate(courseId, assignment, updateType) {
    try {
      const data = {
        type: updateType,
        assignmentId: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        timestamp: new Date()
      }

      await this.sendMessageToCourse(courseId, 'assignment_update', data)
    } catch (error) {
      logger.error('Send assignment update error:', error)
    }
  }

  // Send discussion update
  async sendDiscussionUpdate(courseId, discussion, updateType) {
    try {
      const data = {
        type: updateType,
        discussionId: discussion._id,
        title: discussion.title,
        authorName: discussion.createdBy?.name,
        timestamp: new Date()
      }

      await this.sendMessageToCourse(courseId, 'discussion_update', data)
    } catch (error) {
      logger.error('Send discussion update error:', error)
    }
  }

  // Send live class update
  async sendLiveClassUpdate(courseId, classUpdate) {
    try {
      await this.sendMessageToCourse(courseId, 'live_class_update', {
        type: classUpdate.type,
        classId: classUpdate.classId,
        title: classUpdate.title,
        startTime: classUpdate.startTime,
        endTime: classUpdate.endTime,
        meetingUrl: classUpdate.meetingUrl,
        timestamp: new Date()
      })
    } catch (error) {
      logger.error('Send live class update error:', error)
    }
  }

  // Get connection statistics
  getConnectionStats() {
    const stats = {
      connectedUsers: this.connectedUsers.size,
      totalCourseRooms: this.courseRooms.size,
      courseRoomDetails: {}
    }

    // Get details for each course room
    for (const [courseId, userSet] of this.courseRooms.entries()) {
      stats.courseRoomDetails[courseId] = {
        activeUsers: userSet.size,
        users: Array.from(userSet)
      }
    }

    return stats
  }

  // Broadcast system announcement
  async broadcastSystemAnnouncement(announcement) {
    try {
      if (this.useSignalR) {
        // SignalR not implemented
      } else {
        // Use Socket.IO to broadcast to all connected users
        this.io.emit('system_announcement', {
          title: announcement.title,
          message: announcement.message,
          type: announcement.type || 'info',
          timestamp: new Date()
        })
      }

      logger.info('System announcement broadcasted')
    } catch (error) {
      logger.error('Broadcast system announcement error:', error)
    }
  }

  // Cleanup inactive connections
  cleanupInactiveConnections() {
    try {
      const now = Date.now()
      const inactiveThreshold = 30 * 60 * 1000 // 30 minutes

      for (const [userId, socket] of this.connectedUsers.entries()) {
        if (now - socket.handshake.time > inactiveThreshold) {
          socket.disconnect(true)
          logger.info(`Disconnected inactive user: ${userId}`)
        }
      }
    } catch (error) {
      logger.error('Cleanup inactive connections error:', error)
    }
  }
}

export default new RealtimeService()