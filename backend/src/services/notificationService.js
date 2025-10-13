import Notification from '../models/Notification.js'
import emailService from './emailService.js'
import signalrService from './signalrService.js'
import { logger } from '../utils/logger.js'

class NotificationService {
  constructor() {
    this.channels = {
      EMAIL: 'email',
      IN_APP: 'in_app',
      PUSH: 'push',
      SMS: 'sms'
    }
    
    this.types = {
      SYSTEM: 'system',
      COURSE: 'course',
      ASSIGNMENT: 'assignment',
      DISCUSSION: 'discussion',
      GRADE: 'grade',
      ANNOUNCEMENT: 'announcement',
      CERTIFICATE: 'certificate',
      PAYMENT: 'payment'
    }
    
    this.priorities = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      URGENT: 'urgent'
    }
  }

  // Create and send notification
  async createNotification(data) {
    try {
      const {
        userId,
        type,
        title,
        message,
        priority = this.priorities.MEDIUM,
        actionUrl,
        metadata = {},
        channels = [this.channels.IN_APP],
        scheduleAt
      } = data

      // Create notification in database
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        priority,
        actionUrl,
        metadata,
        channels,
        scheduleAt: scheduleAt ? new Date(scheduleAt) : undefined
      })

      await notification.save()

      // Send immediately if not scheduled
      if (!scheduleAt || new Date(scheduleAt) <= new Date()) {
        await this.sendNotification(notification)
      }

      return notification
    } catch (error) {
      logger.error('Failed to create notification:', error)
      throw error
    }
  }

  // Send notification through configured channels
  async sendNotification(notification) {
    try {
      const user = await this.getUserWithPreferences(notification.userId)
      if (!user) {
        logger.warn(`User not found for notification: ${notification._id}`)
        return
      }

      const promises = []

      // Send through each configured channel
      for (const channel of notification.channels) {
        if (this.shouldSendToChannel(channel, user.notificationPreferences, notification)) {
          promises.push(this.sendToChannel(channel, notification, user))
        }
      }

      await Promise.allSettled(promises)

      // Update notification status
      notification.status = 'sent'
      notification.sentAt = new Date()
      await notification.save()

      logger.info(`Notification sent successfully: ${notification._id}`)
    } catch (error) {
      logger.error('Failed to send notification:', error)
      
      // Update notification with error
      notification.status = 'failed'
      notification.error = error.message
      await notification.save()
    }
  }

  // Send to specific channel
  async sendToChannel(channel, notification, user) {
    try {
      switch (channel) {
        case this.channels.IN_APP:
          await this.sendInAppNotification(notification, user)
          break
        case this.channels.EMAIL:
          await this.sendEmailNotification(notification, user)
          break
        case this.channels.PUSH:
          await this.sendPushNotification(notification, user)
          break
        case this.channels.SMS:
          await this.sendSMSNotification(notification, user)
          break
        default:
          logger.warn(`Unknown notification channel: ${channel}`)
      }
    } catch (error) {
      logger.error(`Failed to send notification via ${channel}:`, error)
      throw error
    }
  }

  // Send in-app notification via SignalR
  async sendInAppNotification(notification, user) {
    try {
      await signalrService.sendNotification(user._id.toString(), notification)
      logger.info(`In-app notification sent to user: ${user._id}`)
    } catch (error) {
      logger.error('Failed to send in-app notification:', error)
      throw error
    }
  }

  // Send email notification
  async sendEmailNotification(notification, user) {
    try {
      const emailTemplate = this.getEmailTemplate(notification.type)
      
      await emailService.sendEmail({
        to: user.email,
        subject: notification.title,
        template: emailTemplate,
        data: {
          userName: user.name,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          priority: notification.priority,
          metadata: notification.metadata
        }
      })
      
      logger.info(`Email notification sent to: ${user.email}`)
    } catch (error) {
      logger.error('Failed to send email notification:', error)
      throw error
    }
  }

  // Send push notification (placeholder for future implementation)
  async sendPushNotification(notification, user) {
    try {
      // TODO: Implement push notification service (Firebase, OneSignal, etc.)
      logger.info(`Push notification would be sent to user: ${user._id}`)
    } catch (error) {
      logger.error('Failed to send push notification:', error)
      throw error
    }
  }

  // Send SMS notification (placeholder for future implementation)
  async sendSMSNotification(notification, user) {
    try {
      // TODO: Implement SMS service (Twilio, Azure Communication Services, etc.)
      logger.info(`SMS notification would be sent to user: ${user._id}`)
    } catch (error) {
      logger.error('Failed to send SMS notification:', error)
      throw error
    }
  }

  // Broadcast notification to multiple users
  async broadcastNotification(data) {
    try {
      const {
        userIds,
        type,
        title,
        message,
        priority = this.priorities.MEDIUM,
        actionUrl,
        metadata = {},
        channels = [this.channels.IN_APP]
      } = data

      const notifications = userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        priority,
        actionUrl,
        metadata,
        channels
      }))

      // Create all notifications
      const createdNotifications = await Notification.insertMany(notifications)

      // Send all notifications
      const sendPromises = createdNotifications.map(notification => 
        this.sendNotification(notification)
      )

      await Promise.allSettled(sendPromises)

      return createdNotifications
    } catch (error) {
      logger.error('Failed to broadcast notification:', error)
      throw error
    }
  }

  // Send course-related notifications
  async sendCourseNotification(courseId, data) {
    try {
      const Course = (await import('../models/Course.js')).default
      const course = await Course.findById(courseId).populate('enrolledStudents.studentId', '_id')
      
      if (!course) {
        throw new Error('Course not found')
      }

      const userIds = course.enrolledStudents.map(enrollment => enrollment.studentId._id)
      
      await this.broadcastNotification({
        ...data,
        userIds,
        metadata: {
          ...data.metadata,
          courseId,
          courseName: course.title
        }
      })

      // Send real-time update to course group
      if (data.type === this.types.ASSIGNMENT) {
        await signalrService.sendAssignmentUpdate(courseId, data.metadata.assignment, data.metadata.updateType)
      } else if (data.type === this.types.DISCUSSION) {
        await signalrService.sendDiscussionUpdate(courseId, data.metadata.discussion, data.metadata.updateType)
      }

    } catch (error) {
      logger.error('Failed to send course notification:', error)
      throw error
    }
  }

  // Send assignment-related notifications
  async sendAssignmentNotification(assignmentId, type, data = {}) {
    try {
      const Assignment = (await import('../models/Assignment.js')).default
      const assignment = await Assignment.findById(assignmentId)
        .populate('courseId', 'title enrolledStudents')
        .populate('instructorId', 'name')

      if (!assignment) {
        throw new Error('Assignment not found')
      }

      let notificationData = {}

      switch (type) {
        case 'created':
          notificationData = {
            type: this.types.ASSIGNMENT,
            title: 'New Assignment Available',
            message: `A new assignment "${assignment.title}" has been posted in ${assignment.courseId.title}`,
            priority: this.priorities.MEDIUM,
            actionUrl: `/assignments/${assignment._id}`,
            metadata: {
              assignmentId: assignment._id,
              courseId: assignment.courseId._id,
              updateType: 'created',
              assignment
            }
          }
          break

        case 'due_soon':
          notificationData = {
            type: this.types.ASSIGNMENT,
            title: 'Assignment Due Soon',
            message: `Assignment "${assignment.title}" is due in ${data.hoursRemaining} hours`,
            priority: this.priorities.HIGH,
            actionUrl: `/assignments/${assignment._id}`,
            metadata: {
              assignmentId: assignment._id,
              courseId: assignment.courseId._id,
              hoursRemaining: data.hoursRemaining
            }
          }
          break

        case 'graded':
          notificationData = {
            type: this.types.GRADE,
            title: 'Assignment Graded',
            message: `Your assignment "${assignment.title}" has been graded`,
            priority: this.priorities.MEDIUM,
            actionUrl: `/submissions/${data.submissionId}`,
            metadata: {
              assignmentId: assignment._id,
              submissionId: data.submissionId,
              grade: data.grade
            }
          }
          break
      }

      if (type === 'graded') {
        // Send to specific student
        await this.createNotification({
          userId: data.studentId,
          ...notificationData
        })
      } else {
        // Send to all course students
        await this.sendCourseNotification(assignment.courseId._id, notificationData)
      }

    } catch (error) {
      logger.error('Failed to send assignment notification:', error)
      throw error
    }
  }

  // Send discussion-related notifications
  async sendDiscussionNotification(discussionId, type, data = {}) {
    try {
      const Discussion = (await import('../models/Discussion.js')).default
      const discussion = await Discussion.findById(discussionId)
        .populate('courseId', 'title')
        .populate('createdBy', 'name')

      if (!discussion) {
        throw new Error('Discussion not found')
      }

      let notificationData = {}

      switch (type) {
        case 'created':
          notificationData = {
            type: this.types.DISCUSSION,
            title: 'New Discussion Started',
            message: `${discussion.createdBy.name} started a new discussion: "${discussion.title}"`,
            priority: this.priorities.LOW,
            actionUrl: `/discussions/${discussion._id}`,
            metadata: {
              discussionId: discussion._id,
              courseId: discussion.courseId._id,
              updateType: 'created',
              discussion
            }
          }
          break

        case 'replied':
          notificationData = {
            type: this.types.DISCUSSION,
            title: 'New Reply in Discussion',
            message: `${data.replyAuthor} replied to "${discussion.title}"`,
            priority: this.priorities.LOW,
            actionUrl: `/discussions/${discussion._id}`,
            metadata: {
              discussionId: discussion._id,
              courseId: discussion.courseId._id,
              replyId: data.replyId,
              updateType: 'replied'
            }
          }
          break
      }

      await this.sendCourseNotification(discussion.courseId._id, notificationData)

    } catch (error) {
      logger.error('Failed to send discussion notification:', error)
      throw error
    }
  }

  // Send certificate notification
  async sendCertificateNotification(certificateId) {
    try {
      const Certificate = (await import('../models/Certificate.js')).default
      const certificate = await Certificate.findById(certificateId)
        .populate('userId', 'name email')
        .populate('courseId', 'title')
        .populate('learningPathId', 'title')

      if (!certificate) {
        throw new Error('Certificate not found')
      }

      const resourceName = certificate.courseId?.title || certificate.learningPathId?.title || 'Achievement'

      await this.createNotification({
        userId: certificate.userId._id,
        type: this.types.CERTIFICATE,
        title: 'Certificate Issued',
        message: `Congratulations! Your certificate for "${resourceName}" has been issued.`,
        priority: this.priorities.HIGH,
        actionUrl: `/certificates/${certificate._id}`,
        channels: [this.channels.IN_APP, this.channels.EMAIL],
        metadata: {
          certificateId: certificate._id,
          certificateNumber: certificate.certificateNumber,
          resourceName
        }
      })

    } catch (error) {
      logger.error('Failed to send certificate notification:', error)
      throw error
    }
  }

  // Process scheduled notifications
  async processScheduledNotifications() {
    try {
      const scheduledNotifications = await Notification.find({
        status: 'pending',
        scheduleAt: { $lte: new Date() }
      })

      for (const notification of scheduledNotifications) {
        await this.sendNotification(notification)
      }

      logger.info(`Processed ${scheduledNotifications.length} scheduled notifications`)
    } catch (error) {
      logger.error('Failed to process scheduled notifications:', error)
    }
  }

  // Check if notification should be sent to channel based on user preferences
  shouldSendToChannel(channel, preferences, notification) {
    if (!preferences) return true

    // Check global channel preference
    if (preferences[`${channel}Notifications`] === false) {
      return false
    }

    // Check type-specific preferences
    if (preferences.types && preferences.types[notification.type] === false) {
      return false
    }

    // Check priority-based preferences
    if (preferences.minPriority) {
      const priorityLevels = {
        low: 1,
        medium: 2,
        high: 3,
        urgent: 4
      }
      
      const notificationLevel = priorityLevels[notification.priority] || 2
      const minLevel = priorityLevels[preferences.minPriority] || 2
      
      return notificationLevel >= minLevel
    }

    return true
  }

  // Get user with notification preferences
  async getUserWithPreferences(userId) {
    try {
      const User = (await import('../models/User.js')).default
      return await User.findById(userId).select('name email notificationPreferences')
    } catch (error) {
      logger.error('Failed to get user with preferences:', error)
      return null
    }
  }

  // Get email template based on notification type
  getEmailTemplate(type) {
    const templates = {
      [this.types.SYSTEM]: 'system-notification',
      [this.types.COURSE]: 'course-notification',
      [this.types.ASSIGNMENT]: 'assignment-notification',
      [this.types.DISCUSSION]: 'discussion-notification',
      [this.types.GRADE]: 'grade-notification',
      [this.types.ANNOUNCEMENT]: 'announcement-notification',
      [this.types.CERTIFICATE]: 'certificate-notification',
      [this.types.PAYMENT]: 'payment-notification'
    }

    return templates[type] || 'default-notification'
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { status: 'read', readAt: new Date() },
        { new: true }
      )

      if (!notification) {
        throw new Error('Notification not found')
      }

      return notification
    } catch (error) {
      logger.error('Failed to mark notification as read:', error)
      throw error
    }
  }

  // Get notification analytics
  async getAnalytics(filters = {}) {
    try {
      const matchStage = {}
      
      if (filters.startDate) {
        matchStage.createdAt = { $gte: new Date(filters.startDate) }
      }
      
      if (filters.endDate) {
        matchStage.createdAt = { 
          ...matchStage.createdAt, 
          $lte: new Date(filters.endDate) 
        }
      }
      
      if (filters.type) {
        matchStage.type = filters.type
      }

      const analytics = await Notification.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            sentNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
            readNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] }
            },
            failedNotifications: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            byType: {
              $push: {
                type: '$type',
                status: '$status',
                priority: '$priority'
              }
            }
          }
        }
      ])

      // Calculate type and priority distributions
      const typeDistribution = {}
      const priorityDistribution = {}
      
      if (analytics[0]?.byType) {
        analytics[0].byType.forEach(item => {
          typeDistribution[item.type] = (typeDistribution[item.type] || 0) + 1
          priorityDistribution[item.priority] = (priorityDistribution[item.priority] || 0) + 1
        })
      }

      return {
        ...analytics[0],
        typeDistribution,
        priorityDistribution,
        deliveryRate: analytics[0] ? 
          (analytics[0].sentNotifications / analytics[0].totalNotifications * 100).toFixed(2) : 0,
        readRate: analytics[0] ? 
          (analytics[0].readNotifications / analytics[0].sentNotifications * 100).toFixed(2) : 0
      }
    } catch (error) {
      logger.error('Failed to get notification analytics:', error)
      throw error
    }
  }
}

export default new NotificationService()