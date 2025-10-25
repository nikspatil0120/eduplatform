import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Auth Store
export const useAuthStore = create(
  persist(
    immer((set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      
      setUser: (user) => set((state) => {
        state.user = user
        state.isAuthenticated = !!user
      }),
      
      setToken: (token) => set((state) => {
        state.token = token
      }),
      
      setLoading: (loading) => set((state) => {
        state.isLoading = loading
      }),
      
      logout: () => set((state) => {
        state.user = null
        state.token = null
        state.isAuthenticated = false
      }),
      
      updateProfile: (updates) => set((state) => {
        if (state.user) {
          state.user = { ...state.user, ...updates }
        }
      })
    })),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      })
    }
  )
)

// UI Store
export const useUIStore = create(
  persist(
    immer((set, get) => ({
      theme: 'light',
      sidebarOpen: false,
      notifications: [],
      loading: {},
      
      toggleTheme: () => set((state) => {
        state.theme = state.theme === 'light' ? 'dark' : 'light'
      }),
      
      setTheme: (theme) => set((state) => {
        state.theme = theme
      }),
      
      toggleSidebar: () => set((state) => {
        state.sidebarOpen = !state.sidebarOpen
      }),
      
      setSidebarOpen: (open) => set((state) => {
        state.sidebarOpen = open
      }),
      
      addNotification: (notification) => set((state) => {
        state.notifications.push({
          id: Date.now(),
          timestamp: new Date(),
          ...notification
        })
      }),
      
      removeNotification: (id) => set((state) => {
        state.notifications = state.notifications.filter(n => n.id !== id)
      }),
      
      clearNotifications: () => set((state) => {
        state.notifications = []
      }),
      
      setLoading: (key, loading) => set((state) => {
        state.loading[key] = loading
      }),
      
      isLoading: (key) => get().loading[key] || false
    })),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        theme: state.theme,
        sidebarOpen: state.sidebarOpen
      })
    }
  )
)

// Course Store
export const useCourseStore = create(
  persist(
    immer((set, get) => ({
    courses: [],
    currentCourse: null,
    enrolledCourses: [],
    progressByCourseId: {}, // { [courseId]: { completedLessonIds: string[], minutesWatched: number } }
    studyActivityDays: [], // [ 'YYYY-MM-DD', ... ] when user was active
    certificates: [], // { id, courseId, courseName, userName, issuedAt }
    filters: {
      category: '',
      level: '',
      search: '',
      tags: []
    },
    
    setCourses: (courses) => set((state) => {
      state.courses = courses
    }),
    
    setCurrentCourse: (course) => set((state) => {
      state.currentCourse = course
    }),
    
    setEnrolledCourses: (courses) => set((state) => {
      state.enrolledCourses = courses
    }),

    addEnrolledCourse: (course) => set((state) => {
      const exists = state.enrolledCourses.some(c => c.id === course.id)
      if (!exists) {
        state.enrolledCourses.push(course)
      }
      if (!state.progressByCourseId[course.id]) {
        state.progressByCourseId[course.id] = { completedLessonIds: [], minutesWatched: 0 }
      }
    }),

    isCourseEnrolled: (courseId) => {
      return get().enrolledCourses.some(c => c.id === courseId)
    },



    isLessonCompleted: (courseId, lessonId) => {
      const map = get().progressByCourseId || {}
      const entry = map[courseId]
      return !!entry && entry.completedLessonIds.includes(lessonId)
    },

    getTotalStudyHours: () => {
      const map = get().progressByCourseId || {}
      const totalMinutes = Object.values(map || {}).reduce((sum, e) => sum + (e?.minutesWatched || 0), 0)
      return Math.floor(totalMinutes / 60)
    },

    getTotalStudyTimeFormatted: () => {
      const map = get().progressByCourseId || {}
      const totalMinutes = Object.values(map || {}).reduce((sum, e) => sum + (e?.minutesWatched || 0), 0)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return `${hours}h ${minutes}m`
    },

    getStudyActivityDays: () => {
      const days = get().studyActivityDays || []
      return [...days].sort((a, b) => (a < b ? 1 : -1))
    },

    getStudyStreakSummary: (limit = 7) => {
      const days = get().getStudyActivityDays().slice(0, limit)
      if (days.length === 0) return 'No activity yet'
      const fmt = (iso) => {
        const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10))
        const date = new Date(y, m - 1, d)
        return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      }
      return `Active on: ${days.map(fmt).join(', ')}`
    },

    isCourseFullyCompleted: (courseId, totalLessons) => {
      const map = get().progressByCourseId || {}
      const entry = map[courseId]
      return !!entry && Array.isArray(entry.completedLessonIds) && entry.completedLessonIds.length >= (totalLessons || 0)
    },



    // Check completion and auto-issue certificate if all sections are completed
    ensureCertificateForCourse: async (courseId, courseName, userName, totalLessons) => {
      const state = get()
      const entry = state.progressByCourseId[courseId]
      const already = state.certificates.find(c => c.courseId === courseId)
      
      if (!already && entry && Array.isArray(entry.completedLessonIds) && entry.completedLessonIds.length >= (totalLessons || 0)) {
        await state.issueCertificate(courseId, courseName, userName)
      }
    },

    listCertificates: () => get().certificates,
    
    updateCourse: (courseId, updates) => set((state) => {
      const index = state.courses.findIndex(c => c._id === courseId)
      if (index !== -1) {
        state.courses[index] = { ...state.courses[index], ...updates }
      }
      
      if (state.currentCourse?._id === courseId) {
        state.currentCourse = { ...state.currentCourse, ...updates }
      }
    }),
    
    setFilters: (filters) => set((state) => {
      state.filters = { ...state.filters, ...filters }
    }),
    
    clearFilters: () => set((state) => {
      state.filters = {
        category: '',
        level: '',
        search: '',
        tags: []
      }
    }),

    // Clear all user-specific course data (for when switching users)
    clearUserData: () => set((state) => {
      state.enrolledCourses = []
      state.progressByCourseId = {}
      state.certificates = []
    }),

    // Sync user progress and enrolled courses from database
    syncProgressFromDatabase: async () => {
      try {
        console.log('🔄 Starting sync from database...')
        
        // Sync progress data
        const { userProgressAPI, courseAPI } = await import('../services/api.js')
        
        // Get user progress
        console.log('📊 Fetching user progress...')
        const progressResponse = await userProgressAPI.getAllProgress()
        console.log('📊 Progress response:', progressResponse.data)
        
        // Get enrolled courses
        console.log('📚 Fetching enrolled courses...')
        const enrolledResponse = await courseAPI.getEnrolledCourses()
        console.log('📚 Enrolled courses response:', enrolledResponse.data)
        
        set((state) => {
          // Clear existing data
          state.progressByCourseId = {}
          state.certificates = []
          state.enrolledCourses = []
          
          // Populate progress from database
          if (progressResponse.data?.success) {
            const progressData = progressResponse.data.data
            console.log('📊 Syncing progress for', progressData.length, 'courses')
            progressData.forEach(courseProgress => {
              state.progressByCourseId[courseProgress.courseId] = {
                completedLessonIds: courseProgress.completedLessons || [],
                minutesWatched: courseProgress.totalWatchTime || 0
              }
              
              // Add certificates
              if (courseProgress.certificates) {
                courseProgress.certificates.forEach(cert => {
                  // Get current user name from localStorage
                  let actualUserName = 'Student'
                  try {
                    const userData = localStorage.getItem('userData')
                    if (userData) {
                      const user = JSON.parse(userData)
                      actualUserName = user.name || 'Student'
                    }
                  } catch (e) {
                    console.warn('Failed to parse user data for certificate sync:', e)
                  }
                  
                  state.certificates.push({
                    id: cert.certificateId,
                    courseId: courseProgress.courseId,
                    courseName: cert.courseName,
                    userName: cert.userName || actualUserName,
                    issuedAt: cert.issuedAt
                  })
                })
              }
            })
          }
          
          // Populate enrolled courses from database
          if (enrolledResponse.data?.success) {
            const enrolledCourses = enrolledResponse.data.data || []
            console.log('📚 Syncing', enrolledCourses.length, 'enrolled courses')
            state.enrolledCourses = enrolledCourses
          } else {
            console.warn('⚠️ Failed to get enrolled courses:', enrolledResponse.data)
          }
        })
        
        console.log('✅ User progress and enrolled courses synced from database')
      } catch (error) {
        console.error('❌ Failed to sync data from database:', error)
        if (error.response) {
          console.error('❌ Response status:', error.response.status)
          console.error('❌ Response data:', error.response.data)
        }
      }
    },

    // Manual sync trigger for testing
    manualSync: async () => {
      const { syncProgressFromDatabase } = get()
      await syncProgressFromDatabase()
    },

    // Mark lesson complete and sync to database
    markLessonComplete: async (courseId, lessonId, minutesWatched = 0) => {
      try {
        // Update local state immediately
        set((state) => {
          if (!state.progressByCourseId[courseId]) {
            state.progressByCourseId[courseId] = { completedLessonIds: [], minutesWatched: 0 }
          }
          
          const progress = state.progressByCourseId[courseId]
          if (!progress.completedLessonIds.includes(lessonId)) {
            progress.completedLessonIds.push(lessonId)
            progress.minutesWatched += minutesWatched
            
            // Track study activity day for streaks
            if (Number.isFinite(minutesWatched) && minutesWatched > 0) {
              const today = new Date()
              const y = today.getFullYear()
              const m = String(today.getMonth() + 1).padStart(2, '0')
              const d = String(today.getDate()).padStart(2, '0')
              const iso = `${y}-${m}-${d}`
              if (!state.studyActivityDays.includes(iso)) {
                state.studyActivityDays.push(iso)
                // keep only last 365 days to avoid unbounded growth
                state.studyActivityDays = state.studyActivityDays
                  .sort((a, b) => (a < b ? 1 : -1))
                  .slice(0, 365)
              }
            }
          }
        })
        
        // Sync to database
        const { userProgressAPI } = await import('../services/api.js')
        await userProgressAPI.markLessonComplete(courseId, lessonId, minutesWatched)
        
        console.log('✅ Lesson completion synced to database')
      } catch (error) {
        console.error('Failed to sync lesson completion:', error)
        // Could implement retry logic here
      }
    },

    // Issue certificate and sync to database
    issueCertificate: async (courseId, courseName, userName) => {
      try {
        const certificateId = `cert_${Date.now()}`
        
        // Get current user name from localStorage if userName is fallback
        let actualUserName = userName
        if (userName === 'Student' || !userName) {
          try {
            const userData = localStorage.getItem('userData')
            if (userData) {
              const user = JSON.parse(userData)
              actualUserName = user.name || userName || 'Student'
            }
          } catch (e) {
            console.warn('Failed to parse user data for certificate:', e)
          }
        }
        
        // Update local state immediately
        set((state) => {
          const already = state.certificates.find(c => c.courseId === courseId)
          if (!already) {
            state.certificates.push({
              id: certificateId,
              courseId,
              courseName,
              userName: actualUserName,
              issuedAt: new Date().toISOString()
            })
          }
        })
        
        // Sync to database
        const { userProgressAPI } = await import('../services/api.js')
        await userProgressAPI.addCertificate(courseId, certificateId, courseName)
        
        console.log('✅ Certificate synced to database with user name:', actualUserName)
      } catch (error) {
        console.error('Failed to sync certificate:', error)
      }
    }
  })),
  {
    name: 'course-storage',
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ 
      enrolledCourses: state.enrolledCourses, 
      progressByCourseId: state.progressByCourseId,
      certificates: state.certificates
    })
  }
  )
)

// Chat Store
export const useChatStore = create(
  immer((set, get) => ({
    messages: {},
    activeUsers: {},
    typingUsers: {},
    currentRoom: null,
    
    setMessages: (roomId, messages) => set((state) => {
      state.messages[roomId] = messages
    }),
    
    addMessage: (roomId, message) => set((state) => {
      if (!state.messages[roomId]) {
        state.messages[roomId] = []
      }
      state.messages[roomId].push(message)
    }),
    
    updateMessage: (roomId, messageId, updates) => set((state) => {
      if (state.messages[roomId]) {
        const index = state.messages[roomId].findIndex(m => m._id === messageId)
        if (index !== -1) {
          state.messages[roomId][index] = { ...state.messages[roomId][index], ...updates }
        }
      }
    }),
    
    setActiveUsers: (roomId, users) => set((state) => {
      state.activeUsers[roomId] = users
    }),
    
    setTypingUsers: (roomId, users) => set((state) => {
      state.typingUsers[roomId] = users
    }),
    
    setCurrentRoom: (roomId) => set((state) => {
      state.currentRoom = roomId
    }),
    
    clearRoom: (roomId) => set((state) => {
      delete state.messages[roomId]
      delete state.activeUsers[roomId]
      delete state.typingUsers[roomId]
    })
  }))
)

// Notes Store
export const useNotesStore = create(
  persist(
    immer((set, get) => ({
      notes: [],
      currentNote: null,
      syncStatus: 'synced', // 'syncing', 'synced', 'error', 'offline'
      collaborators: [],
      
      setNotes: (notes) => set((state) => {
        state.notes = notes
      }),
      
      addNote: (note) => set((state) => {
        state.notes.push(note)
      }),
      
      updateNote: (noteId, updates) => set((state) => {
        const index = state.notes.findIndex(n => n._id === noteId)
        if (index !== -1) {
          state.notes[index] = { ...state.notes[index], ...updates }
        }
        
        if (state.currentNote?._id === noteId) {
          state.currentNote = { ...state.currentNote, ...updates }
        }
      }),
      
      deleteNote: (noteId) => set((state) => {
        state.notes = state.notes.filter(n => n._id !== noteId)
        if (state.currentNote?._id === noteId) {
          state.currentNote = null
        }
      }),
      
      setCurrentNote: (note) => set((state) => {
        state.currentNote = note
      }),
      
      setSyncStatus: (status) => set((state) => {
        state.syncStatus = status
      }),
      
      setCollaborators: (collaborators) => set((state) => {
        state.collaborators = collaborators
      }),
      
      // Offline support
      addOfflineNote: (note) => set((state) => {
        const offlineNote = {
          ...note,
          _id: `offline_${Date.now()}`,
          isOffline: true,
          createdAt: new Date().toISOString()
        }
        state.notes.push(offlineNote)
      }),
      
      markForSync: (noteId) => set((state) => {
        const index = state.notes.findIndex(n => n._id === noteId)
        if (index !== -1) {
          state.notes[index].needsSync = true
        }
      })
    })),
    {
      name: 'notes-storage',
      storage: createJSONStorage(() => localStorage)
    }
  )
)

// Assignment Store
export const useAssignmentStore = create(
  immer((set, get) => ({
    assignments: [],
    submissions: [],
    currentAssignment: null,
    
    setAssignments: (assignments) => set((state) => {
      state.assignments = assignments
    }),
    
    setSubmissions: (submissions) => set((state) => {
      state.submissions = submissions
    }),
    
    setCurrentAssignment: (assignment) => set((state) => {
      state.currentAssignment = assignment
    }),
    
    addSubmission: (submission) => set((state) => {
      state.submissions.push(submission)
    }),
    
    updateSubmission: (submissionId, updates) => set((state) => {
      const index = state.submissions.findIndex(s => s._id === submissionId)
      if (index !== -1) {
        state.submissions[index] = { ...state.submissions[index], ...updates }
      }
    })
  }))
)

// Discussion Store
export const useDiscussionStore = create(
  immer((set, get) => ({
    discussions: [],
    currentDiscussion: null,
    replies: {},
    
    setDiscussions: (discussions) => set((state) => {
      state.discussions = discussions
    }),
    
    setCurrentDiscussion: (discussion) => set((state) => {
      state.currentDiscussion = discussion
    }),
    
    setReplies: (discussionId, replies) => set((state) => {
      state.replies[discussionId] = replies
    }),
    
    addReply: (discussionId, reply) => set((state) => {
      if (!state.replies[discussionId]) {
        state.replies[discussionId] = []
      }
      state.replies[discussionId].push(reply)
    }),
    
    updateReply: (discussionId, replyId, updates) => set((state) => {
      if (state.replies[discussionId]) {
        const index = state.replies[discussionId].findIndex(r => r._id === replyId)
        if (index !== -1) {
          state.replies[discussionId][index] = { ...state.replies[discussionId][index], ...updates }
        }
      }
    })
  }))
)

// Analytics Store
export const useAnalyticsStore = create(
  immer((set, get) => ({
    userAnalytics: null,
    courseAnalytics: {},
    systemAnalytics: null,
    
    setUserAnalytics: (analytics) => set((state) => {
      state.userAnalytics = analytics
    }),
    
    setCourseAnalytics: (courseId, analytics) => set((state) => {
      state.courseAnalytics[courseId] = analytics
    }),
    
    setSystemAnalytics: (analytics) => set((state) => {
      state.systemAnalytics = analytics
    })
  }))
)