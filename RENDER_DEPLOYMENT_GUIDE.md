# 🚀 Render Deployment Guide for EduPlatform

## 📋 Prerequisites

- GitHub repository: `https://github.com/nikspatil0120/eduplatform.git`
- MongoDB Atlas database
- Cloudinary account
- Google OAuth credentials

## 🔧 Backend Deployment on Render

### Step 1: Create New Web Service

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New +" → "Web Service"**
3. **Connect GitHub repository**: `nikspatil0120/eduplatform`

### Step 2: Configure Service Settings

```yaml
Name: eduplatform-backend
Environment: Node
Region: Singapore (or closest to your users)
Branch: main
Root Directory: backend
Build Command: npm ci
Start Command: npm start
```

### Step 3: Environment Variables

Add these environment variables in Render dashboard:

```bash
# Required Variables
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/eduplatform?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here-change-this-in-production

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Email (Optional)
EMAIL_ENABLED=false
EMAIL_FROM=noreply@eduplatform.com

# API Configuration
API_VERSION=v1
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Step 4: Advanced Settings

```yaml
Health Check Path: /health
Auto-Deploy: Yes
```

## 🌐 Frontend Deployment on Vercel

### Step 1: Connect Repository

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. **Import Project** → Connect GitHub → Select `nikspatil0120/eduplatform`

### Step 2: Configure Build Settings

```yaml
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### Step 3: Environment Variables

```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_EMAILJS_SERVICE_ID=your-emailjs-service-id
VITE_EMAILJS_TEMPLATE_ID=your-emailjs-template-id
VITE_EMAILJS_PUBLIC_KEY=your-emailjs-public-key
VITE_API_BASE_URL=https://your-render-backend-url.onrender.com/api/v1
VITE_APP_NAME=EduPlatform
VITE_APP_VERSION=1.0.0
```

## 🔒 Security Best Practices

### 1. Environment Variables
- ✅ **Never commit .env files** to repository
- ✅ **Use strong JWT secrets** (generate with crypto.randomBytes(64).toString('hex'))
- ✅ **Rotate secrets regularly**

### 2. Database Security
- ✅ **Use MongoDB Atlas** with IP whitelisting
- ✅ **Create dedicated database user** with minimal permissions
- ✅ **Enable database encryption**

### 3. API Security
- ✅ **Enable CORS** with specific origins
- ✅ **Use rate limiting**
- ✅ **Implement proper authentication**

## 📊 Monitoring & Health Checks

### Backend Health Check
```
GET https://your-backend.onrender.com/health
```

### System Health Check
```
GET https://your-backend.onrender.com/api/v1/system/health
```

### API Documentation
```
GET https://your-backend.onrender.com/api/v1/docs
```

## 🚀 Deployment URLs

After successful deployment:

- **Backend**: `https://eduplatform-backend-xxxx.onrender.com`
- **Frontend**: `https://eduplatform-xxxx.vercel.app`
- **API Docs**: `https://eduplatform-backend-xxxx.onrender.com/api/v1/docs`

## 🔧 Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Check build logs for specific errors

2. **Environment Variable Issues**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify MongoDB connection string format

3. **CORS Issues**
   - Update FRONTEND_URL in backend environment
   - Check CORS configuration in backend/src/app.js

### Debug Commands

```bash
# Check backend health
curl https://your-backend.onrender.com/health

# Check API documentation
curl https://your-backend.onrender.com/api/v1/docs

# Test authentication
curl -X POST https://your-backend.onrender.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## 📈 Performance Optimization

### Backend (Render)
- Use **Starter plan** for better performance
- Enable **persistent storage** if needed
- Monitor **resource usage**

### Frontend (Vercel)
- Enable **Edge Functions** for better performance
- Use **Image Optimization**
- Enable **Analytics**

## 🎯 Next Steps

1. **Deploy backend** to Render
2. **Deploy frontend** to Vercel
3. **Update environment variables**
4. **Test all functionality**
5. **Set up monitoring**
6. **Configure custom domains** (optional)

Your EduPlatform will be live and ready for users! 🎉