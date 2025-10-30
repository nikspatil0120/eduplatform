import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Clock, 
  Award, 
  Calendar,
  Bell,
  Play,
  FileText,
  Users,
  Target,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCourseStore } from '../store'

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const enrolled = useCourseStore((s) => s.enrolledCourses)
  const getTotalStudyTimeFormatted = useCourseStore((s) => s.getTotalStudyTimeFormatted)

  const certificates = useCourseStore((s) => s.listCertificates())
  const manualSync = useCourseStore((s) => s.manualSync)
  const [showCertModal, setShowCertModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(true)

  const handleManualSync = async () => {
    console.log('🔄 Manual sync triggered')
    await manualSync()
  }

  // Debug enrolled courses data
  console.log('📚 Enrolled courses in Dashboard:', enrolled)
  
  // Debug enrollment status
  console.log('🔐 Current user:', user)
  console.log('🔐 Is authenticated:', isAuthenticated)
  
  // Debug course store
  const { isCourseEnrolled } = useCourseStore.getState()
  console.log('🔐 Course store enrollment check function:', isCourseEnrolled)

  const enrolledCourses = enrolled || []

  // Fetch real notifications from database
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!isAuthenticated || !user) return
      
      try {
        setLoadingNotifications(true)
        const token = localStorage.getItem('authToken')
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('📨 Fetched notifications:', data)
          setNotifications(data.data || [])
        } else {
          console.error('Failed to fetch notifications:', response.status)
          // Fallback to empty array if API fails
          setNotifications([])
        }
      } catch (error) {
        console.error('Error fetching notifications:', error)
        // Fallback to empty array if API fails
        setNotifications([])
      } finally {
        setLoadingNotifications(false)
      }
    }

    fetchNotifications()
  }, [isAuthenticated, user])

  const stats = [
    { label: 'Courses Enrolled', value: String(enrolled.length || 0), icon: BookOpen, color: 'bg-blue-500', change: '0 this month' },
    { label: 'Hours Learned', value: getTotalStudyTimeFormatted(), icon: Clock, color: 'bg-green-500', change: 'watch time' },
    { label: 'Certificates', value: String(certificates.length || 0), icon: Award, color: 'bg-yellow-500', change: `${certificates.length} total` }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.name}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Ready to continue your learning journey?
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleManualSync}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -5 }}
              className={`card p-6 ${stat.label === 'Certificates' ? 'cursor-pointer' : ''}`}
              onClick={() => {
                if (stat.label === 'Certificates' && certificates.length > 0) {
                  setShowCertModal(true)
                }
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enrolled Courses */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Continue Learning
                </h2>
                <Link
                  to="/courses"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All
                </Link>
              </div>

              <div className="space-y-4">
                {enrolled.length > 0 && enrolled.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ x: 5 }}
                    className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <img
                      src={course.thumbnail || '/api/placeholder/course-thumbnail.jpg'}
                      alt={course.title || 'Course'}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {course.title || 'Untitled Course'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        by {course.instructor?.name || course.instructor || 'Unknown Instructor'}
                      </p>
                      <Link
                        to={`/course/${course.id}`}
                        className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        <Play className="h-4 w-4" />
                        <span>Open</span>
                      </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Certificates */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Certificates</h3>
              </div>
              {certificates.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No certificates yet.</p>
              ) : (
                <div className="space-y-3">
                  {certificates.map(cert => (
                    <Link key={cert.id} to={`/certificate/${cert.id}`} className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{cert.courseName}</div>
                          <div className="text-xs text-gray-500">Issued {new Date(cert.issuedAt).toLocaleString()}</div>
                        </div>
                        <span className="text-primary-600 text-sm">View</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>


            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <Link
                  to="/notifications"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              
              {loadingNotifications ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-start space-x-3 p-3">
                        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const isUnread = !notification.readAt
                    const timeAgo = notification.createdAt ? 
                      new Date(notification.createdAt).toLocaleDateString() : 
                      'Recently'
                    
                    return (
                      <div
                        key={notification._id}
                        className={`p-3 rounded-lg transition-colors cursor-pointer ${
                          isUnread
                            ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-1 rounded-full ${
                            notification.type === 'assignment' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' :
                            notification.type === 'course' ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400' :
                            notification.type === 'system' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400' :
                            notification.type === 'announcement' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {notification.type === 'assignment' && <BookOpen className="h-3 w-3" />}
                            {notification.type === 'course' && <Play className="h-3 w-3" />}
                            {notification.type === 'system' && <Bell className="h-3 w-3" />}
                            {notification.type === 'announcement' && <Calendar className="h-3 w-3" />}
                            {!['assignment', 'course', 'system', 'announcement'].includes(notification.type) && <Bell className="h-3 w-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {timeAgo}
                            </p>
                          </div>
                          {isUnread && (
                            <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Certificates Modal */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowCertModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Your Certificates</h4>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowCertModal(false)}>✕</button>
            </div>
            {certificates.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No certificates yet.</p>
            ) : (
              <div className="space-y-3">
                {certificates.map(cert => (
                  <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{cert.courseName}</div>
                      <div className="text-xs text-gray-500">Issued {new Date(cert.issuedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link to={`/certificate/${cert.id}`} className="btn-secondary px-3 py-1 text-sm">View</Link>
                      <button
                        className="btn-primary px-3 py-1 text-sm"
                        onClick={() => {
                          const win = window.open(`/certificate/${cert.id}`, '_blank')
                          if (win) {
                            win.focus()
                            // Give the new tab a moment to load then trigger print
                            setTimeout(() => { try { win.print() } catch (_) {} }, 800)
                          }
                        }}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard