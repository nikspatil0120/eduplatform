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
  immer((set, get) => ({
    courses: [],
    currentCourse: null,
    enrolledCourses: [],
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
    })
  }))
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