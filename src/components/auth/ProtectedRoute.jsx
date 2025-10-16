import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../ui/LoadingSpinner'

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    )
  }

  console.log('🔒 ProtectedRoute check:', { 
    user: user?.role, 
    loading, 
    isAuthenticated, 
    location: location.pathname,
    requiredRole,
    userRole: user?.role 
  })
  
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login')
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    console.log('❌ Role mismatch:', { required: requiredRole, actual: user?.role })
    // If admin role is required but user is not admin, redirect to admin login
    if (requiredRole === 'admin') {
      console.log('🔄 Redirecting to admin login')
      return <Navigate to="/admin-login" replace />
    }
    return <Navigate to="/unauthorized" replace />
  }

  console.log('✅ Access granted to:', location.pathname)

  return children
}

export default ProtectedRoute