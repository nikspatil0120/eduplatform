import React from 'react'
import { BookOpen } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold">EduPlatform</span>
          </div>
          <div className="text-sm text-gray-400">
            © 2024 EduPlatform. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer