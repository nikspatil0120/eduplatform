import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Mail, 
  Calendar,
  MapPin,
  Edit3,
  Save,
  X,
  Camera,
  Shield,
  BookOpen,
  Award,
  TrendingUp
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCourseStore } from '../store'
import { profileAPI } from '../services/api'
import toast from 'react-hot-toast'

const Profile = () => {
  const { user, setUser } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarStatus, setAvatarStatus] = useState({})
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    skills: user?.skills || []
  })

  // Get data from course store
  const enrolledCourses = useCourseStore((state) => state.enrolledCourses)
  const certificates = useCourseStore((state) => state.certificates)
  const getTotalStudyTimeFormatted = useCourseStore((state) => state.getTotalStudyTimeFormatted)
  const syncProgressFromDatabase = useCourseStore((state) => state.syncProgressFromDatabase)

  // Calculate stats
  const coursesEnrolled = enrolledCourses?.length || 0
  const certificatesEarned = certificates?.length || 0
  const totalStudyTime = getTotalStudyTimeFormatted?.() || '0h 0m'
  
  // Calculate study streak (simplified - you might want to implement proper streak logic)
  const studyStreak = user?.streakDays || 0

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        setLoading(true)
        console.log('🔄 Loading profile data...')
        console.log('👤 Current user data:', user)
        console.log('🖼️ User avatar:', user?.avatar)
        // Sync data from database
        await syncProgressFromDatabase()
        // Load avatar status
        await loadAvatarStatus()
        console.log('✅ Profile data loaded')
        console.log('📚 Enrolled courses:', enrolledCourses)
        console.log('🏆 Certificates:', certificates)
      } catch (error) {
        console.error('❌ Failed to load profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfileData()
  }, [])

  // Debug log when data changes
  useEffect(() => {
    console.log('📊 Profile stats updated:', {
      coursesEnrolled,
      certificatesEarned,
      totalStudyTime,
      enrolledCourses: enrolledCourses?.length,
      certificates: certificates?.length
    })
  }, [coursesEnrolled, certificatesEarned, totalStudyTime, enrolledCourses, certificates])

  const handleSave = async () => {
    try {
      const response = await profileAPI.updateProfile({
        name: formData.name,
        bio: formData.bio,
        location: formData.location
      })
      
      if (response.data?.success) {
        // Update user context with new data
        setUser(prev => ({
          ...prev,
          name: formData.name,
          bio: formData.bio,
          location: formData.location
        }))
        toast.success('Profile updated successfully!')
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
      skills: user?.skills || []
    })
    setIsEditing(false)
  }

  const handleRefreshData = async () => {
    try {
      setLoading(true)
      await syncProgressFromDatabase()
      toast.success('Profile data refreshed!')
    } catch (error) {
      console.error('Failed to refresh data:', error)
      toast.error('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  const loadAvatarStatus = async () => {
    try {
      const response = await profileAPI.getAvatarStatus()
      const status = response.data?.data || {}
      setAvatarStatus(status)
      return status
    } catch (error) {
      console.error('Failed to check avatar status:', error)
      return {}
    }
  }

  const checkAvatarStatus = async () => {
    return avatarStatus.hasAvatar ? avatarStatus : await loadAvatarStatus()
  }

  const handleAvatarUpload = async (event) => {
    console.log('🎯 handleAvatarUpload called')
    const file = event.target.files[0]
    console.log('📁 Selected file:', file)
    if (!file) {
      console.log('❌ No file selected')
      return
    }

    // Check current avatar status
    const avatarStatus = await checkAvatarStatus()
    console.log('🔍 Avatar status:', avatarStatus)

    // If user has a Cloudinary avatar, ask for confirmation
    if (avatarStatus.hasCloudinaryAvatar) {
      const confirmed = window.confirm(
        'You already have a custom profile picture. Do you want to replace it with this new image?'
      )
      if (!confirmed) {
        // Reset the file input
        event.target.value = ''
        return
      }
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    try {
      setUploadingAvatar(true)
      const formData = new FormData()
      formData.append('avatar', file)

      console.log('🔄 Uploading avatar...')
      const response = await profileAPI.uploadAvatar(formData)
      console.log('📸 Upload response:', response.data)
      
      if (response.data?.success) {
        // Update user context with new avatar
        setUser(prev => ({
          ...prev,
          avatar: response.data.data.avatar
        }))
        
        // Also update localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        userData.avatar = response.data.data.avatar
        localStorage.setItem('userData', JSON.stringify(userData))
        
        toast.success('Profile picture updated successfully!')
      }
    } catch (error) {
      console.error('❌ Failed to upload avatar:', error)
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Failed to upload profile picture')
      }
    } finally {
      setUploadingAvatar(false)
      // Clear the input
      event.target.value = ''
    }
  }

  const handleDeleteAvatar = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) {
      return
    }

    try {
      setUploadingAvatar(true)
      console.log('🗑️ Deleting avatar...')
      const response = await profileAPI.deleteAvatar()
      console.log('🗑️ Delete response:', response.data)
      
      if (response.data?.success) {
        // Update user context to remove avatar
        setUser(prev => ({
          ...prev,
          avatar: null
        }))
        
        // Also update localStorage
        const userData = JSON.parse(localStorage.getItem('userData') || '{}')
        userData.avatar = null
        localStorage.setItem('userData', JSON.stringify(userData))
        
        toast.success('Profile picture deleted successfully!')
      }
    } catch (error) {
      console.error('❌ Failed to delete avatar:', error)
      if (error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Failed to delete profile picture')
      }
    } finally {
      setUploadingAvatar(false)
    }
  }

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Recently joined'
    try {
      // Handle both string and Date object
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Recently joined'
    }
  }

  // Safety check - ensure user is loaded
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <User className="h-8 w-8 text-primary-600" />
                My Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage your account information and preferences
              </p>
            </div>
            {!isEditing ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit Profile
              </motion.button>
            ) : (
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  Save
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </motion.button>
              </div>
            )}
            {!isEditing && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefreshData}
                disabled={loading}
                className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <TrendingUp className="h-4 w-4" />
                {loading ? 'Syncing...' : 'Sync Data'}
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8"
        >
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Picture */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=6366f1&color=ffffff&size=128`}
                  alt={user?.name}
                  className="w-32 h-32 rounded-full object-cover border-4 border-primary-100 dark:border-primary-900"
                />
                <div className="absolute bottom-0 right-0">
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="flex items-center justify-center p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors cursor-pointer"
                  >
                    {uploadingAvatar ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </label>
                </div>
              </div>
              <div className="mt-4 text-center">
                {/* Avatar source indicator */}
                {avatarStatus.hasAvatar && (
                  <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    {avatarStatus.hasCloudinaryAvatar ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                        <Camera className="h-3 w-3" />
                        Custom Upload
                      </span>
                    ) : avatarStatus.hasGoogleAvatar ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-full">
                        <svg className="h-3 w-3" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google Profile
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Shield className="h-4 w-4" />
                  <span className="capitalize">{String(user?.role || 'Student')}</span>
                </div>
                {user?.provider === 'google' && (
                  <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                    Signed in with Google
                  </div>
                )}
                {user?.avatar && (
                  <button
                    onClick={handleDeleteAvatar}
                    disabled={uploadingAvatar}
                    className="mt-2 text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    Remove Picture
                  </button>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className="flex-1 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>{String(user?.name || 'Not provided')}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span>{String(user?.email || 'Not provided')}</span>
                  {user?.provider === 'google' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Gmail</span>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {String(user?.bio || 'No bio provided')}
                  </p>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Your location"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{String(user?.location || 'Not provided')}</span>
                  </div>
                )}
              </div>

              {/* Join Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Member Since
                </label>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span>{formatJoinDate(user?.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Account Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Courses Enrolled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : coursesEnrolled}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active enrollments
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Certificates</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : certificatesEarned}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Earned certificates
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Study Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {loading ? '...' : totalStudyTime}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Total learning time
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enrolled Courses */}
        {coursesEnrolled > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Enrolled Courses ({coursesEnrolled})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledCourses.slice(0, 6).map((course) => (
                <div key={course.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {String(course?.title || 'Course')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {String(course?.instructor || 'Instructor')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {String(course?.duration || 'Self-paced')}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Enrolled
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {coursesEnrolled > 6 && (
              <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
                And {coursesEnrolled - 6} more courses...
              </p>
            )}
          </motion.div>
        )}

        {/* Certificates */}
        {certificatesEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Certificates ({certificatesEarned})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.slice(0, 4).map((certificate) => (
                <div key={certificate.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border-l-4 border-green-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                        {String(certificate?.courseName || 'Certificate')}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Issued to {String(certificate?.userName || 'Student')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {certificate?.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString() : 'Recently issued'}
                      </p>
                    </div>
                    <Award className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              ))}
            </div>
            {certificatesEarned > 4 && (
              <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
                And {certificatesEarned - 4} more certificates...
              </p>
            )}
          </motion.div>
        )}

        {/* Empty State */}
        {!loading && coursesEnrolled === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center py-12"
          >
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No courses enrolled yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Start your learning journey by enrolling in a course
            </p>
            <motion.a
              href="/courses"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Browse Courses
            </motion.a>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default Profile