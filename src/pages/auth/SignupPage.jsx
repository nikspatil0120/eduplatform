import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, BookOpen } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import toast from 'react-hot-toast'

const SignupPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signup, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  // Redirect authenticated users to appropriate page
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        console.log('🔄 Admin user authenticated, redirecting to admin panel...')
        navigate('/admin', { replace: true })
      } else {
        console.log('🔄 User already authenticated, redirecting to dashboard...')
        navigate('/dashboard', { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate])

  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [otpCode, setOtpCode] = useState('')
  const [otpEmail, setOtpEmail] = useState('') // Store email for OTP verification
  const [otpName, setOtpName] = useState('') // Store name for OTP verification

  // Debug stored values
  useEffect(() => {
    console.log('💾 Stored OTP data:', { otpEmail, otpName })
  }, [otpEmail, otpName])

  // Restore step and data from localStorage on component mount
  useEffect(() => {
    const savedStep = localStorage.getItem('signup_step')
    const savedEmail = localStorage.getItem('signup_email')
    const savedName = localStorage.getItem('signup_name')
    
    if (savedStep === 'otp' && savedEmail && savedName) {
      console.log('🔄 Restoring OTP step from localStorage')
      setStep('otp')
      setOtpEmail(savedEmail)
      setOtpName(savedName)
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        name: savedName
      }))
    }
  }, [])
  const { sendOTP, verifyOTP, resendOTP } = useAuth()

  // Debug step changes and prevent unwanted resets
  useEffect(() => {
    console.log('📋 Current step:', step)
    console.log('📝 Form data:', formData)
    
    // If step changes to 'email' but we have OTP data, restore OTP step
    if (step === 'email' && localStorage.getItem('signup_step') === 'otp') {
      const savedEmail = localStorage.getItem('signup_email')
      const savedName = localStorage.getItem('signup_name')
      if (savedEmail && savedName) {
        console.log('🔄 Preventing step reset, restoring OTP step')
        setStep('otp')
        setOtpEmail(savedEmail)
        setOtpName(savedName)
      }
    }
  }, [step, formData])

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }

    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    setLoading(true)

    try {
      console.log('🔄 Sending OTP for:', formData.email, formData.name)
      const result = await sendOTP(formData.email, 'signup', formData.name)
      console.log('📧 OTP result:', result)
      
      if (result && result.success) {
        console.log('✅ OTP sent successfully, switching to OTP step')
        // Store email and name for OTP verification
        const emailToStore = formData.email || otpEmail
        const nameToStore = formData.name || otpName
        
        setOtpEmail(emailToStore)
        setOtpName(nameToStore)
        
        // Also store in localStorage as backup
        localStorage.setItem('signup_email', emailToStore)
        localStorage.setItem('signup_name', nameToStore)
        localStorage.setItem('signup_step', 'otp')
        
        console.log('💾 Storing OTP data:', { emailToStore, nameToStore })
        
        // Force step change immediately
        setStep('otp')
        toast.success('OTP sent! Check your email.')
      } else {
        console.log('❌ OTP send failed:', result)
        toast.error(result?.error || 'Failed to send OTP')
      }
    } catch (error) {
      console.error('❌ OTP error:', error)
      toast.error('An error occurred while sending OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    
    if (!otpCode.trim() || otpCode.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    // Use stored email and name for verification (with localStorage fallback)
    const emailToUse = otpEmail || formData.email || localStorage.getItem('signup_email')
    const nameToUse = otpName || formData.name || localStorage.getItem('signup_name')

    if (!emailToUse || !nameToUse) {
      toast.error('Missing email or name. Please go back and fill the form.')
      setStep('email')
      return
    }

    setLoading(true)

    try {
      console.log('🔐 Verifying OTP for signup:', { email: emailToUse, otp: otpCode, name: nameToUse })
      const result = await verifyOTP(emailToUse, otpCode, 'signup', nameToUse)
      console.log('✅ Signup verification result:', result)
      
      if (result.success) {
        // Clean up localStorage
        localStorage.removeItem('signup_email')
        localStorage.removeItem('signup_name')
        localStorage.removeItem('signup_step')
        navigate('/dashboard')
        toast.success('Account created successfully!')
      } else {
        toast.error(result.error || 'Invalid OTP')
      }
    } catch (error) {
      console.error('❌ Signup verification error:', error)
      toast.error('An error occurred during verification')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      console.log('🔄 Resending OTP for signup:', formData.email)
      const result = await resendOTP(otpEmail || formData.email, 'signup', otpName || formData.name)
      if (result.success) {
        toast.success('OTP resent! Check your email.')
      } else {
        toast.error(result.error || 'Failed to resend OTP')
      }
    } catch (error) {
      console.error('❌ Resend OTP error:', error)
      toast.error('Failed to resend OTP')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (step === 'email') {
      handleEmailSubmit(e)
    } else {
      handleOTPSubmit(e)
    }
  }

  const handleChange = (e) => {
    const newFormData = {
      ...formData,
      [e.target.name]: e.target.value
    }
    setFormData(newFormData)
    
    // Also store email and name immediately for persistence
    if (e.target.name === 'email') {
      setOtpEmail(e.target.value)
    }
    if (e.target.name === 'name') {
      setOtpName(e.target.value)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full space-y-8"
      >
        {/* Header */}
        <div className="text-center">
          <motion.div
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.5 }}
            className="mx-auto bg-primary-600 p-3 rounded-full w-fit"
          >
            <BookOpen className="h-8 w-8 text-white" />
          </motion.div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Join thousands of learners and start your journey today
          </p>
        </div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="space-y-4">
            {step === 'email' ? (
              /* Signup Form */
              <>
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                      placeholder="Enter your full name"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* OTP Step */
              <>
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We've sent a 6-digit code to
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">{otpEmail || formData.email}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Account will be created for: <span className="font-medium">{otpName || formData.name}</span>
                  </p>
                </div>
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter OTP
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="otp"
                      name="otp"
                      type="text"
                      required
                      maxLength="6"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-center text-2xl tracking-widest"
                      placeholder="000000"
                    />
                  </div>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
                  >
                    Didn't receive the code? Resend OTP
                  </button>
                </div>
              </>
            )}
          </div>

          {step === 'email' && (
            /* Terms and conditions */
            <div className="flex items-center">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                I agree to the{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                  Privacy Policy
                </Link>
              </label>
            </div>
          )}

          {step === 'otp' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('signup_step')
                  setStep('email')
                }}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                ← Change details
              </button>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              step === 'email' ? 'Send OTP' : 'Verify & Create Account'
            )}
          </motion.button>



          {/* Social Login Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <GoogleSignInButton text="Sign up with Google" />
            </div>
          </div>

          {/* Sign in link */}
          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign in here
              </Link>
            </span>
          </div>
        </motion.form>
      </motion.div>
    </div>
  )
}

export default SignupPage