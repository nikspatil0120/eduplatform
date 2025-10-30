import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Minus, 
  Edit2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  BookOpen,
  Play,
  FileText,
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

// Helper functions for time conversion
const secondsToHMS = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return { hours, minutes, seconds: secs }
}

const hmsToSeconds = (hours, minutes, seconds) => {
  return (parseInt(hours) || 0) * 3600 + (parseInt(minutes) || 0) * 60 + (parseInt(seconds) || 0)
}

const CourseCreation = ({ onClose, onSave }) => {
  const [courseData, setCourseData] = useState({
    title: '',
    description: '',
    category: 'programming',
    level: 'beginner',
    thumbnail: ''
  })
  
  const [segments, setSegments] = useState([])
  const [thumbZoom, setThumbZoom] = useState(1)
  const [thumbPosition, setThumbPosition] = useState('center') // center, top, bottom, left, right
  const [editingSegment, setEditingSegment] = useState(null)
  const [editingSubSegment, setEditingSubSegment] = useState(null)
  const [expandedSegments, setExpandedSegments] = useState(new Set())

  // Removed categories and levels for ultra-minimal course creation

  const handleInputChange = (field, value) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const addSegment = () => {
    const newSegment = {
      id: Date.now(),
      name: `Section ${segments.length + 1}`,
      subSegments: []
    }
    setSegments(prev => [...prev, newSegment])
    setExpandedSegments(prev => new Set([...prev, newSegment.id]))
  }

  const removeSegment = (segmentId) => {
    setSegments(prev => prev.filter(segment => segment.id !== segmentId))
    setExpandedSegments(prev => {
      const newSet = new Set(prev)
      newSet.delete(segmentId)
      return newSet
    })
  }

  const updateSegmentName = (segmentId, newName) => {
    setSegments(prev => prev.map(segment => 
      segment.id === segmentId 
        ? { ...segment, name: newName }
        : segment
    ))
    setEditingSegment(null)
  }

  const addSubSegment = (segmentId) => {
    const newId = Date.now()
    setSegments(prev => prev.map(segment => {
      if (segment.id === segmentId) {
        const newSubSegment = {
          id: newId,
          name: `Lesson ${segment.subSegments.length + 1}`,
          videoUrl: '',
          duration: 300, // Default 5 minutes
          description: ''
        }
        return {
          ...segment,
          subSegments: [...segment.subSegments, newSubSegment]
        }
      }
      return segment
    }))
    // Immediately enable editing for the newly added lesson so the YouTube URL can be entered
    setEditingSubSegment(newId)
  }

  const removeSubSegment = (segmentId, subSegmentId) => {
    setSegments(prev => prev.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          subSegments: segment.subSegments.filter(sub => sub.id !== subSegmentId)
        }
      }
      return segment
    }))
  }

  const updateSubSegmentName = (segmentId, subSegmentId, newName) => {
    setSegments(prev => prev.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          subSegments: segment.subSegments.map(sub => 
            sub.id === subSegmentId 
              ? { ...sub, name: newName }
              : sub
          )
        }
      }
      return segment
    }))
    setEditingSubSegment(null)
  }

  const updateSubSegmentField = (segmentId, subSegmentId, field, value) => {
    setSegments(prev => prev.map(segment => {
      if (segment.id === segmentId) {
        return {
          ...segment,
          subSegments: segment.subSegments.map(sub => 
            sub.id === subSegmentId 
              ? { ...sub, [field]: value }
              : sub
          )
        }
      }
      return segment
    }))
  }

  const toggleSegmentExpansion = (segmentId) => {
    setExpandedSegments(prev => {
      const newSet = new Set(prev)
      if (newSet.has(segmentId)) {
        newSet.delete(segmentId)
      } else {
        newSet.add(segmentId)
      }
      return newSet
    })
  }

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

  const handleSave = async () => {
    if (!courseData.title) {
      toast.error('Please enter a course name')
      return
    }

    // Send course data with video segments
    let thumbnailToSave = courseData.thumbnail
    if (thumbnailToSave) {
      try {
        thumbnailToSave = await createThumbnailDataUrl(thumbnailToSave, thumbZoom, thumbPosition)
      } catch (_) {}
    }

    const courseToSave = {
      title: courseData.title,
      description: courseData.description || 'Course',
      category: courseData.category,
      level: courseData.level,
      media: thumbnailToSave ? { thumbnail: thumbnailToSave } : undefined,
      segments: segments.map(segment => ({
        name: segment.name,
        subSegments: segment.subSegments.map(subSegment => ({
          name: subSegment.name,
          videoUrl: subSegment.videoUrl,
          duration: subSegment.duration,
          description: subSegment.description
        }))
      }))
    }

    onSave(courseToSave)
    toast.success('Course created successfully!')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Course</h2>
            <p className="text-gray-600 dark:text-gray-400">Build your course with sections and video lessons</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] pb-24">
          {/* Basic Course Information */}
          <div className="space-y-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Course Information</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Name *
                </label>
                <input
                  type="text"
                  value={courseData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={courseData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter course description"
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Card Background / Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Card Background Image
                </label>
                {courseData.thumbnail && (
                  <div className="mb-3">
                    <div
                      className="h-32 w-full rounded border dark:border-gray-700 bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${courseData.thumbnail})`,
                        backgroundSize: `${Math.round(thumbZoom * 100)}% auto`,
                        backgroundPosition:
                          thumbPosition === 'top' ? 'center top' :
                          thumbPosition === 'bottom' ? 'center bottom' :
                          thumbPosition === 'left' ? 'left center' :
                          thumbPosition === 'right' ? 'right center' : 'center'
                      }}
                    />
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1">Zoom</label>
                        <input type="range" min="1" max="3" step="0.1" value={thumbZoom} onChange={(e) => setThumbZoom(parseFloat(e.target.value))} className="w-full" />
                      </div>
                      <div>
                        <label className="block text-xs mb-1">Position</label>
                        <select value={thumbPosition} onChange={(e) => setThumbPosition(e.target.value)} className="w-full px-2 py-1 rounded border dark:bg-gray-700">
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
                <div className="flex items-center space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        handleInputChange('thumbnail', ev.target?.result || '')
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="block w-full text-sm text-gray-900 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category *
                  </label>
                  <select
                    value={courseData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Level *
                  </label>
                  <select
                    value={courseData.level}
                    onChange={(e) => handleInputChange('level', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Segments Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Course Sections & Video Lessons</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addSegment}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Section</span>
              </motion.button>
            </div>

            <div className="space-y-4">
              <AnimatePresence>
                {segments.map((segment, index) => (
                  <motion.div
                    key={segment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    {/* Segment Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleSegmentExpansion(segment.id)}
                          className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                          {expandedSegments.has(segment.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        
                        <BookOpen className="h-5 w-5 text-blue-600" />
                        
                        {editingSegment === segment.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              defaultValue={segment.name}
                              onBlur={(e) => updateSegmentName(segment.id, e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  updateSegmentName(segment.id, e.target.value)
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                              autoFocus
                            />
                            <button
                              onClick={() => setEditingSegment(null)}
                              className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {segment.name}
                            </span>
                            <button
                              onClick={() => setEditingSegment(segment.id)}
                              className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addSubSegment(segment.id)}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-1"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Video Lesson</span>
                        </motion.button>
                        
                        <button
                          onClick={() => removeSegment(segment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sub-segments */}
                    <AnimatePresence>
                      {expandedSegments.has(segment.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="border-t border-gray-200 dark:border-gray-600"
                        >
                          <div className="p-4 space-y-3">
                            {segment.subSegments.length === 0 ? (
                              <p className="text-gray-500 dark:text-gray-400 text-sm italic">
                                No video lessons yet. Click "Add Video Lesson" to add one.
                              </p>
                            ) : (
                              segment.subSegments.map((subSegment) => (
                                <motion.div
                                  key={subSegment.id}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 20 }}
                                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                                >
                                  <div className="flex items-center space-x-3">
                                    <Play className="h-4 w-4 text-green-600" />
                                    
                                    {editingSubSegment === subSegment.id ? (
                                      <div className="flex-1 space-y-2">
                                        <input
                                          type="text"
                                          placeholder="Lesson name"
                                          value={subSegment.name}
                                          onChange={(e) => updateSubSegmentName(segment.id, subSegment.id, e.target.value)}
                                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <input
                                          type="url"
                                          placeholder="YouTube video URL"
                                          value={subSegment.videoUrl}
                                          onChange={(e) => updateSubSegmentField(segment.id, subSegment.id, 'videoUrl', e.target.value)}
                                          className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                          autoFocus
                                        />
                                        <div className="flex items-center space-x-2">
                                          <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1">
                                              <input
                                                type="number"
                                                placeholder="0"
                                                value={secondsToHMS(subSegment.duration).hours}
                                                onChange={(e) => {
                                                  const { minutes, seconds } = secondsToHMS(subSegment.duration)
                                                  const newDuration = hmsToSeconds(e.target.value, minutes, seconds)
                                                  updateSubSegmentField(segment.id, subSegment.id, 'duration', newDuration)
                                                }}
                                                className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                                                min="0"
                                                max="23"
                                              />
                                              <span className="text-xs text-gray-500 dark:text-gray-400">hr</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <input
                                                type="number"
                                                placeholder="0"
                                                value={secondsToHMS(subSegment.duration).minutes}
                                                onChange={(e) => {
                                                  const { hours, seconds } = secondsToHMS(subSegment.duration)
                                                  const newDuration = hmsToSeconds(hours, e.target.value, seconds)
                                                  updateSubSegmentField(segment.id, subSegment.id, 'duration', newDuration)
                                                }}
                                                className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                                                min="0"
                                                max="59"
                                              />
                                              <span className="text-xs text-gray-500 dark:text-gray-400">min</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                              <input
                                                type="number"
                                                placeholder="0"
                                                value={secondsToHMS(subSegment.duration).seconds}
                                                onChange={(e) => {
                                                  const { hours, minutes } = secondsToHMS(subSegment.duration)
                                                  const newDuration = hmsToSeconds(hours, minutes, e.target.value)
                                                  updateSubSegmentField(segment.id, subSegment.id, 'duration', newDuration)
                                                }}
                                                className="w-12 px-1 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-center"
                                                min="0"
                                                max="59"
                                              />
                                              <span className="text-xs text-gray-500 dark:text-gray-400">sec</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => setEditingSubSegment(null)}
                                            className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                          >
                                            <X className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex-1">
                                        <div className="text-gray-900 dark:text-white font-medium">
                                          {subSegment.name}
                                        </div>
                                        {subSegment.videoUrl && (
                                          <div className="text-sm text-gray-500 dark:text-gray-400">
                                            📹 {subSegment.videoUrl}
                                          </div>
                                        )}
                                        <button
                                          onClick={() => setEditingSubSegment(subSegment.id)}
                                          className="mt-1 p-1 text-gray-500 hover:text-green-600 transition-colors"
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => removeSubSegment(segment.id, subSegment.id)}
                                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </motion.div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>

              {segments.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No segments yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create your first segment to start building your course structure
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={addSegment}
                    className="btn-primary flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Segment</span>
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - keep visible while scrolling */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-gray-800/80">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Create Course</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default CourseCreation
