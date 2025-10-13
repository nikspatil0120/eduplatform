import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { logger } from '../utils/logger.js'

// Middleware to authenticate JWT token
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      // Find user
      const user = await User.findById(decoded.id)
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        })
      }

      if (!user.isActive || user.isDeleted) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated.'
        })
      }

      // Add user to request object
      req.user = user
      next()

    } catch (tokenError) {
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired.',
          code: 'TOKEN_EXPIRED'
        })
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token.',
          code: 'INVALID_TOKEN'
        })
      } else {
        throw tokenError
      }
    }

  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
}

// Middleware to check if user has required role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      })
    }

    next()
  }
}

// Middleware to check if user owns the resource or is admin
export const authorizeOwnerOrAdmin = (resourceUserField = 'user') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    // Admin can access everything
    if (req.user.role === 'admin') {
      return next()
    }

    // Check if user owns the resource
    const resourceUserId = req.resource?.[resourceUserField] || req.params.userId || req.body.userId
    
    if (resourceUserId && resourceUserId.toString() === req.user._id.toString()) {
      return next()
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    })
  }
}

// Middleware to check subscription plan
export const requireSubscription = (...plans) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      })
    }

    if (!plans.includes(req.user.subscription.plan)) {
      return res.status(403).json({
        success: false,
        message: 'Subscription upgrade required',
        required: plans,
        current: req.user.subscription.plan,
        upgradeUrl: `${process.env.FRONTEND_URL}/pricing`
      })
    }

    // Check if subscription is active
    if (req.user.subscription.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required',
        status: req.user.subscription.status,
        renewUrl: `${process.env.FRONTEND_URL}/billing`
      })
    }

    next()
  }
}

// Middleware to check if email is verified
export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    })
  }

  if (!req.user.authentication.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
      verifyUrl: `${process.env.FRONTEND_URL}/verify-email`
    })
  }

  next()
}

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next() // Continue without user
    }

    const token = authHeader.substring(7)

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id)
      
      if (user && user.isActive && !user.isDeleted) {
        req.user = user
      }
    } catch (tokenError) {
      // Ignore token errors for optional auth
      logger.debug('Optional auth token error:', tokenError.message)
    }

    next()

  } catch (error) {
    logger.error('Optional authentication error:', error)
    next() // Continue without user
  }
}

// Middleware to rate limit based on user
export const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const userRequests = new Map()

  return (req, res, next) => {
    const userId = req.user?._id?.toString() || req.ip
    const now = Date.now()
    const windowStart = now - windowMs

    // Clean old entries
    for (const [key, requests] of userRequests.entries()) {
      userRequests.set(key, requests.filter(time => time > windowStart))
      if (userRequests.get(key).length === 0) {
        userRequests.delete(key)
      }
    }

    // Check current user's requests
    const requests = userRequests.get(userId) || []
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000)
      })
    }

    // Add current request
    requests.push(now)
    userRequests.set(userId, requests)

    next()
  }
}

// Middleware to log user activity
export const logActivity = (action) => {
  return (req, res, next) => {
    if (req.user) {
      // Update last activity
      req.user.stats.lastActivityDate = new Date()
      req.user.save().catch(error => {
        logger.error('Failed to update user activity:', error)
      })

      // Log activity
      logger.info(`User activity: ${req.user.email} - ${action}`, {
        userId: req.user._id,
        action,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      })
    }

    next()
  }
}

export default {
  authenticate,
  authorize,
  authorizeOwnerOrAdmin,
  requireSubscription,
  requireEmailVerification,
  optionalAuth,
  userRateLimit,
  logActivity
}