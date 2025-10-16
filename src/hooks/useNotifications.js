import { useState, useEffect } from 'react'
import { notificationAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

export const useNotifications = () => {
  const { isAuthenticated } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchUnreadCount = async () => {
    try {
      setLoading(true)
      const response = await notificationAPI.getUnreadCount()
      if (response.data?.success) {
        setUnreadCount(response.data.data?.count || 0)
      }
    } catch (error) {
      // Only log error if it's not a 401 (authentication error)
      if (error.response?.status !== 401) {
        console.error('Failed to fetch unread count:', error)
      }
      // Reset count on auth error
      if (error.response?.status === 401) {
        setUnreadCount(0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch if user is authenticated
    if (!isAuthenticated) {
      setUnreadCount(0)
      return
    }
    
    fetchUnreadCount()
    
    // Refresh unread count every 2 minutes (less frequent to avoid spam)
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchUnreadCount()
      }
    }, 120000)
    
    return () => clearInterval(interval)
  }, [isAuthenticated])

  return {
    unreadCount,
    loading,
    refreshUnreadCount: fetchUnreadCount
  }
}