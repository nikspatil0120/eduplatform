import axios from 'axios'
import toast from 'react-hot-toast'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  // Increased timeout for better reliability during development
  timeout: 15000, // 15 seconds instead of 6
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response, config } = error
    // Allow callers to suppress global error toasts for handled flows
    if (config?.suppressGlobalErrorToast) {
      return Promise.reject(error)
    }
    
    if (response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken')
      localStorage.removeItem('userData')
      toast.error('Session expired. Please login again.')
      // Allow specific calls to suppress redirect and handle navigation in UI
      if (!config?.suppressAuthRedirect) {
        window.location.href = '/login'
      }
    } else if (response?.status === 403) {
      toast.error('Access denied. You do not have permission to perform this action.')
    } else if (response?.status === 429) {
      toast.error('Too many requests. Please slow down.')
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (!response) {
      toast.error('Network error. Please check your connection.')
    }
    
    return Promise.reject(error)
  }
)

// API Services
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }),
  sendOTP: (email) => api.post('/auth/send-otp', { email }),
  verifyOTP: (email, otp) => api.post('/auth/verify-otp', { email, otp }),
  googleAuth: (token) => api.post('/auth/google', { token }),
}

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
}

export const courseAPI = {
  getCourses: (params, options = {}) => api.get('/courses', { params, ...options }),
  getCourseById: (id, options = {}) => api.get(`/courses/${id}`, { ...options }),
  createCourse: (data) => api.post('/courses', data),
  updateCourse: (id, data) => api.put(`/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/courses/${id}`),
  enrollCourse: (courseId, data = {}, options = {}) => api.post(`/courses/${courseId}/enroll`, data, { suppressAuthRedirect: true, ...options }),
  unenrollCourse: (courseId, options = {}) => api.post(`/courses/${courseId}/unenroll`, undefined, { ...options }),
  getEnrolledCourses: (options = {}) => api.get('/courses/enrolled', { ...options }),
  getCourseProgress: (courseId, options = {}) => api.get(`/courses/${courseId}/progress`, { ...options }),
  updateProgress: (courseId, lessonId, options = {}) => api.post(`/courses/${courseId}/progress`, { lessonId }, { ...options }),
}

// User Progress API
export const userProgressAPI = {
  getAllProgress: (options = {}) => api.get('/user-progress', { ...options }),
  getCourseProgress: (courseId, options = {}) => api.get(`/user-progress/${courseId}`, { ...options }),
  markLessonComplete: (courseId, lessonId, watchTime = 0, options = {}) => 
    api.post(`/user-progress/${courseId}/lesson`, { lessonId, watchTime }, { ...options }),
  addCertificate: (courseId, certificateId, courseName, options = {}) => 
    api.post(`/user-progress/${courseId}/certificate`, { certificateId, courseName }, { ...options }),
  resetProgress: (courseId, options = {}) => api.delete(`/user-progress/${courseId}`, { ...options }),
}

export const notesAPI = {
  getNotes: (params) => api.get('/notes', { params }),
  getNoteById: (id) => api.get(`/notes/${id}`),
  createNote: (data) => api.post('/notes', data),
  updateNote: (id, data) => api.put(`/notes/${id}`, data),
  deleteNote: (id) => api.delete(`/notes/${id}`),
  shareNote: (id, shareData) => api.post(`/notes/${id}/share`, shareData),
}

export const notificationAPI = {
  getNotifications: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),

}

export const quizAPI = {
  getQuizzes: (courseId) => api.get(`/courses/${courseId}/quizzes`),
  getQuizById: (id) => api.get(`/quizzes/${id}`),
  submitQuiz: (id, answers) => api.post(`/quizzes/${id}/submit`, { answers }),
  getQuizResults: (id) => api.get(`/quizzes/${id}/results`),
}

export const profileAPI = {
  getAvatarStatus: () => api.get('/profile/avatar-status'),
  uploadAvatar: (formData) => api.post('/profile/upload-avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  deleteAvatar: () => api.delete('/profile/delete-avatar'),
  updateProfile: (data) => api.put('/profile/update', data),
}

export const paymentAPI = {
  createPaymentIntent: (data) => api.post('/payments/create-intent', data),
  confirmPayment: (paymentIntentId) => api.post('/payments/confirm', { paymentIntentId }),
  getPaymentHistory: () => api.get('/payments/history'),
  createSubscription: (priceId) => api.post('/payments/subscription', { priceId }),
  cancelSubscription: (subscriptionId) => api.delete(`/payments/subscription/${subscriptionId}`),
}

export const analyticsAPI = {
  getDashboardStats: () => api.get('/analytics/dashboard'),
  getCourseAnalytics: (courseId) => api.get(`/analytics/courses/${courseId}`),
  getUserAnalytics: (userId) => api.get(`/analytics/users/${userId}`),
  getRevenueAnalytics: (params) => api.get('/analytics/revenue', { params }),
}

export const uploadAPI = {
  uploadFile: (file, folder = 'general') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    
    return api.post('/upload/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(`Upload Progress: ${percentCompleted}%`)
      },
    })
  },
  uploadMultiple: (files, folder = 'general') => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    formData.append('folder', folder)
    return api.post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getFileInfo: (blobName) => api.get(`/upload/info/${blobName}`),
  deleteFile: (blobName) => api.delete(`/upload/${blobName}`),
  getSecureUrl: (blobName) => api.post('/upload/secure-url', { blobName }),
}

// Assignment API
export const assignmentAPI = {
  getCourseAssignments: (courseId, params) => api.get(`/assignments/course/${courseId}`, { params }),
  getAssignment: (id) => api.get(`/assignments/${id}`),
  createAssignment: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'attachments' && data[key]) {
        data[key].forEach(file => formData.append('attachments', file))
      } else {
        formData.append(key, data[key])
      }
    })
    return api.post('/assignments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateAssignment: (id, data) => api.put(`/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`/assignments/${id}`),
  publishAssignment: (id) => api.post(`/assignments/${id}/publish`),
  getAssignmentSubmissions: (id, params) => api.get(`/assignments/${id}/submissions`, { params }),
  getAssignmentAnalytics: (id) => api.get(`/assignments/${id}/analytics`),
}

// Submission API
export const submissionAPI = {
  submitAssignment: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'files' && data[key]) {
        data[key].forEach(file => formData.append('files', file))
      } else {
        formData.append(key, data[key])
      }
    })
    return api.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getMySubmissions: (params) => api.get('/submissions/my', { params }),
  getSubmission: (id) => api.get(`/submissions/${id}`),
  gradeSubmission: (id, data) => api.put(`/submissions/${id}/grade`, data),
  addPeerReview: (id, data) => api.post(`/submissions/${id}/peer-review`, data),
  deleteSubmission: (id) => api.delete(`/submissions/${id}`),
  downloadFile: (id, fileIndex) => api.get(`/submissions/${id}/download/${fileIndex}`),
}

// Discussion API
export const discussionAPI = {
  getCourseDiscussions: (courseId, params) => api.get(`/discussions/course/${courseId}`, { params }),
  getDiscussion: (id) => api.get(`/discussions/${id}`),
  createDiscussion: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'attachments' && data[key]) {
        data[key].forEach(file => formData.append('attachments', file))
      } else {
        formData.append(key, data[key])
      }
    })
    return api.post('/discussions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateDiscussion: (id, data) => api.put(`/discussions/${id}`, data),
  deleteDiscussion: (id) => api.delete(`/discussions/${id}`),
  pinDiscussion: (id) => api.post(`/discussions/${id}/pin`),
  lockDiscussion: (id, reason) => api.post(`/discussions/${id}/lock`, { reason }),
  searchDiscussions: (params) => api.get('/discussions/search', { params }),
  getTrendingDiscussions: (courseId, days) => api.get(`/discussions/trending/${courseId}`, { params: { days } }),
  votePoll: (id, optionIndex) => api.post(`/discussions/${id}/poll/vote`, { optionIndex }),
}

// Reply API
export const replyAPI = {
  createReply: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'attachments' && data[key]) {
        data[key].forEach(file => formData.append('attachments', file))
      } else {
        formData.append(key, data[key])
      }
    })
    return api.post('/replies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  updateReply: (id, data) => api.put(`/replies/${id}`, data),
  deleteReply: (id) => api.delete(`/replies/${id}`),
  voteReply: (id, type) => api.post(`/replies/${id}/vote`, { type }),
  markSolution: (id) => api.post(`/replies/${id}/mark-solution`),
}

// Chat API
export const chatAPI = {
  sendMessage: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'attachments' && data[key]) {
        data[key].forEach(file => formData.append('attachments', file))
      } else {
        formData.append(key, data[key])
      }
    })
    return api.post('/chat/messages', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getMessages: (courseId, params) => api.get(`/chat/messages/${courseId}`, { params }),
  editMessage: (id, content) => api.put(`/chat/messages/${id}`, { content }),
  deleteMessage: (id) => api.delete(`/chat/messages/${id}`),
  addReaction: (id, emoji) => api.post(`/chat/messages/${id}/reactions`, { emoji }),
  removeReaction: (id) => api.delete(`/chat/messages/${id}/reactions`),
  updateTyping: (courseId, isTyping) => api.post('/chat/typing', { courseId, isTyping }),
  joinChat: (courseId) => api.post(`/chat/join/${courseId}`),
  leaveChat: (courseId) => api.post(`/chat/leave/${courseId}`),
  getChatAnalytics: (courseId, params) => api.get(`/chat/analytics/${courseId}`, { params }),
}



// Learning Path API
export const learningPathAPI = {
  getLearningPaths: (params) => api.get('/learning-paths', { params }),
  getLearningPath: (id) => api.get(`/learning-paths/${id}`),
  createLearningPath: (data) => api.post('/learning-paths', data),
  updateLearningPath: (id, data) => api.put(`/learning-paths/${id}`, data),
  deleteLearningPath: (id) => api.delete(`/learning-paths/${id}`),
  enrollInPath: (id) => api.post(`/learning-paths/${id}/enroll`),
  unenrollFromPath: (id) => api.post(`/learning-paths/${id}/unenroll`),
  completeCourse: (id, courseId) => api.post(`/learning-paths/${id}/complete-course`, { courseId }),
  getProgress: (id) => api.get(`/learning-paths/${id}/progress`),
  publishPath: (id) => api.post(`/learning-paths/${id}/publish`),
  getEnrolledPaths: () => api.get('/learning-paths/my/enrolled'),
}

// Certificate API
export const certificateAPI = {
  getMyCertificates: (params) => api.get('/certificates/my', { params }),
  getCertificate: (id) => api.get(`/certificates/${id}`),
  issueCertificate: (data) => api.post('/certificates/issue', data),
  revokeCertificate: (id, reason) => api.post(`/certificates/${id}/revoke`, { reason }),
  verifyCertificate: (certificateNumber) => api.get(`/certificates/verify/${certificateNumber}`),
  downloadCertificate: (id) => api.get(`/certificates/${id}/download`),
  getCertificateAnalytics: (params) => api.get('/certificates/analytics/overview', { params }),
  bulkIssueCertificates: (data) => api.post('/certificates/bulk-issue', data),
}

// System API
export const systemAPI = {
  getHealth: () => api.get('/system/health'),
  getStats: () => api.get('/system/stats'),
  getLogs: (params) => api.get('/system/logs', { params }),
  restartTask: (taskName) => api.post(`/system/scheduler/restart/${taskName}`),
  stopTask: (taskName) => api.post(`/system/scheduler/stop/${taskName}`),
  getRealtimeStats: () => api.get('/system/realtime/stats'),
  broadcastAnnouncement: (data) => api.post('/system/broadcast', data),
  getDatabaseCollections: () => api.get('/system/database/collections'),
}

export default api