import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Bell,
    Check,
    Trash2,
    Search,
    Calendar,
    AlertCircle,
    Info,
    CheckCircle
} from 'lucide-react'
import { notificationAPI } from '../services/api'
import toast from 'react-hot-toast'

const Notifications = () => {
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, unread, read
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchNotifications()
    }, [filter])

    const fetchNotifications = async () => {
        try {
            setLoading(true)
            let params = { limit: 50 }
            if (filter === 'unread') {
                params.unreadOnly = true
            }

            const response = await notificationAPI.getNotifications(params)

            if (response.data?.success) {
                setNotifications(response.data.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch notifications:', error)
            toast.error('Failed to load notifications')
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (notificationId) => {
        try {
            await notificationAPI.markAsRead(notificationId)
            setNotifications(prev =>
                prev.map(n =>
                    n._id === notificationId ? { ...n, readAt: new Date().toISOString() } : n
                )
            )
            toast.success('Notification marked as read')
            
            // Trigger a refresh of the unread count in the navbar
            window.dispatchEvent(new CustomEvent('notificationRead'))
        } catch (error) {
            console.error('Failed to mark as read:', error)
            toast.error('Failed to mark as read')
        }
    }

    const markAllAsRead = async () => {
        try {
            await notificationAPI.markAllAsRead()
            setNotifications(prev =>
                prev.map(n => ({ ...n, readAt: new Date().toISOString() }))
            )
            toast.success('All notifications marked as read')
            
            // Trigger a refresh of the unread count in the navbar
            window.dispatchEvent(new CustomEvent('notificationRead'))
        } catch (error) {
            console.error('Failed to mark all as read:', error)
            toast.error('Failed to mark all as read')
        }
    }

    const deleteNotification = async (notificationId) => {
        try {
            await notificationAPI.deleteNotification(notificationId)
            setNotifications(prev => prev.filter(n => n._id !== notificationId))
            toast.success('Notification deleted')
        } catch (error) {
            console.error('Failed to delete notification:', error)
            toast.error('Failed to delete notification')
        }
    }



    const getNotificationIcon = (type) => {
        switch (type) {
            case 'announcement':
                return <Bell className="h-5 w-5 text-blue-500" />
            case 'info':
                return <Info className="h-5 w-5 text-blue-500" />
            case 'course_enrollment':
            case 'course_completion':
                return <CheckCircle className="h-5 w-5 text-green-500" />
            case 'system_maintenance':
                return <AlertCircle className="h-5 w-5 text-orange-500" />
            default:
                return <Bell className="h-5 w-5 text-gray-500" />
        }
    }

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)

        if (diffInSeconds < 60) return 'Just now'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
        return `${Math.floor(diffInSeconds / 86400)} days ago`
    }

    const filteredNotifications = notifications.filter(notification => {
        const matchesFilter = filter === 'all' ||
            (filter === 'unread' && !notification.readAt) ||
            (filter === 'read' && notification.readAt)

        const matchesSearch = !searchQuery ||
            notification.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            notification.message.toLowerCase().includes(searchQuery.toLowerCase())

        return matchesFilter && matchesSearch
    })

    const unreadCount = notifications.filter(n => !n.readAt).length

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Bell className="h-8 w-8 text-primary-600" />
                                Notifications
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Stay updated with your latest notifications
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={markAllAsRead}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                                >
                                    Mark All Read
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={fetchNotifications}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Refresh
                            </motion.button>
                        </div>
                    </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                >
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
                            </div>
                            <Bell className="h-8 w-8 text-gray-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unread</p>
                                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-orange-400" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Read</p>
                                <p className="text-2xl font-bold text-green-600">{notifications.length - unreadCount}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-400" />
                        </div>
                    </div>
                </motion.div>

                {/* Filters and Search */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm mb-8"
                >
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Filter Tabs */}
                        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                            {[
                                { key: 'all', label: 'All' },
                                { key: 'unread', label: 'Unread' },
                                { key: 'read', label: 'Read' }
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setFilter(tab.key)}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${filter === tab.key
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Notifications List */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-4"
                >
                    {filteredNotifications.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-12 rounded-xl shadow-sm text-center">
                            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                No notifications found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {filter === 'all'
                                    ? "You don't have any notifications yet."
                                    : `No ${filter} notifications found.`
                                }
                            </p>
                        </div>
                    ) : (
                        filteredNotifications.map((notification, index) => (
                            <motion.div
                                key={notification._id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border-l-4 ${notification.readAt
                                    ? 'border-gray-300 dark:border-gray-600'
                                    : 'border-primary-500'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="flex-shrink-0">
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h3 className={`text-lg font-medium ${notification.readAt
                                                    ? 'text-gray-700 dark:text-gray-300'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}>
                                                    {notification.title}
                                                </h3>
                                                {!notification.readAt && (
                                                    <span className="inline-block w-2 h-2 bg-primary-500 rounded-full"></span>
                                                )}
                                            </div>

                                            <p className="text-gray-600 dark:text-gray-400 mb-3">
                                                {notification.message}
                                            </p>

                                            <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center space-x-1">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>{formatTimeAgo(notification.createdAt)}</span>
                                                </div>
                                                <div className="flex items-center space-x-1">
                                                    <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2 ml-4">
                                        {!notification.readAt && (
                                            <button
                                                onClick={() => markAsRead(notification._id)}
                                                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => deleteNotification(notification._id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete notification"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </div>
        </div>
    )
}

export default Notifications