// Simple script to start the backend
import { spawn } from 'child_process'
import path from 'path'

const backendPath = path.join(process.cwd(), 'backend')

console.log('🚀 Starting EduPlatform Backend...')

const backend = spawn('npm', ['run', 'dev'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true
})

backend.on('error', (error) => {
  console.error('❌ Failed to start backend:', error)
})

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend...')
  backend.kill('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend...')
  backend.kill('SIGTERM')
  process.exit(0)
})