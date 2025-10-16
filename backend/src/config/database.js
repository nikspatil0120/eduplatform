import mongoose from 'mongoose'
import { logger } from '../utils/logger.js'

// MongoDB connection
export const connectDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI

    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is required')
    }

    // MongoDB connection options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true, // Enable retry writes for better reliability
      w: 'majority'
    }

    // Connect to MongoDB
    await mongoose.connect(mongoUri, options)

    logger.info('✅ MongoDB connected successfully')

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('❌ MongoDB connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('📴 MongoDB connection closed through app termination')
      process.exit(0)
    })

  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error)
    process.exit(1)
  }
}

// MongoDB client helper functions
export const getMongoClient = () => {
  return mongoose.connection.getClient()
}

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    const state = mongoose.connection.readyState
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }

    return {
      status: states[state] || 'unknown',
      connected: state === 1,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name
    }
  } catch (error) {
    logger.error('Database health check failed:', error)
    return {
      status: 'error',
      connected: false,
      error: error.message
    }
  }
}

// Initialize database indexes for better performance
export const createIndexes = async () => {
  try {
    // User indexes
    await mongoose.connection.db.collection('users').createIndex({ email: 1 }, { unique: true })
    await mongoose.connection.db.collection('users').createIndex({ role: 1 })
    await mongoose.connection.db.collection('users').createIndex({ createdAt: -1 })

    // Course indexes
    await mongoose.connection.db.collection('courses').createIndex({ title: 'text', description: 'text' })
    await mongoose.connection.db.collection('courses').createIndex({ category: 1 })
    await mongoose.connection.db.collection('courses').createIndex({ level: 1 })
    await mongoose.connection.db.collection('courses').createIndex({ instructor: 1 })
    await mongoose.connection.db.collection('courses').createIndex({ createdAt: -1 })
    await mongoose.connection.db.collection('courses').createIndex({ rating: -1 })
    await mongoose.connection.db.collection('courses').createIndex({ enrollments: -1 })

    // Enrollment indexes
    await mongoose.connection.db.collection('enrollments').createIndex({ user: 1, course: 1 }, { unique: true })
    await mongoose.connection.db.collection('enrollments').createIndex({ user: 1 })
    await mongoose.connection.db.collection('enrollments').createIndex({ course: 1 })
    await mongoose.connection.db.collection('enrollments').createIndex({ enrolledAt: -1 })

    // Notes indexes
    await mongoose.connection.db.collection('notes').createIndex({ user: 1 })
    await mongoose.connection.db.collection('notes').createIndex({ course: 1 })
    await mongoose.connection.db.collection('notes').createIndex({ title: 'text', content: 'text' })
    await mongoose.connection.db.collection('notes').createIndex({ createdAt: -1 })

    // Quiz indexes
    await mongoose.connection.db.collection('quizzes').createIndex({ course: 1 })
    await mongoose.connection.db.collection('quizzes').createIndex({ createdAt: -1 })

    // Payment indexes
    await mongoose.connection.db.collection('payments').createIndex({ user: 1 })
    await mongoose.connection.db.collection('payments').createIndex({ stripePaymentIntentId: 1 })
    await mongoose.connection.db.collection('payments').createIndex({ status: 1 })
    await mongoose.connection.db.collection('payments').createIndex({ createdAt: -1 })

    logger.info('✅ Database indexes created successfully')
  } catch (error) {
    logger.error('❌ Failed to create database indexes:', error)
  }
}

export default {
  connectDatabase,
  getMongoClient,
  checkDatabaseHealth,
  createIndexes
}