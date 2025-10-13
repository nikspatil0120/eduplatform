import { logger } from '../utils/logger.js'

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'

    Error.captureStackTrace(this, this.constructor)
  }
}

// Handle different types of errors
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`
  return new AppError(message, 400)
}

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0]
  const message = `Duplicate field value: ${value}. Please use another value!`
  return new AppError(message, 400)
}

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message)
  const message = `Invalid input data. ${errors.join('. ')}`
  return new AppError(message, 400)
}

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401)

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401)

const handleStripeError = (err) => {
  let message = 'Payment processing error'
  
  switch (err.type) {
    case 'StripeCardError':
      message = err.message || 'Your card was declined'
      break
    case 'StripeRateLimitError':
      message = 'Too many requests made to the API too quickly'
      break
    case 'StripeInvalidRequestError':
      message = 'Invalid parameters were supplied to Stripe API'
      break
    case 'StripeAPIError':
      message = 'An error occurred internally with Stripe API'
      break
    case 'StripeConnectionError':
      message = 'Some kind of error occurred during the HTTPS communication'
      break
    case 'StripeAuthenticationError':
      message = 'You probably used an incorrect API key'
      break
    default:
      message = err.message || 'Payment processing failed'
  }
  
  return new AppError(message, 400)
}

const handleMulterError = (err) => {
  let message = 'File upload error'
  
  switch (err.code) {
    case 'LIMIT_FILE_SIZE':
      message = 'File too large'
      break
    case 'LIMIT_FILE_COUNT':
      message = 'Too many files'
      break
    case 'LIMIT_UNEXPECTED_FILE':
      message = 'Unexpected field'
      break
    default:
      message = err.message || 'File upload failed'
  }
  
  return new AppError(message, 400)
}

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack
  })
}

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.statusCode === 400 && err.errors && { errors: err.errors })
    })
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err)
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!'
    })
  }
}

// Global error handling middleware
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500
  err.status = err.status || 'error'

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id
  })

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res)
  } else {
    let error = { ...err }
    error.message = err.message

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error)
    if (error.code === 11000) error = handleDuplicateFieldsDB(error)
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error)
    if (error.name === 'JsonWebTokenError') error = handleJWTError()
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError()
    if (error.type && error.type.startsWith('Stripe')) error = handleStripeError(error)
    if (error.code && error.code.startsWith('LIMIT_')) error = handleMulterError(error)

    sendErrorProd(error, res)
  }
}

// Handle 404 errors
export const notFound = (req, res, next) => {
  const err = new AppError(`Not found - ${req.originalUrl}`, 404)
  next(err)
}

// Async error wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Validation error handler
export const validationErrorHandler = (errors) => {
  const formattedErrors = errors.array().map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }))

  const err = new AppError('Validation failed', 400)
  err.errors = formattedErrors
  return err
}

// Rate limit error handler
export const rateLimitHandler = (req, res) => {
  logger.logSecurity('Rate limit exceeded', {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    url: req.url,
    method: req.method
  })

  res.status(429).json({
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
  })
}

// CORS error handler
export const corsErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    logger.logSecurity('CORS violation', {
      origin: req.get('Origin'),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    })

    return res.status(403).json({
      success: false,
      message: 'CORS policy violation'
    })
  }
  
  next(err)
}

// Unhandled promise rejection handler
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    message: err.message,
    stack: err.stack,
    promise
  })
  
  // Close server & exit process
  process.exit(1)
})

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    message: err.message,
    stack: err.stack
  })
  
  // Close server & exit process
  process.exit(1)
})

export default {
  AppError,
  errorHandler,
  notFound,
  asyncHandler,
  validationErrorHandler,
  rateLimitHandler,
  corsErrorHandler
}