import React from 'react'
import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">Page not found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">The page you requested doesn't exist. Try one of the links below.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/" className="btn-secondary">Home</Link>
          <Link to="/courses" className="btn-primary">Browse Courses</Link>
          <Link to="/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound


