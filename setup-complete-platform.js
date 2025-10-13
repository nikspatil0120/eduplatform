#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

const log = (message, color = colors.reset) => {
  console.log(`${color}${message}${colors.reset}`)
}

const execCommand = (command, cwd = process.cwd()) => {
  try {
    log(`Executing: ${command}`, colors.cyan)
    execSync(command, { cwd, stdio: 'inherit' })
    return true
  } catch (error) {
    log(`Error executing command: ${command}`, colors.red)
    log(error.message, colors.red)
    return false
  }
}

const checkFile = (filePath) => {
  return fs.existsSync(filePath)
}

const createEnvFile = (filePath, content) => {
  if (!checkFile(filePath)) {
    fs.writeFileSync(filePath, content)
    log(`✅ Created ${filePath}`, colors.green)
  } else {
    log(`⚠️  ${filePath} already exists, skipping...`, colors.yellow)
  }
}

const main = async () => {
  log('🚀 Setting up EduPlatform - Complete Learning Management System', colors.bright)
  log('=' .repeat(70), colors.blue)

  // Check Node.js version
  const nodeVersion = process.version
  log(`📋 Node.js version: ${nodeVersion}`, colors.cyan)
  
  if (parseInt(nodeVersion.slice(1)) < 16) {
    log('❌ Node.js 16 or higher is required', colors.red)
    process.exit(1)
  }

  // 1. Setup Backend
  log('\n📦 Setting up Backend...', colors.bright)
  
  const backendDir = path.join(__dirname, 'backend')
  if (!fs.existsSync(backendDir)) {
    fs.mkdirSync(backendDir, { recursive: true })
  }

  // Install backend dependencies
  log('Installing backend dependencies...', colors.yellow)
  if (!execCommand('npm install', backendDir)) {
    log('❌ Failed to install backend dependencies', colors.red)
    process.exit(1)
  }

  // Create backend .env file
  const backendEnvContent = `# Database Configuration
MONGODB_URI=mongodb://localhost:27017/eduplatform
MONGODB_TEST_URI=mongodb://localhost:27017/eduplatform_test

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development
API_VERSION=v1
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@eduplatform.com

# Azure Storage Configuration
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
AZURE_STORAGE_CONTAINER_NAME=eduplatform-files

# Azure Media Services (Optional)
AZURE_MEDIA_ACCOUNT_NAME=your-media-account
AZURE_MEDIA_RESOURCE_GROUP=your-resource-group
AZURE_MEDIA_SUBSCRIPTION_ID=your-subscription-id
AZURE_MEDIA_AAD_CLIENT_ID=your-client-id
AZURE_MEDIA_AAD_SECRET=your-client-secret
AZURE_MEDIA_AAD_TENANT_DOMAIN=your-tenant-domain

# Payment Configuration (Stripe)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# OTP Configuration
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6

# File Upload Configuration
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,mp4,mov,zip

# Redis Configuration (Optional - for caching)
REDIS_URL=redis://localhost:6379

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=logs/app.log
`

  createEnvFile(path.join(backendDir, '.env'), backendEnvContent)

  // 2. Setup Frontend
  log('\n🎨 Setting up Frontend...', colors.bright)
  
  const frontendDir = __dirname
  
  // Install frontend dependencies
  log('Installing frontend dependencies...', colors.yellow)
  if (!execCommand('npm install', frontendDir)) {
    log('❌ Failed to install frontend dependencies', colors.red)
    process.exit(1)
  }

  // Create frontend .env file
  const frontendEnvContent = `# API Configuration
VITE_API_URL=http://localhost:3001/api/v1
VITE_API_TIMEOUT=10000

# Google OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# App Configuration
VITE_APP_NAME=EduPlatform
VITE_APP_VERSION=1.0.0
VITE_APP_DESCRIPTION=Complete Learning Management System

# Feature Flags
VITE_ENABLE_GOOGLE_AUTH=true
VITE_ENABLE_PAYMENTS=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_REAL_TIME=true

# File Upload Configuration
VITE_MAX_FILE_SIZE=50
VITE_ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,doc,docx,txt,mp4,mov,zip

# Development Configuration
VITE_ENABLE_DEVTOOLS=true
VITE_LOG_LEVEL=debug
`

  createEnvFile(path.join(frontendDir, '.env'), frontendEnvContent)

  // 3. Create additional configuration files
  log('\n⚙️  Creating configuration files...', colors.bright)

  // Create package.json scripts for easy management
  const packageJsonPath = path.join(__dirname, 'package.json')
  if (checkFile(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    // Add comprehensive scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview",
      "backend:dev": "cd backend && npm run dev",
      "backend:start": "cd backend && npm start",
      "backend:test": "cd backend && npm test",
      "backend:seed": "cd backend && node seed-data.js",
      "full:dev": "concurrently \"npm run backend:dev\" \"npm run dev\"",
      "full:install": "npm install && cd backend && npm install",
      "full:setup": "npm run full:install && npm run backend:seed",
      "test": "npm run backend:test && npm run test:frontend",
      "test:frontend": "vitest",
      "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
      "lint:fix": "eslint . --ext js,jsx --fix"
    }

    // Add development dependencies
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      "concurrently": "^8.2.2"
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
    log('✅ Updated package.json with management scripts', colors.green)
  }

  // Create backend package.json scripts
  const backendPackageJsonPath = path.join(backendDir, 'package.json')
  if (checkFile(backendPackageJsonPath)) {
    const backendPackageJson = JSON.parse(fs.readFileSync(backendPackageJsonPath, 'utf8'))
    
    backendPackageJson.scripts = {
      ...backendPackageJson.scripts,
      "start": "node src/app.js",
      "dev": "nodemon src/app.js",
      "test": "jest",
      "test:watch": "jest --watch",
      "test:coverage": "jest --coverage",
      "seed": "node seed-data.js",
      "db:reset": "node scripts/reset-database.js",
      "lint": "eslint src/ --ext .js",
      "lint:fix": "eslint src/ --ext .js --fix"
    }

    fs.writeFileSync(backendPackageJsonPath, JSON.stringify(backendPackageJson, null, 2))
    log('✅ Updated backend package.json with management scripts', colors.green)
  }

  // Install concurrently for running both frontend and backend
  log('Installing concurrently for full-stack development...', colors.yellow)
  execCommand('npm install --save-dev concurrently', frontendDir)

  // 4. Create development scripts
  log('\n📝 Creating development scripts...', colors.bright)

  // Create start-dev script
  const startDevScript = `#!/bin/bash

echo "🚀 Starting EduPlatform Development Environment"
echo "=============================================="

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Please start MongoDB first:"
    echo "   - On macOS: brew services start mongodb-community"
    echo "   - On Ubuntu: sudo systemctl start mongod"
    echo "   - On Windows: net start MongoDB"
    exit 1
fi

# Start both frontend and backend
npm run full:dev
`

  fs.writeFileSync(path.join(__dirname, 'start-dev.sh'), startDevScript)
  execCommand('chmod +x start-dev.sh', __dirname)

  // Create Windows batch file
  const startDevBat = `@echo off
echo 🚀 Starting EduPlatform Development Environment
echo ==============================================

REM Check if MongoDB is running (Windows)
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="1" (
    echo ⚠️  MongoDB is not running. Please start MongoDB first:
    echo    net start MongoDB
    exit /b 1
)

REM Start both frontend and backend
npm run full:dev
`

  fs.writeFileSync(path.join(__dirname, 'start-dev.bat'), startDevBat)

  // 5. Create README with setup instructions
  log('\n📚 Creating comprehensive documentation...', colors.bright)

  const readmeContent = `# EduPlatform - Complete Learning Management System

A modern, full-featured Learning Management System built with React, Node.js, Express, and MongoDB.

## 🚀 Features

### Core Learning Features
- **Course Management**: Create, manage, and deliver online courses
- **Assignment System**: Create assignments with file uploads, rubrics, and automated grading
- **Discussion Forums**: Threaded discussions with moderation and search
- **Learning Paths**: Structured course sequences with progress tracking
- **Certificates**: Digital certificates with verification system
- **Real-time Notifications**: Multi-channel notification system

### Advanced Features
- **Video Streaming**: Azure Media Services integration
- **File Management**: Secure file upload and storage with Azure Blob Storage
- **Payment Processing**: Stripe integration for course purchases
- **Analytics Dashboard**: Comprehensive learning analytics
- **Note-taking System**: Rich text notes with course integration
- **Quiz System**: Interactive quizzes with instant feedback

### Technical Features
- **Authentication**: JWT-based auth with Google OAuth support
- **Security**: Rate limiting, input validation, and secure file handling
- **Responsive Design**: Mobile-first responsive UI
- **Real-time Updates**: WebSocket integration for live features
- **API Documentation**: Comprehensive REST API

## 🛠️ Technology Stack

### Frontend
- **React 18** with Hooks and Context API
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication

### Backend
- **Node.js** with Express.js framework
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Multer** for file uploads
- **Nodemailer** for email services
- **Express Rate Limit** for API protection

### Cloud Services
- **Azure Blob Storage** for file storage
- **Azure Media Services** for video streaming
- **Stripe** for payment processing

## 📋 Prerequisites

- Node.js 16 or higher
- MongoDB 4.4 or higher
- npm or yarn package manager

## 🚀 Quick Start

### 1. Clone and Setup
\`\`\`bash
git clone <repository-url>
cd eduplatform
node setup-complete-platform.js
\`\`\`

### 2. Configure Environment Variables

#### Backend (.env)
\`\`\`env
MONGODB_URI=mongodb://localhost:27017/eduplatform
JWT_SECRET=your-super-secret-jwt-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
AZURE_STORAGE_ACCOUNT_NAME=your-storage-account
AZURE_STORAGE_ACCOUNT_KEY=your-storage-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
\`\`\`

#### Frontend (.env)
\`\`\`env
VITE_API_URL=http://localhost:3001/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
\`\`\`

### 3. Install Dependencies and Seed Data
\`\`\`bash
npm run full:setup
\`\`\`

### 4. Start Development Environment
\`\`\`bash
# On macOS/Linux
./start-dev.sh

# On Windows
start-dev.bat

# Or manually
npm run full:dev
\`\`\`

## 📚 API Documentation

The API documentation is available at: \`http://localhost:3001/api/v1/docs\`

### Authentication Endpoints
- \`POST /auth/send-otp\` - Send OTP for authentication
- \`POST /auth/verify-otp\` - Verify OTP and login
- \`POST /auth/register\` - Register with email/password
- \`POST /auth/login\` - Login with email/password
- \`POST /auth/google\` - Google OAuth login

### Course Management
- \`GET /courses\` - Get all courses
- \`GET /courses/:id\` - Get course details
- \`POST /courses\` - Create new course (instructor/admin)
- \`POST /courses/:id/enroll\` - Enroll in course

### Assignment System
- \`GET /assignments/course/:courseId\` - Get course assignments
- \`POST /assignments\` - Create assignment (instructor/admin)
- \`POST /submissions\` - Submit assignment (student)
- \`PUT /submissions/:id/grade\` - Grade submission (instructor/admin)

### Discussion Forums
- \`GET /discussions/course/:courseId\` - Get course discussions
- \`POST /discussions\` - Create discussion
- \`POST /replies\` - Reply to discussion
- \`POST /replies/:id/vote\` - Vote on reply

### Learning Paths
- \`GET /learning-paths\` - Get all learning paths
- \`POST /learning-paths/:id/enroll\` - Enroll in learning path
- \`GET /learning-paths/:id/progress\` - Get progress

### Certificates
- \`GET /certificates/my\` - Get user certificates
- \`POST /certificates/issue\` - Issue certificate (instructor/admin)
- \`GET /certificates/verify/:number\` - Verify certificate (public)

## 🔧 Development Scripts

### Frontend
\`\`\`bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
\`\`\`

### Backend
\`\`\`bash
npm run backend:dev     # Start backend in development mode
npm run backend:start   # Start backend in production mode
npm run backend:test    # Run backend tests
npm run backend:seed    # Seed database with sample data
\`\`\`

### Full Stack
\`\`\`bash
npm run full:dev        # Start both frontend and backend
npm run full:install    # Install all dependencies
npm run full:setup      # Full setup with seeding
\`\`\`

## 🧪 Testing

### Backend Tests
\`\`\`bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
\`\`\`

### Frontend Tests
\`\`\`bash
npm run test          # Run frontend tests
\`\`\`

## 🚀 Deployment

### Environment Setup
1. Set up MongoDB Atlas or self-hosted MongoDB
2. Configure Azure Storage and Media Services
3. Set up Stripe account for payments
4. Configure email service (Gmail, SendGrid, etc.)

### Production Build
\`\`\`bash
# Build frontend
npm run build

# Start backend in production
cd backend
NODE_ENV=production npm start
\`\`\`

### Docker Deployment
\`\`\`bash
# Build and run with Docker Compose
docker-compose up --build
\`\`\`

## 🔐 Default Login Credentials

After running the seed script, you can use these credentials:

### Admin
- Email: admin@eduplatform.com
- Password: password123

### Instructors
- Email: sarah.johnson@eduplatform.com
- Password: password123
- Email: michael.chen@eduplatform.com
- Password: password123

### Students
- Email: alice.smith@student.com
- Password: password123
- Email: bob.wilson@student.com
- Password: password123
- Email: emma.davis@student.com
- Password: password123

## 📁 Project Structure

\`\`\`
eduplatform/
├── backend/                 # Backend API server
│   ├── src/
│   │   ├── config/         # Database and service configurations
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Custom middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic services
│   │   └── utils/          # Utility functions
│   ├── tests/              # Backend tests
│   └── package.json
├── src/                    # Frontend React application
│   ├── components/         # Reusable components
│   ├── contexts/          # React contexts
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── utils/             # Utility functions
├── public/                # Static assets
├── docs/                  # Documentation
└── package.json
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (\`git checkout -b feature/amazing-feature\`)
3. Commit your changes (\`git commit -m 'Add amazing feature'\`)
4. Push to the branch (\`git push origin feature/amazing-feature\`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation in the \`docs/\` folder
- Review the API documentation at \`/api/v1/docs\`

## 🔄 Updates and Roadmap

### Current Version: 1.0.0
- ✅ Complete course management system
- ✅ Assignment and submission system
- ✅ Discussion forums with threading
- ✅ Learning paths and progress tracking
- ✅ Certificate generation and verification
- ✅ Real-time notifications
- ✅ File upload and management
- ✅ Payment processing integration
- ✅ Comprehensive analytics

### Upcoming Features
- 🔄 Mobile application (React Native)
- 🔄 Advanced video conferencing integration
- 🔄 AI-powered content recommendations
- 🔄 Advanced proctoring system
- 🔄 Multi-language support
- 🔄 Advanced reporting and analytics
- 🔄 Integration with external LTI tools
`

  fs.writeFileSync(path.join(__dirname, 'README.md'), readmeContent)

  // 6. Final setup steps
  log('\n🎯 Final Setup Steps...', colors.bright)

  // Create logs directory for backend
  const logsDir = path.join(backendDir, 'logs')
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
    log('✅ Created logs directory', colors.green)
  }

  // Create uploads directory for backend
  const uploadsDir = path.join(backendDir, 'uploads')
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
    log('✅ Created uploads directory', colors.green)
  }

  log('\n🎉 Setup Complete!', colors.bright)
  log('=' .repeat(50), colors.green)
  
  log('\n📋 Next Steps:', colors.bright)
  log('1. Start MongoDB:', colors.yellow)
  log('   - macOS: brew services start mongodb-community', colors.cyan)
  log('   - Ubuntu: sudo systemctl start mongod', colors.cyan)
  log('   - Windows: net start MongoDB', colors.cyan)
  
  log('\n2. Configure environment variables in .env files', colors.yellow)
  
  log('\n3. Seed the database with sample data:', colors.yellow)
  log('   npm run backend:seed', colors.cyan)
  
  log('\n4. Start the development environment:', colors.yellow)
  log('   ./start-dev.sh (macOS/Linux)', colors.cyan)
  log('   start-dev.bat (Windows)', colors.cyan)
  log('   OR npm run full:dev', colors.cyan)
  
  log('\n🌐 Access Points:', colors.bright)
  log('   Frontend: http://localhost:3000', colors.green)
  log('   Backend API: http://localhost:3001', colors.green)
  log('   API Docs: http://localhost:3001/api/v1/docs', colors.green)
  log('   Health Check: http://localhost:3001/health', colors.green)
  
  log('\n🔑 Default Login (after seeding):', colors.bright)
  log('   Admin: admin@eduplatform.com / password123', colors.magenta)
  log('   Instructor: sarah.johnson@eduplatform.com / password123', colors.magenta)
  log('   Student: alice.smith@student.com / password123', colors.magenta)
  
  log('\n📚 Documentation:', colors.bright)
  log('   - README.md for detailed setup instructions', colors.cyan)
  log('   - API documentation at /api/v1/docs', colors.cyan)
  log('   - Check .env.example files for configuration options', colors.cyan)
  
  log('\n✨ Happy coding!', colors.green)
}

main().catch(error => {
  log(`❌ Setup failed: ${error.message}`, colors.red)
  process.exit(1)
})