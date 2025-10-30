import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Upload,
  Check,
  X,
  Clock,
  Users,
  Star,
  Play,
  Image as ImageIcon,
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import adminApi from '../../../services/adminApi'
import CourseCreation from './CourseCreation'

const CourseManagement = () => {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [coursesPerPage] = useState(8)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCourseCreation, setShowCourseCreation] = useState(false)
  const [editThumbZoom, setEditThumbZoom] = useState(1)
  const [editThumbPosition, setEditThumbPosition] = useState('center')

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching courses...')
      
      const response = await adminApi.getCourses({
        page: currentPage,
        limit: coursesPerPage,
        search: searchTerm,
        category: selectedCategory,
        status: selectedStatus
      })
      
      console.log('📊 API Response:', response)
      console.log('📚 Courses from API:', response.courses)
      
      setCourses(response.courses || [])
    } catch (error) {
      console.error('❌ Error fetching courses:', error)
      console.log('🔄 Using fallback mock data')
      
      // Mock data as fallback - including newly created courses
      const mockCourses = [
        {
          _id: '1',
          title: 'Complete JavaScript Mastery',
          description: 'Master JavaScript from basics to advanced concepts',
          instructor: { name: 'Sarah Johnson', email: 'sarah@example.com' },
          category: 'Programming',
          status: 'published',
          enrolledStudents: [1, 2, 3],
          rating: 4.8,
          price: 99.99,
          thumbnail: '/api/placeholder/300/200',
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          title: 'React Development Bootcamp',
          description: 'Build modern web applications with React',
          instructor: { name: 'Mike Chen', email: 'mike@example.com' },
          category: 'Web Development',
          status: 'draft',
          enrolledStudents: [1, 2],
          rating: 4.9,
          price: 129.99,
          thumbnail: '/api/placeholder/300/200',
          createdAt: new Date().toISOString()
        }
      ]
      
      console.log('🎭 Setting mock courses:', mockCourses)
      setCourses(mockCourses)
    } finally {
      setLoading(false)
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    const matchesStatus = selectedStatus === 'all' || course.status === selectedStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Debug logging
  console.log('📋 Courses state:', courses)
  console.log('🔍 Filtered courses:', filteredCourses)
  console.log('⚙️ Filter params:', { searchTerm, selectedCategory, selectedStatus })


  const handleApproveCourse = async (courseId) => {
    try {
      await adminApi.approveCourse(courseId)
      toast.success('Course approved successfully')
      fetchCourses()
    } catch (error) {
      toast.error('Failed to approve course')
    }
  }

  const handleRejectCourse = async (courseId, reason) => {
    try {
      await adminApi.rejectCourse(courseId, reason)
      toast.success('Course rejected')
      fetchCourses()
    } catch (error) {
      toast.error('Failed to reject course')
    }
  }

  const handleCreateCourse = async (courseData) => {
    try {
      const response = await adminApi.createCourse(courseData)
      console.log('Course creation response:', response)
      
      toast.success('Course created successfully!')
      setShowCourseCreation(false)
      fetchCourses() // Refresh the course list
    } catch (error) {
      console.error('Error creating course:', error)
      toast.error('Failed to create course')
    }
  }

  const handlePublishCourse = async (courseId) => {
    try {
      await adminApi.publishCourse(courseId)
      toast.success('Course published successfully!')
      fetchCourses() // Refresh the course list
    } catch (error) {
      console.error('Error publishing course:', error)
      toast.error('Failed to publish course')
    }
  }



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage and moderate platform courses</p>
        </div>
        <div className="flex items-center space-x-3">

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCourseCreation(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Course</span>
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          

          
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            {filteredCourses.length} courses found
          </div>
        </div>
      </div>
      
      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {loading ? (
            [...Array(8)].map((_, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-300 dark:bg-gray-600"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            filteredCourses.map((course) => (
              <motion.div
                key={course._id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ y: -5 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="relative" onClick={async () => {
                  const res = await adminApi.getCourse(course._id)
                  setSelectedCourse(res.course)
                  setShowDetails(true)
                }}>
                  <img
                    src={(course.media?.thumbnail || course.thumbnail) || '/api/placeholder/300/200'}
                    alt={course.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      course.status === 'published'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : course.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {course.status}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span>By {course.instructor?.name}</span>
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>{course.rating}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                      <Users className="h-3 w-3" />
                      <span>{course.enrolledStudents?.length || 0} students</span>
                    </div>
                    <span className="font-semibold text-primary-600">${course.price}</span>
                  </div>
                  
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="View Course"
                        onClick={async () => {
                          const res = await adminApi.getCourse(course._id)
                          setSelectedCourse(res.course)
                          setShowDetails(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Edit Course"
                        onClick={async () => {
                          const res = await adminApi.getCourse(course._id)
                          setSelectedCourse(res.course)
                          setShowDetails(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Course"
                        onClick={async () => {
                          await adminApi.deleteCourse(course._id)
                          toast.success('Course deleted')
                          fetchCourses()
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-wrap">
                      {course.status === 'draft' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePublishCourse(course._id)}
                          className="px-3 py-2 bg-primary-600 text-white text-xs md:text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
                        >
                          <Play className="h-4 w-4" />
                          <span>Release</span>
                        </motion.button>
                      )}
                      
                      {course.status === 'published' && (
                        <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 text-xs font-semibold rounded-full">
                          Live
                        </span>
                      )}

                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Pagination */}
      {filteredCourses.length > coursesPerPage && (
        <div className="flex items-center justify-center space-x-2">
          <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Previous
          </button>
          <span className="px-3 py-2 bg-primary-600 text-white rounded-lg">1</span>
          <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Next
          </button>
        </div>
      )}

      {/* Course Creation Modal */}
      {showCourseCreation && (
        <CourseCreation
          onClose={() => setShowCourseCreation(false)}
          onSave={handleCreateCourse}
        />
      )}

      {/* Course Details / Edit Modal */}
      {showDetails && selectedCourse && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Course Details</h2>
              <button className="text-gray-500" onClick={() => setShowDetails(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input
                  className="w-full px-3 py-2 rounded border dark:bg-gray-700"
                  value={selectedCourse.title || ''}
                  onChange={(e) => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  className="w-full px-3 py-2 rounded border dark:bg-gray-700"
                  rows={4}
                  value={selectedCourse.description || ''}
                  onChange={(e) => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Thumbnail URL</label>
                <input
                  className="w-full px-3 py-2 rounded border dark:bg-gray-700"
                  value={selectedCourse.media?.thumbnail || ''}
                  onChange={(e) => setSelectedCourse({ ...selectedCourse, media: { ...(selectedCourse.media||{}), thumbnail: e.target.value } })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Category</label>
                  <select
                    className="w-full px-3 py-2 rounded border dark:bg-gray-700"
                    value={selectedCourse.category || 'programming'}
                    onChange={(e) => setSelectedCourse({ ...selectedCourse, category: e.target.value })}
                  >
                    <option value="programming">Programming</option>
                    <option value="design">Design</option>
                    <option value="business">Business</option>
                    <option value="data-science">Data Science</option>
                    <option value="marketing">Marketing</option>
                    <option value="photography">Photography</option>
                    <option value="music">Music</option>
                    <option value="language">Language</option>
                    <option value="health">Health</option>
                    <option value="lifestyle">Lifestyle</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Level</label>
                  <select
                    className="w-full px-3 py-2 rounded border dark:bg-gray-700"
                    value={selectedCourse.level || 'beginner'}
                    onChange={(e) => setSelectedCourse({ ...selectedCourse, level: e.target.value })}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
              {/* Curriculum editor - sections and lessons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm">Curriculum</label>
                  <button
                    className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700"
                    onClick={() => {
                      const next = [...(selectedCourse.curriculum || [])]
                      next.push({ title: `Section ${next.length + 1}`, description: '', order: next.length + 1, lessons: [] })
                      setSelectedCourse({ ...selectedCourse, curriculum: next })
                    }}
                  >Add Section</button>
                </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {(selectedCourse.curriculum || []).map((sec, sIdx) => (
                    <div key={sIdx} className="border rounded p-3 dark:border-gray-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          className="flex-1 px-3 py-2 rounded border dark:bg-gray-700"
                          value={sec.title || ''}
                          placeholder={`Section ${sIdx + 1} title`}
                          onChange={(e) => {
                            const next = [...(selectedCourse.curriculum || [])]
                            next[sIdx] = { ...next[sIdx], title: e.target.value }
                            setSelectedCourse({ ...selectedCourse, curriculum: next })
                          }}
                        />
                        <button
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white"
                          onClick={() => {
                            const next = [...(selectedCourse.curriculum || [])]
                            next.splice(sIdx, 1)
                            setSelectedCourse({ ...selectedCourse, curriculum: next })
                          }}
                        >Delete</button>
                      </div>
                      <div className="space-y-2">
                        {(sec.lessons || []).map((les, lIdx) => (
                          <div key={lIdx} className="grid grid-cols-5 gap-2 items-center">
                            <input
                              className="col-span-2 px-3 py-2 rounded border dark:bg-gray-700"
                              placeholder="Lesson title"
                              value={les.title || ''}
                              onChange={(e) => {
                                const next = [...(selectedCourse.curriculum || [])]
                                const lessons = [...(next[sIdx].lessons || [])]
                                lessons[lIdx] = { ...lessons[lIdx], title: e.target.value }
                                next[sIdx] = { ...next[sIdx], lessons }
                                setSelectedCourse({ ...selectedCourse, curriculum: next })
                              }}
                            />
                            <input
                              className="col-span-2 px-3 py-2 rounded border dark:bg-gray-700"
                              placeholder="Video URL"
                              value={les.videoUrl || ''}
                              onChange={(e) => {
                                const next = [...(selectedCourse.curriculum || [])]
                                const lessons = [...(next[sIdx].lessons || [])]
                                lessons[lIdx] = { ...lessons[lIdx], videoUrl: e.target.value }
                                next[sIdx] = { ...next[sIdx], lessons }
                                setSelectedCourse({ ...selectedCourse, curriculum: next })
                              }}
                            />
                            <input
                              type="number"
                              className="px-3 py-2 rounded border dark:bg-gray-700"
                              placeholder="Duration (sec)"
                              value={les.videoDuration || ''}
                              onChange={(e) => {
                                const val = Number(e.target.value)
                                const next = [...(selectedCourse.curriculum || [])]
                                const lessons = [...(next[sIdx].lessons || [])]
                                lessons[lIdx] = { ...lessons[lIdx], videoDuration: val }
                                next[sIdx] = { ...next[sIdx], lessons }
                                setSelectedCourse({ ...selectedCourse, curriculum: next })
                              }}
                            />
                            <textarea
                              className="col-span-5 px-3 py-2 rounded border dark:bg-gray-700"
                              placeholder="Description"
                              value={les.description || ''}
                              onChange={(e) => {
                                const next = [...(selectedCourse.curriculum || [])]
                                const lessons = [...(next[sIdx].lessons || [])]
                                lessons[lIdx] = { ...lessons[lIdx], description: e.target.value }
                                next[sIdx] = { ...next[sIdx], lessons }
                                setSelectedCourse({ ...selectedCourse, curriculum: next })
                              }}
                            />
                            <div className="col-span-5 flex justify-end">
                              <button
                                className="px-2 py-1 text-xs rounded bg-red-500 text-white"
                                onClick={() => {
                                  const next = [...(selectedCourse.curriculum || [])]
                                  const lessons = [...(next[sIdx].lessons || [])]
                                  lessons.splice(lIdx, 1)
                                  next[sIdx] = { ...next[sIdx], lessons }
                                  setSelectedCourse({ ...selectedCourse, curriculum: next })
                                }}
                              >Remove Lesson</button>
                            </div>
                          </div>
                        ))}
                        <button
                          className="px-2 py-1 text-xs rounded bg-gray-200 dark:bg-gray-700"
                          onClick={() => {
                            const next = [...(selectedCourse.curriculum || [])]
                            const lessons = [...(next[sIdx].lessons || [])]
                            lessons.push({ title: `Lesson ${lessons.length + 1}`, description: '', videoUrl: '', videoDuration: 300, order: lessons.length + 1, isPreview: false, isPublished: true })
                            next[sIdx] = { ...next[sIdx], lessons }
                            setSelectedCourse({ ...selectedCourse, curriculum: next })
                          }}
                        >Add Lesson</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-sm mb-1">Card Background Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        setSelectedCourse({ ...selectedCourse, media: { ...(selectedCourse.media || {}), thumbnail: ev.target?.result } })
                      }
                      reader.readAsDataURL(file)
                    }}
                  />
                </div>
                {selectedCourse?.media?.thumbnail && (
                  <div>
                    <div
                      className="h-40 w-full rounded border dark:border-gray-700 bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${selectedCourse.media.thumbnail})`,
                        backgroundSize: `${Math.round(editThumbZoom * 100)}% auto`,
                        backgroundPosition:
                          editThumbPosition === 'top' ? 'center top' :
                          editThumbPosition === 'bottom' ? 'center bottom' :
                          editThumbPosition === 'left' ? 'left center' :
                          editThumbPosition === 'right' ? 'right center' : 'center'
                      }}
                    />
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1">Zoom</label>
                        <input type="range" min="1" max="3" step="0.1" value={editThumbZoom} onChange={(e) => setEditThumbZoom(parseFloat(e.target.value))} className="w-full" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Position</label>
                        <select value={editThumbPosition} onChange={(e) => setEditThumbPosition(e.target.value)} className="w-full px-2 py-1 rounded border dark:bg-gray-700">
                          <option value="center">Center</option>
                          <option value="top">Top</option>
                          <option value="bottom">Bottom</option>
                          <option value="left">Left</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 sticky bottom-0 bg-white dark:bg-gray-800 pt-3">
                <button className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setShowDetails(false)}>Close</button>
                <button
                  className="px-4 py-2 rounded bg-primary-600 text-white"
                  onClick={async () => {
                    const createThumbnailDataUrl = (src, zoom = 1, position = 'center', outW = 1200, outH = 675) => {
                      return new Promise((resolve) => {
                        const img = new Image()
                        img.crossOrigin = 'anonymous'
                        img.onload = () => {
                          const canvas = document.createElement('canvas')
                          canvas.width = outW
                          canvas.height = outH
                          const ctx = canvas.getContext('2d')
                          const scale = zoom * Math.max(outW / img.naturalWidth, outH / img.naturalHeight)
                          const drawW = img.naturalWidth * scale
                          const drawH = img.naturalHeight * scale
                          let dx = (outW - drawW) / 2
                          let dy = (outH - drawH) / 2
                          if (position === 'top') dy = 0
                          if (position === 'bottom') dy = outH - drawH
                          if (position === 'left') dx = 0
                          if (position === 'right') dx = outW - drawW
                          ctx.drawImage(img, dx, dy, drawW, drawH)
                          resolve(canvas.toDataURL('image/jpeg', 0.9))
                        }
                        img.src = src
                      })
                    }

                    let processedThumb = selectedCourse.media?.thumbnail
                    if (processedThumb) {
                      try {
                        processedThumb = await createThumbnailDataUrl(processedThumb, editThumbZoom, editThumbPosition)
                      } catch (_) {}
                    }

                    await adminApi.updateCourse(selectedCourse._id, {
                      title: selectedCourse.title,
                      description: selectedCourse.description,
                      category: selectedCourse.category,
                      level: selectedCourse.level,
                      media: { thumbnail: processedThumb },
                      curriculum: selectedCourse.curriculum
                    })
                    toast.success('Course updated')
                    setShowDetails(false)
                    fetchCourses()
                  }}
                >Save</button>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CourseManagement