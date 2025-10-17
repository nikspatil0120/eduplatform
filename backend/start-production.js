#!/usr/bin/env node

// Production startup script with better error handling and logging
import { fileURLToPath } from 'url'
import path from 'path'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config()

// Simple console logger for startup
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`)
}

async function startServer() {
  try {
    log.info('Starting EduPlatform Backend...')
    
    // Check required environment variables
    const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    
    if (missingVars.length > 0) {
      log.error(`Missing required environment variables: ${missingVars.join(', ')}`)
      process.exit(1)
    }
    
    log.info('Environment variables validated')
    
    // Import and start the main app
    const app = await import('./src/app.js')
    log.info('Application imported successfully')
    
  } catch (error) {
    log.error(`Failed to start server: ${error.message}`)
    log.error(`Stack trace: ${error.stack}`)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error(`Uncaught Exception: ${error.message}`)
  log.error(`Stack trace: ${error.stack}`)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`)
  process.exit(1)
})

// Start the server
startServer()