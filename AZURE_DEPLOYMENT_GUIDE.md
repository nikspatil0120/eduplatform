# 🚀 Azure Deployment Guide for EduPlatform

## Overview
This guide will help you deploy your e-learning platform to Azure using:
- **Azure Static Web Apps** (Frontend)
- **Azure App Service** (Backend API)
- **Azure Application Insights** (Monitoring)

## Prerequisites
- Azure account with active subscription
- Azure CLI installed
- Git repository (GitHub/Azure DevOps)

## 🎯 Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Azure Static  │    │   Azure App      │    │   External      │
│   Web Apps      │───▶│   Service        │───▶│   Services      │
│   (Frontend)    │    │   (Backend)      │    │   - MongoDB     │
└─────────────────┘    └──────────────────┘    │   - Cloudinary  │
                                               │   - EmailJS     │
                                               │   - Google OAuth│
                                               └─────────────────┘
```

## 📋 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. **Push your code to GitHub** (if not already done)
2. **Create production environment files**

### Step 2: Deploy Backend to Azure App Service

#### 2.1 Create App Service via Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → "Web App"
3. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: Create new "eduplatform-rg"
   - **Name**: "eduplatform-api" (must be globally unique)
   - **Runtime**: Node.js 18 LTS
   - **Region**: Choose closest to your users
   - **Pricing**: B1 Basic (or F1 Free for testing)

#### 2.2 Configure App Service Settings

1. Go to your App Service → **Configuration** → **Application Settings**
2. Add these environment variables:

```
MONGODB_URI=mongodb+srv://eduplatform07_db_user:Eduplatform%40123@cluster0.odqpm2q.mongodb.net/eduplatform?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secret-jwt-key-here-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here-production
NODE_ENV=production
PORT=8080
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
CLOUDINARY_CLOUD_NAME=dm0fc6dvv
CLOUDINARY_API_KEY=818788848452475
CLOUDINARY_API_SECRET=_deYcgh_tIaGqRMFjjnMPmBFSTE
CLOUDINARY_URL=cloudinary://818788848452475:_deYcgh_tIaGqRMFjjnMPmBFSTE@dm0fc6dvv
EMAIL_ENABLED=false
WEBSITE_NODE_DEFAULT_VERSION=18.17.0
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

#### 2.3 Deploy Backend Code

**Option A: GitHub Actions (Recommended)**
1. Go to App Service → **Deployment Center**
2. Choose **GitHub** as source
3. Authorize and select your repository
4. Choose **GitHub Actions** as build provider
5. Select the `backend` folder as the app location

**Option B: Local Git Deploy**
1. Enable local Git in Deployment Center
2. Add Azure remote to your backend folder
3. Push to Azure

### Step 3: Deploy Frontend to Azure Static Web Apps

#### 3.1 Create Static Web App

1. Go to Azure Portal → "Create a resource" → "Static Web App"
2. Configure:
   - **Subscription**: Your subscription
   - **Resource Group**: "eduplatform-rg" (same as backend)
   - **Name**: "eduplatform-frontend"
   - **Plan**: Free
   - **Region**: Same as backend
   - **Source**: GitHub
   - **Repository**: Your repository
   - **Branch**: main/master
   - **Build Presets**: React
   - **App location**: `/` (root)
   - **Output location**: `dist`

#### 3.2 Configure Frontend Environment

1. Go to Static Web App → **Configuration**
2. Add these application settings:

```
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_EMAILJS_SERVICE_ID=service_h4ey4l6
VITE_EMAILJS_TEMPLATE_ID=template_my3fvtb
VITE_EMAILJS_PUBLIC_KEY=DKxX8RU5LXOB9QoZj
VITE_API_BASE_URL=https://eduplatform-api.azurewebsites.net/api/v1
VITE_APP_NAME=EduPlatform
VITE_APP_VERSION=1.0.0
```

### Step 4: Configure Custom Domain (Optional)

#### 4.1 For Static Web App (Frontend)
1. Go to Static Web App → **Custom domains**
2. Add your domain (e.g., `www.yourdomain.com`)
3. Follow DNS configuration instructions

#### 4.2 For App Service (Backend)
1. Go to App Service → **Custom domains**
2. Add your API domain (e.g., `api.yourdomain.com`)
3. Configure SSL certificate

### Step 5: Set Up Monitoring

#### 5.1 Enable Application Insights
1. Go to App Service → **Application Insights**
2. Enable Application Insights
3. Create new resource or use existing

#### 5.2 Configure Alerts
1. Set up alerts for:
   - High response times
   - Error rates
   - Resource usage

## 🔧 Production Configuration Files

### Backend Production Settings
Update your backend for production readiness:

1. **CORS Configuration**: Update allowed origins
2. **Security Headers**: Add helmet.js
3. **Rate Limiting**: Implement rate limiting
4. **Logging**: Configure structured logging

### Frontend Production Settings
1. **API URLs**: Point to production backend
2. **Error Handling**: Add production error boundaries
3. **Analytics**: Add Google Analytics (optional)

## 🚨 Security Checklist

- [ ] Change all default secrets and keys
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Enable Application Insights
- [ ] Configure backup strategy
- [ ] Set up monitoring alerts
- [ ] Review and rotate API keys

## 📊 Cost Estimation

### Free Tier (Development/Testing)
- **Static Web App**: Free (100GB bandwidth/month)
- **App Service**: F1 Free (1GB RAM, 1GB storage)
- **Application Insights**: Free (1GB data/month)
- **Total**: $0/month

### Basic Production
- **Static Web App**: Free
- **App Service**: B1 Basic (~$13/month)
- **Application Insights**: Pay-as-you-go (~$2-5/month)
- **Total**: ~$15-18/month

### Recommended Production
- **Static Web App**: Standard (~$9/month)
- **App Service**: S1 Standard (~$73/month)
- **Application Insights**: Pay-as-you-go (~$5-10/month)
- **Total**: ~$87-92/month

## 🔄 CI/CD Pipeline

The deployment will automatically set up GitHub Actions for:
- **Frontend**: Builds and deploys on every push to main
- **Backend**: Builds and deploys on every push to main
- **Environment**: Separate staging and production environments

## 🆘 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Check Application Insights logs
   - Verify environment variables
   - Check Node.js version compatibility

2. **Frontend can't connect to backend**
   - Verify VITE_API_BASE_URL
   - Check CORS configuration
   - Verify backend is running

3. **Database connection issues**
   - Check MongoDB Atlas IP whitelist
   - Verify connection string
   - Check network security groups

### Useful Commands

```bash
# Check App Service logs
az webapp log tail --name eduplatform-api --resource-group eduplatform-rg

# Restart App Service
az webapp restart --name eduplatform-api --resource-group eduplatform-rg

# Check Static Web App status
az staticwebapp show --name eduplatform-frontend --resource-group eduplatform-rg
```

## 📞 Support

- **Azure Documentation**: https://docs.microsoft.com/azure/
- **Azure Support**: Create support ticket in Azure Portal
- **Community**: Stack Overflow with `azure` tag

---

🎉 **Congratulations!** Your EduPlatform is now running on Azure!

Access your platform at:
- **Frontend**: https://eduplatform-frontend.azurestaticapps.net
- **Backend**: https://eduplatform-api.azurewebsites.net