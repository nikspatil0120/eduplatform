#!/usr/bin/env node

// Simple startup verification for Railway
import http from 'http'

const PORT = process.env.PORT || 3001
const MAX_RETRIES = 30
const RETRY_INTERVAL = 2000

console.log('Verifying server startup...')

function checkHealth(attempt = 1) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Server is healthy (attempt ${attempt})`)
          console.log('Response:', data)
          resolve(true)
        } else {
          console.log(`❌ Server returned status ${res.statusCode} (attempt ${attempt})`)
          reject(new Error(`Status ${res.statusCode}`))
        }
      })
    })

    req.on('error', (error) => {
      console.log(`❌ Health check failed (attempt ${attempt}): ${error.message}`)
      reject(error)
    })

    req.on('timeout', () => {
      console.log(`⏰ Health check timeout (attempt ${attempt})`)
      req.destroy()
      reject(new Error('Timeout'))
    })

    req.end()
  })
}

async function verifyStartup() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await checkHealth(attempt)
      console.log('🎉 Server startup verified successfully!')
      process.exit(0)
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(`💥 Server failed to start after ${MAX_RETRIES} attempts`)
        process.exit(1)
      }
      console.log(`⏳ Retrying in ${RETRY_INTERVAL/1000} seconds...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL))
    }
  }
}

verifyStartup()