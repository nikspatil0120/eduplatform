import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useRealtime } from '../../services/realtime'
import api from '../../services/api'

const ChatWindow = ({ courseId, isOpen, onClose }) => {
  const { user } = useAuth()
  const { socket, isConnected } = useRealtime()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load chat messages when component mounts
  useEffect(() => {
    if (isOpen && courseId) {
      loadMessages()
      joinCourseChat()
    }

    return () => {
      if (courseId) {
        leaveCourseChat()
      }
    }
  }, [isOpen, courseId])

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message])
    }

    const handleTypingUsers = (data) => {
      setTypingUsers(data.users.filter(userId => userId !== user.id))
    }

    const handleMessageReaction = (data) => {
      setMessages(prev => prev.map(msg => 
        msg.id === data.messageId 
          ? { ...msg, reactions: data.reactions }
          : msg
      ))
    }

    socket.on('new_message', handleNewMessage)
    socket.on('typing_users', handleTypingUsers)
    socket.on('message_reaction', handleMessageReaction)

    return () => {
      socket.off('new_message', handleNewMessage)
      socket.off('typing_users', handleTypingUsers)
      socket.off('message_reaction', handleMessageReaction)
    }
  }, [socket, isConnected, user.id])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/chat/messages/${courseId}`)
      setMessages(response.data.data.messages)
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const joinCourseChat = async () => {
    try {
      await api.post(`/chat/join/${courseId}`)
      if (socket) {
        socket.emit('join_course', courseId)
      }
    } catch (error) {
      console.error('Failed to join chat:', error)
    }
  }

  const leaveCourseChat = async () => {
    try {
      await api.post(`/chat/leave/${courseId}`)
      if (socket) {
        socket.emit('leave_course', courseId)
      }
    } catch (error) {
      console.error('Failed to leave chat:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const messageData = {
        courseId,
        content: newMessage.trim(),
        type: 'text'
      }

      // Send via API
      await api.post('/chat/messages', messageData)
      
      // Also emit via socket for immediate feedback
      if (socket) {
        socket.emit('send_message', messageData)
      }

      setNewMessage('')
      stopTyping()
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  const handleTyping = (e) => {
    setNewMessage(e.target.value)

    if (!isTyping) {
      setIsTyping(true)
      if (socket) {
        socket.emit('typing', { courseId, isTyping: true })
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, 1000)
  }

  const stopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      if (socket) {
        socket.emit('typing', { courseId, isTyping: false })
      }
    }
  }

  const addReaction = async (messageId, emoji) => {
    try {
      await api.post(`/chat/messages/${messageId}/reactions`, { emoji })
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-4 right-4 w-80 h-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <h3 className="font-medium text-gray-900 dark:text-white">Course Chat</h3>
          {!isConnected && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg ${
                  message.senderId === user.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {message.senderId !== user.id && (
                  <div className="text-xs font-medium mb-1 opacity-75">
                    {message.senderName}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div className="text-xs opacity-75 mt-1">
                  {formatTime(message.timestamp)}
                </div>
                
                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex space-x-1 mt-2">
                    {message.reactions.map((reaction, index) => (
                      <span key={index} className="text-xs">
                        {reaction.emoji}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Quick reactions */}
                <div className="flex space-x-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {['👍', '❤️', '😊'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(message.id, emoji)}
                      className="text-xs hover:bg-gray-200 dark:hover:bg-gray-600 rounded px-1"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-500 italic">
            {typingUsers.length === 1 
              ? 'Someone is typing...'
              : `${typingUsers.length} people are typing...`
            }
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || !isConnected}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

export default ChatWindow