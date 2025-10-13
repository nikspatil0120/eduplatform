# 🚀 EduPlatform Deployment Guide

This guide will help you deploy the complete EduPlatform to Azure with all services configured.

## 📋 Prerequisites

### Required Tools
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) (optional)

### Required Accounts
- [Azure Subscription](https://azure.microsoft.com/free/)
- [Stripe Account](https://stripe.com/)
- [SendGrid Account](https://sendgrid.com/)
- [Google Cloud Console](https://console.cloud.google.com/) (for OAuth)

---

## 🏗️ Phase 1: Azure Infrastructure Setup

### 1. Login to Azure
```bash
az login
az account set --subscription "your-subscription-id"
```

### 2. Create Resource Group
```bash
az group create \
  --name eduplatform-rg \
  --location eastus
```

### 3. Create Azure Cosmos DB (MongoDB API)
```bash
az cosmosdb create \
  --name eduplatform-cosmos \
  --resource-group eduplatform-rg \
  --kind MongoDB \
  --locations regionName=eastus failoverPriority=0 isZoneRedundant=False \
  --default-consistency-level Session \
  --enable-automatic-failover true
```

### 4. Create Storage Account
```bash
az storage account create \
  --name eduplatformstorage \
  --resource-group eduplatform-rg \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2
```

### 5. Create App Service Plan
```bash
az appservice plan create \
  --name eduplatform-plan \
  --resource-group eduplatform-rg \
  --sku B2 \
  --is-linux
```

### 6. Create Backend App Service
```bash
az webapp create \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --plan eduplatform-plan \
  --runtime "NODE|18-lts"
```

### 7. Create Static Web App (Frontend)
```bash
az staticwebapp create \
  --name eduplatform-web \
  --resource-group eduplatform-rg \
  --source https://github.com/yourusername/eduplatform \
  --branch main \
  --app-location "/" \
  --output-location "dist"
```

### 8. Create Azure Media Services (Optional)
```bash
az ams account create \
  --name eduplatformmedia \
  --resource-group eduplatform-rg \
  --storage-account eduplatformstorage \
  --location eastus
```

### 9. Create SignalR Service
```bash
az signalr create \
  --name eduplatform-signalr \
  --resource-group eduplatform-rg \
  --sku Standard_S1 \
  --service-mode Default
```

---

## 🔧 Phase 2: Configuration

### 1. Get Connection Strings
```bash
# Cosmos DB Connection String
az cosmosdb keys list \
  --name eduplatform-cosmos \
  --resource-group eduplatform-rg \
  --type connection-strings

# Storage Account Connection String
az storage account show-connection-string \
  --name eduplatformstorage \
  --resource-group eduplatform-rg

# SignalR Connection String
az signalr key list \
  --name eduplatform-signalr \
  --resource-group eduplatform-rg
```

### 2. Configure App Service Settings
```bash
az webapp config appsettings set \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --settings \
    NODE_ENV=production \
    PORT=8000 \
    MONGODB_URI="your-cosmos-connection-string" \
    JWT_SECRET="your-super-secret-jwt-key" \
    AZURE_STORAGE_CONNECTION_STRING="your-storage-connection-string" \
    AZURE_SIGNALR_CONNECTION_STRING="your-signalr-connection-string" \
    STRIPE_SECRET_KEY="your-stripe-secret-key" \
    SENDGRID_API_KEY="your-sendgrid-api-key" \
    GOOGLE_CLIENT_ID="your-google-client-id" \
    GOOGLE_CLIENT_SECRET="your-google-client-secret" \
    FRONTEND_URL="https://eduplatform-web.azurestaticapps.net"
```

---

## 📦 Phase 3: Backend Deployment

### Option A: Deploy via Azure CLI
```bash
# Build and deploy backend
cd backend
npm run build
zip -r ../backend.zip .
az webapp deployment source config-zip \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --src ../backend.zip
```

### Option B: Deploy via GitHub Actions
1. Fork the repository
2. Set up GitHub secrets:
   - `AZURE_CREDENTIALS`
   - `AZURE_WEBAPP_PUBLISH_PROFILE`
3. Push to main branch to trigger deployment

### Option C: Deploy via Docker
```bash
# Build Docker image
docker build -t eduplatform-backend .

# Tag for Azure Container Registry
docker tag eduplatform-backend eduplatform.azurecr.io/backend:latest

# Push to registry
docker push eduplatform.azurecr.io/backend:latest

# Deploy to App Service
az webapp config container set \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --docker-custom-image-name eduplatform.azurecr.io/backend:latest
```

---

## 🌐 Phase 4: Frontend Deployment

### Option A: Automatic Deployment (Recommended)
Static Web Apps automatically deploys from your GitHub repository when you push to the main branch.

### Option B: Manual Deployment
```bash
# Build frontend
npm run build

# Deploy to Static Web Apps
az staticwebapp environment set \
  --name eduplatform-web \
  --environment-name default \
  --source dist/
```

---

## 🔐 Phase 5: Security Configuration

### 1. Configure CORS
```bash
az webapp cors add \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --allowed-origins "https://eduplatform-web.azurestaticapps.net"
```

### 2. Enable HTTPS Only
```bash
az webapp update \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --https-only true
```

### 3. Configure Custom Domain (Optional)
```bash
# Add custom domain
az webapp config hostname add \
  --webapp-name eduplatform-api \
  --resource-group eduplatform-rg \
  --hostname api.yourdomain.com

# Enable SSL
az webapp config ssl bind \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --certificate-thumbprint your-cert-thumbprint \
  --ssl-type SNI
```

---

## 📊 Phase 6: Monitoring Setup

### 1. Enable Application Insights
```bash
az monitor app-insights component create \
  --app eduplatform-insights \
  --location eastus \
  --resource-group eduplatform-rg \
  --application-type web

# Link to App Service
az webapp config appsettings set \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --settings APPINSIGHTS_INSTRUMENTATIONKEY="your-instrumentation-key"
```

### 2. Set up Alerts
```bash
# CPU usage alert
az monitor metrics alert create \
  --name "High CPU Usage" \
  --resource-group eduplatform-rg \
  --scopes /subscriptions/your-subscription/resourceGroups/eduplatform-rg/providers/Microsoft.Web/sites/eduplatform-api \
  --condition "avg Percentage CPU > 80" \
  --description "Alert when CPU usage is high"
```

---

## 🧪 Phase 7: Testing Deployment

### 1. Health Check
```bash
curl https://eduplatform-api.azurewebsites.net/health
```

### 2. API Test
```bash
curl https://eduplatform-api.azurewebsites.net/api/v1/courses
```

### 3. Frontend Test
Visit: `https://eduplatform-web.azurestaticapps.net`

---

## 🔄 Phase 8: CI/CD Setup

### 1. Azure DevOps Pipeline
- Import the `azure-pipelines.yml` file
- Configure service connections
- Set up variable groups for secrets

### 2. GitHub Actions (Alternative)
```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install and build
      run: |
        npm ci
        npm run build
    
    - name: Deploy to Azure
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'eduplatform-api'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: './backend'
```

---

## 🔧 Environment Variables Reference

### Backend (.env)
```bash
# Server Configuration
NODE_ENV=production
PORT=8000
API_VERSION=v1

# Database
MONGODB_URI=mongodb://eduplatform-cosmos:password@eduplatform-cosmos.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@eduplatform-cosmos@

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRES_IN=30d

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=eduplatformstorage;AccountKey=...;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=eduplatform-files

# Azure SignalR
AZURE_SIGNALR_CONNECTION_STRING=Endpoint=https://eduplatform-signalr.service.signalr.net;AccessKey=...;Version=1.0;

# Email
SENDGRID_API_KEY=SG.your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=EduPlatform

# Payment
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application URLs
FRONTEND_URL=https://eduplatform-web.azurestaticapps.net
BACKEND_URL=https://eduplatform-api.azurewebsites.net
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=https://eduplatform-api.azurewebsites.net/api/v1
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_STRIPE_PUBLIC_KEY=pk_live_your-stripe-public-key
VITE_SIGNALR_URL=https://eduplatform-signalr.service.signalr.net
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. CORS Errors
```bash
# Add your domain to CORS settings
az webapp cors add \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --allowed-origins "https://yourdomain.com"
```

#### 2. Database Connection Issues
- Verify Cosmos DB connection string
- Check firewall settings
- Ensure MongoDB API is enabled

#### 3. File Upload Issues
- Verify storage account permissions
- Check container exists and is public
- Validate connection string

#### 4. Authentication Issues
- Verify JWT secret is set
- Check Google OAuth configuration
- Ensure redirect URLs are correct

### Monitoring Commands
```bash
# View app logs
az webapp log tail --name eduplatform-api --resource-group eduplatform-rg

# Check app status
az webapp show --name eduplatform-api --resource-group eduplatform-rg --query state

# View metrics
az monitor metrics list --resource /subscriptions/your-subscription/resourceGroups/eduplatform-rg/providers/Microsoft.Web/sites/eduplatform-api
```

---

## 📈 Performance Optimization

### 1. Enable CDN
```bash
az cdn profile create \
  --name eduplatform-cdn-profile \
  --resource-group eduplatform-rg \
  --sku Standard_Microsoft

az cdn endpoint create \
  --name eduplatform-cdn \
  --profile-name eduplatform-cdn-profile \
  --resource-group eduplatform-rg \
  --origin eduplatform-web.azurestaticapps.net
```

### 2. Configure Caching
```bash
# Enable output caching
az webapp config set \
  --name eduplatform-api \
  --resource-group eduplatform-rg \
  --generic-configurations '{"outputCaching":{"enabled":true}}'
```

### 3. Scale Settings
```bash
# Configure auto-scaling
az monitor autoscale create \
  --resource-group eduplatform-rg \
  --resource /subscriptions/your-subscription/resourceGroups/eduplatform-rg/providers/Microsoft.Web/serverfarms/eduplatform-plan \
  --name eduplatform-autoscale \
  --min-count 1 \
  --max-count 5 \
  --count 2
```

---

## 🔒 Security Checklist

- [ ] HTTPS enabled on all services
- [ ] CORS properly configured
- [ ] Environment variables secured
- [ ] Database firewall configured
- [ ] API rate limiting enabled
- [ ] Authentication properly implemented
- [ ] File upload restrictions in place
- [ ] Monitoring and alerting configured
- [ ] Backup strategy implemented
- [ ] SSL certificates configured

---

## 📞 Support

If you encounter issues during deployment:

1. Check the [Azure Status Page](https://status.azure.com/)
2. Review application logs in Azure Portal
3. Consult the [Azure Documentation](https://docs.microsoft.com/azure/)
4. Contact support through Azure Portal

---

**🎉 Congratulations! Your EduPlatform is now deployed to Azure and ready for production use!**