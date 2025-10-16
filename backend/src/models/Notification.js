import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  type: {
    type: String,
    enum: [
      // Course related
      'course_enrollment', 'course_completion', 'course_update', 'new_course_available',
      // Assignment related
      'assignment_created', 'assignment_due_soon', 'assignment_graded', 'assignment_feedback',
      // Discussion related
      'discussion_reply', 'discussion_mention', 'discussion_like', 'new_discussion',
      // System related
      'system_maintenance', 'account_update', 'password_changed', 'email_verified',
      // Social related
      'peer_review_request', 'peer_review_completed', 'achievement_unlocked', 'certificate_issued',
      // Instructor related
      'new_student_enrolled', 'assignment_submitted', 'question_asked',
      // General
      'announcement', 'reminder', 'welcome', 'custom', 'info'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  shortMessage: {
    type: String,
    maxlength: [100, 'Short message cannot exceed 100 characters']
  },
  
  // Rich Content
  content: {
    html: String,
    markdown: String,
    attachments: [{
      fileName: String,
      fileUrl: String,
      mimeType: String
    }],
    actionButtons: [{
      text: String,
      url: String,
      style: {
        type: String,
        enum: ['primary', 'secondary', 'success', 'warning', 'danger'],
        default: 'primary'
      }
    }]
  },
  
  // Context and References
  context: {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment'
    },
    discussionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Discussion'
    },
    certificateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate'
    },
    learningPathId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningPath'
    },
    relatedUrl: String,
    metadata: {
      type: Map,
      of: String
    }
  },
  
  // Delivery and Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true
  },
  channels: [{
    type: {
      type: String,
      enum: ['in_app', 'email', 'push', 'sms', 'webhook'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    sentAt: Date,
    deliveredAt: Date,
    failureReason: String,
    externalId: String // For tracking with external services
  }],
  
  // Scheduling
  scheduledFor: {
    type: Date,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  
  // User Interaction
  readAt: Date,
  clickedAt: Date,
  dismissedAt: Date,
  actionTaken: {
    action: String,
    takenAt: Date,
    metadata: {
      type: Map,
      of: String
    }
  },
  
  // Personalization
  personalization: {
    userName: String,
    courseName: String,
    instructorName: String,
    customData: {
      type: Map,
      of: String
    }
  },
  
  // Grouping and Batching
  groupId: {
    type: String,
    index: true
  },
  batchId: {
    type: String,
    index: true
  },
  
  // Analytics
  analytics: {
    openRate: Number,
    clickRate: Number,
    conversionRate: Number,
    engagementScore: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for performance
notificationSchema.index({ recipientId: 1, status: 1, createdAt: -1 })
notificationSchema.index({ recipientId: 1, readAt: 1 })
notificationSchema.index({ type: 1, scheduledFor: 1 })
notificationSchema.index({ status: 1, scheduledFor: 1 })
notificationSchema.index({ expiresAt: 1 })

// Virtual for recipient details
notificationSchema.virtual('recipient', {
  ref: 'User',
  localField: 'recipientId',
  foreignField: '_id',
  justOne: true
})

// Virtual for sender details
notificationSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
})

// Virtual for checking if notification is read
notificationSchema.virtual('isRead').get(function() {
  return !!this.readAt
})

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt
})

// Virtual for checking if notification is scheduled
notificationSchema.virtual('isScheduled').get(function() {
  return this.scheduledFor && new Date() < this.scheduledFor
})

// Virtual for time until scheduled
notificationSchema.virtual('timeUntilScheduled').get(function() {
  if (!this.scheduledFor) return null
  const now = new Date()
  const scheduled = new Date(this.scheduledFor)
  return scheduled > now ? scheduled - now : 0
})

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set short message if not provided
  if (!this.shortMessage && this.message) {
    this.shortMessage = this.message.length > 100 
      ? this.message.substring(0, 97) + '...'
      : this.message
  }
  
  // Set expiry if not provided (default 30 days)
  if (!this.expiresAt) {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    this.expiresAt = expiry
  }
  
  next()
})

// Methods
notificationSchema.methods.markAsRead = function() {
  this.readAt = new Date()
  this.status = 'read'
  return this.save()
}

notificationSchema.methods.markAsClicked = function() {
  this.clickedAt = new Date()
  return this.save()
}

notificationSchema.methods.dismiss = function() {
  this.dismissedAt = new Date()
  return this.save()
}

notificationSchema.methods.takeAction = function(action, metadata = {}) {
  this.actionTaken = {
    action,
    takenAt: new Date(),
    metadata
  }
  return this.save()
}

notificationSchema.methods.updateChannelStatus = function(channelType, status, metadata = {}) {
  const channel = this.channels.find(c => c.type === channelType)
  if (channel) {
    channel.status = status
    if (status === 'sent') {
      channel.sentAt = new Date()
    } else if (status === 'delivered') {
      channel.deliveredAt = new Date()
    } else if (status === 'failed') {
      channel.failureReason = metadata.reason
    }
    
    if (metadata.externalId) {
      channel.externalId = metadata.externalId
    }
  }
  
  // Update overall status based on channel statuses
  const allChannelsSent = this.channels.every(c => ['sent', 'delivered'].includes(c.status))
  if (allChannelsSent && this.status === 'pending') {
    this.status = 'sent'
  }
  
  return this.save()
}

notificationSchema.methods.cancel = function() {
  this.status = 'cancelled'
  return this.save()
}

notificationSchema.methods.reschedule = function(newDate) {
  this.scheduledFor = newDate
  this.status = 'pending'
  return this.save()
}

// Static methods
notificationSchema.statics.findByRecipient = function(recipientId, options = {}) {
  const query = { recipientId }
  
  if (options.unreadOnly) {
    query.readAt = null
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  if (options.priority) {
    query.priority = options.priority
  }
  
  return this.find(query)
    .populate('senderId', 'name profile.avatar')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
}

notificationSchema.statics.findPending = function(options = {}) {
  const query = {
    status: 'pending',
    $or: [
      { scheduledFor: null },
      { scheduledFor: { $lte: new Date() } }
    ]
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  if (options.priority) {
    query.priority = options.priority
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: 1 })
    .limit(options.limit || 100)
}

notificationSchema.statics.markAllAsRead = function(recipientId, options = {}) {
  const query = { 
    recipientId,
    readAt: null
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  if (options.before) {
    query.createdAt = { $lte: new Date(options.before) }
  }
  
  return this.updateMany(query, {
    readAt: new Date(),
    status: 'read'
  })
}

notificationSchema.statics.getUnreadCount = function(recipientId, options = {}) {
  const query = { 
    recipientId,
    readAt: null,
    status: { $ne: 'cancelled' }
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  return this.countDocuments(query)
}

notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: { $in: ['read', 'dismissed', 'cancelled'] }
  })
}

notificationSchema.statics.getAnalytics = async function(options = {}) {
  const matchStage = {}
  
  if (options.recipientId) {
    matchStage.recipientId = mongoose.Types.ObjectId(options.recipientId)
  }
  
  if (options.type) {
    matchStage.type = options.type
  }
  
  if (options.dateRange) {
    matchStage.createdAt = {
      $gte: new Date(options.dateRange.start),
      $lte: new Date(options.dateRange.end)
    }
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        readNotifications: {
          $sum: { $cond: [{ $ne: ['$readAt', null] }, 1, 0] }
        },
        clickedNotifications: {
          $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] }
        },
        dismissedNotifications: {
          $sum: { $cond: [{ $ne: ['$dismissedAt', null] }, 1, 0] }
        },
        byType: {
          $push: '$type'
        },
        byPriority: {
          $push: '$priority'
        }
      }
    }
  ])
  
  const result = stats[0] || {
    totalNotifications: 0,
    readNotifications: 0,
    clickedNotifications: 0,
    dismissedNotifications: 0,
    byType: [],
    byPriority: []
  }
  
  // Calculate rates
  result.readRate = result.totalNotifications > 0 
    ? (result.readNotifications / result.totalNotifications) * 100 
    : 0
  
  result.clickRate = result.totalNotifications > 0 
    ? (result.clickedNotifications / result.totalNotifications) * 100 
    : 0
  
  // Group by type and priority
  result.typeDistribution = {}
  result.byType.forEach(type => {
    result.typeDistribution[type] = (result.typeDistribution[type] || 0) + 1
  })
  
  result.priorityDistribution = {}
  result.byPriority.forEach(priority => {
    result.priorityDistribution[priority] = (result.priorityDistribution[priority] || 0) + 1
  })
  
  delete result.byType
  delete result.byPriority
  
  return result
}

export default mongoose.model('Notification', notificationSchema)