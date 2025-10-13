import express from 'express'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    })
  } catch (error) {
    logger.error('Get profile error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile'
    })
  }
})

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body
    
    // TODO: Implement profile update logic
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: { ...req.user, name, email }
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