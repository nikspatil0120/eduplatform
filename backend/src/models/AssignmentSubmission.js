import mongoose from 'mongoose'

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true,
    index: true
  },
  studentId: {
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
  submissionText: {
    type: String,
    maxlength: [10000, 'Submission text cannot exceed 10000 characters']
  },
  attachments: [{
    fileName: {
      type: String,
      required: true
    },
    originalName: String,
    fileUrl: {
      type: String,
      required: true
    },
    fileSize: Number,
    mimeType: String,
    blobName: String, // For Azure Blob Storage
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  isLate: {
    type: Boolean,
    default: false
  },
  attemptNumber: {
    type: Number,
    default: 1,
    min: 1
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'graded', 'returned', 'resubmitted'],
    default: 'submitted',
    index: true
  },
  grade: {
    type: Number,
    min: 0,
    default: null
  },
  maxPoints: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  rubricGrades: [{
    criteriaId: mongoose.Schema.Types.ObjectId,
    points: Number,
    maxPoints: Number,
    feedback: String
  }],
  feedback: {
    instructorComments: {
      type: String,
      maxlength: [2000, 'Instructor comments cannot exceed 2000 characters']
    },
    audioFeedbackUrl: String,
    videoFeedbackUrl: String,
    annotatedFileUrl: String,
    gradedAt: Date,
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  peerReviews: [{
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comments: {
      type: String,
      maxlength: [1000, 'Peer review comments cannot exceed 1000 characters']
    },
    reviewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  plagiarismCheck: {
    checked: {
      type: Boolean,
      default: false
    },
    similarityScore: Number,
    reportUrl: String,
    checkedAt: Date
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    submissionSource: {
      type: String,
      enum: ['web', 'mobile', 'api'],
      default: 'web'
    },
    timeSpent: Number, // in seconds
    wordCount: Number,
    characterCount: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for performance
assignmentSubmissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true })
assignmentSubmissionSchema.index({ courseId: 1, submittedAt: -1 })
assignmentSubmissionSchema.index({ studentId: 1, status: 1 })
assignmentSubmissionSchema.index({ status: 1, submittedAt: -1 })

// Virtual for assignment details
assignmentSubmissionSchema.virtual('assignment', {
  ref: 'Assignment',
  localField: 'assignmentId',
  foreignField: '_id',
  justOne: true
})

// Virtual for student details
assignmentSubmissionSchema.virtual('student', {
  ref: 'User',
  localField: 'studentId',
  foreignField: '_id',
  justOne: true
})

// Virtual for calculating percentage
assignmentSubmissionSchema.virtual('calculatedPercentage').get(function() {
  if (this.grade !== null && this.grade !== undefined && this.maxPoints > 0) {
    return Math.round((this.grade / this.maxPoints) * 100)
  }
  return null
})

// Virtual for letter grade
assignmentSubmissionSchema.virtual('letterGrade').get(function() {
  const percentage = this.calculatedPercentage
  if (percentage === null) return null
  
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
})

// Pre-save middleware
assignmentSubmissionSchema.pre('save', async function(next) {
  // Calculate percentage if grade is provided
  if (this.grade !== null && this.grade !== undefined && this.maxPoints > 0) {
    this.percentage = Math.round((this.grade / this.maxPoints) * 100)
  }
  
  // Check if submission is late
  if (this.isNew) {
    const Assignment = mongoose.model('Assignment')
    const assignment = await Assignment.findById(this.assignmentId)
    if (assignment && this.submittedAt > assignment.dueDate) {
      this.isLate = true
    }
  }
  
  // Update word and character count for text submissions
  if (this.submissionText) {
    this.metadata.wordCount = this.submissionText.split(/\s+/).filter(word => word.length > 0).length
    this.metadata.characterCount = this.submissionText.length
  }
  
  next()
})

// Post-save middleware to update assignment analytics
assignmentSubmissionSchema.post('save', async function() {
  const Assignment = mongoose.model('Assignment')
  const assignment = await Assignment.findById(this.assignmentId)
  if (assignment) {
    await assignment.updateAnalytics()
  }
})

// Methods
assignmentSubmissionSchema.methods.gradeSubmission = function(points, feedback, gradedBy) {
  this.grade = points
  this.status = 'graded'
  this.feedback.instructorComments = feedback
  this.feedback.gradedAt = new Date()
  this.feedback.gradedBy = gradedBy
  
  return this.save()
}

assignmentSubmissionSchema.methods.addPeerReview = function(reviewerId, rating, comments) {
  this.peerReviews.push({
    reviewerId,
    rating,
    comments,
    reviewedAt: new Date()
  })
  
  return this.save()
}

assignmentSubmissionSchema.methods.resubmit = function(newText, newAttachments) {
  this.submissionText = newText || this.submissionText
  if (newAttachments) {
    this.attachments = newAttachments
  }
  this.attemptNumber += 1
  this.status = 'resubmitted'
  this.submittedAt = new Date()
  
  return this.save()
}

// Static methods
assignmentSubmissionSchema.statics.findByAssignment = function(assignmentId, options = {}) {
  const query = { assignmentId }
  
  if (options.status) {
    query.status = options.status
  }
  
  return this.find(query)
    .populate('studentId', 'name email profile.avatar')
    .sort({ submittedAt: -1 })
}

assignmentSubmissionSchema.statics.findByStudent = function(studentId, options = {}) {
  const query = { studentId }
  
  if (options.courseId) {
    query.courseId = options.courseId
  }
  
  if (options.status) {
    query.status = options.status
  }
  
  return this.find(query)
    .populate('assignmentId', 'title dueDate maxPoints')
    .populate('courseId', 'title')
    .sort({ submittedAt: -1 })
}

assignmentSubmissionSchema.statics.getGradeStatistics = async function(assignmentId) {
  const submissions = await this.find({ 
    assignmentId, 
    grade: { $ne: null } 
  })
  
  if (submissions.length === 0) {
    return {
      count: 0,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      distribution: {}
    }
  }
  
  const grades = submissions.map(s => s.grade).sort((a, b) => a - b)
  const sum = grades.reduce((acc, grade) => acc + grade, 0)
  
  // Calculate distribution
  const distribution = {
    'A (90-100)': 0,
    'B (80-89)': 0,
    'C (70-79)': 0,
    'D (60-69)': 0,
    'F (0-59)': 0
  }
  
  submissions.forEach(s => {
    const percentage = s.calculatedPercentage
    if (percentage >= 90) distribution['A (90-100)']++
    else if (percentage >= 80) distribution['B (80-89)']++
    else if (percentage >= 70) distribution['C (70-79)']++
    else if (percentage >= 60) distribution['D (60-69)']++
    else distribution['F (0-59)']++
  })
  
  return {
    count: submissions.length,
    average: sum / submissions.length,
    median: grades[Math.floor(grades.length / 2)],
    min: Math.min(...grades),
    max: Math.max(...grades),
    distribution
  }
}

export default mongoose.model('AssignmentSubmission', assignmentSubmissionSchema)