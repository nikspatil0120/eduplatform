#!/usr/bin/env node

// Railway-specific startup script
console.log('🚂 Railway Backend Startup')
console.log('Node.js version:', process.version)
console.log('Working directory:', process.cwd())
console.log('Environment:', process.env.NODE_ENV || 'development')

// Import and start the production script
import('./start-production.js')
  .then(() => {
    console.log('✅ Backend startup script loaded')
  })
  .catch((error) => {
    console.error('❌ Backend startup failed:', error)
    process.exit(1)
  })