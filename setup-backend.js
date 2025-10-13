#!/usr/bin/env node

import { execSync } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

console.log('🚀 Setting up EduPlatform Backend...\n')

// Create backend directory structure
const directories = [
  'backend/src/controllers',
  'backend/src/models',
  'backend/src/routes',
  'backend/src/middleware',
  'backend/src/services',
  'backend/src/utils',
  'backend/src/config',
  'backend/tests/unit',
  'backend/tests/integration',
  'backend/tests/e2e',
  'backend/logs',
  'backend/uploads'
]

console.log('📁 Creating directory structure...')
directories.forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    console.log(`   ✅ Created ${dir}`)
  }
})

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...')
try {
  process.chdir('backend')
  execSync('npm install', { stdio: 'inherit' })
  console.log('   ✅ Backend dependencies installed')
} catch (error) {
  console.error('   ❌ Failed to install dependencies:', error.message)
  process.exit(1)
}

// Create environment file
console.log('\n⚙️ Setting up environment configuration...')
if (!existsSync('.env')) {
  execSync('cp .env.example .env')
  console.log('   ✅ Created .env file from template')
  console.log('   ⚠️  Please update .env with your actual configuration values')
} else {
  console.log('   ℹ️  .env file already exists')
}

// Create additional required files
const additionalFiles = [
  {
    path: 'src/models/Enrollment.js',
    content: `import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrolledAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  progress: {
    completedLessons: [{
      lessonId: mongoose.Schema.Types.ObjectId,
      completedAt: Date,
      watchTime: Number // in seconds
    }],
    currentLesson: mongoose.Schema.Types.ObjectId,
    overallProgress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastAccessedAt: Date
  },
  certificate: {
    issued: {
      type: Boolean,
      default: false
    },
    issuedAt: Date,
    certificateUrl: String,
    certificateId: String
  },
  paymentIntentId: String,
  amount: Number,
  currency: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// Indexes
enrollmentSchema.index({ user: 1, course: 1 }, { unique: true })
enrollmentSchema.index({ user: 1 })
enrollmentSchema.index({ course: 1 })
enrollmentSchema.index({ enrolledAt: -1 })

const Enrollment = mongoose.model('Enrollment', enrollmentSchema)
export default Enrollment`
  },
  {
    path: 'src/models/Quiz.js',
    content: `import mongoose from 'mongoose'

const questionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['multiple-choice', 'multiple-select', 'true-false', 'short-answer'],
    required: true
  },
  question: {
    type: String,
    required: true,
    maxlength: 1000
  },
  options: [String], // For multiple choice questions
  correctAnswer: mongoose.Schema.Types.Mixed, // String for single answer, Array for multiple
  explanation: String,
  points: {
    type: Number,
    default: 1
  },
  order: Number
})

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: String,
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    required: false // Can be course-level quiz
  },
  questions: [questionSchema],
  settings: {
    timeLimit: Number, // in minutes
    passingScore: {
      type: Number,
      default: 70,
      min: 0,
      max: 100
    },
    maxAttempts: {
      type: Number,
      default: 3
    },
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    randomizeQuestions: {
      type: Boolean,
      default: false
    },
    randomizeOptions: {
      type: Boolean,
      default: false
    }
  },
  isPublished: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

const Quiz = mongoose.model('Quiz', quizSchema)
export default Quiz`
  },
  {
    path: 'src/models/Note.js',
    content: `import mongoose from 'mongoose'

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  timestamp: Number, // Video timestamp if note is tied to specific moment
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permission: {
      type: String,
      enum: ['read', 'write'],
      default: 'read'
    }
  }],
  folder: String,
  color: String,
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Indexes
noteSchema.index({ user: 1 })
noteSchema.index({ course: 1 })
noteSchema.index({ title: 'text', content: 'text' })
noteSchema.index({ createdAt: -1 })

const Note = mongoose.model('Note', noteSchema)
export default Note`
  }
]

console.log('\n📝 Creating additional model files...')
additionalFiles.forEach(file => {
  if (!existsSync(file.path)) {
    writeFileSync(file.path, file.content)
    console.log(`   ✅ Created ${file.path}`)
  }
})

// Create startup scripts
const scripts = {
  'scripts/start-dev.js': `#!/usr/bin/env node
import { spawn } from 'child_process'

console.log('🚀 Starting EduPlatform in development mode...')

// Start backend
const backend = spawn('npm', ['run', 'dev'], {
  cwd: 'backend',
  stdio: 'inherit',
  shell: true
})

// Start frontend
const frontend = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down...')
  backend.kill()
  frontend.kill()
  process.exit()
})`,

  'scripts/setup-azure.js': `#!/usr/bin/env node
import { execSync } from 'child_process'

console.log('☁️ Setting up Azure resources...')

const azureCommands = [
  'az group create --name eduplatform-rg --location eastus',
  'az cosmosdb create --name eduplatform-cosmos --resource-group eduplatform-rg --kind MongoDB',
  'az storage account create --name eduplatformstorage --resource-group eduplatform-rg --location eastus --sku Standard_LRS',
  'az appservice plan create --name eduplatform-plan --resource-group eduplatform-rg --sku B1 --is-linux',
  'az webapp create --name eduplatform-api --resource-group eduplatform-rg --plan eduplatform-plan --runtime "NODE|18-lts"'
]

try {
  azureCommands.forEach(cmd => {
    console.log(\`Executing: \${cmd}\`)
    execSync(cmd, { stdio: 'inherit' })
  })
  console.log('✅ Azure resources created successfully')
} catch (error) {
  console.error('❌ Failed to create Azure resources:', error.message)
}`
}

console.log('\n🔧 Creating utility scripts...')
Object.entries(scripts).forEach(([path, content]) => {
  const fullPath = join('..', path)
  if (!existsSync(fullPath)) {
    mkdirSync(join('..', 'scripts'), { recursive: true })
    writeFileSync(fullPath, content)
    console.log(`   ✅ Created ${path}`)
  }
})

// Create Docker configuration
const dockerConfig = {
  'Dockerfile': `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy source code
COPY backend/src ./src

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3001

CMD ["node", "src/app.js"]`,

  'docker-compose.yml': `version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    env_file:
      - backend/.env
    depends_on:
      - mongodb
      - redis

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mongodb_data:
  redis_data:`
}

console.log('\n🐳 Creating Docker configuration...')
Object.entries(dockerConfig).forEach(([filename, content]) => {
  const fullPath = join('..', filename)
  if (!existsSync(fullPath)) {
    writeFileSync(fullPath, content)
    console.log(`   ✅ Created ${filename}`)
  }
})

// Go back to root directory
process.chdir('..')

console.log('\n🎉 Backend setup completed successfully!')
console.log('\n📋 Next steps:')
console.log('   1. Update backend/.env with your configuration values')
console.log('   2. Set up your Azure resources: node scripts/setup-azure.js')
console.log('   3. Start development: node scripts/start-dev.js')
console.log('   4. Visit http://localhost:3000 to see your application')
console.log('\n📚 Documentation:')
console.log('   - API Documentation: http://localhost:3001/api/v1/docs')
console.log('   - Health Check: http://localhost:3001/health')
console.log('\n🔗 Useful links:')
console.log('   - Azure Portal: https://portal.azure.com')
console.log('   - Stripe Dashboard: https://dashboard.stripe.com')
console.log('   - SendGrid Dashboard: https://app.sendgrid.com')
console.log('\n✨ Happy coding!')