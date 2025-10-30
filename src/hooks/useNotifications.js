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
        const count = response.data.data?.count || 0
        setUnreadCount(count)
      } else {
        // If API call succeeds but returns no success, set count to 0
        setUnreadCount(0)
      }
    } catch (error) {
      // Always reset count on any error to avoid showing false notifications
      setUnreadCount(0)
      
      // Only log error if it's not a 401 (authentication error)
      if (error.response?.status !== 401) {
        console.error('Failed to fetch unread count:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Always reset count when authentication changes
    setUnreadCount(0)
    
    // Only fetch if user is authenticated
    if (!isAuthenticated) {
      return
    }
    
    // Small delay to ensure auth is fully established
    const timeoutId = setTimeout(() => {
      fetchUnreadCount()
    }, 500)
    
    // Refresh unread count every 2 minutes (less frequent to avoid spam)
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchUnreadCount()
      }
    }, 120000)
    
    // Listen for notification read events to refresh count immediately
    const handleNotificationRead = () => {
      if (isAuthenticated) {
        fetchUnreadCount()
      }
    }
    
    window.addEventListener('notificationRead', handleNotificationRead)
    
    return () => {
      clearTimeout(timeoutId)
      clearInterval(interval)
      window.removeEventListener('notificationRead', handleNotificationRead)
    }
  }, [isAuthenticated])

  return {
    unreadCount,
    loading,
    refreshUnreadCount: fetchUnreadCount
  }
}