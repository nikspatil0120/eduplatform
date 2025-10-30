import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Search, 
  Star, 
  Clock, 
  Users, 
  Play,
  BookOpen,
  Code,
  Palette,
  BarChart,
  Camera,
  Music,
  Globe,
  Briefcase
} from 'lucide-react'
import { courseAPI } from '../services/api'
import toast from 'react-hot-toast'

const CourseCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')

  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  const categories = [
    { id: 'all', name: 'All Courses', icon: BookOpen, count: courses.length },
    { id: 'programming', name: 'Programming', icon: Code, count: courses.filter(c => c.category === 'programming').length },
    { id: 'design', name: 'Design', icon: Palette, count: courses.filter(c => c.category === 'design').length },
    { id: 'business', name: 'Business', icon: Briefcase, count: courses.filter(c => c.category === 'business').length },
    { id: 'data-science', name: 'Data Science', icon: BarChart, count: courses.filter(c => c.category === 'data-science').length },
    { id: 'marketing', name: 'Marketing', icon: Globe, count: courses.filter(c => c.category === 'marketing').length },
    { id: 'photography', name: 'Photography', icon: Camera, count: courses.filter(c => c.category === 'photography').length },
    { id: 'music', name: 'Music', icon: Music, count: courses.filter(c => c.category === 'music').length }
  ]

  // Fetch courses from backend
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true)
        const response = await courseAPI.getCourses({ limit: 12, page: 1 }, { suppressGlobalErrorToast: true })
        const coursesData = response.data?.data?.courses || response.data?.courses || []
        
        // Transform backend data to match frontend expectations
        const transformedCourses = coursesData.map(course => ({
          id: course._id,
          title: course.title,
          instructor: course.instructor?.name || 'Unknown Instructor',
          category: course.category,
          level: course.level,
          rating: course.stats?.averageRating || 4.5,
          students: course.stats?.enrolledStudents || 0,
          duration: `${course.totalDurationHours || 0} hours`,
          thumbnail: course.media?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
          description: course.description || course.shortDescription || 'No description available',
          tags: course.tags || [],
          bestseller: course.stats?.enrolledStudents > 1000
        }))

        setCourses(transformedCourses)
      } catch (error) {
        console.error('Failed to fetch courses:', error)
        toast.error('Failed to fetch courses')
        setCourses([])
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel
    
    return matchesSearch && matchesCategory && matchesLevel
  })

  // No sorting needed, just use filtered courses
  const sortedCourses = filteredCourses

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explore Our Courses
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Discover thousands of courses taught by expert instructors. Learn new skills and advance your career.
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search courses, instructors, or topics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>


            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Categories Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-64 flex-shrink-0"
          >
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Categories
              </h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <motion.button
                    key={category.id}
                    whileHover={{ x: 5 }}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <category.icon className="h-5 w-5" />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {category.count}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Courses Grid */}
          <div className="flex-1">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-6"
            >
              <p className="text-gray-600 dark:text-gray-400">
                Showing {sortedCourses.length} of {courses.length} courses
              </p>
            </motion.div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, index) => (
                  <div key={index} className="card overflow-hidden animate-pulse">
                    <div className="w-full h-48 bg-gray-300 dark:bg-gray-600"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-20"></div>
                        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <AnimatePresence>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {sortedCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="card overflow-hidden group"
                  >
                    <div className="relative">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {course.bestseller && (
                        <div className="absolute top-3 left-3 bg-accent-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                          Bestseller
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          whileHover={{ scale: 1 }}
                          className="bg-white/90 p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        >
                          <Play className="h-6 w-6 text-primary-600" />
                        </motion.div>
                      </div>
                    </div>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary-600 bg-primary-100 dark:bg-primary-900/20 px-2 py-1 rounded-full">
                          {categories.find(cat => cat.id === course.category)?.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {course.level}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {course.description}
                      </p>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        by {course.instructor}
                      </p>

                      <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span>{course.rating}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{course.students.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span>{course.duration}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-4">
                        {course.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-green-600 font-medium">
                          Free Course
                        </div>
                        <Link
                          to={`/course/${course.id}`}
                          className="btn-primary text-sm px-4 py-2"
                        >
                          View Course
                        </Link>
                      </div>
                    </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}

            {sortedCourses.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No courses found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search or filter criteria
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseCatalog