import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp, 
  Calendar,
  Bell,
  Play,
  FileText,
  Users,
  Target,
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Dashboard = () => {
  const { user } = useAuth()

  const enrolledCourses = [
    {
      id: 1,
      title: 'React Development Masterclass',
      instructor: 'Sarah Johnson',
      progress: 75,
      totalLessons: 24,
      completedLessons: 18,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300',
      nextLesson: 'Advanced Hooks',
      timeLeft: '2h 30m'
    },
    {
      id: 2,
      title: 'UI/UX Design Fundamentals',
      instructor: 'Michael Chen',
      progress: 45,
      totalLessons: 16,
      completedLessons: 7,
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300',
      nextLesson: 'Color Theory',
      timeLeft: '1h 45m'
    },
    {
      id: 3,
      title: 'Data Science with Python',
      instructor: 'Emily Rodriguez',
      progress: 30,
      totalLessons: 32,
      completedLessons: 10,
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300',
      nextLesson: 'Pandas Basics',
      timeLeft: '3h 15m'
    }
  ]

  const recentNotes = [
    {
      id: 1,
      title: 'React Hooks Best Practices',
      course: 'React Development Masterclass',
      lastModified: '2 hours ago',
      preview: 'useState and useEffect are the most commonly used hooks...'
    },
    {
      id: 2,
      title: 'Design System Components',
      course: 'UI/UX Design Fundamentals',
      lastModified: '1 day ago',
      preview: 'Consistent design systems help maintain brand identity...'
    },
    {
      id: 3,
      title: 'Data Visualization Techniques',
      course: 'Data Science with Python',
      lastModified: '3 days ago',
      preview: 'Matplotlib and Seaborn are powerful libraries for...'
    }
  ]

  const notifications = [
    {
      id: 1,
      type: 'assignment',
      title: 'New assignment available',
      message: 'React Development Masterclass - Build a Todo App',
      time: '1 hour ago',
      unread: true
    },
    {
      id: 2,
      type: 'achievement',
      title: 'Achievement unlocked!',
      message: 'Completed 5 courses this month',
      time: '2 days ago',
      unread: true
    },
    {
      id: 3,
      type: 'reminder',
      title: 'Course deadline reminder',
      message: 'UI/UX Design project due in 3 days',
      time: '1 week ago',
      unread: false
    }
  ]

  const stats = [
    {
      label: 'Courses Enrolled',
      value: '12',
      icon: BookOpen,
      color: 'bg-blue-500',
      change: '+2 this month'
    },
    {
      label: 'Hours Learned',
      value: '156',
      icon: Clock,
      color: 'bg-green-500',
      change: '+24 this week'
    },
    {
      label: 'Certificates',
      value: '8',
      icon: Award,
      color: 'bg-yellow-500',
      change: '+1 this month'
    },
    {
      label: 'Study Streak',
      value: '15',
      icon: TrendingUp,
      color: 'bg-purple-500',
      change: 'days in a row'
    }
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
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 transition-colors"
              >
                <Bell className="h-6 w-6" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse"></span>
              </motion.button>
              <Link
                to="/courses"
                className="btn-primary flex items-center space-x-2"
              >
                <span>Browse Courses</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
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
              className="card p-6"
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
                {enrolledCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                    whileHover={{ x: 5 }}
                    className="flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        by {course.instructor}
                      </p>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                            <span>{course.completedLessons}/{course.totalLessons} lessons</span>
                            <span>{course.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${course.progress}%` }}
                              transition={{ duration: 1, delay: 0.5 }}
                              className="bg-primary-600 h-2 rounded-full"
                            ></motion.div>
                          </div>
                        </div>
                        <Link
                          to={`/course/${course.id}`}
                          className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                          <Play className="h-4 w-4" />
                          <span>Continue</span>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Notes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Notes
                </h3>
                <Link
                  to="/notes"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      <FileText className="h-4 w-4 text-primary-600 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {note.course}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                          {note.preview}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {note.lastModified}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="card p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Notifications
              </h3>
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg transition-colors cursor-pointer ${
                      notification.unread
                        ? 'bg-primary-50 dark:bg-primary-900/20 border-l-4 border-primary-600'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${
                        notification.type === 'assignment' ? 'bg-blue-100 text-blue-600' :
                        notification.type === 'achievement' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {notification.type === 'assignment' && <BookOpen className="h-3 w-3" />}
                        {notification.type === 'achievement' && <Award className="h-3 w-3" />}
                        {notification.type === 'reminder' && <Calendar className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {notification.time}
                        </p>
                      </div>
                      {notification.unread && (
                        <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard