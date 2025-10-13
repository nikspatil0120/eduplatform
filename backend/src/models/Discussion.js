import mongoose from 'mongoose'

const discussionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Discussion title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['general', 'announcement', 'question', 'assignment_help', 'study_group'],
    default: 'general',
    index: true
  },
  category: {
    type: String,
    enum: ['lecture', 'assignment', 'exam', 'project', 'general', 'technical_help'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  visibility: {
    type: String,
    enum: ['public', 'students_only', 'instructors_only', 'private'],
    default: 'public',
    index: true
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        votedAt: {
          type: Date,
          default: Date.now
        }
      }]
    }],
    allowMultipleChoices: {
      type: Boolean,
      default: false
    },
    expiresAt: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  },
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    participantCount: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    averageRating: {
      type: Number,
      default: 0
    }
  },
  moderation: {
    isReported: {
      type: Boolean,
      default: false
    },
    reportCount: {
      type: Number,
      default: 0
    },
    isApproved: {
      type: Boolean,
      default: true
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: Date,
    moderationNotes: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
discussionSchema.index({ courseId: 1, createdAt: -1 })
discussionSchema.index({ courseId: 1, isPinned: -1, createdAt: -1 })
discussionSchema.index({ type: 1, visibility: 1 })
discussionSchema.index({ tags: 1 })
discussionSchema.index({ 'analytics.lastActivity': -1 })

// Virtual for replies
discussionSchema.virtual('replies', {
  ref: 'DiscussionReply',
  localField: '_id',
  foreignField: 'discussionId'
})

// Virtual for creator details
discussionSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
})

// Virtual for checking if discussion is active
discussionSchema.virtual('isActive').get(function() {
  return !this.isLocked && this.moderation.isApproved
})

// Pre-save middleware
discussionSchema.pre('save', function(next) {
  // Update last activity
  if (this.isModified() && !this.isNew) {
    this.analytics.lastActivity = new Date()
  }
  
  next()
})

// Methods
discussionSchema.methods.pin = function() {
  this.isPinned = true
  return this.save()
}

discussionSchema.methods.unpin = function() {
  this.isPinned = false
  return this.save()
}

discussionSchema.methods.lock = function(moderatorId, reason) {
  this.isLocked = true
  this.moderation.moderatedBy = moderatorId
  this.moderation.moderatedAt = new Date()
  this.moderation.moderationNotes = reason
  return this.save()
}

discussionSchema.methods.unlock = function(moderatorId) {
  this.isLocked = false
  this.moderation.moderatedBy = moderatorId
  this.moderation.moderatedAt = new Date()
  return this.save()
}

discussionSchema.methods.addView = function() {
  this.analytics.viewCount += 1
  this.analytics.lastActivity = new Date()
  return this.save()
}

discussionSchema.methods.updateAnalytics = async function() {
  const DiscussionReply = mongoose.model('DiscussionReply')
  
  const replies = await DiscussionReply.find({ discussionId: this._id })
  
  this.analytics.replyCount = replies.length
  
  // Count unique participants
  const participants = new Set()
  participants.add(this.createdBy.toString())
  replies.forEach(reply => participants.add(reply.authorId.toString()))
  this.analytics.participantCount = participants.size
  
  // Update last activity
  if (replies.length > 0) {
    const lastReply = replies.sort((a, b) => b.createdAt - a.createdAt)[0]
    this.analytics.lastActivity = lastReply.createdAt
  }
  
  return this.save()
}

discussionSchema.methods.votePoll = function(userId, optionIndex) {
  if (!this.poll || !this.poll.isActive) {
    throw new Error('Poll is not active')
  }
  
  if (this.poll.expiresAt && new Date() > this.poll.expiresAt) {
    throw new Error('Poll has expired')
  }
  
  if (optionIndex >= this.poll.options.length) {
    throw new Error('Invalid option')
  }
  
  // Check if user already voted
  const hasVoted = this.poll.options.some(option => 
    option.votes.some(vote => vote.userId.toString() === userId.toString())
  )
  
  if (hasVoted && !this.poll.allowMultipleChoices) {
    throw new Error('User has already voted')
  }
  
  // Add vote
  this.poll.options[optionIndex].votes.push({
    userId,
    votedAt: new Date()
  })
  
  return this.save()
}

// Static methods
discussionSchema.statics.findByCourse = function(courseId, options = {}) {
  const query = { courseId }
  
  if (options.type) {
    query.type = options.type
  }
  
  if (options.visibility) {
    query.visibility = options.visibility
  }
  
  if (options.tags && options.tags.length > 0) {
    query.tags = { $in: options.tags }
  }
  
  const sort = {}
  if (options.sortBy === 'activity') {
    sort['analytics.lastActivity'] = -1
  } else if (options.sortBy === 'replies') {
    sort['analytics.replyCount'] = -1
  } else {
    sort.isPinned = -1
    sort.createdAt = -1
  }
  
  return this.find(query)
    .populate('createdBy', 'name profile.avatar role')
    .sort(sort)
    .limit(options.limit || 20)
    .skip(options.skip || 0)
}

discussionSchema.statics.search = function(courseId, searchTerm, options = {}) {
  const query = {
    courseId,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } }
    ]
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  return this.find(query)
    .populate('createdBy', 'name profile.avatar role')
    .sort({ 'analytics.lastActivity': -1 })
    .limit(options.limit || 10)
}

discussionSchema.statics.getTrendingDiscussions = function(courseId, days = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  
  return this.find({
    courseId,
    createdAt: { $gte: startDate },
    'moderation.isApproved': true
  })
  .sort({ 'analytics.replyCount': -1, 'analytics.viewCount': -1 })
  .limit(10)
  .populate('createdBy', 'name profile.avatar role')
}

export default mongoose.model('Discussion', discussionSchema)