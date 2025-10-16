# Azure Deployment Script for EduPlatform
# Run this script to deploy your application to Azure

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName = "eduplatform-rg",
    
    [Parameter(Mandatory=$true)]
    [string]$Location = "East US",
    
    [Parameter(Mandatory=$true)]
    [string]$AppServiceName = "eduplatform-api",
    
    [Parameter(Mandatory=$true)]
    [string]$StaticWebAppName = "eduplatform-frontend"
)

Write-Host "🚀 Starting Azure deployment for EduPlatform..." -ForegroundColor Green

# Check if Azure CLI is installed
if (!(Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Azure CLI not found. Please install Azure CLI first." -ForegroundColor Red
    Write-Host "Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Yellow
    exit 1
}

# Login to Azure
Write-Host "🔐 Logging into Azure..." -ForegroundColor Blue
az login

# Create Resource Group
Write-Host "📦 Creating resource group: $ResourceGroupName" -ForegroundColor Blue
az group create --name $ResourceGroupName --location $Location

# Create App Service Plan
Write-Host "🏗️ Creating App Service Plan..." -ForegroundColor Blue
az appservice plan create --name "$AppServiceName-plan" --resource-group $ResourceGroupName --sku B1 --is-linux

# Create App Service for Backend
Write-Host "🌐 Creating App Service for backend..." -ForegroundColor Blue
az webapp create --resource-group $ResourceGroupName --plan "$AppServiceName-plan" --name $AppServiceName --runtime "NODE:18-lts"

# Configure App Service settings
Write-Host "⚙️ Configuring App Service settings..." -ForegroundColor Blue
az webapp config appsettings set --resource-group $ResourceGroupName --name $AppServiceName --settings @backend/.env.production

# Enable Application Insights
Write-Host "📊 Enabling Application Insights..." -ForegroundColor Blue
az monitor app-insights component create --app $AppServiceName --location $Location --resource-group $ResourceGroupName

# Create Static Web App
Write-Host "🌟 Creating Static Web App for frontend..." -ForegroundColor Blue
Write-Host "⚠️ Note: Static Web App creation requires GitHub integration." -ForegroundColor Yellow
Write-Host "Please create the Static Web App manually in Azure Portal with these settings:" -ForegroundColor Yellow
Write-Host "- Name: $StaticWebAppName" -ForegroundColor White
Write-Host "- Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "- Source: GitHub" -ForegroundColor White
Write-Host "- Build Preset: React" -ForegroundColor White
Write-Host "- App location: /" -ForegroundColor White
Write-Host "- Output location: dist" -ForegroundColor White

# Display deployment URLs
Write-Host "`n✅ Deployment setup complete!" -ForegroundColor Green
Write-Host "Backend URL: https://$AppServiceName.azurewebsites.net" -ForegroundColor Cyan
Write-Host "Frontend URL: https://$StaticWebAppName.azurestaticapps.net" -ForegroundColor Cyan

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Create Static Web App in Azure Portal" -ForegroundColor White
Write-Host "2. Configure GitHub repository integration" -ForegroundColor White
Write-Host "3. Add environment variables to Static Web App" -ForegroundColor White
Write-Host "4. Update VITE_API_BASE_URL in frontend configuration" -ForegroundColor White
Write-Host "5. Push code to trigger deployment" -ForegroundColor White

Write-Host "`n🎉 Happy deploying!" -ForegroundColor Green