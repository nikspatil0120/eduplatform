import { ServiceBusClient } from '@azure/service-bus'
import { logger } from '../utils/logger.js'

class SignalRService {
  constructor() {
    this.connectionString = process.env.AZURE_SIGNALR_CONNECTION_STRING
    this.hubName = process.env.AZURE_SIGNALR_HUB_NAME || 'eduplatform'
    this.serviceBusClient = null
    
    if (process.env.AZURE_SERVICE_BUS_CONNECTION_STRING) {
      this.serviceBusClient = new ServiceBusClient(process.env.AZURE_SERVICE_BUS_CONNECTION_STRING)
    }
  }

  // Generate SignalR connection info for client
  async getConnectionInfo(userId, groups = []) {
    try {
      const endpoint = `https://${process.env.AZURE_SIGNALR_SERVICE_NAME}.service.signalr.net`
      const accessKey = process.env.AZURE_SIGNALR_ACCESS_KEY
      
      if (!endpoint || !accessKey) {
        throw new Error('SignalR configuration missing')
      }

      // Generate access token for user
      const token = this.generateAccessToken(userId, groups)
      
      return {
        url: `${endpoint}/client/?hub=${this.hubName}`,
        accessToken: token
      }
    } catch (error) {
      logger.error('SignalR connection info generation failed:', error)
      throw error
    }
  }

  // Generate JWT token for SignalR authentication
  generateAccessToken(userId, groups = []) {
    const jwt = require('jsonwebtoken')
    const payload = {
      aud: `https://${process.env.AZURE_SIGNALR_SERVICE_NAME}.service.signalr.net/client`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
      'asrs.s.uid': userId,
      'asrs.s.groups': groups
    }
    
    return jwt.sign(payload, process.env.AZURE_SIGNALR_ACCESS_KEY, { algorithm: 'HS256' })
  }

  // Send message to specific user
  async sendToUser(userId, method, ...args) {
    try {
      const message = {
        target: method,
        arguments: args
      }
      
      await this.sendSignalRMessage('sendToUser', {
        userId,
        message
      })
      
      logger.info(`Message sent to user ${userId}:`, { method, args })
    } catch (error) {
      logger.error('Failed to send message to user:', error)
      throw error
    }
  }

  // Send message to group (e.g., course participants)
  async sendToGroup(groupName, method, ...args) {
    try {
      const message = {
        target: method,
        arguments: args
      }
      
      await this.sendSignalRMessage('sendToGroup', {
        group: groupName,
        message
      })
      
      logger.info(`Message sent to group ${groupName}:`, { method, args })
    } catch (error) {
      logger.error('Failed to send message to group:', error)
      throw error
    }
  }

  // Add user to group
  async addUserToGroup(userId, groupName) {
    try {
      await this.sendSignalRMessage('addToGroup', {
        userId,
        group: groupName
      })
      
      logger.info(`User ${userId} added to group ${groupName}`)
    } catch (error) {
      logger.error('Failed to add user to group:', error)
      throw error
    }
  }

  // Remove user from group
  async removeUserFromGroup(userId, groupName) {
    try {
      await this.sendSignalRMessage('removeFromGroup', {
        userId,
        group: groupName
      })
      
      logger.info(`User ${userId} removed from group ${groupName}`)
    } catch (error) {
      logger.error('Failed to remove user from group:', error)
      throw error
    }
  }

  // Send real-time notification
  async sendNotification(userId, notification) {
    try {
      await this.sendToUser(userId, 'notification', {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt
      })
    } catch (error) {
      logger.error('Failed to send real-time notification:', error)
    }
  }

  // Send chat message
  async sendChatMessage(courseId, message) {
    try {
      await this.sendToGroup(`course_${courseId}`, 'chatMessage', {
        id: message._id,
        courseId: message.courseId,
        senderId: message.senderId,
        senderName: message.senderName,
        content: message.content,
        timestamp: message.createdAt,
        type: message.type || 'text'
      })
    } catch (error) {
      logger.error('Failed to send chat message:', error)
    }
  }

  // Send live class update
  async sendLiveClassUpdate(courseId, update) {
    try {
      await this.sendToGroup(`course_${courseId}`, 'liveClassUpdate', {
        type: update.type, // 'started', 'ended', 'updated'
        classId: update.classId,
        title: update.title,
        startTime: update.startTime,
        endTime: update.endTime,
        meetingUrl: update.meetingUrl,
        timestamp: new Date()
      })
    } catch (error) {
      logger.error('Failed to send live class update:', error)
    }
  }

  // Send assignment update
  async sendAssignmentUpdate(courseId, assignment, type) {
    try {
      await this.sendToGroup(`course_${courseId}`, 'assignmentUpdate', {
        type, // 'created', 'updated', 'graded'
        assignmentId: assignment._id,
        title: assignment.title,
        dueDate: assignment.dueDate,
        timestamp: new Date()
      })
    } catch (error) {
      logger.error('Failed to send assignment update:', error)
    }
  }

  // Send discussion update
  async sendDiscussionUpdate(courseId, discussion, type) {
    try {
      await this.sendToGroup(`course_${courseId}`, 'discussionUpdate', {
        type, // 'created', 'replied', 'pinned'
        discussionId: discussion._id,
        title: discussion.title,
        authorName: discussion.createdBy?.name,
        timestamp: new Date()
      })
    } catch (error) {
      logger.error('Failed to send discussion update:', error)
    }
  }

  // Internal method to send messages via Service Bus or HTTP
  async sendSignalRMessage(action, data) {
    if (this.serviceBusClient) {
      // Use Service Bus for reliable message delivery
      const sender = this.serviceBusClient.createSender('signalr-messages')
      await sender.sendMessages({
        body: { action, data },
        messageId: `${Date.now()}-${Math.random()}`
      })
      await sender.close()
    } else {
      // Direct HTTP call to SignalR REST API (fallback)
      const axios = require('axios')
      const endpoint = `https://${process.env.AZURE_SIGNALR_SERVICE_NAME}.service.signalr.net`
      
      await axios.post(`${endpoint}/api/v1/hubs/${this.hubName}/${action}`, data, {
        headers: {
          'Authorization': `Bearer ${this.generateServiceToken()}`,
          'Content-Type': 'application/json'
        }
      })
    }
  }

  // Generate service token for REST API calls
  generateServiceToken() {
    const jwt = require('jsonwebtoken')
    const payload = {
      aud: `https://${process.env.AZURE_SIGNALR_SERVICE_NAME}.service.signalr.net/api/v1/hubs/${this.hubName}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300 // 5 minutes
    }
    
    return jwt.sign(payload, process.env.AZURE_SIGNALR_ACCESS_KEY, { algorithm: 'HS256' })
  }

  // Cleanup resources
  async close() {
    if (this.serviceBusClient) {
      await this.serviceBusClient.close()
    }
  }
}

export default new SignalRService()