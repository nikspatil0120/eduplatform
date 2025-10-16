import mongoose from 'mongoose'

const userProgressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  completedLessons: [{
    lessonId: {
      type: String,
      required: true
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    watchTime: {
      type: Number,
      default: 0 // in minutes
    }
  }],
  certificates: [{
    certificateId: {
      type: String,
      required: true
    },
    courseName: String,
    issuedAt: {
      type: Date,
      default: Date.now
    }
  }],
  totalWatchTime: {
    type: Number,
    default: 0 // in minutes
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Compound index for efficient queries
userProgressSchema.index({ user: 1, course: 1 }, { unique: true })

// Methods
userProgressSchema.methods.markLessonComplete = function(lessonId, watchTime = 0) {
  // Check if lesson is already completed
  const existingLesson = this.completedLessons.find(l => l.lessonId === lessonId)
  
  if (!existingLesson) {
    this.completedLessons.push({
      lessonId,
      completedAt: new Date(),
      watchTime
    })
    this.totalWatchTime += watchTime
  }
  
  this.lastAccessedAt = new Date()
  return this.save()
}

userProgressSchema.methods.isLessonCompleted = function(lessonId) {
  return this.completedLessons.some(l => l.lessonId === lessonId)
}

userProgressSchema.methods.addCertificate = function(certificateId, courseName) {
  // Check if certificate already exists
  const existingCert = this.certificates.find(c => c.certificateId === certificateId)
  
  if (!existingCert) {
    this.certificates.push({
      certificateId,
      courseName,
      issuedAt: new Date()
    })
  }
  
  return this.save()
}

userProgressSchema.methods.getProgressSummary = function() {
  return {
    completedLessonsCount: this.completedLessons.length,
    completedLessons: this.completedLessons.map(l => l.lessonId),
    certificates: this.certificates,
    totalWatchTime: this.totalWatchTime,
    lastAccessedAt: this.lastAccessedAt
  }
}

const UserProgress = mongoose.model('UserProgress', userProgressSchema)

export default UserProgress