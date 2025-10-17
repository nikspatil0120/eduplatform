# Deployment Guide: Vercel + Railway

This guide covers deploying your EduPlatform using Vercel for the frontend and Railway for the backend.

## 🚀 Quick Deployment Steps

### 1. Frontend Deployment (Vercel)

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Connect your GitHub repository
   - Import your project

2. **Configure Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Environment Variables:**
   ```
   VITE_API_BASE_URL=https://your-railway-backend.railway.app/api/v1
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
   ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically build and deploy your React app

### 2. Backend Deployment (Railway)

1. **Connect to Railway:**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub repository
   - Select the `backend` folder as root

2. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   EMAILJS_SERVICE_ID=your_emailjs_service
   EMAILJS_TEMPLATE_ID=your_emailjs_template
   EMAILJS_PUBLIC_KEY=your_emailjs_public_key
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

3. **Deploy:**
   - Railway will automatically detect Node.js
   - It will run `npm install` and `npm start`
   - Your backend will be available at `https://your-app.railway.app`

## 🔧 Configuration Files

### Frontend (vercel.json)
```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

### Backend (railway.json)
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/v1/system/health"
  }
}
```

## 🌐 Domain Setup

### Custom Domain (Optional)
1. **Vercel:** Add your domain in Vercel dashboard
2. **Railway:** Add custom domain in Railway dashboard
3. **Update CORS:** Update backend CORS settings to include your domains

## 📊 Monitoring

### Vercel Analytics
- Automatic performance monitoring
- Real-time visitor analytics
- Core Web Vitals tracking

### Railway Metrics
- CPU and memory usage
- Request metrics
- Error tracking

## 🔒 Security Checklist

- [ ] Environment variables are set correctly
- [ ] CORS is configured for your domains
- [ ] JWT secrets are secure
- [ ] API keys are not exposed in frontend
- [ ] HTTPS is enabled (automatic on both platforms)

## 🚨 Troubleshooting

### Common Issues:

1. **API Connection Failed:**
   - Check `VITE_API_BASE_URL` in Vercel
   - Ensure Railway backend is running
   - Verify CORS settings

2. **Build Failures:**
   - Check build logs in Vercel/Railway
   - Ensure all dependencies are in package.json
   - Verify Node.js version compatibility

3. **Environment Variables:**
   - Double-check all required env vars are set
   - Restart deployments after env changes

## 💰 Cost Estimation

### Vercel (Frontend)
- **Hobby Plan:** Free
- **Pro Plan:** $20/month (if needed)

### Railway (Backend)
- **Free Tier:** $0 (limited hours)
- **Developer Plan:** $5/month
- **Team Plan:** $20/month

### Total Monthly Cost: $5-25/month

## 📝 Next Steps

1. Deploy frontend to Vercel
2. Deploy backend to Railway
3. Update environment variables
4. Test the deployed application
5. Set up custom domains (optional)
6. Configure monitoring and alerts

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Railway Documentation](https://docs.railway.app)
- [MongoDB Atlas](https://www.mongodb.com/atlas) (for database)
- [Cloudinary](https://cloudinary.com) (for file storage)