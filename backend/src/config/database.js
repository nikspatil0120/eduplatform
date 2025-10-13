import mongoose from 'mongoose'
import { CosmosClient } from '@azure/cosmos'
import { logger } from '../utils/logger.js'

// MongoDB/Cosmos DB connection
export const connectDatabase = async () => {
  try {
    let mongoUri = process.env.MONGODB_URI

    if (!mongoUri) {
      throw new Error('Database connection string not provided')
    }

    // Fix URL encoding for Cosmos DB keys
    if (mongoUri.includes('cosmos.azure.com') && !mongoUri.includes('%3D%3D')) {
      // URL encode the == at the end of the key
      mongoUri = mongoUri.replace(/([A-Za-z0-9+/])={1,2}@/, '$1%3D%3D@')
      logger.info('Fixed URL encoding for Cosmos DB connection string')
    }

    // MongoDB connection options optimized for Cosmos DB
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased for Cosmos DB
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4, // Use IPv4, skip trying IPv6
      retryWrites: false, // Cosmos DB doesn't support retryWrites
      w: 'majority',
      ssl: true,
      sslValidate: true
    }

    // Connect to MongoDB/Cosmos DB
    await mongoose.connect(mongoUri, options)

    logger.info('✅ Database connected successfully')

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('❌ Database connection error:', error)
    })

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ Database disconnected')
    })

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 Database reconnected')
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close()
      logger.info('📴 Database connection closed through app termination')
      process.exit(0)
    })

  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    process.exit(1)
  }
}

// Azure Cosmos DB client (for advanced operations)
export const createCosmosClient = () => {
  if (!process.env.COSMOS_DB_ENDPOINT || !process.env.COSMOS_DB_KEY) {
    logger.warn('Cosmos DB credentials not provided, using MongoDB connection only')
    return null
  }

  try {
    const client = new CosmosClient({
      endpoint: process.env.COSMOS_DB_ENDPOINT,
      key: process.env.COSMOS_DB_KEY,
      connectionPolicy: {
        requestTimeout: 30000,
        enableEndpointDiscovery: true,
        preferredLocations: ['East US', 'West US 2'], // Add your preferred regions
      }
    })

    logger.info('✅ Cosmos DB client initialized')
    return client
  } catch (error) {
    logger.error('❌ Failed to initialize Cosmos DB client:', error)
    return null
  }
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
  createCosmosClient,
  checkDatabaseHealth,
  createIndexes
}