// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'

// Debug logging (remove in production)
// console.log('🔍 Current URL:', window.location.origin)
// console.log('🔍 Google Client ID loaded:', GOOGLE_CLIENT_ID)

// Check if Google OAuth is properly configured
const isGoogleOAuthConfigured = () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return clientId && 
         clientId !== 'your-google-client-id' && 
         clientId !== 'your-actual-google-client-id-here' &&
         !clientId.includes('your-') &&
         clientId.includes('.apps.googleusercontent.com')
}

class GoogleAuthService {
  constructor() {
    this.isInitialized = false
    this.gapi = null
  }

  async initialize() {
    if (this.isInitialized) return

    // Check if Google OAuth is configured
    if (!isGoogleOAuthConfigured()) {
      console.warn('Google OAuth not configured. Skipping initialization.')
      console.warn('Current client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID)
      throw new Error('Google OAuth not configured')
    }

    return new Promise((resolve, reject) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Google Auth initialization timeout'))
      }, 10000) // 10 second timeout

      // Load Google Identity Services
      if (!window.google) {
        const script = document.createElement('script')
        script.src = 'https://accounts.google.com/gsi/client'
        script.async = true
        script.defer = true
        script.onload = () => {
          clearTimeout(timeout)
          this.initializeGoogleAuth()
            .then(resolve)
            .catch(reject)
        }
        script.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
        document.head.appendChild(script)
      } else {
        clearTimeout(timeout)
        this.initializeGoogleAuth()
          .then(resolve)
          .catch(reject)
      }
    })
  }

  async initializeGoogleAuth() {
    try {
      // Check if Google Client ID is configured
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
      if (!clientId) {
        throw new Error('Google Client ID not configured')
      }

      // console.log('🚀 Initializing Google Auth with Client ID:', clientId)

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true
      })

      this.isInitialized = true
      console.log('Google Auth initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Google Auth:', error)
      throw error
    }
  }

  handleCredentialResponse(response) {
    // This will be overridden by the auth context
    console.log('Credential response:', response)
  }

  setCredentialHandler(handler) {
    this.handleCredentialResponse = handler
  }

  async signIn() {
    if (!this.isInitialized) {
      await this.initialize()
    }

    // Use popup flow directly - more reliable than One Tap
    return this.showPopup()
  }

  async showPopup() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initiating Google OAuth popup...')

        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Google OAuth timeout'))
        }, 30000) // 30 second timeout

        // Use OAuth2 popup flow instead of One Tap
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'email profile openid',
          callback: async (response) => {
            try {
              clearTimeout(timeout)
              console.log('Google OAuth response:', response)

              if (response.error) {
                console.error('Google OAuth error:', response.error)
                reject(new Error(response.error))
                return
              }

              if (!response.access_token) {
                console.error('No access token received from Google')
                reject(new Error('No access token received'))
                return
              }

              console.log('Getting user info with access token...')
              const userInfo = await this.getUserInfo(response.access_token)
              console.log('User info received:', userInfo)
              
              // For this flow, we don't have an ID token, so we'll create a mock one
              // In a real app, you'd exchange the access token for an ID token on your backend
              resolve({
                ...userInfo,
                idToken: 'mock-id-token-' + Date.now() // Mock ID token for testing
              })
            } catch (error) {
              clearTimeout(timeout)
              console.error('Error in Google OAuth callback:', error)
              reject(error)
            }
          },
          error_callback: (error) => {
            clearTimeout(timeout)
            console.error('Google OAuth error callback:', error)
            reject(new Error(error.type || 'Google OAuth failed'))
          }
        })

        console.log('Requesting access token...')
        tokenClient.requestAccessToken()

      } catch (error) {
        clearTimeout(timeout)
        console.error('Error setting up Google OAuth:', error)
        reject(error)
      }
    })
  }

  // Alternative method using redirect flow (more reliable for development)
  async signInWithRedirect() {
    try {
      const redirectUrl = `https://accounts.google.com/oauth/authorize?` +
        `client_id=${GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/callback')}&` +
        `response_type=code&` +
        `scope=email profile openid&` +
        `access_type=offline`

      window.location.href = redirectUrl
    } catch (error) {
      console.error('Redirect sign-in error:', error)
      throw error
    }
  }

  async getUserInfo(accessToken) {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`)
      const userInfo = await response.json()

      return {
        id: userInfo.id,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.picture,
        provider: 'google'
      }
    } catch (error) {
      console.error('Failed to get user info:', error)
      throw error
    }
  }

  parseJWT(token) {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to parse JWT:', error)
      return null
    }
  }

  async signOut() {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.disableAutoSelect()
    }
  }
}

export default new GoogleAuthService()