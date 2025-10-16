import api from './api'

class AdminAPI {
  // Dashboard Statistics
  async getDashboardStats() {
    const response = await api.get('/admin/stats')
    return response.data
  }

  async getEnrolledUsers() {
    const response = await api.get('/admin/stats/active-users')
    return response.data
  }

  async getUserEnrollments(userId) {
    const response = await api.get(`/admin/enrollments/${userId}`)
    return response.data
  }

  // User Management
  async getUsers(params = {}) {
    const response = await api.get('/admin/users', { params })
    return response.data
  }

  async getUser(id) {
    const response = await api.get(`/admin/users/${id}`)
    return response.data
  }

  async updateUserRole(id, role) {
    const response = await api.put(`/admin/users/${id}/role`, { role })
    return response.data
  }

  async updateUserStatus(id, isActive) {
    const response = await api.put(`/admin/users/${id}/status`, { isActive })
    return response.data
  }

  async deleteUser(id) {
    const response = await api.delete(`/admin/users/${id}`)
    return response.data
  }

  // Course Management
  async getCourses(params = {}) {
    console.log('🌐 Making API call to /admin/courses with params:', params)
    const response = await api.get('/admin/courses', { params })
    console.log('📡 API response received:', response.data)
    return response.data
  }

  async getCourse(id) {
    const response = await api.get(`/admin/courses/${id}`)
    return response.data
  }

  // Debug endpoint to check all courses
  async getDebugCourses() {
    console.log('🔧 Making debug API call to /admin/debug/courses')
    const response = await api.get('/admin/debug/courses')
    console.log('🐛 Debug response:', response.data)
    return response.data
  }

  async createCourse(courseData) {
    console.log('🎯 Creating course with data:', courseData)
    const response = await api.post('/courses', courseData)
    console.log('✅ Course created successfully:', response.data)
    return response.data
  }

  async publishCourse(id) {
    const response = await api.post(`/admin/courses/${id}/publish`)
    return response.data
  }

  async approveCourse(id) {
    const response = await api.post(`/admin/courses/${id}/approve`)
    return response.data
  }

  async updateCourse(id, payload) {
    const response = await api.put(`/admin/courses/${id}`, payload)
    return response.data
  }

  async deleteCourse(id) {
    const response = await api.delete(`/admin/courses/${id}`)
    return response.data
  }

  async rejectCourse(id, reason) {
    const response = await api.post(`/admin/courses/${id}/reject`, { reason })
    return response.data
  }

  // Assignment Management
  async getAssignments(params = {}) {
    const response = await api.get('/admin/assignments', { params })
    return response.data
  }

  // Analytics
  async getUserAnalytics(period = '30d') {
    const response = await api.get('/admin/analytics/users', { params: { period } })
    return response.data
  }

  async getCourseAnalytics() {
    const response = await api.get('/admin/analytics/courses')
    return response.data
  }

  // System Health
  async getSystemHealth() {
    const response = await api.get('/admin/system/health')
    return response.data
  }

  // Notifications
  async createNotification(notification) {
    const response = await api.post('/admin/notifications', notification)
    return response.data
  }

  async getNotifications(params = {}) {
    const response = await api.get('/admin/notifications', { params })
    return response.data
  }

  // Audit Logs
  async getLogs(params = {}) {
    const response = await api.get('/admin/logs', { params })
    return response.data
  }
}

export default new AdminAPI()