import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, BookOpen } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import GoogleSignInButton from '../../components/auth/GoogleSignInButton'
import toast from 'react-hot-toast'

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔄 User already authenticated, redirecting to dashboard...')
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [isAuthenticated, user, navigate, location.state?.from?.pathname])

  const [step, setStep] = useState('email') // 'email' or 'otp'
  const [otpCode, setOtpCode] = useState('')
  const { sendOTP, verifyOTP, resendOTP } = useAuth()

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await sendOTP(formData.email, 'login')
      if (result.success) {
        setStep('otp')
      }
    } catch (error) {
      toast.error('An error occurred while sending OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await verifyOTP(formData.email, otpCode, 'login')
      if (result.success) {
        const from = location.state?.from?.pathname || location.state?.from || '/dashboard'
        navigate(from, { replace: true })
      }
    } catch (error) {
      toast.error('An error occurred during verification')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      await resendOTP(formData.email, 'login')
    } catch (error) {
      toast.error('Failed to resend OTP')
    }
  }

  const handleSubmit = step === 'email' ? handleEmailSubmit : handleOTPSubmit

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in to your account to continue learning
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
              /* Email Step */
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
            ) : (
              /* OTP Step */
              <>
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We've sent a 6-digit code to
                  </p>
                  <p className="font-medium text-gray-900 dark:text-white">{formData.email}</p>
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
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {step === 'otp' && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                ← Change email address
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
              step === 'email' ? 'Send OTP' : 'Verify & Sign In'
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
              <GoogleSignInButton text="Sign in with Google" />
            </div>
          </div>

          {/* Sign up link */}
          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
              >
                Sign up here
              </Link>
            </span>
          </div>
        </motion.form>
      </motion.div>
    </div>
  )
}

export default LoginPage