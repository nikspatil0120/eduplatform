import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  Bell, 
  Settings,
  Search,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  UserCheck,
  GraduationCap,
  Activity
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useCourseStore } from '../../store'
import toast from 'react-hot-toast'
import adminApi from '../../services/adminApi'

// Import admin modules
import UserManagement from './modules/UserManagement'
import CourseManagement from './modules/CourseManagement'
import AssignmentManagement from './modules/AssignmentManagement'
import NotificationManagement from './modules/NotificationManagement'
import SystemSettings from './modules/SystemSettings'

const AdminDashboard = () => {
  const { user, logout } = useAuth()
  const [activeModule, setActiveModule] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    pendingAssignments: 0
  })
  // Note: we previously showed client-side enrolled count; now we rely on backend stats
  const [showEnrolledModal, setShowEnrolledModal] = useState(false)
  const [enrolledUsers, setEnrolledUsers] = useState([])
  const [loadingEnrolled, setLoadingEnrolled] = useState(false)
  const [selectedUserCourses, setSelectedUserCourses] = useState(null)
  const [loadingUserCourses, setLoadingUserCourses] = useState(false)

  // Debug logging
  console.log('AdminDashboard rendering...', { user, activeModule })

  // Fetch dashboard stats
  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      console.log('Fetching dashboard stats...')
      const token = localStorage.getItem('authToken')
      console.log('Auth token available:', !!token)
      
      const stats = await adminApi.getDashboardStats()
      console.log('Dashboard stats received:', stats)
      setDashboardStats({
        totalUsers: Number(stats?.totalUsers) || 0,
        activeUsers: Number(stats?.activeUsers) || 0,
        totalCourses: Number(stats?.totalCourses) || 0,
        pendingAssignments: Number(stats?.pendingAssignments) || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      console.error('Error details:', error.response?.data || error.message)
      
      // Check if it's an auth error
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Authentication failed. Please login again.')
      } else {
        toast.error('Failed to load dashboard statistics.')
      }
      
      // Fallback to zeros on error
      setDashboardStats({ totalUsers: 0, activeUsers: 0, totalCourses: 0, pendingAssignments: 0 })
    }
  }

  const openEnrolledUsersModal = async () => {
    try {
      setLoadingEnrolled(true)
      setShowEnrolledModal(true)
      const data = await adminApi.getEnrolledUsers()
      setEnrolledUsers(Array.isArray(data.users) ? data.users : [])
    } catch (e) {
      toast.error('Failed to load enrolled users')
    } finally {
      setLoadingEnrolled(false)
    }
  }

  // Navigation items
  const navigationItems = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3, color: 'text-blue-500' },
    { id: 'courses', name: 'Course Management', icon: BookOpen, color: 'text-purple-500' },
    { id: 'notifications', name: 'Notifications', icon: Bell, color: 'text-red-500' },
    { id: 'settings', name: 'System Settings', icon: Settings, color: 'text-gray-500' }
  ]

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error('Failed to logout')
    }
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 cursor-pointer"
          onClick={openEnrolledUsersModal}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(dashboardStats.activeUsers || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{(dashboardStats.totalCourses || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>

      </div>

      {/* Quick Actions removed as requested */}
    </div>
  )

  const renderActiveModule = () => {
    console.log('Rendering active module:', activeModule)
    
    switch (activeModule) {
      case 'dashboard':
        return renderDashboardOverview()
      case 'courses':
        return <CourseManagement />
      case 'notifications':
        return <NotificationManagement />
      case 'settings':
        return <SystemSettings />
      default:
        return renderDashboardOverview()
    }
  }

  // Simple loading check
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 ${darkMode ? 'dark' : ''}`}>

      <div className="flex">
        {/* Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700"
            >
              <div className="flex flex-col h-full">
                {/* Logo */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    Kiro Admin
                  </h1>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2">
                  {navigationItems.map((item) => (
                    <motion.button
                      key={item.id}
                      whileHover={{ x: 4 }}
                      onClick={() => setActiveModule(item.id)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                        activeModule === item.id
                          ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <item.icon className={`h-5 w-5 ${activeModule === item.id ? 'text-primary-600' : item.color}`} />
                      <span className="font-medium">{item.name}</span>
                    </motion.button>
                  ))}
                </nav>

                {/* User Info */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {user?.name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.name || 'Admin User'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email || 'admin@kiro.edu'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          {/* Top Bar */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <Menu className="h-5 w-5" />
                </button>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveModule('users')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <Users className="h-4 w-4" />
                  <span>Add User</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveModule('courses')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Add Course</span>
                </motion.button>

                <button
                  onClick={toggleDarkMode}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
                
                <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
                </button>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">
            {/* Active Module Indicator */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Current Module: <span className="font-semibold capitalize">{activeModule}</span>
              </p>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderActiveModule()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Action Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative group">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="bg-primary-600 hover:bg-primary-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => setActiveModule('users')}
            >
              <Users className="h-6 w-6" />
            </motion.button>
            
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              Quick Add User
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Users Modal */}
      {showEnrolledModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowEnrolledModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Enrolled Users ({enrolledUsers.length})</h4>
              <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" onClick={() => setShowEnrolledModal(false)}>✕</button>
            </div>
            {loadingEnrolled ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-300">Loading...</div>
            ) : enrolledUsers.length === 0 ? (
              <div className="py-8 text-center text-gray-600 dark:text-gray-300">No enrolled users found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="max-h-96 overflow-auto divide-y divide-gray-200 dark:divide-gray-700">
                  {enrolledUsers.map(u => (
                    <button
                      key={u._id}
                      onClick={async () => {
                        try {
                          setLoadingUserCourses(true)
                          setSelectedUserCourses(null)
                          const data = await adminApi.getUserEnrollments(u._id)
                          setSelectedUserCourses({ user: u, courses: data.courses || [] })
                        } catch (_) {
                          toast.error('Failed to fetch user enrollments')
                        } finally {
                          setLoadingUserCourses(false)
                        }
                      }}
                      className="w-full text-left py-3 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{u.name || 'Unnamed User'}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </button>
                  ))}
                </div>
                <div className="border rounded-lg p-3 border-gray-200 dark:border-gray-700 min-h-[8rem]">
                  {loadingUserCourses ? (
                    <div className="text-center text-gray-600 dark:text-gray-300">Loading courses…</div>
                  ) : selectedUserCourses ? (
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white mb-2">{selectedUserCourses.user.name || selectedUserCourses.user.email}</div>
                      {selectedUserCourses.courses.length === 0 ? (
                        <div className="text-sm text-gray-600 dark:text-gray-300">No courses found.</div>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {selectedUserCourses.courses.map(c => (
                            <li key={c._id} className="flex items-center justify-between">
                              <span className="text-gray-900 dark:text-white">{c.title}</span>
                              <span className="text-xs text-gray-500">{c.level}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-300">Select a user to view enrolled courses.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard