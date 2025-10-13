import React, { createContext, useContext, useState, useEffect } from 'react'
import googleAuthService from '../services/googleAuth'
import toast from 'react-hot-toast'

export const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize auth with a timeout to prevent hanging
    const initTimeout = setTimeout(() => {
      console.warn('Auth initialization timeout, continuing without Google Auth')
      setLoading(false)
    }, 5000) // 5 second timeout

    initializeAuth().finally(() => {
      clearTimeout(initTimeout)
    })
  }, [])

  const initializeAuth = async () => {
    try {
      // Check for existing auth token first (this should be fast)
      const token = localStorage.getItem('authToken')
      const userData = localStorage.getItem('userData')
      
      if (token && userData) {
        try {
          setUser(JSON.parse(userData))
        } catch (parseError) {
          console.warn('Failed to parse stored user data:', parseError)
          localStorage.removeItem('authToken')
          localStorage.removeItem('userData')
        }
      }

      // Initialize Google Auth in the background (don't await)
      googleAuthService.initialize()
        .then(() => {
          googleAuthService.setCredentialHandler(handleGoogleCredential)
          console.log('Google Auth initialized successfully')
        })
        .catch((googleError) => {
          console.warn('Google Auth initialization failed:', googleError)
          // App continues to work without Google Auth
        })
      
    } catch (error) {
      console.error('Failed to initialize auth:', error)
    } finally {
      // Always set loading to false so the app can load
      setLoading(false)
    }
  }

  const handleGoogleCredential = async (response) => {
    try {
      setLoading(true)
      
      // Parse the JWT token from Google
      const userInfo = googleAuthService.parseJWT(response.credential)
      
      if (userInfo) {
        const userData = {
          id: userInfo.sub,
          name: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.picture,
          role: 'student',
          provider: 'google'
        }
        
        setUser(userData)
        localStorage.setItem('authToken', response.credential)
        localStorage.setItem('userData', JSON.stringify(userData))
        
        toast.success(`Welcome, ${userData.name}!`)
      }
    } catch (error) {
      console.error('Google auth error:', error)
      toast.error('Failed to sign in with Google')
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    // Simulate traditional email/password login
    setLoading(true)
    try {
      // Mock successful login
      const mockUser = {
        id: '1',
        name: 'John Doe',
        email: email,
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        provider: 'email'
      }
      setUser(mockUser)
      localStorage.setItem('authToken', 'mock-jwt-token')
      localStorage.setItem('userData', JSON.stringify(mockUser))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signup = async (name, email, password) => {
    // Simulate traditional email/password signup
    setLoading(true)
    try {
      const mockUser = {
        id: '1',
        name: name,
        email: email,
        role: 'student',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        provider: 'email'
      }
      setUser(mockUser)
      localStorage.setItem('authToken', 'mock-jwt-token')
      localStorage.setItem('userData', JSON.stringify(mockUser))
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const sendOTP = async (email, purpose = 'login') => {
    try {
      setLoading(true)
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, purpose }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('OTP sent to your email!')
        return { success: true, data: data.data }
      } else {
        toast.error(data.message || 'Failed to send OTP')
        return { success: false, error: data.message }
      }
    } catch (error) {
      console.error('Send OTP error:', error)
      toast.error('Failed to send OTP. Please try again.')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const verifyOTP = async (email, otp, purpose = 'login', name = '') => {
    try {
      setLoading(true)
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, purpose, name }),
      })

      const data = await response.json()
      
      if (data.success) {
        if (data.data.user) {
          setUser(data.data.user)
          localStorage.setItem('authToken', data.data.token)
          localStorage.setItem('userData', JSON.stringify(data.data.user))
          toast.success(data.message)
        }
        return { success: true, data: data.data }
      } else {
        toast.error(data.message || 'Invalid OTP')
        return { success: false, error: data.message, code: data.code, attemptsLeft: data.attemptsLeft }
      }
    } catch (error) {
      console.error('Verify OTP error:', error)
      toast.error('Failed to verify OTP. Please try again.')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const resendOTP = async (email, purpose = 'login') => {
    try {
      setLoading(true)
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, purpose }),
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success('New OTP sent to your email!')
        return { success: true }
      } else {
        toast.error(data.message || 'Failed to resend OTP')
        return { success: false, error: data.message, waitTime: data.waitTime }
      }
    } catch (error) {
      console.error('Resend OTP error:', error)
      toast.error('Failed to resend OTP. Please try again.')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const loginWithGoogle = async () => {
    try {
      setLoading(true)
      const userInfo = await googleAuthService.signIn()
      
      if (userInfo && userInfo.email) {
        const userData = {
          id: userInfo.id,
          name: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.avatar,
          role: 'student',
          provider: 'google'
        }
        
        setUser(userData)
        localStorage.setItem('authToken', 'google-oauth-token')
        localStorage.setItem('userData', JSON.stringify(userData))
        
        toast.success(`Welcome, ${userData.name}!`)
        return { success: true, user: userData }
      } else {
        toast.error('Google sign-in failed. Please try again.')
        return { success: false, error: 'Google sign-in failed' }
      }
    } catch (error) {
      console.error('Google OAuth error:', error)
      
      // Check if it's a configuration issue
      if (error.message.includes('popup_failed_to_open') || error.message.includes('origin is not allowed')) {
        toast.error('Google OAuth needs configuration. Please use email OTP login for now.', {
          duration: 4000,
        })
      } else {
        toast.error('Failed to sign in with Google. Please try again.')
      }
      
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const adminLogin = async (email, password) => {
    try {
      setLoading(true)
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'
      const response = await fetch(`${API_BASE_URL}/auth/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        const { user, token, refreshToken } = data.data
        
        // Store tokens
        localStorage.setItem('authToken', token)
        localStorage.setItem('refreshToken', refreshToken)
        localStorage.setItem('userData', JSON.stringify(user))
        
        setUser(user)
        toast.success('Admin login successful!')
        return { success: true, user }
      } else {
        toast.error(data.message || 'Admin login failed')
        return { success: false, error: data.message }
      }
    } catch (error) {
      console.error('Admin login error:', error)
      toast.error('Admin login failed')
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await googleAuthService.signOut()
      setUser(null)
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('userData')
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const setToken = (token) => {
    localStorage.setItem('authToken', token)
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      loginWithGoogle,
      adminLogin,
      logout,
      sendOTP,
      verifyOTP,
      resendOTP,
      setUser,
      setToken,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}