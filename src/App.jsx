import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoadingSpinner from './components/ui/LoadingSpinner'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import AdminRedirect from './components/admin/AdminRedirect'
import UnauthorizedPage from './pages/UnauthorizedPage'
import Dashboard from './pages/Dashboard'
import CourseCatalog from './pages/CourseCatalog'
import CourseDetail from './pages/CourseDetail'

import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import AdminPanel from './pages/admin/AdminPanel'
import NotFound from './pages/NotFound'
import GlobalErrorBoundary from './components/GlobalErrorBoundary'
import CertificateView from './pages/CertificateView'

const AppContent = () => {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading EduPlatform...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/admin-login" element={<AdminLoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/courses" element={<CourseCatalog />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          <Route path="/certificate/:id" element={<CertificateView />} />
          <Route path="*" element={<NotFound />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Admin Only Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
        }}
      />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <GlobalErrorBoundary>
            <AppContent />
          </GlobalErrorBoundary>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App