import express from 'express'
import { body, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'
import emailService from '../services/emailService.js'
import otpService from '../services/otpService.js'
import { logger } from '../utils/logger.js'
import { OAuth2Client } from 'google-auth-library'

const router = express.Router()

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs (increased for development)
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  }
})

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

// Validation middleware
const validateRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['student', 'instructor'])
    .withMessage('Role must be either student or instructor')
]

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

const validatePasswordReset = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
]

const validateNewPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
]

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    })
  }
  next()
}

// @route   POST /api/v1/auth/admin-login
// @desc    Admin login with password (bypasses OTP)
// @access  Public
router.post('/admin-login', authLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body
    console.log('🔐 Admin login attempt:', { email, passwordLength: password?.length })

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password')
    console.log('👤 User found:', user ? { id: user._id, email: user.email, role: user.role } : 'No user found')
    if (!user) {
      console.log('❌ No user found with email:', email)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('❌ User is not admin:', user.role)
      return res.status(403).json({
        success: false,
        message: 'Admin access required. Please use regular login for non-admin users.'
      })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    console.log('🔑 Password valid:', isPasswordValid)
    if (!isPasswordValid) {
      console.log('❌ Invalid password for user:', email)
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Update last login
    user.authentication.lastLogin = new Date()
    await user.save()

    // Generate tokens
    const token = user.generateAuthToken()
    const refreshToken = user.generateRefreshToken()

    logger.info(`Admin login successful: ${email}`)

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    })

  } catch (error) {
    logger.error('Admin login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authLimiter, validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password, role = 'student' } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role
    })

    // Generate email verification token
    const verificationToken = user.generateEmailVerificationToken()
    await user.save()

    // Send verification email
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Verify Your Email - EduPlatform',
        template: 'emailVerification',
        data: {
          name: user.name,
          verificationToken,
          verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
        }
      })
    } catch (emailError) {
      logger.error('Failed to send verification email:', emailError)
      // Don't fail registration if email fails
    }

    // Generate tokens
    const token = user.generateAuthToken()
    const refreshToken = user.generateRefreshToken()

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    })

  } catch (error) {
    logger.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findByEmail(email).select('+password')
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      })
    }

    // Check if account is active
    if (!user.isActive || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    
    if (!isPasswordValid) {
      await user.incLoginAttempts()
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      })
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts()

    // Generate tokens
    const token = user.generateAuthToken()
    const refreshToken = user.generateRefreshToken()

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    })

  } catch (error) {
    logger.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// @route   POST /api/v1/auth/google
// @desc    Google OAuth login
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      })
    }

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    const { sub: googleId, email, name, picture } = payload

    // Find or create user
    let user = await User.findByEmail(email)

    if (user) {
      // Update existing user with Google info
      if (user.authentication.provider !== 'google') {
        user.authentication.provider = 'google'
        user.authentication.providerId = googleId
      }
      user.authentication.isEmailVerified = true
      user.authentication.lastLogin = new Date()
      
      if (picture && !user.profile.avatar) {
        user.profile.avatar = picture
      }
      
      await user.save()
    } else {
      // Create new user
      user = new User({
        name,
        email,
        role: 'student',
        profile: {
          avatar: picture
        },
        authentication: {
          provider: 'google',
          providerId: googleId,
          isEmailVerified: true,
          lastLogin: new Date()
        }
      })
      
      await user.save()
    }

    // Generate tokens
    const authToken = user.generateAuthToken()
    const refreshToken = user.generateRefreshToken()

    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        user: user.getPublicProfile(),
        token: authToken,
        refreshToken
      }
    })

  } catch (error) {
    logger.error('Google auth error:', error)
    res.status(500).json({
      success: false,
      message: 'Google authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// @route   POST /api/v1/auth/google-oauth
// @desc    Google OAuth login (using user info from frontend)
// @access  Public
router.post('/google-oauth', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body

    if (!googleId || !email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Google ID, email, and name are required'
      })
    }

    // Find or create user
    let user = await User.findByEmail(email)

    if (user) {
      // Update existing user with Google info
      if (user.authentication.provider !== 'google') {
        user.authentication.provider = 'google'
        user.authentication.providerId = googleId
      }
      user.authentication.isEmailVerified = true
      user.authentication.lastLogin = new Date()
      
      // Only set Google avatar if user doesn't have a Cloudinary avatar
      if (avatar && !user.profile.avatar && !user.profile.avatarPublicId) {
        console.log('🖼️ Setting Google avatar for existing user:', avatar)
        user.profile.avatar = avatar
      } else {
        console.log('🖼️ Not setting Google avatar. Current avatar:', user.profile.avatar, 'Has Cloudinary:', !!user.profile.avatarPublicId, 'New avatar:', avatar)
      }
      
      await user.save()
    } else {
      // Create new user
      console.log('🆕 Creating new user with Google avatar:', avatar)
      user = new User({
        name,
        email,
        role: 'student',
        profile: {
          avatar: avatar || null // Set Google avatar for new users
        },
        authentication: {
          provider: 'google',
          providerId: googleId,
          isEmailVerified: true,
          lastLogin: new Date()
        }
      })
      
      await user.save()
    }

    // Generate tokens
    const authToken = user.generateAuthToken()
    const refreshToken = user.generateRefreshToken()

    const publicProfile = user.getPublicProfile()
    console.log('👤 Sending user profile to frontend:', publicProfile)
    console.log('🖼️ Avatar in profile:', publicProfile.avatar)

    res.json({
      success: true,
      message: 'Google OAuth login successful',
      data: {
        user: publicProfile,
        token: authToken,
        refreshToken
      }
    })

  } catch (error) {
    logger.error('Google OAuth error:', error)
    res.status(500).json({
      success: false,
      message: 'Google OAuth authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      })
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    
    // Find user
    const user = await User.findById(decoded.id)
    if (!user || !user.isActive || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      })
    }

    // Generate new tokens
    const newToken = user.generateAuthToken()
    const newRefreshToken = user.generateRefreshToken()

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    })

  } catch (error) {
    logger.error('Token refresh error:', error)
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    })
  }
})

// @route   POST /api/v1/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', authLimiter, validatePasswordReset, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body

    const user = await User.findByEmail(email)
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.'
      })
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken()
    await user.save()

    // Send reset email
    try {
      await emailService.sendEmail({
        to: user.email,
        subject: 'Password Reset - EduPlatform',
        template: 'passwordReset',
        data: {
          name: user.name,
          resetToken,
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
        }
      })
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError)
      return res.status(500).json({
        success: false,
        message: 'Failed to send password reset email'
      })
    }

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    })

  } catch (error) {
    logger.error('Forgot password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request'
    })
  }
})

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', validateNewPassword, handleValidationErrors, async (req, res) => {
  try {
    const { token, password } = req.body

    // Find user with valid reset token
    const user = await User.findOne({
      'authentication.passwordResetToken': token,
      'authentication.passwordResetExpires': { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      })
    }

    // Update password and clear reset token
    user.password = password
    user.authentication.passwordResetToken = undefined
    user.authentication.passwordResetExpires = undefined
    user.authentication.loginAttempts = 0
    user.authentication.lockUntil = undefined

    await user.save()

    res.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error) {
    logger.error('Reset password error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    })
  }
})

// @route   POST /api/v1/auth/verify-email
// @desc    Verify email address
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      })
    }

    // Find user with valid verification token
    const user = await User.findOne({
      'authentication.emailVerificationToken': token,
      'authentication.emailVerificationExpires': { $gt: Date.now() }
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      })
    }

    // Mark email as verified
    user.authentication.isEmailVerified = true
    user.authentication.emailVerificationToken = undefined
    user.authentication.emailVerificationExpires = undefined

    await user.save()

    res.json({
      success: true,
      message: 'Email verified successfully'
    })

  } catch (error) {
    logger.error('Email verification error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify email'
    })
  }
})

// @route   POST /api/v1/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

// OTP Authentication Routes

// @route   POST /api/v1/auth/send-otp
// @desc    Send OTP to email for login/signup
// @access  Public
router.post('/send-otp', authLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('purpose')
    .optional()
    .isIn(['login', 'signup', 'password-reset'])
    .withMessage('Purpose must be login, signup, or password-reset')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body

    // For signup, check if user doesn't exist
    if (purpose === 'signup') {
      const existingUser = await User.findByEmail(email)
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User already exists with this email'
        })
      }
    }

    // For login, check if user exists
    if (purpose === 'login') {
      const user = await User.findByEmail(email)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email'
        })
      }

      if (!user.isActive || user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        })
      }
    }

    // Generate OTP
    const otp = otpService.generateSecureOTP()
    const result = otpService.storeOTP(email, otp, purpose)

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate OTP'
      })
    }

    // Return OTP data for frontend to handle email sending
    logger.info(`📧 OTP generated for ${email}: ${otp}`)
    
    res.json({
      success: true,
      message: 'OTP generated successfully',
      data: {
        email,
        purpose,
        otp: otp, // Frontend will use this to send email via EmailJS
        expiryTime: result.expiryTime
      }
    })

  } catch (error) {
    logger.error('Send OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    })
  }
})

// @route   POST /api/v1/auth/verify-otp
// @desc    Verify OTP and login/signup user
// @access  Public
router.post('/verify-otp', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),
  body('purpose')
    .optional()
    .isIn(['login', 'signup', 'password-reset'])
    .withMessage('Purpose must be login, signup, or password-reset'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, otp, purpose = 'login', name, role = 'student' } = req.body

    // Verify OTP
    const otpResult = otpService.verifyOTP(email, otp, purpose)

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.error,
        code: otpResult.code,
        attemptsLeft: otpResult.attemptsLeft
      })
    }

    let user

    if (purpose === 'signup') {
      // Create new user
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for signup'
        })
      }

      user = new User({
        name,
        email,
        role,
        authentication: {
          provider: 'email',
          isEmailVerified: true, // Email is verified via OTP
          lastLogin: new Date()
        }
      })

      await user.save()
      logger.info(`New user created via OTP: ${email}`)

    } else if (purpose === 'login') {
      // Find existing user
      user = await User.findByEmail(email)
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }

      // Update last login
      user.authentication.lastLogin = new Date()
      user.authentication.isEmailVerified = true
      await user.save()

    } else if (purpose === 'password-reset') {
      // For password reset, just verify OTP - password change happens in separate endpoint
      return res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          email,
          resetToken: otpResult.email // Use email as reset identifier
        }
      })
    }

    // Generate tokens
    const token = user.generateAuthToken()
    const refreshToken = user.generateRefreshToken()

    res.json({
      success: true,
      message: `${purpose === 'signup' ? 'Account created' : 'Login'} successful`,
      data: {
        user: user.getPublicProfile(),
        token,
        refreshToken
      }
    })

  } catch (error) {
    logger.error('Verify OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    })
  }
})

// @route   POST /api/v1/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post('/resend-otp', authLimiter, [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('purpose')
    .optional()
    .isIn(['login', 'signup', 'password-reset'])
    .withMessage('Purpose must be login, signup, or password-reset')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body

    // Resend OTP
    const result = otpService.resendOTP(email, purpose)

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
        code: result.code,
        waitTime: result.waitTime
      })
    }

    // Return new OTP data for frontend to handle email sending
    logger.info(`📧 New OTP generated for ${email}: ${result.otp}`)
    
    res.json({
      success: true,
      message: 'New OTP generated successfully',
      data: {
        email,
        purpose,
        otp: result.otp, // Frontend will use this to send email via EmailJS
        expiryTime: result.expiryTime
      }
    })

  } catch (error) {
    logger.error('Resend OTP error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    })
  }
})

export default router