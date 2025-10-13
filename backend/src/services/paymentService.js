import Stripe from 'stripe'
import User from '../models/User.js'
import Course from '../models/Course.js'
import { logger } from '../utils/logger.js'
import { sendEmail } from './emailService.js'

class PaymentService {
  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    
    // Subscription plans
    this.plans = {
      free: {
        name: 'Free',
        price: 0,
        features: ['Limited course access', 'Basic support'],
        stripePriceId: null
      },
      premium: {
        name: 'Premium',
        price: 29,
        features: ['Full course access', 'Certificates', 'Priority support', 'Offline downloads'],
        stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID
      },
      enterprise: {
        name: 'Enterprise',
        price: 99,
        features: ['Everything in Premium', 'Custom branding', 'Advanced analytics', 'SSO integration'],
        stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID
      }
    }
  }

  // Create payment intent for course purchase
  async createCoursePaymentIntent(userId, courseId, options = {}) {
    try {
      const user = await User.findById(userId)
      const course = await Course.findById(courseId)

      if (!user || !course) {
        throw new Error('User or course not found')
      }

      // Check if user already owns the course
      const existingEnrollment = await this.checkEnrollment(userId, courseId)
      if (existingEnrollment) {
        throw new Error('User already enrolled in this course')
      }

      // Calculate amount (handle discounts)
      const amount = this.calculateCoursePrice(course)

      // Create or get Stripe customer
      const customer = await this.getOrCreateCustomer(user)

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: course.pricing.currency || 'usd',
        customer: customer.id,
        metadata: {
          type: 'course_purchase',
          userId: userId.toString(),
          courseId: courseId.toString(),
          courseName: course.title,
          instructorId: course.instructor.toString()
        },
        description: `Course: ${course.title}`,
        receipt_email: user.email,
        ...options
      })

      logger.info(`💳 Created payment intent for course purchase: ${paymentIntent.id}`)

      return {
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          clientSecret: paymentIntent.client_secret,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        },
        course: {
          id: course._id,
          title: course.title,
          price: amount
        }
      }

    } catch (error) {
      logger.error('Failed to create course payment intent:', error)
      throw error
    }
  }

  // Create subscription for premium plans
  async createSubscription(userId, planId, options = {}) {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const plan = this.plans[planId]
      if (!plan || !plan.stripePriceId) {
        throw new Error('Invalid subscription plan')
      }

      // Create or get Stripe customer
      const customer = await this.getOrCreateCustomer(user)

      // Cancel existing subscription if any
      if (user.subscription.stripeSubscriptionId) {
        await this.cancelSubscription(user.subscription.stripeSubscriptionId)
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.stripePriceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId.toString(),
          plan: planId
        },
        ...options
      })

      // Update user subscription info
      await User.findByIdAndUpdate(userId, {
        'subscription.plan': planId,
        'subscription.stripeSubscriptionId': subscription.id,
        'subscription.status': subscription.status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000)
      })

      logger.info(`📋 Created subscription for user ${userId}: ${subscription.id}`)

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          clientSecret: subscription.latest_invoice.payment_intent.client_secret,
          currentPeriodEnd: subscription.current_period_end
        },
        plan
      }

    } catch (error) {
      logger.error('Failed to create subscription:', error)
      throw error
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId, cancelAtPeriodEnd = true) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: cancelAtPeriodEnd
      })

      // Update user record
      const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscriptionId })
      if (user) {
        user.subscription.cancelAtPeriodEnd = cancelAtPeriodEnd
        await user.save()
      }

      logger.info(`❌ ${cancelAtPeriodEnd ? 'Scheduled cancellation' : 'Cancelled'} subscription: ${subscriptionId}`)

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: subscription.current_period_end
        }
      }

    } catch (error) {
      logger.error('Failed to cancel subscription:', error)
      throw error
    }
  }

  // Get or create Stripe customer
  async getOrCreateCustomer(user) {
    try {
      // Check if user already has a Stripe customer ID
      if (user.subscription.stripeCustomerId) {
        try {
          const customer = await this.stripe.customers.retrieve(user.subscription.stripeCustomerId)
          return customer
        } catch (error) {
          // Customer doesn't exist, create new one
          logger.warn(`Stripe customer ${user.subscription.stripeCustomerId} not found, creating new one`)
        }
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user._id.toString()
        }
      })

      // Update user with customer ID
      await User.findByIdAndUpdate(user._id, {
        'subscription.stripeCustomerId': customer.id
      })

      logger.info(`👤 Created Stripe customer: ${customer.id}`)
      return customer

    } catch (error) {
      logger.error('Failed to get or create customer:', error)
      throw error
    }
  }

  // Handle Stripe webhooks
  async handleWebhook(payload, signature) {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret)

      logger.info(`🔔 Received Stripe webhook: ${event.type}`)

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object)
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object)
          break

        case 'invoice.payment_succeeded':
          await this.handleSubscriptionPaymentSuccess(event.data.object)
          break

        case 'invoice.payment_failed':
          await this.handleSubscriptionPaymentFailed(event.data.object)
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object)
          break

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`)
      }

      return { success: true, processed: true }

    } catch (error) {
      logger.error('Webhook handling failed:', error)
      throw error
    }
  }

  // Handle successful payment
  async handlePaymentSuccess(paymentIntent) {
    try {
      const { metadata } = paymentIntent

      if (metadata.type === 'course_purchase') {
        await this.processCourseEnrollment(metadata.userId, metadata.courseId, paymentIntent)
      }

      // Send confirmation email
      const user = await User.findById(metadata.userId)
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Payment Confirmation - EduPlatform',
          template: 'paymentConfirmation',
          data: {
            name: user.name,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            paymentIntentId: paymentIntent.id
          }
        })
      }

    } catch (error) {
      logger.error('Failed to handle payment success:', error)
    }
  }

  // Handle failed payment
  async handlePaymentFailed(paymentIntent) {
    try {
      const { metadata } = paymentIntent

      // Send failure notification email
      const user = await User.findById(metadata.userId)
      if (user) {
        await sendEmail({
          to: user.email,
          subject: 'Payment Failed - EduPlatform',
          template: 'paymentFailed',
          data: {
            name: user.name,
            amount: paymentIntent.amount / 100,
            currency: paymentIntent.currency.toUpperCase(),
            paymentIntentId: paymentIntent.id
          }
        })
      }

    } catch (error) {
      logger.error('Failed to handle payment failure:', error)
    }
  }

  // Process course enrollment after successful payment
  async processCourseEnrollment(userId, courseId, paymentIntent) {
    try {
      // Create enrollment record
      const Enrollment = (await import('../models/Enrollment.js')).default
      
      const enrollment = new Enrollment({
        user: userId,
        course: courseId,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
        enrolledAt: new Date()
      })

      await enrollment.save()

      // Update course stats
      await Course.findByIdAndUpdate(courseId, {
        $inc: { 
          'stats.enrollments': 1,
          'stats.totalRevenue': paymentIntent.amount / 100
        }
      })

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.coursesEnrolled': 1 }
      })

      logger.info(`✅ Processed course enrollment: User ${userId} -> Course ${courseId}`)

    } catch (error) {
      logger.error('Failed to process course enrollment:', error)
      throw error
    }
  }

  // Handle subscription payment success
  async handleSubscriptionPaymentSuccess(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription)
      const customer = await this.stripe.customers.retrieve(subscription.customer)
      
      const user = await User.findOne({ 'subscription.stripeCustomerId': customer.id })
      if (!user) return

      // Update subscription status
      user.subscription.status = 'active'
      user.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000)
      user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000)
      await user.save()

      // Send confirmation email
      await sendEmail({
        to: user.email,
        subject: 'Subscription Payment Confirmed - EduPlatform',
        template: 'subscriptionConfirmation',
        data: {
          name: user.name,
          plan: user.subscription.plan,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          nextBillingDate: new Date(subscription.current_period_end * 1000)
        }
      })

    } catch (error) {
      logger.error('Failed to handle subscription payment success:', error)
    }
  }

  // Calculate course price with discounts
  calculateCoursePrice(course) {
    let price = course.pricing.price

    // Apply discount if valid
    if (course.pricing.discountPercentage && 
        course.pricing.discountValidUntil && 
        new Date(course.pricing.discountValidUntil) > new Date()) {
      price = price * (1 - course.pricing.discountPercentage / 100)
    }

    return Math.round(price * 100) / 100 // Round to 2 decimal places
  }

  // Check if user is enrolled in course
  async checkEnrollment(userId, courseId) {
    try {
      const Enrollment = (await import('../models/Enrollment.js')).default
      return await Enrollment.findOne({ user: userId, course: courseId })
    } catch (error) {
      return null
    }
  }

  // Get payment history for user
  async getPaymentHistory(userId, options = {}) {
    try {
      const { limit = 10, startingAfter = null } = options
      
      const user = await User.findById(userId)
      if (!user || !user.subscription.stripeCustomerId) {
        return { success: true, payments: [] }
      }

      const charges = await this.stripe.charges.list({
        customer: user.subscription.stripeCustomerId,
        limit,
        starting_after: startingAfter
      })

      const payments = charges.data.map(charge => ({
        id: charge.id,
        amount: charge.amount / 100,
        currency: charge.currency,
        status: charge.status,
        description: charge.description,
        receiptUrl: charge.receipt_url,
        created: new Date(charge.created * 1000),
        metadata: charge.metadata
      }))

      return {
        success: true,
        payments,
        hasMore: charges.has_more
      }

    } catch (error) {
      logger.error('Failed to get payment history:', error)
      throw error
    }
  }

  // Create refund
  async createRefund(paymentIntentId, amount = null, reason = 'requested_by_customer') {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
        reason
      })

      logger.info(`💰 Created refund: ${refund.id} for payment ${paymentIntentId}`)

      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          currency: refund.currency,
          status: refund.status,
          reason: refund.reason
        }
      }

    } catch (error) {
      logger.error('Failed to create refund:', error)
      throw error
    }
  }
}

// Create singleton instance
const paymentService = new PaymentService()

export default paymentService