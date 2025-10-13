import mongoose from 'mongoose'

const discussionReplySchema = new mongoose.Schema({
  discussionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discussion',
    required: true,
    index: true
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: [true, 'Reply content is required'],
    maxlength: [5000, 'Reply content cannot exceed 5000 characters']
  },
  parentReplyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DiscussionReply',
    default: null,
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
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    notified: {
      type: Boolean,
      default: false
    }
  }],
  reactions: [{
    type: {
      type: String,
      enum: ['like', 'love', 'helpful', 'insightful', 'confused'],
      required: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isInstructorResponse: {
    type: Boolean,
    default: false
  },
  isBestAnswer: {
    type: Boolean,
    default: false
  },
  markedAsBestBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  markedAsBestAt: Date,
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
  },
  analytics: {
    reactionCount: {
      type: Number,
      default: 0
    },
    replyCount: {
      type: Number,
      default: 0
    },
    helpfulVotes: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
discussionReplySchema.index({ discussionId: 1, createdAt: 1 })
discussionReplySchema.index({ authorId: 1, createdAt: -1 })
discussionReplySchema.index({ parentReplyId: 1 })
discussionReplySchema.index({ isBestAnswer: 1 })
discussionReplySchema.index({ isInstructorResponse: 1 })

// Virtual for author details
discussionReplySchema.virtual('author', {
  ref: 'User',
  localField: 'authorId',
  foreignField: '_id',
  justOne: true
})

// Virtual for nested replies
discussionReplySchema.virtual('replies', {
  ref: 'DiscussionReply',
  localField: '_id',
  foreignField: 'parentReplyId'
})

// Virtual for discussion details
discussionReplySchema.virtual('discussion', {
  ref: 'Discussion',
  localField: 'discussionId',
  foreignField: '_id',
  justOne: true
})

// Virtual for checking if reply is a thread starter
discussionReplySchema.virtual('isThreadStarter').get(function() {
  return this.parentReplyId === null
})

// Virtual for reaction summary
discussionReplySchema.virtual('reactionSummary').get(function() {
  const summary = {}
  this.reactions.forEach(reaction => {
    summary[reaction.type] = (summary[reaction.type] || 0) + 1
  })
  return summary
})

// Pre-save middleware
discussionReplySchema.pre('save', async function(next) {
  // Set instructor response flag
  if (this.isNew) {
    const User = mongoose.model('User')
    const author = await User.findById(this.authorId)
    if (author && (author.role === 'instructor' || author.role === 'admin')) {
      this.isInstructorResponse = true
    }
  }
  
  // Update analytics
  this.analytics.reactionCount = this.reactions.length
  this.analytics.helpfulVotes = this.reactions.filter(r => r.type === 'helpful').length
  
  next()
})

// Post-save middleware to update discussion analytics
discussionReplySchema.post('save', async function() {
  const Discussion = mongoose.model('Discussion')
  const discussion = await Discussion.findById(this.discussionId)
  if (discussion) {
    await discussion.updateAnalytics()
  }
})

// Methods
discussionReplySchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString())
  
  // Add new reaction
  this.reactions.push({
    type: reactionType,
    userId,
    createdAt: new Date()
  })
  
  return this.save()
}

discussionReplySchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString())
  return this.save()
}

discussionReplySchema.methods.edit = function(newContent, reason) {
  // Save to edit history
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
    reason
  })
  
  this.content = newContent
  this.isEdited = true
  
  return this.save()
}

discussionReplySchema.methods.markAsBestAnswer = function(markedBy) {
  this.isBestAnswer = true
  this.markedAsBestBy = markedBy
  this.markedAsBestAt = new Date()
  
  return this.save()
}

discussionReplySchema.methods.unmarkAsBestAnswer = function() {
  this.isBestAnswer = false
  this.markedAsBestBy = undefined
  this.markedAsBestAt = undefined
  
  return this.save()
}

discussionReplySchema.methods.softDelete = function(deletedBy, reason) {
  this.isDeleted = true
  this.deletedAt = new Date()
  this.deletedBy = deletedBy
  this.moderation.moderationNotes = reason
  
  return this.save()
}

discussionReplySchema.methods.restore = function() {
  this.isDeleted = false
  this.deletedAt = undefined
  this.deletedBy = undefined
  
  return this.save()
}

// Static methods
discussionReplySchema.statics.findByDiscussion = function(discussionId, options = {}) {
  const query = { 
    discussionId,
    isDeleted: false
  }
  
  if (options.parentOnly) {
    query.parentReplyId = null
  }
  
  if (options.parentReplyId) {
    query.parentReplyId = options.parentReplyId
  }
  
  const sort = {}
  if (options.sortBy === 'helpful') {
    sort['analytics.helpfulVotes'] = -1
  } else if (options.sortBy === 'reactions') {
    sort['analytics.reactionCount'] = -1
  } else {
    sort.isBestAnswer = -1
    sort.isInstructorResponse = -1
    sort.createdAt = 1
  }
  
  return this.find(query)
    .populate('authorId', 'name profile.avatar role')
    .populate('markedAsBestBy', 'name')
    .sort(sort)
    .limit(options.limit || 50)
}

discussionReplySchema.statics.findThreaded = async function(discussionId, options = {}) {
  // Get all replies for the discussion
  const replies = await this.find({ 
    discussionId, 
    isDeleted: false 
  })
  .populate('authorId', 'name profile.avatar role')
  .populate('markedAsBestBy', 'name')
  .sort({ createdAt: 1 })
  
  // Build threaded structure
  const replyMap = new Map()
  const rootReplies = []
  
  replies.forEach(reply => {
    replyMap.set(reply._id.toString(), { ...reply.toObject(), children: [] })
  })
  
  replies.forEach(reply => {
    const replyObj = replyMap.get(reply._id.toString())
    
    if (reply.parentReplyId) {
      const parent = replyMap.get(reply.parentReplyId.toString())
      if (parent) {
        parent.children.push(replyObj)
      }
    } else {
      rootReplies.push(replyObj)
    }
  })
  
  return rootReplies
}

discussionReplySchema.statics.findByAuthor = function(authorId, options = {}) {
  const query = { 
    authorId,
    isDeleted: false
  }
  
  if (options.discussionId) {
    query.discussionId = options.discussionId
  }
  
  return this.find(query)
    .populate('discussionId', 'title courseId')
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
}

discussionReplySchema.statics.getPopularReplies = function(discussionId, limit = 5) {
  return this.find({ 
    discussionId,
    isDeleted: false
  })
  .sort({ 
    'analytics.helpfulVotes': -1, 
    'analytics.reactionCount': -1 
  })
  .limit(limit)
  .populate('authorId', 'name profile.avatar role')
}

export default mongoose.model('DiscussionReply', discussionReplySchema)