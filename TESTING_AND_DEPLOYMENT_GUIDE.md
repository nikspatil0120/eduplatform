# 🧪 EduPlatform - Testing & Deployment Guide

## 📋 **COMPREHENSIVE TESTING GUIDE**

### **🚀 Quick Start Testing**

#### **1. Environment Setup**
```bash
# Clone and setup the project
git clone <your-repo>
cd eduplatform

# Run the complete setup
node setup-complete-platform.js

# Install dependencies
npm run full:install

# Configure environment variables
# Edit backend/.env and .env files with your credentials

# Seed the database with test data
npm run backend:seed

# Start development environment
npm run full:dev
```

#### **2. Access Points**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/v1/docs
- **Health Check**: http://localhost:3001/health

---

## 🔧 **BACKEND TESTING**

### **API Endpoint Testing**

#### **Authentication Endpoints**
```bash
# Test user registration
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Test user login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Test OTP authentication
curl -X POST http://localhost:3001/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

#### **Course Management**
```bash
# Get all courses
curl -X GET http://localhost:3001/api/v1/courses \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get course by ID
curl -X GET http://localhost:3001/api/v1/courses/COURSE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Enroll in course
curl -X POST http://localhost:3001/api/v1/courses/COURSE_ID/enroll \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### **Assignment System**
```bash
# Get course assignments
curl -X GET http://localhost:3001/api/v1/assignments/course/COURSE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Submit assignment
curl -X POST http://localhost:3001/api/v1/submissions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "assignmentId": "ASSIGNMENT_ID",
    "submissionText": "My assignment submission"
  }'
```

#### **Discussion Forums**
```bash
# Get course discussions
curl -X GET http://localhost:3001/api/v1/discussions/course/COURSE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create discussion
curl -X POST http://localhost:3001/api/v1/discussions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Discussion",
    "description": "This is a test discussion",
    "courseId": "COURSE_ID",
    "type": "question"
  }'
```

#### **Real-time Chat**
```bash
# Get chat messages
curl -X GET http://localhost:3001/api/v1/chat/messages/COURSE_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send chat message
curl -X POST http://localhost:3001/api/v1/chat/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": "COURSE_ID",
    "content": "Hello, this is a test message!"
  }'
```

### **Database Testing**

#### **Test Database Connection**
```bash
cd backend
node test-database.js
```

#### **Test Email Service**
```bash
cd backend
node test-email.js
```

#### **Test Azure Storage**
```bash
cd backend
node test-azure-storage.js
```

### **System Health Testing**

#### **Health Check**
```bash
curl -X GET http://localhost:3001/health
```

#### **System Statistics (Admin)**
```bash
curl -X GET http://localhost:3001/api/v1/system/stats \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

#### **Real-time Service Status**
```bash
curl -X GET http://localhost:3001/api/v1/system/realtime/stats \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## 🎨 **FRONTEND TESTING**

### **Manual Testing Checklist**

#### **Authentication Flow**
- [ ] User registration with email/password
- [ ] User login with email/password
- [ ] Google OAuth login
- [ ] OTP-based authentication
- [ ] Password reset functionality
- [ ] Email verification

#### **Course Management**
- [ ] Browse course catalog
- [ ] Search and filter courses
- [ ] View course details
- [ ] Enroll in courses
- [ ] Track course progress
- [ ] Access course materials

#### **Assignment System**
- [ ] View course assignments
- [ ] Submit assignments with files
- [ ] View assignment feedback
- [ ] Check assignment grades
- [ ] Assignment due date reminders

#### **Discussion Forums**
- [ ] Create new discussions
- [ ] Reply to discussions
- [ ] Vote on replies
- [ ] Search discussions
- [ ] Mark solutions

#### **Real-time Features**
- [ ] Receive real-time notifications
- [ ] Chat in course rooms
- [ ] See typing indicators
- [ ] Add message reactions
- [ ] Real-time assignment updates

#### **Learning Paths**
- [ ] Browse learning paths
- [ ] Enroll in learning paths
- [ ] Track progress across paths
- [ ] Complete courses in sequence

#### **Certificates**
- [ ] View earned certificates
- [ ] Download certificate PDFs
- [ ] Verify certificates publicly

### **Browser Testing**

#### **Supported Browsers**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### **Mobile Testing**
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Responsive design
- [ ] Touch interactions

### **Performance Testing**

#### **Page Load Times**
```bash
# Use Lighthouse for performance testing
npm install -g lighthouse

# Test homepage
lighthouse http://localhost:3000 --output html --output-path ./lighthouse-report.html

# Test course page
lighthouse http://localhost:3000/courses/COURSE_ID --output html --output-path ./course-lighthouse.html
```

#### **Bundle Size Analysis**
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist
```

---

## 🔒 **SECURITY TESTING**

### **Authentication Security**
- [ ] JWT token expiration
- [ ] Refresh token rotation
- [ ] Password strength validation
- [ ] Rate limiting on auth endpoints
- [ ] CSRF protection

### **API Security**
- [ ] Input validation
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Rate limiting
- [ ] CORS configuration

### **File Upload Security**
- [ ] File type validation
- [ ] File size limits
- [ ] Malware scanning (if implemented)
- [ ] Secure file storage

### **Data Protection**
- [ ] Sensitive data encryption
- [ ] Secure headers
- [ ] HTTPS enforcement
- [ ] Data sanitization

---

## 🚀 **DEPLOYMENT GUIDE**

### **🔧 Pre-deployment Checklist**

#### **Environment Configuration**
- [ ] Production environment variables configured
- [ ] Database connection strings updated
- [ ] Azure services configured
- [ ] Email service configured
- [ ] Payment gateway configured
- [ ] Domain and SSL certificates ready

#### **Security Configuration**
- [ ] Strong JWT secrets
- [ ] Secure database passwords
- [ ] API keys secured
- [ ] CORS origins configured
- [ ] Rate limiting configured

#### **Performance Optimization**
- [ ] Database indexes created
- [ ] CDN configured
- [ ] Caching strategy implemented
- [ ] Bundle optimization completed

### **🌐 Azure Deployment**

#### **1. Azure Resources Setup**

```bash
# Login to Azure
az login

# Create resource group
az group create --name eduplatform-rg --location "East US"

# Create App Service Plan
az appservice plan create \
  --name eduplatform-plan \
  --resource-group eduplatform-rg \
  --sku B1 \
  --is-linux

# Create Web App for Backend
az webapp create \
  --resource-group eduplatform-rg \
  --plan eduplatform-plan \
  --name eduplatform-backend \
  --runtime "NODE|18-lts"

# Create Static Web App for Frontend
az staticwebapp create \
  --name eduplatform-frontend \
  --resource-group eduplatform-rg \
  --source https://github.com/YOUR_USERNAME/eduplatform \
  --branch main \
  --app-location "/" \
  --api-location "backend" \
  --output-location "dist"
```

#### **2. Database Setup**

```bash
# Create Cosmos DB account
az cosmosdb create \
  --resource-group eduplatform-rg \
  --name eduplatform-cosmos \
  --kind MongoDB \
  --locations regionName="East US" failoverPriority=0 isZoneRedundant=False

# Get connection string
az cosmosdb keys list \
  --resource-group eduplatform-rg \
  --name eduplatform-cosmos \
  --type connection-strings
```

#### **3. Storage Setup**

```bash
# Create storage account
az storage account create \
  --name eduplatformstorage \
  --resource-group eduplatform-rg \
  --location "East US" \
  --sku Standard_LRS

# Create blob container
az storage container create \
  --name eduplatform-files \
  --account-name eduplatformstorage \
  --public-access off
```

#### **4. Application Configuration**

```bash
# Configure backend app settings
az webapp config appsettings set \
  --resource-group eduplatform-rg \
  --name eduplatform-backend \
  --settings \
    NODE_ENV=production \
    MONGODB_URI="YOUR_COSMOS_CONNECTION_STRING" \
    JWT_SECRET="YOUR_PRODUCTION_JWT_SECRET" \
    AZURE_STORAGE_ACCOUNT_NAME="eduplatformstorage" \
    AZURE_STORAGE_ACCOUNT_KEY="YOUR_STORAGE_KEY"
```

#### **5. Deploy Backend**

```bash
# Build and deploy backend
cd backend
npm run build
az webapp deployment source config-zip \
  --resource-group eduplatform-rg \
  --name eduplatform-backend \
  --src backend.zip
```

#### **6. Deploy Frontend**

```bash
# Build frontend
npm run build

# Deploy to Static Web App (automatic via GitHub Actions)
# Or manual deployment:
az staticwebapp environment set \
  --name eduplatform-frontend \
  --environment-name default \
  --source dist/
```

### **🐳 Docker Deployment**

#### **1. Create Docker Files**

**Backend Dockerfile:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### **2. Docker Compose**

```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/eduplatform
    depends_on:
      - mongo
    
  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend
    
  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

volumes:
  mongo_data:
```

#### **3. Deploy with Docker**

```bash
# Build and run
docker-compose up -d

# Scale services
docker-compose up -d --scale backend=3

# View logs
docker-compose logs -f backend
```

### **☁️ Alternative Deployment Options**

#### **Vercel Deployment**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy frontend
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### **Netlify Deployment**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

#### **Heroku Deployment**
```bash
# Install Heroku CLI
# Create Heroku apps
heroku create eduplatform-backend
heroku create eduplatform-frontend

# Deploy backend
cd backend
git push heroku main

# Deploy frontend
cd ..
heroku buildpacks:set https://github.com/heroku/heroku-buildpack-static
git push heroku main
```

---

## 📊 **MONITORING & MAINTENANCE**

### **Health Monitoring**

#### **System Health Checks**
```bash
# Automated health check script
#!/bin/bash
BACKEND_URL="https://your-backend.azurewebsites.net"
FRONTEND_URL="https://your-frontend.azurestaticapps.net"

# Check backend health
curl -f $BACKEND_URL/health || echo "Backend is down!"

# Check frontend
curl -f $FRONTEND_URL || echo "Frontend is down!"

# Check database connectivity
curl -f $BACKEND_URL/api/v1/system/stats || echo "Database issues!"
```

#### **Performance Monitoring**
- Set up Application Insights for Azure
- Configure error tracking with Sentry
- Monitor API response times
- Track user engagement metrics

### **Backup Strategy**

#### **Database Backup**
```bash
# MongoDB backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="YOUR_MONGODB_URI" --out="/backups/backup_$DATE"
```

#### **File Storage Backup**
```bash
# Azure Blob Storage backup
az storage blob download-batch \
  --destination ./backups/files \
  --source eduplatform-files \
  --account-name eduplatformstorage
```

### **Maintenance Tasks**

#### **Regular Maintenance**
- [ ] Update dependencies monthly
- [ ] Review and rotate API keys quarterly
- [ ] Clean up old files and logs
- [ ] Monitor database performance
- [ ] Review user feedback and bug reports

#### **Security Updates**
- [ ] Apply security patches promptly
- [ ] Review access logs regularly
- [ ] Update SSL certificates
- [ ] Audit user permissions

---

## 🔍 **TROUBLESHOOTING**

### **Common Issues**

#### **Backend Issues**
```bash
# Check backend logs
docker logs eduplatform-backend

# Check database connection
node backend/test-database.js

# Check environment variables
printenv | grep -E "(MONGODB|JWT|AZURE)"
```

#### **Frontend Issues**
```bash
# Check build errors
npm run build

# Check console errors in browser
# Open Developer Tools > Console

# Check network requests
# Open Developer Tools > Network
```

#### **Real-time Issues**
```bash
# Check WebSocket connection
# In browser console:
# Check if socket.io is connecting properly

# Check SignalR connection
# Verify Azure SignalR service is running
```

### **Performance Issues**

#### **Database Optimization**
```javascript
// Add database indexes
db.users.createIndex({ email: 1 })
db.courses.createIndex({ category: 1, isPublished: 1 })
db.assignments.createIndex({ courseId: 1, dueDate: 1 })
db.discussions.createIndex({ courseId: 1, createdAt: -1 })
```

#### **Caching Strategy**
```javascript
// Implement Redis caching for frequently accessed data
const redis = require('redis')
const client = redis.createClient()

// Cache course data
const getCourse = async (courseId) => {
  const cached = await client.get(`course:${courseId}`)
  if (cached) return JSON.parse(cached)
  
  const course = await Course.findById(courseId)
  await client.setex(`course:${courseId}`, 3600, JSON.stringify(course))
  return course
}
```

---

## 🎯 **SUCCESS METRICS**

### **Technical Metrics**
- [ ] API response time < 200ms
- [ ] Page load time < 2 seconds
- [ ] 99.9% uptime
- [ ] Zero critical security vulnerabilities
- [ ] Real-time message delivery < 100ms

### **Business Metrics**
- [ ] User registration rate
- [ ] Course completion rate
- [ ] User engagement time
- [ ] Revenue per user
- [ ] Customer satisfaction score

### **Performance Benchmarks**
- [ ] Support 10,000+ concurrent users
- [ ] Handle 1M+ API requests per day
- [ ] Store 100GB+ of user content
- [ ] Process 10,000+ real-time messages per minute

---

**🎉 Congratulations! Your EduPlatform is now fully tested and ready for production deployment!**

This comprehensive testing and deployment guide ensures your platform is robust, secure, and scalable for real-world usage. ✨