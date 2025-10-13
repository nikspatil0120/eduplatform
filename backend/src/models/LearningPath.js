import mongoose from 'mongoose'

const learningPathSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Learning path title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Learning path description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  slug: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'web_development', 'mobile_development', 'data_science', 
      'artificial_intelligence', 'cybersecurity', 'cloud_computing',
      'devops', 'ui_ux_design', 'digital_marketing', 'business',
      'project_management', 'soft_skills', 'other'
    ],
    index: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    required: true,
    index: true
  },
  estimatedDuration: {
    hours: {
      type: Number,
      required: true,
      min: 1
    },
    weeks: {
      type: Number,
      required: true,
      min: 1
    }
  },
  thumbnail: {
    type: String,
    default: null
  },
  bannerImage: {
    type: String,
    default: null
  },
  
  // Course Structure
  courses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    isRequired: {
      type: Boolean,
      default: true
    },
    prerequisites: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    estimatedWeeks: {
      type: Number,
      default: 1
    },
    description: String,
    learningObjectives: [String]
  }],
  
  // Prerequisites and Requirements
  prerequisites: {
    skills: [String],
    experience: String,
    courses: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    }],
    certifications: [String]
  },
  
  // Learning Outcomes
  learningOutcomes: [{
    outcome: {
      type: String,
      required: true
    },
    description: String,
    skillLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert']
    }
  }],
  
  // Skills and Competencies
  skillsAcquired: [{
    skill: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      required: true
    },
    description: String
  }],
  
  // Career Information
  careerPaths: [{
    title: String,
    description: String,
    averageSalary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'USD'
      }
    },
    jobTitles: [String],
    companies: [String]
  }],
  
  // Pricing and Access
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid', 'subscription', 'mixed'],
      default: 'free'
    },
    price: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    discountPrice: Number,
    subscriptionPlan: String
  },
  
  // Status and Visibility
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'under_review'],
    default: 'draft',
    index: true
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  publishedAt: Date,
  
  // Tags and Metadata
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  language: {
    type: String,
    default: 'en',
    index: true
  },
  targetAudience: [String],
  
  // Analytics and Engagement
  analytics: {
    enrollmentCount: {
      type: Number,
      default: 0
    },
    completionCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    averageCompletionTime: {
      type: Number,
      default: 0 // in hours
    },
    dropoffRate: {
      type: Number,
      default: 0 // percentage
    }
  },
  
  // Reviews and Ratings
  reviews: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [1000, 'Review comment cannot exceed 1000 characters']
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    helpfulVotes: {
      type: Number,
      default: 0
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Certification
  certification: {
    isAvailable: {
      type: Boolean,
      default: false
    },
    certificateTemplate: String,
    passingScore: {
      type: Number,
      default: 70
    },
    requirements: {
      completionPercentage: {
        type: Number,
        default: 100
      },
      minimumGrade: {
        type: Number,
        default: 70
      },
      requiredAssignments: {
        type: Number,
        default: 0
      },
      requiredProjects: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Gamification
  gamification: {
    points: {
      type: Number,
      default: 0
    },
    badges: [{
      name: String,
      description: String,
      iconUrl: String,
      requirement: String
    }],
    leaderboard: {
      isEnabled: {
        type: Boolean,
        default: false
      },
      criteria: {
        type: String,
        enum: ['completion_time', 'grade', 'engagement', 'projects'],
        default: 'completion_time'
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for performance
learningPathSchema.index({ category: 1, level: 1 })
learningPathSchema.index({ status: 1, isPublic: 1 })
learningPathSchema.index({ isFeatured: 1, 'analytics.enrollmentCount': -1 })
learningPathSchema.index({ tags: 1 })
learningPathSchema.index({ 'analytics.averageRating': -1 })
learningPathSchema.index({ createdAt: -1 })

// Virtual for creator details
learningPathSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
})

// Virtual for total courses
learningPathSchema.virtual('totalCourses').get(function() {
  return this.courses.length
})

// Virtual for required courses
learningPathSchema.virtual('requiredCourses').get(function() {
  return this.courses.filter(course => course.isRequired).length
})

// Virtual for completion rate
learningPathSchema.virtual('completionRate').get(function() {
  if (this.analytics.enrollmentCount === 0) return 0
  return (this.analytics.completionCount / this.analytics.enrollmentCount) * 100
})

// Virtual for checking if path is published
learningPathSchema.virtual('isPublished').get(function() {
  return this.status === 'published'
})

// Pre-save middleware
learningPathSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
  
  // Set published date
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  
  // Sort courses by order
  if (this.courses && this.courses.length > 0) {
    this.courses.sort((a, b) => a.order - b.order)
  }
  
  next()
})

// Methods
learningPathSchema.methods.publish = function() {
  this.status = 'published'
  this.publishedAt = new Date()
  return this.save()
}

learningPathSchema.methods.unpublish = function() {
  this.status = 'draft'
  this.publishedAt = undefined
  return this.save()
}

learningPathSchema.methods.addCourse = function(courseId, order, options = {}) {
  const courseData = {
    courseId,
    order,
    isRequired: options.isRequired !== undefined ? options.isRequired : true,
    prerequisites: options.prerequisites || [],
    estimatedWeeks: options.estimatedWeeks || 1,
    description: options.description,
    learningObjectives: options.learningObjectives || []
  }
  
  this.courses.push(courseData)
  this.courses.sort((a, b) => a.order - b.order)
  
  return this.save()
}

learningPathSchema.methods.removeCourse = function(courseId) {
  this.courses = this.courses.filter(course => 
    course.courseId.toString() !== courseId.toString()
  )
  return this.save()
}

learningPathSchema.methods.reorderCourses = function(courseOrders) {
  courseOrders.forEach(({ courseId, order }) => {
    const course = this.courses.find(c => 
      c.courseId.toString() === courseId.toString()
    )
    if (course) {
      course.order = order
    }
  })
  
  this.courses.sort((a, b) => a.order - b.order)
  return this.save()
}

learningPathSchema.methods.addReview = function(userId, rating, comment) {
  // Remove existing review from this user
  this.reviews = this.reviews.filter(review => 
    review.userId.toString() !== userId.toString()
  )
  
  // Add new review
  this.reviews.push({
    userId,
    rating,
    comment,
    createdAt: new Date()
  })
  
  // Update analytics
  this.updateRatingAnalytics()
  
  return this.save()
}

learningPathSchema.methods.updateRatingAnalytics = function() {
  if (this.reviews.length === 0) {
    this.analytics.averageRating = 0
    this.analytics.totalRatings = 0
    return
  }
  
  const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0)
  this.analytics.averageRating = totalRating / this.reviews.length
  this.analytics.totalRatings = this.reviews.length
}

learningPathSchema.methods.incrementEnrollment = function() {
  this.analytics.enrollmentCount += 1
  return this.save()
}

learningPathSchema.methods.incrementCompletion = function() {
  this.analytics.completionCount += 1
  return this.save()
}

learningPathSchema.methods.addView = function() {
  this.analytics.viewCount += 1
  return this.save()
}

// Static methods
learningPathSchema.statics.findPublished = function(options = {}) {
  const query = { 
    status: 'published',
    isPublic: true
  }
  
  if (options.category) {
    query.category = options.category
  }
  
  if (options.level) {
    query.level = options.level
  }
  
  if (options.featured) {
    query.isFeatured = true
  }
  
  const sort = {}
  if (options.sortBy === 'popular') {
    sort['analytics.enrollmentCount'] = -1
  } else if (options.sortBy === 'rating') {
    sort['analytics.averageRating'] = -1
  } else if (options.sortBy === 'newest') {
    sort.publishedAt = -1
  } else {
    sort.createdAt = -1
  }
  
  return this.find(query)
    .populate('createdBy', 'name profile.avatar')
    .sort(sort)
    .limit(options.limit || 20)
    .skip(options.skip || 0)
}

learningPathSchema.statics.search = function(searchTerm, options = {}) {
  const query = {
    status: 'published',
    isPublic: true,
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { tags: { $regex: searchTerm, $options: 'i' } },
      { 'skillsAcquired.skill': { $regex: searchTerm, $options: 'i' } }
    ]
  }
  
  if (options.category) {
    query.category = options.category
  }
  
  if (options.level) {
    query.level = options.level
  }
  
  return this.find(query)
    .populate('createdBy', 'name profile.avatar')
    .sort({ 'analytics.averageRating': -1, 'analytics.enrollmentCount': -1 })
    .limit(options.limit || 10)
}

learningPathSchema.statics.findByCreator = function(creatorId, options = {}) {
  const query = { createdBy: creatorId }
  
  if (options.status) {
    query.status = options.status
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 20)
}

learningPathSchema.statics.getFeatured = function(limit = 6) {
  return this.find({
    status: 'published',
    isPublic: true,
    isFeatured: true
  })
  .populate('createdBy', 'name profile.avatar')
  .sort({ 'analytics.averageRating': -1, 'analytics.enrollmentCount': -1 })
  .limit(limit)
}

learningPathSchema.statics.getPopular = function(limit = 10) {
  return this.find({
    status: 'published',
    isPublic: true
  })
  .populate('createdBy', 'name profile.avatar')
  .sort({ 'analytics.enrollmentCount': -1, 'analytics.averageRating': -1 })
  .limit(limit)
}

learningPathSchema.statics.getByCategory = function(category, options = {}) {
  const query = {
    status: 'published',
    isPublic: true,
    category
  }
  
  if (options.level) {
    query.level = options.level
  }
  
  return this.find(query)
    .populate('createdBy', 'name profile.avatar')
    .sort({ 'analytics.averageRating': -1 })
    .limit(options.limit || 20)
}

export default mongoose.model('LearningPath', learningPathSchema)