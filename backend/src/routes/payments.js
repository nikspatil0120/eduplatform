import express from 'express'
import { authenticate as auth } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = express.Router()

// Create payment intent (placeholder - Stripe removed)
router.post('/create-intent', auth, async (req, res) => {
  try {
    // Since Stripe is removed, return a mock success response
    res.json({
      success: true,
      message: 'Payment processing is currently disabled',
      paymentMethod: 'free'
    })
  } catch (error) {
    logger.error('Payment intent error:', error)
    res.status(500).json({
      success: false,
      message: 'Payment processing unavailable'
    })
  }
})

// Webhook handler (placeholder)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    // Placeholder for payment webhook handling
    res.status(200).json({ received: true })
  } catch (error) {
    logger.error('Payment webhook error:', error)
    res.status(400).json({
      success: false,
      message: 'Webhook processing failed'
    })
  }
})

export default router