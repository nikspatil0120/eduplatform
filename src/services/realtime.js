import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'

class RealtimeService {
  constructor() {
    this.signalRConnection = null
    this.socketIOConnection = null
    this.isSignalRConnected = false
    this.isSocketIOConnected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.listeners = new Map()
    this.useSignalR = import.meta.env.VITE_USE_SIGNALR === 'true'
    this.currentUser = null
  }

  async initialize(userId, token) {
    this.currentUser = { id: userId }
    
    if (this.useSignalR) {
      await this.initializeSignalR(userId, token)
    } else {
      await this.initializeSocketIO(token)
    }
  }

  async initializeSignalR(userId, token) {
    try {
      const signalRUrl = import.meta.env.VITE_SIGNALR_URL || 'http://localhost:3001/hubs/notifications'
      
      this.signalRConnection = new HubConnectionBuilder()
        .withUrl(signalRUrl, {
          accessTokenFactory: () => token
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(LogLevel.Information)
        .build()

      // Set up event handlers
      this.setupSignalREventHandlers()

      // Start connection
      await this.signalRConnection.start()
      this.isSignalRConnected = true
      this.reconnectAttempts = 0

      // Join user-specific group
      await this.signalRConnection.invoke('JoinUserGroup', userId)
      
      console.log('SignalR Connected')
    } catch (error) {
      console.error('SignalR Connection Error:', error)
      this.handleReconnect(userId, token)
    }
  }

  async initializeSocketIO(token) {
    try {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
      
      this.socketIOConnection = io(socketUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true
      })

      this.setupSocketIOEventHandlers()
      
      console.log('Socket.IO initialized')
    } catch (error) {
      console.error('Socket.IO Connection Error:', error)
      toast.error('Failed to connect to real-time services')
    }
  }

  setupSignalREventHandlers() {
    if (!this.signalRConnection) return

    // Connection events
    this.signalRConnection.onreconnecting(() => {
      console.log('SignalR Reconnecting...')
      this.isSignalRConnected = false
      toast.loading('Reconnecting to real-time services...', { id: 'reconnecting' })
    })

    this.signalRConnection.onreconnected(() => {
      console.log('SignalR Reconnected')
      this.isSignalRConnected = true
      this.reconnectAttempts = 0
      toast.success('Reconnected to real-time services', { id: 'reconnecting' })
    })

    this.signalRConnection.onclose(() => {
      console.log('SignalR Disconnected')
      this.isSignalRConnected = false
    })

    // Notification events
    this.signalRConnection.on('notification', (notification) => {
      this.handleNotification(notification)
    })

    // Chat events
    this.signalRConnection.on('chatMessage', (message) => {
      this.handleChatMessage(message)
    })

    // Assignment events
    this.signalRConnection.on('assignmentUpdate', (update) => {
      this.handleAssignmentUpdate(update)
    })

    // Discussion events
    this.signalRConnection.on('discussionUpdate', (update) => {
      this.handleDiscussionUpdate(update)
    })

    // Learning events
    this.signalRConnection.on('ProgressUpdated', (data) => {
      this.handleProgressUpdate(data)
    })

    this.signalRConnection.on('NoteUpdated', (noteData) => {
      this.handleNoteUpdate(noteData)
    })

    this.signalRConnection.on('CourseUpdated', (courseData) => {
      this.handleCourseUpdate(courseData)
    })

    // Live class events
    this.signalRConnection.on('liveClassUpdate', (update) => {
      this.handleLiveClassUpdate(update)
    })

    // System announcements
    this.signalRConnection.on('systemAnnouncement', (announcement) => {
      this.handleSystemAnnouncement(announcement)
    })
  }

  setupSocketIOEventHandlers() {
    if (!this.socketIOConnection) return

    this.socketIOConnection.on('connect', () => {
      console.log('Socket.IO connected')
      this.isSocketIOConnected = true
      this.reconnectAttempts = 0
    })

    this.socketIOConnection.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason)
      this.isSocketIOConnected = false
      
      if (reason === 'io server disconnect') {
        this.socketIOConnection.connect()
      }
    })

    this.socketIOConnection.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error)
      toast.error('Failed to connect to real-time services')
    })

    // All the same event handlers as SignalR but with Socket.IO event names
    this.socketIOConnection.on('notification', (notification) => {
      this.handleNotification(notification)
    })

    this.socketIOConnection.on('new_message', (message) => {
      this.handleChatMessage(message)
    })

    this.socketIOConnection.on('assignment_update', (update) => {
      this.handleAssignmentUpdate(update)
    })

    this.socketIOConnection.on('discussion_update', (update) => {
      this.handleDiscussionUpdate(update)
    })

    this.socketIOConnection.on('progressUpdated', (data) => {
      this.handleProgressUpdate(data)
    })

    this.socketIOConnection.on('noteUpdated', (noteData) => {
      this.handleNoteUpdate(noteData)
    })

    this.socketIOConnection.on('courseUpdated', (courseData) => {
      this.handleCourseUpdate(courseData)
    })

    this.socketIOConnection.on('live_class_update', (update) => {
      this.handleLiveClassUpdate(update)
    })

    this.socketIOConnection.on('system_announcement', (announcement) => {
      this.handleSystemAnnouncement(announcement)
    })
  }

  async handleReconnect(userId, token) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = Math.pow(2, this.reconnectAttempts) * 1000 // Exponential backoff
      
      setTimeout(() => {
        console.log(`Reconnect attempt ${this.reconnectAttempts}`)
        this.initialize(userId, token)
      }, delay)
    } else {
      toast.error('Unable to connect to real-time services. Please refresh the page.')
    }
  }

  // Event handlers
  handleNotification(notification) {
    // Show toast notification
    const toastType = notification.priority === 'urgent' ? 'error' : 
                     notification.priority === 'high' ? 'warning' : 'info'
    
    toast[toastType](notification.message, {
      duration: notification.priority === 'urgent' ? 0 : 5000
    })

    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }
    
    // Dispatch event for notification updates
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }))
  }

  handleChatMessage(message) {
    // Show toast for new messages (if not from current user)
    if (message.senderId !== this.currentUser?.id) {
      toast.success(`New message from ${message.senderName}`, {
        duration: 3000
      })
    }
    
    // Dispatch event for chat messages
    window.dispatchEvent(new CustomEvent('newMessage', { detail: message }))
  }

  handleAssignmentUpdate(update) {
    let message = ''
    switch (update.type) {
      case 'created':
        message = `New assignment: ${update.title}`
        break
      case 'updated':
        message = `Assignment updated: ${update.title}`
        break
      case 'graded':
        message = `Assignment graded: ${update.title}`
        break
      default:
        message = `Assignment update: ${update.title}`
    }

    toast.info(message, { duration: 4000 })
    window.dispatchEvent(new CustomEvent('assignmentUpdate', { detail: update }))
  }

  handleDiscussionUpdate(update) {
    let message = ''
    switch (update.type) {
      case 'created':
        message = `New discussion: ${update.title}`
        break
      case 'replied':
        message = `New reply in: ${update.title}`
        break
      case 'pinned':
        message = `Discussion pinned: ${update.title}`
        break
      default:
        message = `Discussion update: ${update.title}`
    }

    toast.info(message, { duration: 4000 })
    window.dispatchEvent(new CustomEvent('discussionUpdate', { detail: update }))
  }

  handleProgressUpdate(data) {
    // Dispatch custom event for progress updates
    window.dispatchEvent(new CustomEvent('progressUpdated', { detail: data }))
  }

  handleNoteUpdate(noteData) {
    // Dispatch event for note synchronization
    window.dispatchEvent(new CustomEvent('noteUpdated', { detail: noteData }))
  }

  handleCourseUpdate(courseData) {
    // Dispatch event for course updates
    window.dispatchEvent(new CustomEvent('courseUpdated', { detail: courseData }))
  }

  handleLiveClassUpdate(update) {
    let message = ''
    switch (update.type) {
      case 'started':
        message = `Live class started: ${update.title}`
        break
      case 'ended':
        message = `Live class ended: ${update.title}`
        break
      case 'updated':
        message = `Live class updated: ${update.title}`
        break
      default:
        message = `Live class update: ${update.title}`
    }

    toast.info(message, { duration: 5000 })
    window.dispatchEvent(new CustomEvent('liveClassUpdate', { detail: update }))
  }

  handleSystemAnnouncement(announcement) {
    const toastType = announcement.type === 'error' ? 'error' :
                     announcement.type === 'warning' ? 'warning' :
                     announcement.type === 'success' ? 'success' : 'info'

    toast[toastType](announcement.message, {
      duration: 8000
    })

    window.dispatchEvent(new CustomEvent('systemAnnouncement', { detail: announcement }))
  }

  // Public methods
  async joinCourse(courseId) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('JoinCourseGroup', courseId)
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('join_course', courseId)
    }
  }

  async leaveCourse(courseId) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('LeaveCourseGroup', courseId)
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('leave_course', courseId)
    }
  }

  async sendMessage(courseId, content, type = 'text', replyTo = null) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('SendMessage', {
        courseId,
        content,
        type,
        replyTo
      })
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('send_message', {
        courseId,
        content,
        type,
        replyTo
      })
    }
  }

  async updateTyping(courseId, isTyping) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('UpdateTyping', courseId, isTyping)
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('typing', {
        courseId,
        isTyping
      })
    }
  }

  async addReaction(messageId, emoji) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('AddReaction', messageId, emoji)
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('add_reaction', {
        messageId,
        emoji
      })
    }
  }

  async updateNote(noteId, content) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('UpdateNote', noteId, content)
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('update_note', {
        noteId,
        content
      })
    }
  }

  async updateProgress(courseId, lessonId, progress) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('UpdateProgress', courseId, lessonId, progress)
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('update_progress', {
        courseId,
        lessonId,
        progress
      })
    }
  }

  // Live class methods
  async joinLiveClass(classId, courseId) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('JoinLiveClass', { classId, courseId })
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('join_live_class', {
        classId,
        courseId
      })
    }
  }

  async shareScreen(classId, isSharing, streamData = null) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('ShareScreen', { classId, isSharing, streamData })
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('screen_share', {
        classId,
        isSharing,
        streamData
      })
    }
  }

  async updateWhiteboard(classId, drawData) {
    if (this.useSignalR && this.isSignalRConnected) {
      await this.signalRConnection.invoke('UpdateWhiteboard', { classId, drawData })
    } else if (this.isSocketIOConnected) {
      this.socketIOConnection.emit('whiteboard_draw', {
        classId,
        drawData
      })
    }
  }

  // Utility methods
  isConnected() {
    return this.useSignalR ? this.isSignalRConnected : this.isSocketIOConnected
  }

  getConnectionStatus() {
    return {
      signalR: this.isSignalRConnected,
      socketIO: this.isSocketIOConnected,
      active: this.isConnected()
    }
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return Notification.permission === 'granted'
  }

  async disconnect() {
    if (this.signalRConnection) {
      await this.signalRConnection.stop()
      this.isSignalRConnected = false
    }

    if (this.socketIOConnection) {
      this.socketIOConnection.disconnect()
      this.isSocketIOConnected = false
    }
  }
}

export default new RealtimeService()