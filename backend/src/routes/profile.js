import express from 'express'
import { authenticate } from '../middleware/auth.js'
import { v2 as cloudinary } from 'cloudinary'
import multer from 'multer'
import User from '../models/User.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Cloudinary will be configured in the route handler

// @route   GET /api/v1/profile/avatar-status
// @desc    Check user's current avatar status
// @access  Private
router.get('/avatar-status', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('profile.avatar profile.avatarPublicId authentication.provider')
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    const hasCloudinaryAvatar = !!user.profile.avatarPublicId
    const hasGoogleAvatar = user.authentication.provider === 'google' && user.profile.avatar && !hasCloudinaryAvatar
    
    console.log('🔍 Avatar status debug:', {
      userId: user._id,
      hasAvatar: !!user.profile.avatar,
      avatarUrl: user.profile.avatar,
      avatarPublicId: user.profile.avatarPublicId,
      provider: user.authentication.provider,
      hasCloudinaryAvatar,
      hasGoogleAvatar
    })
    
    res.json({
      success: true,
      data: {
        hasAvatar: !!user.profile.avatar,
        hasCloudinaryAvatar,
        hasGoogleAvatar,
        currentAvatar: user.profile.avatar,
        provider: user.authentication.provider
      }
    })
  } catch (error) {
    logger.error('Get avatar status error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get avatar status'
    })
  }
})

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

// @route   POST /api/v1/profile/upload-avatar
// @desc    Upload profile picture
// @access  Private
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  try {
    console.log('📸 Upload avatar endpoint reached')
    console.log('👤 User:', req.user?.id)
    console.log('📁 File:', req.file ? 'File received' : 'No file')
    
    if (!req.file) {
      console.log('❌ No file provided')
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      })
    }

    // Check if user already has a Cloudinary avatar
    const currentUser = await User.findById(req.user.id).select('profile.avatar profile.avatarPublicId')
    const hasCloudinaryAvatar = currentUser?.profile?.avatarPublicId
    
    console.log('🔍 User avatar status:', {
      hasAvatar: !!currentUser?.profile?.avatar,
      hasCloudinaryAvatar: !!hasCloudinaryAvatar,
      currentAvatar: currentUser?.profile?.avatar
    })

    const userId = req.user.id
    const publicId = `profile-pictures/${userId}`

    // Configure Cloudinary (ensure env vars are loaded)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    console.log('🔧 Cloudinary config check:', {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Missing',
      api_key: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Missing',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Missing'
    })

    // Upload to Cloudinary
    console.log('☁️ Uploading to Cloudinary...')
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'profile-pictures',
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('☁️ Cloudinary upload error:', error)
            reject(error)
          } else {
            console.log('☁️ Cloudinary upload success:', result.public_id)
            resolve(result)
          }
        }
      )
      uploadStream.end(req.file.buffer)
    })

    // Update user's avatar in database
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        'profile.avatar': uploadResult.secure_url,
        'profile.avatarPublicId': uploadResult.public_id
      },
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    logger.info(`Avatar updated for user ${userId}`)

    res.json({
      success: true,
      message: 'Profile picture updated successfully',
      data: {
        avatar: uploadResult.secure_url,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: uploadResult.secure_url,
          role: user.role
        }
      }
    })
  } catch (error) {
    console.error('❌ Upload avatar error:', error)
    logger.error('Upload avatar error:', error)
    
    if (error.message === 'Only image files are allowed') {
      return res.status(400).json({
        success: false,
        message: 'Only image files are allowed'
      })
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture',
      error: error.message
    })
  }
})

// @route   DELETE /api/v1/profile/delete-avatar
// @desc    Delete profile picture
// @access  Private
router.delete('/delete-avatar', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Delete from Cloudinary if exists
    if (user.profile?.avatarPublicId) {
      try {
        console.log('🗑️ Deleting from Cloudinary:', user.profile.avatarPublicId)
        const deleteResult = await cloudinary.uploader.destroy(user.profile.avatarPublicId)
        console.log('🗑️ Cloudinary delete result:', deleteResult)
      } catch (cloudinaryError) {
        console.warn('⚠️ Failed to delete from Cloudinary:', cloudinaryError)
        logger.warn('Failed to delete from Cloudinary:', cloudinaryError)
        // Continue with database update even if Cloudinary deletion fails
      }
    }

    // Update user's avatar in database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { 
        $unset: { 
          'profile.avatar': 1,
          'profile.avatarPublicId': 1
        }
      },
      { new: true }
    ).select('-password')

    logger.info(`Avatar deleted for user ${userId}`)

    res.json({
      success: true,
      message: 'Profile picture deleted successfully',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          avatar: null,
          role: updatedUser.role
        }
      }
    })
  } catch (error) {
    logger.error('Delete avatar error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile picture'
    })
  }
})

// @route   PUT /api/v1/profile/update
// @desc    Update profile information
// @access  Private
router.put('/update', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { name, bio, location } = req.body

    const updateData = {}
    if (name) updateData.name = name
    if (bio !== undefined) updateData['profile.bio'] = bio
    if (location !== undefined) updateData['profile.location'] = location

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    logger.info(`Profile updated for user ${userId}`)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.profile?.avatar,
          bio: user.profile?.bio,
          location: user.profile?.location,
          role: user.role
        }
      }
    })
  } catch (error) {
    logger.error('Update profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    })
  }
})

export default router