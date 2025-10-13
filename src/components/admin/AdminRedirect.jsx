import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Shield, ArrowRight } from 'lucide-react'

const AdminRedirect = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary-600 p-4 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Admin Access Required
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You need to be logged in as an administrator to access this area.
          </p>
          
          <Link
            to="/admin-login"
            className="inline-flex items-center justify-center w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors group"
          >
            Go to Admin Login
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Demo Admin Credentials:
            </p>
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div>superadmin@kiro.edu / admin123</div>
              <div>moderator@kiro.edu / mod123</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default AdminRedirect