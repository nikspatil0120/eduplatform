import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { courseAPI } from '../services/api'
import toast from 'react-hot-toast'
import { 
  Play, 
  Pause, 
  Volume2, 
  Maximize, 
  Star, 
  Clock, 
  Users, 
  Award,
  Download,
  BookOpen,
  CheckCircle,
  Lock,
  FileText,
  MessageCircle,
  Share2
} from 'lucide-react'

const CourseDetail = () => {
  const { id } = useParams()
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLesson, setSelectedLesson] = useState(0)
  const [notes, setNotes] = useState('')
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        const response = await courseAPI.getCourseById(id)
        const courseData = response.data?.data || response.data
        
        // Transform backend data
        const transformedCourse = {
          id: courseData._id,
          title: courseData.title,
          instructor: {
            name: courseData.instructor?.name || 'Unknown Instructor',
            avatar: courseData.instructor?.profile?.avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150',
            bio: courseData.instructor?.profile?.bio || 'Experienced instructor',
            rating: 4.9,
            students: 25000
          },
          rating: courseData.stats?.averageRating || 4.5,
          students: courseData.stats?.enrolledStudents || 0,
          duration: `${courseData.totalDurationHours || 0} hours`,
          lessons: courseData.curriculum?.length || 0,
          description: courseData.description || 'No description available',
          thumbnail: courseData.media?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
          tags: courseData.tags || [],
          whatYouLearn: courseData.whatYouWillLearn || [
            'Learn the fundamentals',
            'Build practical projects',
            'Master key concepts',
            'Apply knowledge in real scenarios'
          ],
          curriculum: courseData.curriculum || [],
          requirements: courseData.requirements || [],
          level: courseData.level || 'beginner'
        }
        
        setCourse(transformedCourse)
      } catch (error) {
        console.error('Failed to fetch course:', error)
        toast.error('Failed to load course details')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchCourse()
    }
  }, [id])

  // Handle enrollment
  const handleEnrollment = async () => {
    try {
      setEnrolling(true)
      await courseAPI.enrollCourse(id)
      setIsEnrolled(true)
      toast.success('Successfully enrolled in the course!')
    } catch (error) {
      console.error('Enrollment failed:', error)
      toast.error('Failed to enroll. Please try again.')
    } finally {
      setEnrolling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Course not found</h2>
          <p className="text-gray-600 dark:text-gray-400">The course you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview' },
    { id: 'curriculum', name: 'Curriculum' },
    { id: 'instructor', name: 'Instructor' },
    { id: 'reviews', name: 'Reviews' },
    { id: 'notes', name: 'My Notes' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="relative aspect-video bg-gray-900">
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-primary-600 hover:bg-primary-700 text-white p-6 rounded-full transition-colors"
              >
                {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
              </motion.button>
            </div>
            
            {/* Video Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center space-x-4">
                  <button className="hover:text-primary-400 transition-colors">
                    <Volume2 className="h-5 w-5" />
                  </button>
                  <span className="text-sm">12:30 / 18:20</span>
                </div>
                <div className="flex items-center space-x-4">
                  <button className="hover:text-primary-400 transition-colors">
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="w-full bg-gray-600 rounded-full h-1 mt-2">
                <div className="bg-primary-600 h-1 rounded-full" style={{ width: '68%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {course.title}
              </h1>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-current" />
                  <span>{course.rating}</span>
                  <span>({course.students.toLocaleString()} students)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.lessons} lessons</span>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                {course.description}
              </p>
            </motion.div>

            {/* Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-8"
            >
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-8">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      What you'll learn
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(course.whatYouLearn || []).map((item, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700 dark:text-gray-300">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      Requirements
                    </h3>
                    <ul className="space-y-2">
                      {(course.requirements || []).map((req, index) => (
                        <li key={index} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700 dark:text-gray-300">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="space-y-6">
                  {(course.curriculum || []).map((section, sectionIndex) => (
                    <div key={sectionIndex} className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {section.title}
                      </h3>
                      <div className="space-y-3">
                        {section.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center space-x-3">
                              {lesson.completed ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : lesson.preview ? (
                                <Play className="h-5 w-5 text-primary-600" />
                              ) : (
                                <Lock className="h-5 w-5 text-gray-400" />
                              )}
                              <span className="text-gray-900 dark:text-white font-medium">
                                {lesson.title}
                              </span>
                              {lesson.preview && (
                                <span className="text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-600 px-2 py-1 rounded-full">
                                  Preview
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {lesson.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'instructor' && (
                <div className="card p-6">
                  <div className="flex items-start space-x-6">
                    <img
                      src={course.instructor.avatar}
                      alt={course.instructor.name}
                      className="w-24 h-24 rounded-full"
                    />
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {course.instructor.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {course.instructor.bio}
                      </p>
                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span>{course.instructor.rating} instructor rating</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{course.instructor.students.toLocaleString()} students</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="card p-6">
                      <div className="flex items-start space-x-4">
                        <img
                          src={review.avatar}
                          alt={review.user}
                          className="w-12 h-12 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {review.user}
                            </h4>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {review.date}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mb-3">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <p className="text-gray-700 dark:text-gray-300">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      My Notes
                    </h3>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                      >
                        Save
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        <Share2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Take notes while watching the course..."
                    className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="card p-6 sticky top-8"
            >
              <div className="text-center mb-6">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <span className="text-3xl font-bold text-green-600">
                    Free Course
                  </span>
                </div>
                <span className="text-sm text-green-600 font-medium">
                  55% off - Limited time offer
                </span>
              </div>

              <div className="space-y-4 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEnrollment}
                  disabled={enrolling || isEnrolled}
                  className={`w-full text-lg py-3 ${
                    isEnrolled 
                      ? 'bg-green-600 text-white cursor-not-allowed' 
                      : enrolling 
                        ? 'bg-gray-400 text-white cursor-not-allowed' 
                        : 'btn-primary'
                  }`}
                >
                  {enrolling ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Enrolling...</span>
                    </div>
                  ) : isEnrolled ? (
                    <div className="flex items-center justify-center space-x-2">
                      <CheckCircle className="h-5 w-5" />
                      <span>Enrolled</span>
                    </div>
                  ) : (
                    'Start Learning - Free'
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full btn-secondary text-lg py-3"
                >
                  Add to Wishlist
                </motion.button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duration</span>
                  <span className="text-gray-900 dark:text-white font-medium">{course.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lessons</span>
                  <span className="text-gray-900 dark:text-white font-medium">{course.lessons}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Certificate</span>
                  <span className="text-gray-900 dark:text-white font-medium">Yes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Access</span>
                  <span className="text-gray-900 dark:text-white font-medium">Lifetime</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  This course includes:
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Play className="h-4 w-4 text-primary-600" />
                    <span className="text-gray-700 dark:text-gray-300">42 hours on-demand video</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-primary-600" />
                    <span className="text-gray-700 dark:text-gray-300">15 articles</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4 text-primary-600" />
                    <span className="text-gray-700 dark:text-gray-300">Downloadable resources</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="h-4 w-4 text-primary-600" />
                    <span className="text-gray-700 dark:text-gray-300">Certificate of completion</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail