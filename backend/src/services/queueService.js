import { logger } from '../utils/logger.js'

class QueueService {
  constructor() {
    this.isInitialized = true
    logger.info('Queue service initialized (no Redis)')
  }

  // Process jobs immediately without queuing
  async addJob(queueName, jobType, data, options = {}) {
    return this.processJobImmediately(jobType, data)
  }

  // Process job immediately
  async processJobImmediately(jobType, data) {
    logger.info(`Processing job immediately: ${jobType}`)
    
    try {
      switch (jobType) {
        case 'send-email':
          logger.info('Email would be sent immediately:', data.to)
          break
        case 'send-notification':
          logger.info('Notification would be sent immediately:', data.title)
          break
        default:
          logger.info(`Job ${jobType} processed immediately`)
      }
      return { id: Date.now(), processed: true }
    } catch (error) {
      logger.error('Job processing failed:', error)
      throw error
    }
  }

  // Convenience methods
  async sendEmail(emailData, options = {}) {
    return await this.addJob('email', 'send-email', emailData, options)
  }

  async sendNotification(notificationData, options = {}) {
    return await this.addJob('notification', 'send-notification', notificationData, options)
  }

  async generateAnalytics(analyticsData, options = {}) {
    return await this.addJob('analytics', 'generate-analytics', analyticsData, options)
  }

  // Mock queue management methods
  async getQueueStats(queueName) {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0
    }
  }

  async getAllQueueStats() {
    return {
      email: await this.getQueueStats('email'),
      notification: await this.getQueueStats('notification'),
      analytics: await this.getQueueStats('analytics')
    }
  }

  async pauseQueue(queueName) {
    logger.info(`Queue ${queueName} paused (no-op)`)
  }

  async resumeQueue(queueName) {
    logger.info(`Queue ${queueName} resumed (no-op)`)
  }

  async cleanQueue(queueName, grace = 5000) {
    logger.info(`Queue ${queueName} cleaned (no-op)`)
  }

  async getJob(queueName, jobId) {
    return null
  }

  async removeJob(queueName, jobId) {
    logger.info(`Job ${jobId} removed from queue ${queueName} (no-op)`)
  }

  // No-op shutdown
  async close() {
    logger.info('Queue service closed')
  }

  // Always healthy since no external dependencies
  isHealthy() {
    return true
  }

  getStatus() {
    return {
      initialized: true,
      redisStatus: 'not-used',
      queues: ['email', 'notification', 'analytics'],
      healthy: true
    }
  }
}

export default new QueueService()