import mongoose from 'mongoose'

const lessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Lesson title is required'],
    trim: true,
    maxlength: [200, 'Lesson title cannot exceed 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Lesson description cannot exceed 1000 characters']
  },
  videoUrl: {
    type: String,
    required: [true, 'Video URL is required']
  },
  videoDuration: {
    type: Number, // in seconds
    required: [true, 'Video duration is required']
  },
  thumbnailUrl: String,
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'doc', 'link', 'image', 'video', 'other']
    },
    size: Number // in bytes
  }],
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  order: {
    type: Number,
    required: true
  },
  isPreview: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

const sectionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Section title is required'],
    trim: true,
    maxlength: [200, 'Section title cannot exceed 200 characters']
  },
  description: String,
  lessons: [lessonSchema],
  order: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
})

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Course title is required'],
    trim: true,
    maxlength: [200, 'Course title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Course description is required'],
    maxlength: [2000, 'Course description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxlength: [500, 'Short description cannot exceed 500 characters']
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Instructor is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'programming',
      'design',
      'business',
      'data-science',
      'marketing',
      'photography',
      'music',
      'language',
      'health',
      'lifestyle',
      'other'
    ]
  },
  subcategory: String,
  level: {
    type: String,
    required: [true, 'Course level is required'],
    enum: ['beginner', 'intermediate', 'advanced']
  },
  language: {
    type: String,
    default: 'en'
  },
  pricing: {
    type: {
      type: String,
      enum: ['free', 'paid', 'subscription'],
      default: 'paid'
    },
    price: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    originalPrice: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    discountValidUntil: Date
  },
  media: {
    thumbnail: {
      type: String,
      required: [true, 'Course thumbnail is required']
    },
    previewVideo: String,
    images: [String]
  },
  curriculum: [sectionSchema],
  requirements: [{
    type: String,
    trim: true
  }],
  whatYouWillLearn: [{
    type: String,
    required: true,
    trim: true
  }],
  targetAudience: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  stats: {
    enrollments: {
      type: Number,
      default: 0
    },
    completions: {
      type: Number,
      default: 0
    },
    totalDuration: {
      type: Number, // in minutes
      default: 0
    },
    totalLessons: {
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
    totalRevenue: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
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
    isVerifiedPurchase: {
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
  settings: {
    isPublished: {
      type: Boolean,
      default: false
    },
    isDraft: {
      type: Boolean,
      default: true
    },
    allowReviews: {
      type: Boolean,
      default: true
    },
    allowQuestions: {
      type: Boolean,
      default: true
    },
    certificateEnabled: {
      type: Boolean,
      default: true
    },
    completionCriteria: {
      watchPercentage: {
        type: Number,
        default: 80,
        min: 0,
        max: 100
      },
      quizPassPercentage: {
        type: Number,
        default: 70,
        min: 0,
        max: 100
      }
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  analytics: {
    views: {
      type: Number,
      default: 0
    },
    uniqueViews: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    averageWatchTime: {
      type: Number,
      default: 0
    },
    dropOffPoints: [{
      lessonId: mongoose.Schema.Types.ObjectId,
      timestamp: Number,
      dropOffRate: Number
    }]
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes
courseSchema.index({ title: 'text', description: 'text', tags: 'text' })
courseSchema.index({ category: 1 })
courseSchema.index({ level: 1 })
courseSchema.index({ instructor: 1 })
courseSchema.index({ 'pricing.price': 1 })
courseSchema.index({ 'stats.averageRating': -1 })
courseSchema.index({ 'stats.enrollments': -1 })
courseSchema.index({ createdAt: -1 })
courseSchema.index({ slug: 1 }, { unique: true })
courseSchema.index({ 'settings.isPublished': 1 })

// Virtual for total duration in hours
courseSchema.virtual('totalDurationHours').get(function() {
  return Math.round((this.stats.totalDuration / 60) * 100) / 100
})

// Virtual for completion rate
courseSchema.virtual('completionRate').get(function() {
  if (this.stats.enrollments === 0) return 0
  return Math.round((this.stats.completions / this.stats.enrollments) * 100)
})

// Virtual for discount price
courseSchema.virtual('discountPrice').get(function() {
  if (this.pricing.discountPercentage && this.pricing.discountValidUntil > new Date()) {
    return Math.round(this.pricing.price * (1 - this.pricing.discountPercentage / 100) * 100) / 100
  }
  return this.pricing.price
})

// Pre-save middleware to generate slug
courseSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
  }
  next()
})

// Pre-save middleware to calculate stats
courseSchema.pre('save', function(next) {
  // Calculate total lessons and duration
  let totalLessons = 0
  let totalDuration = 0

  this.curriculum.forEach(section => {
    totalLessons += section.lessons.length
    section.lessons.forEach(lesson => {
      totalDuration += lesson.videoDuration || 0
    })
  })

  this.stats.totalLessons = totalLessons
  this.stats.totalDuration = Math.round(totalDuration / 60) // Convert to minutes

  // Calculate average rating
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0)
    this.stats.averageRating = Math.round((totalRating / this.reviews.length) * 10) / 10
    this.stats.totalRatings = this.reviews.length
  }

  next()
})

// Instance method to add review
courseSchema.methods.addReview = function(userId, rating, comment, isVerifiedPurchase = false) {
  // Check if user already reviewed
  const existingReview = this.reviews.find(review => review.user.toString() === userId.toString())
  
  if (existingReview) {
    existingReview.rating = rating
    existingReview.comment = comment
    existingReview.isVerifiedPurchase = isVerifiedPurchase
  } else {
    this.reviews.push({
      user: userId,
      rating,
      comment,
      isVerifiedPurchase
    })
  }

  return this.save()
}

// Instance method to get lesson by ID
courseSchema.methods.getLessonById = function(lessonId) {
  for (const section of this.curriculum) {
    const lesson = section.lessons.id(lessonId)
    if (lesson) return lesson
  }
  return null
}

// Instance method to get next lesson
courseSchema.methods.getNextLesson = function(currentLessonId) {
  let foundCurrent = false
  
  for (const section of this.curriculum) {
    for (const lesson of section.lessons) {
      if (foundCurrent) return lesson
      if (lesson._id.toString() === currentLessonId.toString()) {
        foundCurrent = true
      }
    }
  }
  
  return null
}

// Instance method to get previous lesson
courseSchema.methods.getPreviousLesson = function(currentLessonId) {
  let previousLesson = null
  
  for (const section of this.curriculum) {
    for (const lesson of section.lessons) {
      if (lesson._id.toString() === currentLessonId.toString()) {
        return previousLesson
      }
      previousLesson = lesson
    }
  }
  
  return null
}

// Static method to find published courses
courseSchema.statics.findPublished = function() {
  return this.find({ 
    'settings.isPublished': true, 
    'settings.isDraft': false,
    isDeleted: false 
  })
}

// Static method to search courses
courseSchema.statics.searchCourses = function(query, filters = {}) {
  const searchQuery = {
    'settings.isPublished': true,
    isDeleted: false,
    ...filters
  }

  if (query) {
    searchQuery.$text = { $search: query }
  }

  return this.find(searchQuery)
    .populate('instructor', 'name profile.avatar')
    .sort({ 'stats.averageRating': -1, 'stats.enrollments': -1 })
}

// Method to increment view count
courseSchema.methods.incrementViews = function(isUnique = false) {
  this.analytics.views += 1
  if (isUnique) {
    this.analytics.uniqueViews += 1
  }
  return this.save()
}

const Course = mongoose.model('Course', courseSchema)

export default Course