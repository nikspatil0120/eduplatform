import mongoose from 'mongoose'
import signalrService from './signalrService.js'
import { logger } from '../utils/logger.js'

// Chat Message Schema
const chatMessageSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  senderAvatar: String,
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  metadata: {
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true
})

// Indexes for performance
chatMessageSchema.index({ courseId: 1, createdAt: -1 })
chatMessageSchema.index({ senderId: 1, createdAt: -1 })

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema)

class ChatService {
  constructor() {
    this.activeUsers = new Map() // Track active users per course
    this.typingUsers = new Map() // Track typing users per course
  }

  // Send chat message
  async sendMessage(data) {
    try {
      const {
        courseId,
        senderId,
        content,
        type = 'text',
        attachments = [],
        replyTo,
        metadata = {}
      } = data

      // Get sender information
      const User = (await import('../models/User.js')).default
      const sender = await User.findById(senderId).select('name profile.avatar')
      
      if (!sender) {
        throw new Error('Sender not found')
      }

      // Verify user has access to course
      const Course = (await import('../models/Course.js')).default
      const course = await Course.findById(courseId)
      
      if (!course) {
        throw new Error('Course not found')
      }

      // Check if user is enrolled or is instructor
      const isEnrolled = course.enrolledStudents.some(
        enrollment => enrollment.studentId.toString() === senderId
      )
      const isInstructor = course.instructor.toString() === senderId

      if (!isEnrolled && !isInstructor) {
        throw new Error('User not authorized to send messages in this course')
      }

      // Create message
      const message = new ChatMessage({
        courseId,
        senderId,
        senderName: sender.name,
        senderAvatar: sender.profile?.avatar,
        content,
        type,
        attachments,
        replyTo: replyTo || undefined,
        metadata
      })

      await message.save()

      // Populate reply information if exists
      if (replyTo) {
        await message.populate('replyTo', 'senderName content createdAt')
      }

      // Send real-time message to course group
      await signalrService.sendChatMessage(courseId, message)

      // Update last activity
      await this.updateLastActivity(courseId, senderId)

      logger.info(`Chat message sent in course ${courseId} by user ${senderId}`)
      return message
    } catch (error) {
      logger.error('Failed to send chat message:', error)
      throw error
    }
  }

  // Get chat messages for a course
  async getMessages(courseId, options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        before,
        after,
        search
      } = options

      const query = { 
        courseId,
        isDeleted: false
      }

      // Date range filtering
      if (before) {
        query.createdAt = { ...query.createdAt, $lt: new Date(before) }
      }
      if (after) {
        query.createdAt = { ...query.createdAt, $gt: new Date(after) }
      }

      // Search functionality
      if (search) {
        query.content = { $regex: search, $options: 'i' }
      }

      const skip = (page - 1) * limit

      const messages = await ChatMessage.find(query)
        .populate('senderId', 'name profile.avatar role')
        .populate('replyTo', 'senderName content createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))

      const total = await ChatMessage.countDocuments(query)

      return {
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasMore: skip + messages.length < total
        }
      }
    } catch (error) {
      logger.error('Failed to get chat messages:', error)
      throw error
    }
  }

  // Edit message
  async editMessage(messageId, userId, newContent) {
    try {
      const message = await ChatMessage.findOne({
        _id: messageId,
        senderId: userId,
        isDeleted: false
      })

      if (!message) {
        throw new Error('Message not found or not authorized')
      }

      // Check if message is too old to edit (e.g., 15 minutes)
      const editTimeLimit = 15 * 60 * 1000 // 15 minutes
      if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
        throw new Error('Message is too old to edit')
      }

      message.content = newContent
      message.isEdited = true
      message.editedAt = new Date()
      await message.save()

      // Send real-time update
      await signalrService.sendToGroup(`course_${message.courseId}`, 'messageEdited', {
        messageId: message._id,
        content: newContent,
        editedAt: message.editedAt
      })

      return message
    } catch (error) {
      logger.error('Failed to edit message:', error)
      throw error
    }
  }

  // Delete message
  async deleteMessage(messageId, userId, isAdmin = false) {
    try {
      const query = { _id: messageId, isDeleted: false }
      
      // Only allow deletion by sender or admin
      if (!isAdmin) {
        query.senderId = userId
      }

      const message = await ChatMessage.findOne(query)

      if (!message) {
        throw new Error('Message not found or not authorized')
      }

      message.isDeleted = true
      message.deletedAt = new Date()
      await message.save()

      // Send real-time update
      await signalrService.sendToGroup(`course_${message.courseId}`, 'messageDeleted', {
        messageId: message._id,
        deletedAt: message.deletedAt
      })

      return message
    } catch (error) {
      logger.error('Failed to delete message:', error)
      throw error
    }
  }

  // Add reaction to message
  async addReaction(messageId, userId, emoji) {
    try {
      const message = await ChatMessage.findById(messageId)
      
      if (!message || message.isDeleted) {
        throw new Error('Message not found')
      }

      // Remove existing reaction from this user
      message.reactions = message.reactions.filter(
        reaction => reaction.userId.toString() !== userId
      )

      // Add new reaction
      message.reactions.push({
        userId,
        emoji,
        createdAt: new Date()
      })

      await message.save()

      // Send real-time update
      await signalrService.sendToGroup(`course_${message.courseId}`, 'messageReaction', {
        messageId: message._id,
        userId,
        emoji,
        reactions: message.reactions
      })

      return message
    } catch (error) {
      logger.error('Failed to add reaction:', error)
      throw error
    }
  }

  // Remove reaction from message
  async removeReaction(messageId, userId) {
    try {
      const message = await ChatMessage.findById(messageId)
      
      if (!message || message.isDeleted) {
        throw new Error('Message not found')
      }

      // Remove reaction from this user
      message.reactions = message.reactions.filter(
        reaction => reaction.userId.toString() !== userId
      )

      await message.save()

      // Send real-time update
      await signalrService.sendToGroup(`course_${message.courseId}`, 'messageReactionRemoved', {
        messageId: message._id,
        userId,
        reactions: message.reactions
      })

      return message
    } catch (error) {
      logger.error('Failed to remove reaction:', error)
      throw error
    }
  }

  // Handle user typing indicator
  async handleTyping(courseId, userId, isTyping) {
    try {
      const courseKey = courseId.toString()
      
      if (!this.typingUsers.has(courseKey)) {
        this.typingUsers.set(courseKey, new Set())
      }

      const typingSet = this.typingUsers.get(courseKey)

      if (isTyping) {
        typingSet.add(userId)
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
          typingSet.delete(userId)
          this.broadcastTypingUsers(courseId)
        }, 3000)
      } else {
        typingSet.delete(userId)
      }

      await this.broadcastTypingUsers(courseId)
    } catch (error) {
      logger.error('Failed to handle typing indicator:', error)
    }
  }

  // Broadcast typing users to course
  async broadcastTypingUsers(courseId) {
    try {
      const courseKey = courseId.toString()
      const typingSet = this.typingUsers.get(courseKey) || new Set()
      
      await signalrService.sendToGroup(`course_${courseId}`, 'typingUsers', {
        users: Array.from(typingSet)
      })
    } catch (error) {
      logger.error('Failed to broadcast typing users:', error)
    }
  }

  // Handle user joining course chat
  async joinCourseChat(courseId, userId) {
    try {
      // Add user to SignalR group
      await signalrService.addUserToGroup(userId, `course_${courseId}`)

      // Track active user
      const courseKey = courseId.toString()
      if (!this.activeUsers.has(courseKey)) {
        this.activeUsers.set(courseKey, new Set())
      }
      
      this.activeUsers.get(courseKey).add(userId)

      // Update last activity
      await this.updateLastActivity(courseId, userId)

      // Broadcast active users
      await this.broadcastActiveUsers(courseId)

      logger.info(`User ${userId} joined course chat ${courseId}`)
    } catch (error) {
      logger.error('Failed to join course chat:', error)
      throw error
    }
  }

  // Handle user leaving course chat
  async leaveCourseChat(courseId, userId) {
    try {
      // Remove user from SignalR group
      await signalrService.removeUserFromGroup(userId, `course_${courseId}`)

      // Remove from active users
      const courseKey = courseId.toString()
      if (this.activeUsers.has(courseKey)) {
        this.activeUsers.get(courseKey).delete(userId)
      }

      // Remove from typing users
      if (this.typingUsers.has(courseKey)) {
        this.typingUsers.get(courseKey).delete(userId)
      }

      // Broadcast updates
      await this.broadcastActiveUsers(courseId)
      await this.broadcastTypingUsers(courseId)

      logger.info(`User ${userId} left course chat ${courseId}`)
    } catch (error) {
      logger.error('Failed to leave course chat:', error)
    }
  }

  // Broadcast active users to course
  async broadcastActiveUsers(courseId) {
    try {
      const courseKey = courseId.toString()
      const activeSet = this.activeUsers.get(courseKey) || new Set()
      
      await signalrService.sendToGroup(`course_${courseId}`, 'activeUsers', {
        count: activeSet.size,
        users: Array.from(activeSet)
      })
    } catch (error) {
      logger.error('Failed to broadcast active users:', error)
    }
  }

  // Update user's last activity
  async updateLastActivity(courseId, userId) {
    try {
      // Update in user's course enrollment
      const Course = (await import('../models/Course.js')).default
      await Course.updateOne(
        { 
          _id: courseId,
          'enrolledStudents.studentId': userId
        },
        {
          $set: {
            'enrolledStudents.$.lastActivity': new Date()
          }
        }
      )
    } catch (error) {
      logger.error('Failed to update last activity:', error)
    }
  }

  // Get chat analytics for course
  async getChatAnalytics(courseId, options = {}) {
    try {
      const {
        startDate,
        endDate
      } = options

      const matchStage = { 
        courseId: new mongoose.Types.ObjectId(courseId),
        isDeleted: false
      }

      if (startDate) {
        matchStage.createdAt = { $gte: new Date(startDate) }
      }
      if (endDate) {
        matchStage.createdAt = { 
          ...matchStage.createdAt, 
          $lte: new Date(endDate) 
        }
      }

      const analytics = await ChatMessage.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            uniqueUsers: { $addToSet: '$senderId' },
            messagesByType: {
              $push: '$type'
            },
            messagesByHour: {
              $push: {
                hour: { $hour: '$createdAt' },
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              }
            }
          }
        },
        {
          $project: {
            totalMessages: 1,
            uniqueUsers: { $size: '$uniqueUsers' },
            messagesByType: 1,
            messagesByHour: 1
          }
        }
      ])

      // Calculate hourly distribution
      const hourlyDistribution = {}
      if (analytics[0]?.messagesByHour) {
        analytics[0].messagesByHour.forEach(item => {
          const key = `${item.date}-${item.hour}`
          hourlyDistribution[key] = (hourlyDistribution[key] || 0) + 1
        })
      }

      // Calculate type distribution
      const typeDistribution = {}
      if (analytics[0]?.messagesByType) {
        analytics[0].messagesByType.forEach(type => {
          typeDistribution[type] = (typeDistribution[type] || 0) + 1
        })
      }

      return {
        ...analytics[0],
        hourlyDistribution,
        typeDistribution,
        averageMessagesPerUser: analytics[0] ? 
          (analytics[0].totalMessages / analytics[0].uniqueUsers).toFixed(2) : 0
      }
    } catch (error) {
      logger.error('Failed to get chat analytics:', error)
      throw error
    }
  }

  // Search messages across courses (admin only)
  async searchMessages(query, options = {}) {
    try {
      const {
        courseId,
        userId,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = options

      const searchQuery = {
        isDeleted: false,
        $text: { $search: query }
      }

      if (courseId) {
        searchQuery.courseId = courseId
      }
      if (userId) {
        searchQuery.senderId = userId
      }
      if (startDate) {
        searchQuery.createdAt = { $gte: new Date(startDate) }
      }
      if (endDate) {
        searchQuery.createdAt = { 
          ...searchQuery.createdAt, 
          $lte: new Date(endDate) 
        }
      }

      const skip = (page - 1) * limit

      const messages = await ChatMessage.find(searchQuery)
        .populate('senderId', 'name profile.avatar')
        .populate('courseId', 'title')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))

      const total = await ChatMessage.countDocuments(searchQuery)

      return {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    } catch (error) {
      logger.error('Failed to search messages:', error)
      throw error
    }
  }

  // Cleanup old messages (run periodically)
  async cleanupOldMessages(daysToKeep = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await ChatMessage.deleteMany({
        createdAt: { $lt: cutoffDate },
        isDeleted: true
      })

      logger.info(`Cleaned up ${result.deletedCount} old chat messages`)
      return result.deletedCount
    } catch (error) {
      logger.error('Failed to cleanup old messages:', error)
      throw error
    }
  }
}

// Create text index for search
chatMessageSchema.index({ content: 'text', senderName: 'text' })

export default new ChatService()
export { ChatMessage }