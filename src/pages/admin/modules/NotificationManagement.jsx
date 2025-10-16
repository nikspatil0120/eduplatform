import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Send,
  Users,
  Calendar,
  Eye,
  Trash2,
  Plus,
  Filter,
  Search,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const NotificationManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    recipients: 'all',
    scheduledFor: '',
    type: 'info'
  });
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
      
      console.log('🔍 Fetching users from:', `${baseURL}/admin/users`);
      
      const response = await fetch(`${baseURL}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('👥 Users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('👥 Users data received:', data);
        // Handle both data structures - new backend returns {users: []} and old returns {data: []}
        setUsers(data.users || data.data || []);
      } else {
        console.error('Failed to fetch users - Status:', response.status);
        const errorData = await response.text();
        console.error('Error response:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
      
      const response = await fetch(`${baseURL}/admin/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNotification = async () => {
    try {
      // Validation
      if (newNotification.recipients === 'specific' && selectedUsers.length === 0) {
        toast.error('Please select at least one user');
        return;
      }
      
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
      
      // Prepare notification data
      const notificationData = { ...newNotification };
      if (newNotification.recipients === 'specific' && selectedUsers.length > 0) {
        notificationData.recipients = selectedUsers.map(user => user.id);
      }
      
      const response = await fetch(`${baseURL}/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notificationData)
      });
      
      if (response.ok) {
        const result = await response.json();
        const notification = result.data;
        setNotifications([notification, ...notifications]);
        setShowCreateModal(false);
        setNewNotification({
          title: '',
          message: '',
          recipients: 'all',
          scheduledFor: '',
          type: 'info'
        });
        setSelectedUsers([]);
        setShowUserSelector(false);
        setUserSearchTerm('');
        toast.success('Notification created successfully!');
      }
    } catch (error) {
      toast.error('Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('authToken');
      const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
      
      const response = await fetch(`${baseURL}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        setNotifications(notifications.filter(n => n._id !== notificationId));
        toast.success('Notification deleted successfully!');
      }
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || notification.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent': return <CheckCircle className="w-4 h-4" />;
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
          <p className="text-gray-600 mt-1">Send announcements and manage notifications</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Notification
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900">
                {notifications.filter(n => n.status === 'sent').length}
              </p>
            </div>
            <Send className="w-8 h-8 text-green-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-blue-600">
                {notifications.filter(n => n.status === 'scheduled').length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Draft</p>
              <p className="text-2xl font-bold text-gray-600">
                {notifications.filter(n => n.status === 'draft').length}
              </p>
            </div>
            <Bell className="w-8 h-8 text-gray-600" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recipients</p>
              <p className="text-2xl font-bold text-purple-600">
                {notifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-600" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="sent">Sent</option>
            <option value="scheduled">Scheduled</option>
            <option value="draft">Draft</option>
            <option value="failed">Failed</option>
          </select>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Clear Filters
          </motion.button>
        </div>
      </div>
      
      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="space-y-4 p-6">
          <AnimatePresence>
            {filteredNotifications.map((notification) => (
              <motion.div
                key={notification._id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{ scale: 1.01 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${getTypeColor(notification.type)}`}></div>
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                        {getStatusIcon(notification.status)}
                        <span className="ml-1 capitalize">{notification.status}</span>
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{notification.message}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>Recipients: {notification.recipients}</span>
                      </div>
                      
                      {notification.scheduledFor && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Scheduled: {new Date(notification.scheduledFor).toLocaleString()}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>Delivered: {notification.deliveredCount || 0}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Read: {notification.readCount || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Notification Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Create New Notification
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Enter notification title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Enter notification message"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipients
                    </label>
                    <select
                      value={newNotification.recipients}
                      onChange={(e) => {
                        setNewNotification({ ...newNotification, recipients: e.target.value });
                        setShowUserSelector(e.target.value === 'specific');
                        if (e.target.value !== 'specific') {
                          setSelectedUsers([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="all">All Users</option>
                      <option value="students">Students Only</option>
                      <option value="instructors">Instructors Only</option>
                      <option value="admins">Admins Only</option>
                      <option value="specific">Specific Users</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type
                    </label>
                    <select
                      value={newNotification.type}
                      onChange={(e) => setNewNotification({ ...newNotification, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value="announcement">Announcement</option>
                      <option value="info">Info</option>
                      <option value="welcome">Welcome</option>
                      <option value="reminder">Reminder</option>
                      <option value="system_maintenance">System Maintenance</option>
                      <option value="course_update">Course Update</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>
                
                {/* User Selector for Specific Users */}
                {showUserSelector && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Users ({selectedUsers.length} selected)
                    </label>
                    <div className="mb-3 space-y-2">
                      <input
                        type="text"
                        placeholder="Search users..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const filteredUsers = users.filter(user => 
                              user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                              user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                            );
                            setSelectedUsers(filteredUsers);
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedUsers([])}
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                      <div className="space-y-2">
                        {users
                          .filter(user => 
                            user.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
                            user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
                          )
                          .map((user) => (
                          <label key={user.id} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedUsers.some(selected => selected.id === user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers([...selectedUsers, user]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(selected => selected.id !== user.id));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="h-8 w-8 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                              <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'instructor' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </label>
                        ))}
                      </div>
                      {users.length === 0 && (
                        <p className="text-gray-500 text-center py-4">No users found</p>
                      )}
                    </div>
                    {selectedUsers.length === 0 && (
                      <p className="text-red-500 text-sm mt-1">Please select at least one user</p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule For (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newNotification.scheduledFor}
                    onChange={(e) => setNewNotification({ ...newNotification, scheduledFor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty to send immediately
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateNotification}
                  disabled={!newNotification.title || !newNotification.message}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {newNotification.scheduledFor ? 'Schedule Notification' : 'Send Now'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </motion.div>
  );
};

export default NotificationManagement;