# Google OAuth Setup Guide

This guide will help you set up Google OAuth for the EduPlatform application.

## Prerequisites
- Google account
- Access to Google Cloud Console

## Step-by-Step Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter project name: `eduplatform-oauth`
5. Click "Create"

### 2. Enable Required APIs

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google+ API" and enable it
3. Search for "People API" and enable it (optional, for additional user info)

### 3. Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - **App name**: EduPlatform
   - **User support email**: Your email address
   - **App logo**: Upload your app logo (optional)
   - **App domain**: Your domain (for production)
   - **Developer contact information**: Your email address
5. Click "Save and Continue"
6. On the "Scopes" page, click "Save and Continue" (we'll use default scopes)
7. On the "Test users" page, add test email addresses if needed
8. Click "Save and Continue"

### 4. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Enter a name: `EduPlatform Web Client`
5. Add Authorized JavaScript origins:
   - For development: `http://localhost:3000`
   - For production: `https://yourdomain.com`
6. Add Authorized redirect URIs (if needed):
   - For development: `http://localhost:3000/auth/callback`
   - For production: `https://yourdomain.com/auth/callback`
7. Click "Create"
8. Copy the Client ID (you'll need this for your `.env` file)

### 5. Update Environment Variables

1. Open your `.env` file in the project root
2. Replace `your-google-client-id-here` with your actual Client ID:
   ```
   VITE_GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```
3. Save the file

### 6. Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/login`
3. Click the "Sign in with Google" button
4. Complete the OAuth flow
5. You should be redirected back to the application and logged in

## Troubleshooting

### Common Issues

1. **"Error 400: redirect_uri_mismatch"**
   - Make sure your redirect URI in Google Console matches your application URL
   - Check that you've added `http://localhost:3000` to authorized origins

2. **"Error 403: access_denied"**
   - Make sure your OAuth consent screen is properly configured
   - Check that the user email is added to test users (if app is in testing mode)

3. **"Error: popup_closed_by_user"**
   - User closed the popup before completing authentication
   - This is normal user behavior, no action needed

4. **Client ID not found**
   - Verify your `.env` file has the correct `VITE_GOOGLE_CLIENT_ID`
   - Make sure to restart your development server after changing `.env`

### Development vs Production

- **Development**: Use `http://localhost:3000` in authorized origins
- **Production**: Use your actual domain `https://yourdomain.com`
- **Environment Variables**: Use different Client IDs for dev/prod if needed

## Security Best Practices

1. **Never commit your Client ID to public repositories** (though it's not a secret, it's good practice)
2. **Use different projects for development and production**
3. **Regularly review and rotate credentials**
4. **Monitor usage in Google Cloud Console**
5. **Set up proper CORS policies for production**

## Additional Resources

- [Google Identity Documentation](https://developers.google.com/identity)
- [OAuth 2.0 for Web Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)

## Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Google Cloud Console configuration
3. Ensure your `.env` file is properly configured
4. Restart your development server after making changes