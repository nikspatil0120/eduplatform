import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { courseAPI } from '../services/api'
import { useCourseStore } from '../store'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { 
  Play, 
  Pause, 
  Volume2, 
  Maximize, 
  Clock, 
  Users, 
  Award,
  BookOpen,
  CheckCircle,
  Lock,
  MessageCircle
} from 'lucide-react'

const CourseDetail = () => {
  const { id } = useParams()
  const addEnrolledCourse = useCourseStore((s) => s.addEnrolledCourse)
  const isEnrolledInStore = useCourseStore((s) => s.isCourseEnrolled)
  const markLessonComplete = useCourseStore((s) => s.markLessonComplete)
  const isLessonCompleted = useCourseStore((s) => s.isLessonCompleted)
  const isCourseFullyCompleted = useCourseStore((s) => s.isCourseFullyCompleted)
  const issueCertificate = useCourseStore((s) => s.issueCertificate)
  const ensureCertificateForCourse = useCourseStore((s) => s.ensureCertificateForCourse)
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [currentVideoUrl, setCurrentVideoUrl] = useState('')
  const playerRef = useRef(null)
  const completedOnceRef = useRef(false)
  const progressIntervalRef = useRef(null)
  const ytScriptLoadedRef = useRef(false)

  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [videoLoading, setVideoLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Fetch course data
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true)
        const response = await courseAPI.getCourseById(id, { suppressGlobalErrorToast: true })
        const courseData = response.data?.data || response.data
        
        // Transform backend data
        // Normalize curriculum: ensure each lesson has a stable 'id' and a human duration
        const normalizedCurriculum = Array.isArray(courseData.curriculum)
          ? courseData.curriculum.map((section, sectionIndex) => ({
              title: section?.title || 'Section',
              lessons: Array.isArray(section?.lessons)
                ? section.lessons.map((l, lessonIndex) => ({
                    id: (l?._id || l?.id || `${section._id || 'sec'}-${l?.order || Math.random()}`).toString(),
                    title: l?.title || 'Lesson',
                    videoUrl: l?.videoUrl || '',
                    duration: l?.videoDuration ? Math.max(1, Math.ceil(l.videoDuration / 60)) : (l?.duration || 5),
                    // Only first lesson of first section is preview, rest are locked for non-enrolled users
                    preview: l?.preview !== undefined ? l.preview : (sectionIndex === 0 && lessonIndex === 0)
                  }))
                : []
            }))
          : []

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
          lessons: normalizedCurriculum.reduce((sum, s) => sum + (s.lessons?.length || 0), 0),
          description: courseData.description || 'No description available',
          thumbnail: courseData.media?.thumbnail || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400',
          tags: courseData.tags || [],
          // Prefer explicit whatYouWillLearn; otherwise derive from curriculum section titles
          whatYouLearn: Array.isArray(courseData.whatYouWillLearn) && courseData.whatYouWillLearn.length > 0
            ? courseData.whatYouWillLearn
            : (Array.isArray(courseData.curriculum)
                ? courseData.curriculum
                    .map((section) => (typeof section?.title === 'string' ? section.title.trim() : ''))
                    .filter((t) => t && t.length > 0)
                : [
                    'Learn the fundamentals',
                    'Build practical projects',
                    'Master key concepts',
                    'Apply knowledge in real scenarios'
                  ]
              ),
          curriculum: normalizedCurriculum,
          requirements: courseData.requirements || [],
          level: courseData.level || 'beginner'
        }
        
        setCourse(transformedCourse)
        if (isEnrolledInStore(transformedCourse.id)) setIsEnrolled(true)
        
        // Debug course and enrollment data
        console.log('🔐 Course loaded:', transformedCourse.title)
        console.log('🔐 Is enrolled:', isEnrolledInStore(transformedCourse.id))
        console.log('🔐 Course curriculum:', transformedCourse.curriculum)
        console.log('🔐 Sample lesson preview status:', transformedCourse.curriculum?.[0]?.lessons?.[0]?.preview)
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

  // Auto-complete when video reaches its end. We cannot access time from YouTube embeds
  // reliably without the API, so we approximate by listening for the browser 'ended'
  // event for same-origin videos and use a fallback timer for external embeds.
  useEffect(() => {
    if (!currentVideoUrl || !course || !selectedLesson) return
    const lesson = (course?.curriculum || []).flatMap(sec => sec.lessons).find(l => l.id === selectedLesson)
    const mins = lesson?.duration ? parseInt(lesson.duration) : 5

    // If iframe is same-origin, try to attach ended event (for native video sources)
    const iframe = document.getElementById('course-player')
    completedOnceRef.current = false

    let fallbackTimer
    // Fallback only for non-YouTube sources: mark complete after declared duration
    if (currentVideoUrl.indexOf('youtube.com/embed/') === -1 && Number.isFinite(mins) && mins > 0) {
      clearTimeout(fallbackTimer)
      fallbackTimer = setTimeout(() => {
        if (!completedOnceRef.current) {
          markLessonComplete(course.id, selectedLesson, mins)
          completedOnceRef.current = true
          toast.success('Lesson completed')
        }
      }, mins * 60 * 1000)
    }

    return () => {
      clearTimeout(fallbackTimer)
    }
  }, [currentVideoUrl, course, selectedLesson, markLessonComplete])

  // If video is a YouTube embed, use the IFrame API to detect exact end (including when user scrubs to the end)
  useEffect(() => {
    const isYouTubeEmbed = (
      typeof currentVideoUrl === 'string' && (
        currentVideoUrl.indexOf('youtube.com/embed/') !== -1 ||
        currentVideoUrl.indexOf('youtube-nocookie.com/embed/') !== -1
      )
    )

    if (!currentVideoUrl || !isYouTubeEmbed) {
      // not a YouTube video, clean up any existing player
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy() } catch (_) {}
      }
      playerRef.current = null
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      return
    }

    function createPlayer() {
      try {
        if (playerRef.current) {
          try { playerRef.current.destroy() } catch (_) {}
        }
        playerRef.current = new window.YT.Player('course-player', {
          events: {
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.ENDED && !completedOnceRef.current && course && selectedLesson) {
                const lesson = (course?.curriculum || []).flatMap(sec => sec.lessons).find(l => l.id === selectedLesson)
                const mins = lesson?.duration ? parseInt(lesson.duration) : 5
                markLessonComplete(course.id, selectedLesson, mins)
                completedOnceRef.current = true
                toast.success('Lesson completed')
              }
            }
          }
        })

        // Poll progress to mark complete at 90% in case ENDED doesn't fire
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
        progressIntervalRef.current = setInterval(() => {
          try {
            const duration = typeof playerRef.current?.getDuration === 'function' ? playerRef.current.getDuration() : 0
            const current = typeof playerRef.current?.getCurrentTime === 'function' ? playerRef.current.getCurrentTime() : 0
            if (duration > 0 && current / duration >= 0.9 && !completedOnceRef.current && course && selectedLesson) {
              const lesson = (course?.curriculum || []).flatMap(sec => sec.lessons).find(l => l.id === selectedLesson)
              const mins = lesson?.duration ? parseInt(lesson.duration) : Math.ceil(duration / 60)
              markLessonComplete(course.id, selectedLesson, mins)
              completedOnceRef.current = true
              toast.success('Lesson completed')
            }
          } catch (_) {}
        }, 2000)
      } catch (_) {
        // noop
      }
    }

    if (window.YT && window.YT.Player) {
      createPlayer()
      return
    }

    if (!ytScriptLoadedRef.current) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.body.appendChild(tag)
      ytScriptLoadedRef.current = true
    }

    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = function() {
      if (typeof previous === 'function') previous()
      createPlayer()
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy() } catch (_) {}
      }
      playerRef.current = null
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
  }, [currentVideoUrl, course, selectedLesson, markLessonComplete])

  // Watch for course completion and issue certificate once
  useEffect(() => {
    if (!course || !isEnrolled) return
    const total = (course.curriculum || []).reduce((sum, s) => sum + s.lessons.length, 0)
    // Automatically create certificate when all lessons completed
    console.log('🎓 Certificate generation - User object:', user)
    console.log('🎓 Certificate generation - User name:', user?.name)
    ensureCertificateForCourse(course.id, course.title, user?.name || 'Student', total)
  }, [course, isEnrolled, isCourseFullyCompleted, issueCertificate, user])

  // Handle enrollment
  const handleEnrollment = async () => {
    try {
      setEnrolling(true)
      // If user is not authenticated, redirect to login and preserve return URL
      if (!isAuthenticated) {
        navigate('/login', { state: { from: location } })
        return
      }
      if (!course) return
      await courseAPI.enrollCourse(id, {}, { suppressGlobalErrorToast: true, suppressAuthRedirect: true })
      setIsEnrolled(true)
      addEnrolledCourse({ id: course.id, title: course.title, thumbnail: course.thumbnail, instructor: course.instructor?.name || 'Unknown' })
      toast.success('Successfully enrolled in the course!')
    } catch (error) {
      console.error('Enrollment failed:', error)
      if (error?.response?.status === 401) {
        navigate('/login', { state: { from: location } })
        return
      }
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
    { id: 'instructor', name: 'Instructor' }
  ]

  // Derived completion state
  const totalLessons = (course?.curriculum || []).reduce((sum, s) => sum + (s.lessons?.length || 0), 0)
  const isCompleted = isCourseFullyCompleted(course.id, totalLessons)



  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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

            {/* Video player if a lesson is selected */}
            {(currentVideoUrl || videoLoading) && (
              <div className="mb-8">
                <div className="aspect-video w-full rounded-lg overflow-hidden shadow relative">
                  {videoLoading ? (
                    <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                    </div>
                  ) : (
                    <iframe
                      key={currentVideoUrl} // Force re-render when URL changes
                      id="course-player"
                      src={currentVideoUrl}
                      title="Course Video"
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    ></iframe>
                  )}
                </div>
              </div>
            )}

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

                  {(Array.isArray(course.requirements) && course.requirements.length > 0) && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Requirements
                      </h3>
                      <ul className="space-y-2">
                        {course.requirements.map((req, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-700 dark:text-gray-300">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'curriculum' && (
                <div className="space-y-6">
                  {isCompleted && (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <p className="text-green-700 dark:text-green-300 font-medium">
                        Hurray! Course Completed. You can download your certificate from dashboard.
                      </p>
                    </div>
                  )}
                  {(course.curriculum || []).map((section, sectionIndex) => {
                    const sectionCompleted = Array.isArray(section.lessons) && section.lessons.length > 0
                      ? section.lessons.every(lsn => isLessonCompleted(course.id, lsn.id))
                      : false
                    return (
                      <div key={sectionIndex} className="card p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                          {sectionCompleted && <CheckCircle className="h-5 w-5 text-green-500" />}
                          <span>{section.title}</span>
                        </h3>
                      <div className="space-y-3">
                        {section.lessons.map((lesson, lessonIndex) => (
                          <div
                            key={lesson.id}
                            className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                              isEnrolled || lesson.preview 
                                ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' 
                                : 'cursor-not-allowed opacity-75'
                            }`}
                            onClick={() => {
                              // Only allow access if enrolled or it's a preview lesson
                              if (!isEnrolled && !lesson.preview) {
                                toast.error('Please enroll in this course to access this lesson')
                                return
                              }
                              
                              if (lesson.videoUrl && (isEnrolled || lesson.preview)) {
                                setSelectedLesson(lesson.id)
                                // Normalize common YouTube URLs to proper embed + enablejsapi
                                const toYouTubeEmbed = (raw) => {
                                  if (!raw) return raw
                                  try {
                                    let url = raw.trim()
                                    // youtu.be/<id>
                                    const shortMatch = url.match(/^https?:\/\/youtu\.be\/([A-Za-z0-9_-]{6,})/)
                                    if (shortMatch) {
                                      url = `https://www.youtube.com/embed/${shortMatch[1]}`
                                    }
                                    // www.youtube.com/watch?v=<id>
                                    const watchMatch = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/)
                                    if (!url.includes('/embed/') && watchMatch) {
                                      url = `https://www.youtube.com/embed/${watchMatch[1]}`
                                    }
                                    // www.youtube.com/shorts/<id>
                                    const shortsMatch = url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/)
                                    if (shortsMatch) {
                                      url = `https://www.youtube.com/embed/${shortsMatch[1]}`
                                    }
                                    // switch to nocookie domain and add API params
                                    const hasQuery = url.includes('?')
                                    const nocookie = url.replace('https://www.youtube.com/embed/', 'https://www.youtube-nocookie.com/embed/')
                                    return `${nocookie}${hasQuery ? '&' : '?'}enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&rel=0&modestbranding=1&playsinline=1`
                                  } catch (_) {
                                    return raw
                                  }
                                }

                                const url = lesson.videoUrl
                                const isYT = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com')
                                let withApi = url
                                if (isYT) withApi = toYouTubeEmbed(url)
                                // Clear current video first to force iframe reload
                                setVideoLoading(true)
                                setCurrentVideoUrl('')
                                // Set new video after a brief delay to ensure iframe reloads
                                setTimeout(() => {
                                  setCurrentVideoUrl(withApi)
                                  setVideoLoading(false)
                                }, 100)
                                setActiveTab('overview')
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              {isLessonCompleted(course.id, lesson.id) ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : isEnrolled || lesson.preview ? (
                                <Play className="h-5 w-5 text-primary-600" />
                              ) : (
                                <Lock className="h-5 w-5 text-gray-400" />
                              )}
                              <span className={`font-medium ${isEnrolled || lesson.preview ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                                {lesson.title}
                              </span>
                              {!isEnrolled && lesson.preview && (
                                <span className="text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-600 px-2 py-1 rounded-full">
                                  Preview
                                </span>
                              )}
                              {!isEnrolled && !lesson.preview && (
                                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-full">
                                  Locked
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
                  )})}
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




            </motion.div>

            {/* Join Now button at end of main content */}
            <div className="mt-8">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleEnrollment}
                disabled={enrolling || isEnrolled}
                className={`w-full md:w-auto btn-primary text-lg px-6 py-3 ${
                  (enrolling || isEnrolled) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isEnrolled ? 'Enrolled' : (enrolling ? 'Enrolling...' : 'Join Now')}
              </motion.button>
            </div>

            {isCompleted && (
              <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Hurray! Course Completed. You can download your certificate from dashboard.
                </p>
              </div>
            )}
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
                  Limited time offer
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
                
                {!isEnrolled && (
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center justify-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Enroll to unlock all {(course.curriculum || []).reduce((sum, s) => sum + s.lessons.length, 0)} lessons</span>
                    </p>
                  </div>
                )}
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


            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CourseDetail