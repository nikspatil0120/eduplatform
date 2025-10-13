// Google OAuth Configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id'

class GoogleAuthService {
  constructor() {
    this.isInitialized = false
    this.gapi = null
  }

  async initialize() {
    if (this.isInitialized) return

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
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'your-google-client-id-here') {
        throw new Error('Google Client ID not configured')
      }

      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
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

    return new Promise((resolve, reject) => {
      try {
        // Use the One Tap flow which is more reliable
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to popup if One Tap doesn't work
            this.showPopup()
              .then(resolve)
              .catch(reject)
          }
        })
        
        // Set up a temporary credential handler for this sign-in
        const originalHandler = this.handleCredentialResponse
        this.handleCredentialResponse = (response) => {
          // Restore original handler
          this.handleCredentialResponse = originalHandler
          
          try {
            const userInfo = this.parseJWT(response.credential)
            if (userInfo) {
              resolve({
                id: userInfo.sub,
                name: userInfo.name,
                email: userInfo.email,
                avatar: userInfo.picture,
                provider: 'google'
              })
            } else {
              reject(new Error('Failed to parse user information'))
            }
          } catch (error) {
            reject(error)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async showPopup() {
    return new Promise((resolve, reject) => {
      try {
        console.log('Initiating Google OAuth popup...')
        
        // Add timeout to prevent hanging
        const timeout = setTimeout(() => {
          reject(new Error('Google OAuth timeout'))
        }, 30000) // 30 second timeout
        
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
              resolve(userInfo)
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