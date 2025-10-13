import { createWriteStream } from 'fs'
import { mkdir } from 'fs/promises'
import { dirname } from 'path'

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info'
    this.logFile = process.env.LOG_FILE || 'logs/app.log'
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    }
    
    this.initialize()
  }

  async initialize() {
    try {
      // Create logs directory if it doesn't exist
      await mkdir(dirname(this.logFile), { recursive: true })
      
      // Create write stream for file logging
      this.fileStream = createWriteStream(this.logFile, { flags: 'a' })
      
    } catch (error) {
      console.error('Failed to initialize logger:', error)
    }
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel]
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString()
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return

    const formattedMessage = this.formatMessage(level, message, meta)
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    }
    
    const reset = '\x1b[0m'
    const coloredMessage = `${colors[level] || ''}${formattedMessage}${reset}`
    
    console.log(coloredMessage)
    
    // File output
    if (this.fileStream) {
      this.fileStream.write(formattedMessage + '\n')
    }
  }

  error(message, meta = {}) {
    // If meta is an Error object, extract useful information
    if (meta instanceof Error) {
      meta = {
        name: meta.name,
        message: meta.message,
        stack: meta.stack,
        ...meta
      }
    }
    this.log('error', message, meta)
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta)
  }

  info(message, meta = {}) {
    this.log('info', message, meta)
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta)
  }

  // HTTP request logging
  logRequest(req, res, responseTime) {
    const meta = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id || 'anonymous'
    }

    const level = res.statusCode >= 400 ? 'warn' : 'info'
    this.log(level, `${req.method} ${req.url} ${res.statusCode}`, meta)
  }

  // Database operation logging
  logDatabase(operation, collection, query = {}, result = {}) {
    const meta = {
      operation,
      collection,
      query: JSON.stringify(query),
      result: typeof result === 'object' ? JSON.stringify(result) : result
    }

    this.debug(`Database ${operation}`, meta)
  }

  // Performance logging
  logPerformance(operation, duration, meta = {}) {
    const level = duration > 1000 ? 'warn' : 'info' // Warn if operation takes more than 1 second
    
    this.log(level, `Performance: ${operation} took ${duration}ms`, {
      duration,
      ...meta
    })
  }

  // Security logging
  logSecurity(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...details
    })
  }

  // Business logic logging
  logBusiness(event, details = {}) {
    this.info(`Business Event: ${event}`, {
      timestamp: new Date().toISOString(),
      ...details
    })
  }

  // Create child logger with context
  child(context = {}) {
    return {
      error: (message, meta = {}) => this.error(message, { ...context, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...context, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...context, ...meta }),
      debug: (message, meta = {}) => this.debug(message, { ...context, ...meta })
    }
  }

  // Graceful shutdown
  close() {
    if (this.fileStream) {
      this.fileStream.end()
    }
  }
}

// Create singleton instance
const logger = new Logger()

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.close()
})

process.on('SIGTERM', () => {
  logger.close()
})

export { logger }
export default logger