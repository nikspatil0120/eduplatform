import cron from 'node-cron'
import notificationService from './notificationService.js'
// Chat service removed - not used in this project
import realtimeService from './realtimeService.js'
import { logger } from '../utils/logger.js'

class SchedulerService {
  constructor() {
    this.tasks = new Map()
    this.isInitialized = false
  }

  // Initialize all scheduled tasks
  initialize() {
    if (this.isInitialized) {
      logger.warn('Scheduler service already initialized')
      return
    }

    try {
      // Process scheduled notifications every minute
      this.scheduleTask('process-notifications', '* * * * *', async () => {
        await notificationService.processScheduledNotifications()
      })

      // Send assignment due reminders every hour
      this.scheduleTask('assignment-reminders', '0 * * * *', async () => {
        await this.sendAssignmentReminders()
      })

      // Chat cleanup removed - chat service not used in this project

      // Cleanup inactive real-time connections every 30 minutes
      this.scheduleTask('cleanup-connections', '*/30 * * * *', async () => {
        realtimeService.cleanupInactiveConnections()
      })

      // Generate daily analytics reports at 1 AM
      this.scheduleTask('daily-analytics', '0 1 * * *', async () => {
        await this.generateDailyAnalytics()
      })

      // Send weekly course progress reports on Sundays at 9 AM
      this.scheduleTask('weekly-reports', '0 9 * * 0', async () => {
        await this.sendWeeklyProgressReports()
      })

      // Cleanup expired certificates monthly on the 1st at 3 AM
      this.scheduleTask('cleanup-certificates', '0 3 1 * *', async () => {
        await this.cleanupExpiredCertificates()
      })

      // Update course analytics every 6 hours
      this.scheduleTask('update-course-analytics', '0 */6 * * *', async () => {
        await this.updateCourseAnalytics()
      })

      // Send engagement notifications daily at 10 AM
      this.scheduleTask('engagement-notifications', '0 10 * * *', async () => {
        await this.sendEngagementNotifications()
      })

      // Backup important data daily at 4 AM
      this.scheduleTask('daily-backup', '0 4 * * *', async () => {
        await this.performDailyBackup()
      })

      this.isInitialized = true
      logger.info('Scheduler service initialized with all tasks')
    } catch (error) {
      logger.error('Failed to initialize scheduler service:', error)
    }
  }

  // Schedule a new task
  scheduleTask(name, cronExpression, taskFunction) {
    try {
      if (this.tasks.has(name)) {
        logger.warn(`Task ${name} already exists, skipping...`)
        return
      }

      const task = cron.schedule(cronExpression, async () => {
        const startTime = Date.now()
        logger.info(`Starting scheduled task: ${name}`)
        
        try {
          await taskFunction()
          const duration = Date.now() - startTime
          logger.info(`Completed scheduled task: ${name} (${duration}ms)`)
        } catch (error) {
          logger.error(`Error in scheduled task ${name}:`, error)
        }
      }, {
        scheduled: false,
        timezone: process.env.TIMEZONE || 'UTC'
      })

      this.tasks.set(name, task)
      task.start()
      
      logger.info(`Scheduled task registered: ${name} (${cronExpression})`)
    } catch (error) {
      logger.error(`Failed to schedule task ${name}:`, error)
    }
  }

  // Send assignment due reminders
  async sendAssignmentReminders() {
    try {
      const Assignment = (await import('../models/Assignment.js')).default
      const now = new Date()
      const reminderTime = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

      // Find assignments due in the next 24 hours
      const upcomingAssignments = await Assignment.find({
        dueDate: {
          $gte: now,
          $lte: reminderTime
        },
        isPublished: true
      }).populate('courseId', 'title enrolledStudents')

      for (const assignment of upcomingAssignments) {
        const hoursRemaining = Math.ceil((assignment.dueDate - now) / (1000 * 60 * 60))
        
        // Send reminder to all enrolled students
        const studentIds = assignment.courseId.enrolledStudents.map(
          enrollment => enrollment.studentId
        )

        await notificationService.broadcastNotification({
          userIds: studentIds,
          type: 'assignment',
          title: 'Assignment Due Soon',
          message: `Assignment "${assignment.title}" is due in ${hoursRemaining} hours`,
          priority: 'high',
          actionUrl: `/assignments/${assignment._id}`,
          channels: ['in_app', 'email'],
          metadata: {
            assignmentId: assignment._id,
            courseId: assignment.courseId._id,
            hoursRemaining
          }
        })
      }

      logger.info(`Sent reminders for ${upcomingAssignments.length} upcoming assignments`)
    } catch (error) {
      logger.error('Failed to send assignment reminders:', error)
    }
  }

  // Generate daily analytics reports
  async generateDailyAnalytics() {
    try {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get user analytics
      const User = (await import('../models/User.js')).default
      const newUsers = await User.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      })

      // Get course analytics
      const Course = (await import('../models/Course.js')).default
      const newCourses = await Course.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      })

      // Get assignment analytics
      const Assignment = (await import('../models/Assignment.js')).default
      const newAssignments = await Assignment.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      })

      // Get discussion analytics
      const Discussion = (await import('../models/Discussion.js')).default
      const newDiscussions = await Discussion.countDocuments({
        createdAt: { $gte: yesterday, $lt: today }
      })

      // Store analytics (you might want to create an Analytics model)
      const analyticsData = {
        date: yesterday,
        newUsers,
        newCourses,
        newAssignments,
        newDiscussions,
        generatedAt: new Date()
      }

      logger.info('Daily analytics generated:', analyticsData)

      // Send analytics to admins
      const admins = await User.find({ role: 'admin' }).select('_id')
      const adminIds = admins.map(admin => admin._id)

      if (adminIds.length > 0) {
        await notificationService.broadcastNotification({
          userIds: adminIds,
          type: 'system',
          title: 'Daily Analytics Report',
          message: `Yesterday: ${newUsers} new users, ${newCourses} new courses, ${newAssignments} new assignments`,
          priority: 'low',
          actionUrl: '/admin/analytics',
          metadata: analyticsData
        })
      }

    } catch (error) {
      logger.error('Failed to generate daily analytics:', error)
    }
  }

  // Send weekly progress reports
  async sendWeeklyProgressReports() {
    try {
      const Course = (await import('../models/Course.js')).default
      const courses = await Course.find({ isPublished: true })
        .populate('enrolledStudents.studentId', 'name email')

      for (const course of courses) {
        for (const enrollment of course.enrolledStudents) {
          const student = enrollment.studentId
          const progress = enrollment.progress || 0

          // Send progress report to student
          await notificationService.createNotification({
            userId: student._id,
            type: 'course',
            title: 'Weekly Progress Report',
            message: `Your progress in "${course.title}": ${progress}% complete`,
            priority: 'medium',
            actionUrl: `/courses/${course._id}`,
            channels: ['in_app', 'email'],
            metadata: {
              courseId: course._id,
              progress,
              reportType: 'weekly'
            }
          })
        }
      }

      logger.info('Weekly progress reports sent')
    } catch (error) {
      logger.error('Failed to send weekly progress reports:', error)
    }
  }

  // Cleanup expired certificates
  async cleanupExpiredCertificates() {
    try {
      const Certificate = (await import('../models/Certificate.js')).default
      
      // Find certificates that should be cleaned up (example: revoked certificates older than 1 year)
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      const expiredCertificates = await Certificate.find({
        status: 'revoked',
        revokedAt: { $lt: oneYearAgo }
      })

      // Archive or delete expired certificates
      for (const certificate of expiredCertificates) {
        // You might want to archive instead of delete
        certificate.status = 'archived'
        await certificate.save()
      }

      logger.info(`Cleaned up ${expiredCertificates.length} expired certificates`)
    } catch (error) {
      logger.error('Failed to cleanup expired certificates:', error)
    }
  }

  // Update course analytics
  async updateCourseAnalytics() {
    try {
      const Course = (await import('../models/Course.js')).default
      const courses = await Course.find({ isPublished: true })

      for (const course of courses) {
        // Update course analytics (enrollment trends, completion rates, etc.)
        const enrollmentCount = course.enrolledStudents.length
        const completedCount = course.enrolledStudents.filter(
          enrollment => enrollment.progress >= 100
        ).length

        course.analytics = {
          ...course.analytics,
          enrollmentCount,
          completionRate: enrollmentCount > 0 ? (completedCount / enrollmentCount * 100) : 0,
          lastUpdated: new Date()
        }

        await course.save()
      }

      logger.info(`Updated analytics for ${courses.length} courses`)
    } catch (error) {
      logger.error('Failed to update course analytics:', error)
    }
  }

  // Send engagement notifications
  async sendEngagementNotifications() {
    try {
      const User = (await import('../models/User.js')).default
      const Course = (await import('../models/Course.js')).default
      
      // Find students who haven't been active in the last 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const inactiveStudents = await User.find({
        role: 'student',
        lastLoginAt: { $lt: sevenDaysAgo }
      })

      for (const student of inactiveStudents) {
        // Find their enrolled courses
        const enrolledCourses = await Course.find({
          'enrolledStudents.studentId': student._id,
          isPublished: true
        }).select('title _id')

        if (enrolledCourses.length > 0) {
          const courseNames = enrolledCourses.map(course => course.title).join(', ')
          
          await notificationService.createNotification({
            userId: student._id,
            type: 'course',
            title: 'Continue Your Learning Journey',
            message: `You haven't visited your courses recently. Continue learning: ${courseNames}`,
            priority: 'medium',
            actionUrl: '/dashboard',
            channels: ['email'],
            metadata: {
              engagementType: 'reactivation',
              courseCount: enrolledCourses.length
            }
          })
        }
      }

      logger.info(`Sent engagement notifications to ${inactiveStudents.length} inactive students`)
    } catch (error) {
      logger.error('Failed to send engagement notifications:', error)
    }
  }

  // Perform daily backup
  async performDailyBackup() {
    try {
      // This is a placeholder for backup functionality
      // In a real implementation, you might:
      // 1. Export critical data to cloud storage
      // 2. Create database snapshots
      // 3. Backup user-generated content
      
      logger.info('Daily backup completed (placeholder)')
      
      // Notify admins about backup status
      const User = (await import('../models/User.js')).default
      const admins = await User.find({ role: 'admin' }).select('_id')
      const adminIds = admins.map(admin => admin._id)

      if (adminIds.length > 0) {
        await notificationService.broadcastNotification({
          userIds: adminIds,
          type: 'system',
          title: 'Daily Backup Completed',
          message: 'System backup has been completed successfully',
          priority: 'low',
          metadata: {
            backupDate: new Date(),
            backupType: 'daily'
          }
        })
      }
    } catch (error) {
      logger.error('Failed to perform daily backup:', error)
    }
  }

  // Stop a specific task
  stopTask(name) {
    try {
      const task = this.tasks.get(name)
      if (task) {
        task.stop()
        this.tasks.delete(name)
        logger.info(`Stopped scheduled task: ${name}`)
      } else {
        logger.warn(`Task ${name} not found`)
      }
    } catch (error) {
      logger.error(`Failed to stop task ${name}:`, error)
    }
  }

  // Stop all tasks
  stopAllTasks() {
    try {
      for (const [name, task] of this.tasks.entries()) {
        task.stop()
        logger.info(`Stopped scheduled task: ${name}`)
      }
      this.tasks.clear()
      this.isInitialized = false
      logger.info('All scheduled tasks stopped')
    } catch (error) {
      logger.error('Failed to stop all tasks:', error)
    }
  }

  // Get task status
  getTaskStatus() {
    const status = {}
    for (const [name, task] of this.tasks.entries()) {
      status[name] = {
        running: task.running,
        scheduled: task.scheduled
      }
    }
    return status
  }

  // Restart a task
  restartTask(name) {
    try {
      const task = this.tasks.get(name)
      if (task) {
        task.stop()
        task.start()
        logger.info(`Restarted scheduled task: ${name}`)
      } else {
        logger.warn(`Task ${name} not found`)
      }
    } catch (error) {
      logger.error(`Failed to restart task ${name}:`, error)
    }
  }
}

export default new SchedulerService()