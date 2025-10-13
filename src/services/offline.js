import Dexie from 'dexie'
import { useNotesStore } from '@/store'
import toast from 'react-hot-toast'

// IndexedDB database for offline storage
class OfflineDatabase extends Dexie {
  constructor() {
    super('EduPlatformOfflineDB')
    
    this.version(1).stores({
      courses: '++id, title, category, level, isOffline, lastAccessed, downloadedAt',
      lessons: '++id, courseId, title, content, videoUrl, isDownloaded, downloadedAt',
      notes: '++id, courseId, lessonId, title, content, tags, isOffline, needsSync, createdAt, updatedAt',
      assignments: '++id, courseId, title, description, dueDate, isOffline, downloadedAt',
      submissions: '++id, assignmentId, content, files, isOffline, needsSync, createdAt',
      discussions: '++id, courseId, title, content, isOffline, downloadedAt',
      userProgress: '++id, courseId, lessonId, progress, completedAt, isOffline, needsSync',
      files: '++id, name, url, blob, type, size, courseId, lessonId, downloadedAt',
      syncQueue: '++id, type, action, data, timestamp, retryCount'
    })

    this.version(2).stores({
      quizzes: '++id, courseId, title, questions, isOffline, downloadedAt',
      quizResults: '++id, quizId, answers, score, isOffline, needsSync, completedAt'
    }).upgrade(tx => {
      // Migration logic for version 2
      console.log('Upgrading offline database to version 2')
    })
  }
}

class OfflineService {
  constructor() {
    this.db = new OfflineDatabase()
    this.isOnline = navigator.onLine
    this.syncInProgress = false
    this.maxRetries = 3
    this.retryDelay = 5000 // 5 seconds

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))

    // Initialize sync on startup if online
    if (this.isOnline) {
      this.startPeriodicSync()
    }
  }

  // Network status handlers
  handleOnline() {
    console.log('Device is online')
    this.isOnline = true
    toast.success('Connection restored. Syncing data...', { duration: 3000 })
    this.syncOfflineData()
    this.startPeriodicSync()
  }

  handleOffline() {
    console.log('Device is offline')
    this.isOnline = false
    toast.error('You are offline. Changes will be saved locally and synced when connection is restored.', {
      duration: 5000
    })
    this.stopPeriodicSync()
  }

  // Course offline management
  async downloadCourse(courseId) {
    try {
      const { courseAPI } = await import('./api')
      const response = await courseAPI.getCourseById(courseId)
      const course = response.data

      // Store course data
      await this.db.courses.put({
        ...course,
        isOffline: true,
        downloadedAt: new Date()
      })

      // Download lessons
      if (course.lessons) {
        for (const lesson of course.lessons) {
          await this.downloadLesson(courseId, lesson)
        }
      }

      // Download assignments
      if (course.assignments) {
        for (const assignment of course.assignments) {
          await this.db.assignments.put({
            ...assignment,
            courseId,
            isOffline: true,
            downloadedAt: new Date()
          })
        }
      }

      toast.success(`Course "${course.title}" downloaded for offline access`)
      return true
    } catch (error) {
      console.error('Error downloading course:', error)
      toast.error('Failed to download course for offline access')
      return false
    }
  }

  async downloadLesson(courseId, lesson) {
    try {
      // Store lesson metadata
      await this.db.lessons.put({
        ...lesson,
        courseId,
        isDownloaded: false,
        downloadedAt: new Date()
      })

      // Download video if available
      if (lesson.videoUrl) {
        await this.downloadVideo(lesson.id, lesson.videoUrl)
      }

      // Download lesson files
      if (lesson.files) {
        for (const file of lesson.files) {
          await this.downloadFile(file, courseId, lesson.id)
        }
      }

      return true
    } catch (error) {
      console.error('Error downloading lesson:', error)
      return false
    }
  }

  async downloadVideo(lessonId, videoUrl) {
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      
      await this.db.files.put({
        name: `lesson_${lessonId}_video`,
        url: videoUrl,
        blob: blob,
        type: 'video',
        size: blob.size,
        lessonId,
        downloadedAt: new Date()
      })

      // Update lesson as downloaded
      await this.db.lessons.where('id').equals(lessonId).modify({
        isDownloaded: true
      })

      return true
    } catch (error) {
      console.error('Error downloading video:', error)
      return false
    }
  }

  async downloadFile(file, courseId, lessonId) {
    try {
      const response = await fetch(file.url)
      const blob = await response.blob()
      
      await this.db.files.put({
        name: file.name,
        url: file.url,
        blob: blob,
        type: file.type,
        size: blob.size,
        courseId,
        lessonId,
        downloadedAt: new Date()
      })

      return true
    } catch (error) {
      console.error('Error downloading file:', error)
      return false
    }
  }

  // Notes offline management
  async saveNoteOffline(note) {
    try {
      const offlineNote = {
        ...note,
        isOffline: true,
        needsSync: true,
        updatedAt: new Date()
      }

      if (note.id) {
        await this.db.notes.put(offlineNote)
      } else {
        offlineNote.id = `offline_${Date.now()}_${Math.random()}`
        offlineNote.createdAt = new Date()
        await this.db.notes.add(offlineNote)
      }

      // Update store
      useNotesStore.getState().setSyncStatus('offline')
      
      return offlineNote
    } catch (error) {
      console.error('Error saving note offline:', error)
      throw error
    }
  }

  async getOfflineNotes(courseId = null) {
    try {
      let query = this.db.notes.orderBy('updatedAt').reverse()
      
      if (courseId) {
        query = query.filter(note => note.courseId === courseId)
      }

      return await query.toArray()
    } catch (error) {
      console.error('Error getting offline notes:', error)
      return []
    }
  }

  // Progress tracking offline
  async saveProgressOffline(courseId, lessonId, progress) {
    try {
      await this.db.userProgress.put({
        courseId,
        lessonId,
        progress,
        completedAt: progress >= 100 ? new Date() : null,
        isOffline: true,
        needsSync: true
      })

      return true
    } catch (error) {
      console.error('Error saving progress offline:', error)
      return false
    }
  }

  // Assignment submissions offline
  async saveSubmissionOffline(assignmentId, submissionData) {
    try {
      const offlineSubmission = {
        assignmentId,
        ...submissionData,
        isOffline: true,
        needsSync: true,
        createdAt: new Date()
      }

      await this.db.submissions.add(offlineSubmission)
      
      // Add to sync queue
      await this.addToSyncQueue('submission', 'create', offlineSubmission)
      
      toast.success('Submission saved offline. It will be uploaded when connection is restored.')
      return true
    } catch (error) {
      console.error('Error saving submission offline:', error)
      return false
    }
  }

  // Quiz results offline
  async saveQuizResultOffline(quizId, answers, score) {
    try {
      const result = {
        quizId,
        answers,
        score,
        isOffline: true,
        needsSync: true,
        completedAt: new Date()
      }

      await this.db.quizResults.add(result)
      await this.addToSyncQueue('quiz_result', 'create', result)
      
      return result
    } catch (error) {
      console.error('Error saving quiz result offline:', error)
      throw error
    }
  }

  // Sync queue management
  async addToSyncQueue(type, action, data) {
    try {
      await this.db.syncQueue.add({
        type,
        action,
        data,
        timestamp: new Date(),
        retryCount: 0
      })
    } catch (error) {
      console.error('Error adding to sync queue:', error)
    }
  }

  async syncOfflineData() {
    if (this.syncInProgress || !this.isOnline) {
      return
    }

    this.syncInProgress = true
    useNotesStore.getState().setSyncStatus('syncing')

    try {
      // Sync notes
      await this.syncNotes()
      
      // Sync progress
      await this.syncProgress()
      
      // Sync submissions
      await this.syncSubmissions()
      
      // Sync quiz results
      await this.syncQuizResults()
      
      // Process sync queue
      await this.processSyncQueue()

      useNotesStore.getState().setSyncStatus('synced')
      toast.success('All offline data synced successfully')
    } catch (error) {
      console.error('Error syncing offline data:', error)
      useNotesStore.getState().setSyncStatus('error')
      toast.error('Some data failed to sync. Will retry automatically.')
    } finally {
      this.syncInProgress = false
    }
  }

  async syncNotes() {
    try {
      const { notesAPI } = await import('./api')
      const offlineNotes = await this.db.notes.where('needsSync').equals(true).toArray()

      for (const note of offlineNotes) {
        try {
          if (note.id.startsWith('offline_')) {
            // Create new note
            const response = await notesAPI.createNote({
              courseId: note.courseId,
              lessonId: note.lessonId,
              title: note.title,
              content: note.content,
              tags: note.tags
            })
            
            // Update local note with server ID
            await this.db.notes.update(note.id, {
              id: response.data.id,
              needsSync: false,
              isOffline: false
            })
          } else {
            // Update existing note
            await notesAPI.updateNote(note.id, {
              title: note.title,
              content: note.content,
              tags: note.tags
            })
            
            await this.db.notes.update(note.id, {
              needsSync: false,
              isOffline: false
            })
          }
        } catch (error) {
          console.error(`Error syncing note ${note.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error syncing notes:', error)
    }
  }

  async syncProgress() {
    try {
      const { courseAPI } = await import('./api')
      const offlineProgress = await this.db.userProgress.where('needsSync').equals(true).toArray()

      for (const progress of offlineProgress) {
        try {
          await courseAPI.updateProgress(progress.courseId, progress.lessonId)
          
          await this.db.userProgress.update(progress.id, {
            needsSync: false,
            isOffline: false
          })
        } catch (error) {
          console.error(`Error syncing progress:`, error)
        }
      }
    } catch (error) {
      console.error('Error syncing progress:', error)
    }
  }

  async syncSubmissions() {
    try {
      const { submissionAPI } = await import('./api')
      const offlineSubmissions = await this.db.submissions.where('needsSync').equals(true).toArray()

      for (const submission of offlineSubmissions) {
        try {
          await submissionAPI.submitAssignment({
            assignmentId: submission.assignmentId,
            submissionText: submission.content,
            files: submission.files
          })
          
          await this.db.submissions.update(submission.id, {
            needsSync: false,
            isOffline: false
          })
        } catch (error) {
          console.error(`Error syncing submission:`, error)
        }
      }
    } catch (error) {
      console.error('Error syncing submissions:', error)
    }
  }

  async syncQuizResults() {
    try {
      const { quizAPI } = await import('./api')
      const offlineResults = await this.db.quizResults.where('needsSync').equals(true).toArray()

      for (const result of offlineResults) {
        try {
          await quizAPI.submitQuiz(result.courseId, result.quizId, result.answers)
          
          await this.db.quizResults.update(result.id, {
            needsSync: false,
            isOffline: false
          })
        } catch (error) {
          console.error(`Error syncing quiz result:`, error)
        }
      }
    } catch (error) {
      console.error('Error syncing quiz results:', error)
    }
  }

  async processSyncQueue() {
    try {
      const queueItems = await this.db.syncQueue.orderBy('timestamp').toArray()

      for (const item of queueItems) {
        try {
          await this.processSyncItem(item)
          await this.db.syncQueue.delete(item.id)
        } catch (error) {
          console.error(`Error processing sync item:`, error)
          
          // Increment retry count
          const newRetryCount = item.retryCount + 1
          if (newRetryCount < this.maxRetries) {
            await this.db.syncQueue.update(item.id, {
              retryCount: newRetryCount
            })
          } else {
            // Max retries reached, remove from queue
            await this.db.syncQueue.delete(item.id)
            console.error(`Max retries reached for sync item:`, item)
          }
        }
      }
    } catch (error) {
      console.error('Error processing sync queue:', error)
    }
  }

  async processSyncItem(item) {
    // Process different types of sync items
    switch (item.type) {
      case 'submission':
        if (item.action === 'create') {
          const { submissionAPI } = await import('./api')
          await submissionAPI.submitAssignment(item.data)
        }
        break
      case 'quiz_result':
        if (item.action === 'create') {
          const { quizAPI } = await import('./api')
          await quizAPI.submitQuiz(item.data.courseId, item.data.quizId, item.data.answers)
        }
        break
      default:
        console.warn(`Unknown sync item type: ${item.type}`)
    }
  }

  // Periodic sync
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
    }

    // Sync every 5 minutes when online
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.syncOfflineData()
      }
    }, 5 * 60 * 1000)
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }
  }

  // Storage management
  async getStorageUsage() {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        return {
          used: estimate.usage,
          available: estimate.quota,
          percentage: (estimate.usage / estimate.quota) * 100
        }
      }
      return null
    } catch (error) {
      console.error('Error getting storage usage:', error)
      return null
    }
  }

  async clearOfflineData(courseId = null) {
    try {
      if (courseId) {
        // Clear data for specific course
        await this.db.courses.where('id').equals(courseId).delete()
        await this.db.lessons.where('courseId').equals(courseId).delete()
        await this.db.notes.where('courseId').equals(courseId).delete()
        await this.db.assignments.where('courseId').equals(courseId).delete()
        await this.db.files.where('courseId').equals(courseId).delete()
      } else {
        // Clear all offline data
        await this.db.courses.clear()
        await this.db.lessons.clear()
        await this.db.notes.clear()
        await this.db.assignments.clear()
        await this.db.files.clear()
        await this.db.userProgress.clear()
        await this.db.submissions.clear()
        await this.db.quizResults.clear()
        await this.db.syncQueue.clear()
      }

      toast.success('Offline data cleared successfully')
    } catch (error) {
      console.error('Error clearing offline data:', error)
      toast.error('Failed to clear offline data')
    }
  }

  // Utility methods
  async isOfflineAvailable(courseId) {
    try {
      const course = await this.db.courses.where('id').equals(courseId).first()
      return course && course.isOffline
    } catch (error) {
      console.error('Error checking offline availability:', error)
      return false
    }
  }

  async getOfflineCourses() {
    try {
      return await this.db.courses.where('isOffline').equals(true).toArray()
    } catch (error) {
      console.error('Error getting offline courses:', error)
      return []
    }
  }

  getNetworkStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    }
  }
}

export default new OfflineService()