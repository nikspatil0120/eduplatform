import crypto from 'crypto'
import { logger } from '../utils/logger.js'

class OTPService {
  constructor() {
    // In-memory storage for development (use Redis in production)
    this.otpStore = new Map()
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredOTPs()
    }, 60000) // Cleanup every minute
  }

  generateOTP(length = 6) {
    // Generate a random OTP
    const digits = '0123456789'
    let otp = ''
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)]
    }
    return otp
  }

  generateSecureOTP(length = 6) {
    // Generate a cryptographically secure OTP
    const buffer = crypto.randomBytes(length)
    let otp = ''
    for (let i = 0; i < length; i++) {
      otp += (buffer[i] % 10).toString()
    }
    return otp
  }

  storeOTP(email, otp, purpose = 'login', expiryMinutes = 10) {
    const key = `${email}:${purpose}`
    const expiryTime = Date.now() + (expiryMinutes * 60 * 1000)
    
    this.otpStore.set(key, {
      otp,
      email,
      purpose,
      expiryTime,
      attempts: 0,
      maxAttempts: 3,
      createdAt: Date.now()
    })

    logger.info(`OTP stored for ${email} (${purpose})`)
    return { success: true, expiryTime }
  }

  verifyOTP(email, otp, purpose = 'login') {
    const key = `${email}:${purpose}`
    const otpData = this.otpStore.get(key)

    if (!otpData) {
      logger.warn(`OTP verification failed - not found: ${email} (${purpose})`)
      return { 
        success: false, 
        error: 'OTP not found or expired',
        code: 'OTP_NOT_FOUND'
      }
    }

    // Check if expired
    if (Date.now() > otpData.expiryTime) {
      this.otpStore.delete(key)
      logger.warn(`OTP verification failed - expired: ${email} (${purpose})`)
      return { 
        success: false, 
        error: 'OTP has expired',
        code: 'OTP_EXPIRED'
      }
    }

    // Check attempts
    if (otpData.attempts >= otpData.maxAttempts) {
      this.otpStore.delete(key)
      logger.warn(`OTP verification failed - max attempts: ${email} (${purpose})`)
      return { 
        success: false, 
        error: 'Too many failed attempts',
        code: 'MAX_ATTEMPTS_EXCEEDED'
      }
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      otpData.attempts++
      this.otpStore.set(key, otpData)
      logger.warn(`OTP verification failed - incorrect: ${email} (${purpose}) - Attempt ${otpData.attempts}`)
      return { 
        success: false, 
        error: 'Invalid OTP',
        code: 'INVALID_OTP',
        attemptsLeft: otpData.maxAttempts - otpData.attempts
      }
    }

    // Success - remove OTP
    this.otpStore.delete(key)
    logger.info(`OTP verified successfully: ${email} (${purpose})`)
    return { 
      success: true, 
      email: otpData.email,
      purpose: otpData.purpose
    }
  }

  resendOTP(email, purpose = 'login') {
    const key = `${email}:${purpose}`
    const otpData = this.otpStore.get(key)

    if (!otpData) {
      return { 
        success: false, 
        error: 'No OTP found to resend',
        code: 'NO_OTP_TO_RESEND'
      }
    }

    // Check if enough time has passed (prevent spam)
    const timeSinceCreated = Date.now() - otpData.createdAt
    const minResendInterval = 60000 // 1 minute

    if (timeSinceCreated < minResendInterval) {
      const waitTime = Math.ceil((minResendInterval - timeSinceCreated) / 1000)
      return { 
        success: false, 
        error: `Please wait ${waitTime} seconds before requesting a new OTP`,
        code: 'RESEND_TOO_SOON',
        waitTime
      }
    }

    // Generate new OTP
    const newOTP = this.generateSecureOTP()
    this.storeOTP(email, newOTP, purpose)

    return { 
      success: true, 
      otp: newOTP,
      message: 'New OTP generated'
    }
  }

  cleanupExpiredOTPs() {
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiryTime) {
        this.otpStore.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} expired OTPs`)
    }
  }

  getOTPStats() {
    const stats = {
      totalOTPs: this.otpStore.size,
      byPurpose: {},
      expired: 0
    }

    const now = Date.now()
    for (const [key, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiryTime) {
        stats.expired++
      }
      
      if (!stats.byPurpose[otpData.purpose]) {
        stats.byPurpose[otpData.purpose] = 0
      }
      stats.byPurpose[otpData.purpose]++
    }

    return stats
  }

  // Cleanup on service shutdown
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.otpStore.clear()
  }
}

// Create singleton instance
const otpService = new OTPService()

export default otpService