import mongoose from 'mongoose'

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Assignment description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
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
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['file_upload', 'text_submission', 'quiz', 'project', 'presentation'],
    default: 'file_upload'
  },
  instructions: {
    type: String,
    maxlength: [5000, 'Instructions cannot exceed 5000 characters']
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
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  maxPoints: {
    type: Number,
    default: 100,
    min: [0, 'Max points cannot be negative']
  },
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  latePenalty: {
    type: Number,
    default: 0,
    min: [0, 'Late penalty cannot be negative'],
    max: [100, 'Late penalty cannot exceed 100%']
  },
  submissionFormat: {
    allowedFileTypes: [{
      type: String,
      enum: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'zip', 'mp4', 'mov']
    }],
    maxFileSize: {
      type: Number,
      default: 10485760 // 10MB in bytes
    },
    maxFiles: {
      type: Number,
      default: 5
    }
  },
  rubric: [{
    criteria: {
      type: String,
      required: true
    },
    description: String,
    maxPoints: {
      type: Number,
      required: true
    }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  publishedAt: Date,
  settings: {
    allowResubmission: {
      type: Boolean,
      default: false
    },
    showGradeImmediately: {
      type: Boolean,
      default: false
    },
    requirePeerReview: {
      type: Boolean,
      default: false
    },
    peerReviewCount: {
      type: Number,
      default: 2
    }
  },
  analytics: {
    totalSubmissions: {
      type: Number,
      default: 0
    },
    averageGrade: {
      type: Number,
      default: 0
    },
    onTimeSubmissions: {
      type: Number,
      default: 0
    },
    lateSubmissions: {
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
assignmentSchema.index({ courseId: 1, dueDate: 1 })
assignmentSchema.index({ instructorId: 1, createdAt: -1 })
assignmentSchema.index({ isPublished: 1, dueDate: 1 })

// Virtual for submissions
assignmentSchema.virtual('submissions', {
  ref: 'AssignmentSubmission',
  localField: '_id',
  foreignField: 'assignmentId'
})

// Virtual for checking if assignment is overdue
assignmentSchema.virtual('isOverdue').get(function() {
  return new Date() > this.dueDate
})

// Virtual for time remaining
assignmentSchema.virtual('timeRemaining').get(function() {
  const now = new Date()
  const due = new Date(this.dueDate)
  return due > now ? due - now : 0
})

// Methods
assignmentSchema.methods.publish = function() {
  this.isPublished = true
  this.publishedAt = new Date()
  return this.save()
}

assignmentSchema.methods.updateAnalytics = async function() {
  const AssignmentSubmission = mongoose.model('AssignmentSubmission')
  
  const submissions = await AssignmentSubmission.find({ assignmentId: this._id })
  
  this.analytics.totalSubmissions = submissions.length
  
  if (submissions.length > 0) {
    const gradedSubmissions = submissions.filter(s => s.grade !== null && s.grade !== undefined)
    
    if (gradedSubmissions.length > 0) {
      this.analytics.averageGrade = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length
    }
    
    this.analytics.onTimeSubmissions = submissions.filter(s => s.submittedAt <= this.dueDate).length
    this.analytics.lateSubmissions = submissions.filter(s => s.submittedAt > this.dueDate).length
  }
  
  return this.save()
}

// Static methods
assignmentSchema.statics.findByInstructor = function(instructorId, options = {}) {
  const query = { instructorId }
  
  if (options.courseId) {
    query.courseId = options.courseId
  }
  
  if (options.published !== undefined) {
    query.isPublished = options.published
  }
  
  return this.find(query)
    .populate('courseId', 'title')
    .sort({ createdAt: -1 })
}

assignmentSchema.statics.findByCourse = function(courseId, options = {}) {
  const query = { courseId }
  
  if (options.published !== undefined) {
    query.isPublished = options.published
  }
  
  return this.find(query)
    .populate('instructorId', 'name email')
    .sort({ dueDate: 1 })
}

export default mongoose.model('Assignment', assignmentSchema)