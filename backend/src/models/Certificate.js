import mongoose from 'mongoose'
import crypto from 'crypto'

const certificateSchema = new mongoose.Schema({
  certificateId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['completion', 'achievement', 'participation', 'excellence'],
    default: 'completion',
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'issued', 'revoked', 'expired'],
    default: 'pending',
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revocationReason: String,
  
  // Certificate Content
  title: {
    type: String,
    required: true
  },
  description: String,
  recipientName: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  instructorName: {
    type: String,
    required: true
  },
  organizationName: {
    type: String,
    default: 'EduPlatform'
  },
  
  // Achievement Details
  completionDate: {
    type: Date,
    required: true
  },
  finalGrade: {
    type: Number,
    min: 0,
    max: 100
  },
  letterGrade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F']
  },
  creditsEarned: {
    type: Number,
    default: 0
  },
  hoursCompleted: {
    type: Number,
    default: 0
  },
  
  // Skills and Competencies
  skillsAcquired: [{
    skill: String,
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    }
  }],
  competencies: [{
    name: String,
    description: String,
    achieved: {
      type: Boolean,
      default: true
    }
  }],
  
  // Digital Certificate Files
  files: {
    pdfUrl: String,
    imageUrl: String,
    badgeUrl: String,
    qrCodeUrl: String
  },
  
  // Verification
  verificationCode: {
    type: String,
    unique: true,
    required: true
  },
  verificationUrl: String,
  digitalSignature: String,
  blockchainHash: String, // For blockchain verification (future)
  
  // Template and Design
  template: {
    templateId: {
      type: String,
      default: 'default'
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    primaryColor: {
      type: String,
      default: '#2563eb'
    },
    fontFamily: {
      type: String,
      default: 'Arial'
    },
    logoUrl: String,
    backgroundImageUrl: String
  },
  
  // Metadata
  metadata: {
    courseVersion: String,
    curriculumVersion: String,
    assessmentScores: [{
      assessmentName: String,
      score: Number,
      maxScore: Number,
      percentage: Number
    }],
    totalAssignments: Number,
    completedAssignments: Number,
    totalQuizzes: Number,
    completedQuizzes: Number,
    participationScore: Number,
    engagementMetrics: {
      totalTimeSpent: Number, // in minutes
      videosWatched: Number,
      discussionPosts: Number,
      peerInteractions: Number
    }
  },
  
  // Sharing and Privacy
  isPublic: {
    type: Boolean,
    default: false
  },
  shareableLink: String,
  socialMediaShared: [{
    platform: {
      type: String,
      enum: ['linkedin', 'twitter', 'facebook', 'instagram']
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics
  analytics: {
    viewCount: {
      type: Number,
      default: 0
    },
    downloadCount: {
      type: Number,
      default: 0
    },
    verificationCount: {
      type: Number,
      default: 0
    },
    shareCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    lastDownloaded: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
certificateSchema.index({ userId: 1, courseId: 1 }, { unique: true })
certificateSchema.index({ status: 1, issuedAt: -1 })
certificateSchema.index({ type: 1, status: 1 })
certificateSchema.index({ expiresAt: 1 })
certificateSchema.index({ verificationCode: 1 })

// Virtual for user details
certificateSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
})

// Virtual for course details
certificateSchema.virtual('course', {
  ref: 'Course',
  localField: 'courseId',
  foreignField: '_id',
  justOne: true
})

// Virtual for instructor details
certificateSchema.virtual('instructor', {
  ref: 'User',
  localField: 'instructorId',
  foreignField: '_id',
  justOne: true
})

// Virtual for checking if certificate is valid
certificateSchema.virtual('isValid').get(function() {
  if (this.status === 'revoked') return false
  if (this.expiresAt && new Date() > this.expiresAt) return false
  return this.status === 'issued'
})

// Virtual for checking if certificate is expired
certificateSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt
})

// Virtual for days until expiration
certificateSchema.virtual('daysUntilExpiration').get(function() {
  if (!this.expiresAt) return null
  const now = new Date()
  const expiry = new Date(this.expiresAt)
  const diffTime = expiry - now
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// Pre-save middleware
certificateSchema.pre('save', function(next) {
  // Generate certificate ID if not exists
  if (!this.certificateId) {
    this.certificateId = `CERT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`
  }
  
  // Generate verification code if not exists
  if (!this.verificationCode) {
    this.verificationCode = crypto.randomBytes(16).toString('hex').toUpperCase()
  }
  
  // Generate verification URL
  if (!this.verificationUrl) {
    this.verificationUrl = `${process.env.FRONTEND_URL}/verify-certificate/${this.verificationCode}`
  }
  
  // Generate shareable link if public
  if (this.isPublic && !this.shareableLink) {
    this.shareableLink = `${process.env.FRONTEND_URL}/certificate/${this.certificateId}`
  }
  
  // Set letter grade based on final grade
  if (this.finalGrade !== null && this.finalGrade !== undefined) {
    if (this.finalGrade >= 97) this.letterGrade = 'A+'
    else if (this.finalGrade >= 93) this.letterGrade = 'A'
    else if (this.finalGrade >= 90) this.letterGrade = 'A-'
    else if (this.finalGrade >= 87) this.letterGrade = 'B+'
    else if (this.finalGrade >= 83) this.letterGrade = 'B'
    else if (this.finalGrade >= 80) this.letterGrade = 'B-'
    else if (this.finalGrade >= 77) this.letterGrade = 'C+'
    else if (this.finalGrade >= 73) this.letterGrade = 'C'
    else if (this.finalGrade >= 70) this.letterGrade = 'C-'
    else if (this.finalGrade >= 67) this.letterGrade = 'D+'
    else if (this.finalGrade >= 60) this.letterGrade = 'D'
    else this.letterGrade = 'F'
  }
  
  next()
})

// Methods
certificateSchema.methods.issue = function() {
  this.status = 'issued'
  this.issuedAt = new Date()
  return this.save()
}

certificateSchema.methods.revoke = function(revokedBy, reason) {
  this.status = 'revoked'
  this.revokedAt = new Date()
  this.revokedBy = revokedBy
  this.revocationReason = reason
  return this.save()
}

certificateSchema.methods.addView = function() {
  this.analytics.viewCount += 1
  this.analytics.lastViewed = new Date()
  return this.save()
}

certificateSchema.methods.addDownload = function() {
  this.analytics.downloadCount += 1
  this.analytics.lastDownloaded = new Date()
  return this.save()
}

certificateSchema.methods.addVerification = function() {
  this.analytics.verificationCount += 1
  return this.save()
}

certificateSchema.methods.shareOnSocial = function(platform) {
  this.socialMediaShared.push({
    platform,
    sharedAt: new Date()
  })
  this.analytics.shareCount += 1
  return this.save()
}

certificateSchema.methods.makePublic = function() {
  this.isPublic = true
  if (!this.shareableLink) {
    this.shareableLink = `${process.env.FRONTEND_URL}/certificate/${this.certificateId}`
  }
  return this.save()
}

certificateSchema.methods.makePrivate = function() {
  this.isPublic = false
  this.shareableLink = undefined
  return this.save()
}

// Static methods
certificateSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.type) {
    query.type = options.type
  }
  
  return this.find(query)
    .populate('courseId', 'title thumbnail category')
    .populate('instructorId', 'name profile.avatar')
    .sort({ issuedAt: -1 })
}

certificateSchema.statics.findByCourse = function(courseId, options = {}) {
  const query = { courseId }
  
  if (options.status) {
    query.status = options.status
  }
  
  return this.find(query)
    .populate('userId', 'name email profile.avatar')
    .sort({ issuedAt: -1 })
}

certificateSchema.statics.findByInstructor = function(instructorId, options = {}) {
  const query = { instructorId }
  
  if (options.status) {
    query.status = options.status
  }
  
  if (options.courseId) {
    query.courseId = options.courseId
  }
  
  return this.find(query)
    .populate('userId', 'name email profile.avatar')
    .populate('courseId', 'title')
    .sort({ issuedAt: -1 })
}

certificateSchema.statics.verifyByCode = function(verificationCode) {
  return this.findOne({ verificationCode })
    .populate('userId', 'name email')
    .populate('courseId', 'title')
    .populate('instructorId', 'name')
}

certificateSchema.statics.getStatistics = async function(options = {}) {
  const matchStage = {}
  
  if (options.courseId) {
    matchStage.courseId = mongoose.Types.ObjectId(options.courseId)
  }
  
  if (options.instructorId) {
    matchStage.instructorId = mongoose.Types.ObjectId(options.instructorId)
  }
  
  if (options.dateRange) {
    matchStage.issuedAt = {
      $gte: new Date(options.dateRange.start),
      $lte: new Date(options.dateRange.end)
    }
  }
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalCertificates: { $sum: 1 },
        issuedCertificates: {
          $sum: { $cond: [{ $eq: ['$status', 'issued'] }, 1, 0] }
        },
        revokedCertificates: {
          $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] }
        },
        averageGrade: { $avg: '$finalGrade' },
        totalViews: { $sum: '$analytics.viewCount' },
        totalDownloads: { $sum: '$analytics.downloadCount' },
        totalShares: { $sum: '$analytics.shareCount' }
      }
    }
  ])
  
  return stats[0] || {
    totalCertificates: 0,
    issuedCertificates: 0,
    revokedCertificates: 0,
    averageGrade: 0,
    totalViews: 0,
    totalDownloads: 0,
    totalShares: 0
  }
}

certificateSchema.statics.getExpiringCertificates = function(days = 30) {
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  
  return this.find({
    status: 'issued',
    expiresAt: {
      $lte: futureDate,
      $gte: new Date()
    }
  })
  .populate('userId', 'name email')
  .populate('courseId', 'title')
  .sort({ expiresAt: 1 })
}

export default mongoose.model('Certificate', certificateSchema)