/**
 * Don Chat - Enhanced WebSocket Server
 * Repository: https://github.com/mnuhman/Donchat.git
 * 
 * Real-time messaging service with:
 * - Message status tracking (sending, sent, delivered, read)
 * - Offline message queuing
 * - Read receipts
 * - Typing indicators
 * - Connection heartbeat
 */
import { createServer } from 'http'
import { Server, Socket } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

interface User {
  id: string
  username: string
  phone: string
  socketId: string
  lastSeen: Date
}

interface PrivateMessage {
  id: string
  tempId?: string
  content: string
  senderId: string
  senderName: string
  receiverId: string
  conversationId: string
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

interface TypingIndicator {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
}

interface MessageStatus {
  messageId: string
  tempId?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  conversationId: string
  timestamp: string
}

interface QueuedMessage {
  message: PrivateMessage
  attempts: number
  lastAttempt: Date
  maxAttempts: number
}

// Map of userId -> User (for quick lookup)
const usersByUserId = new Map<string, User>()
// Map of socketId -> userId
const usersBySocketId = new Map<string, string>()
// Map of userId -> QueuedMessage[] (for offline users)
const messageQueue = new Map<string, QueuedMessage[]>()

const generateMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const createPrivateMessage = (
  content: string, 
  senderId: string, 
  senderName: string, 
  receiverId: string,
  conversationId: string,
  tempId?: string
): PrivateMessage => ({
  id: generateMessageId(),
  tempId,
  content,
  senderId,
  senderName,
  receiverId,
  conversationId,
  timestamp: new Date().toISOString(),
  status: 'sent'
})

// Process queued messages when user comes online
const processQueuedMessages = (userId: string, socket: Socket) => {
  const queue = messageQueue.get(userId)
  if (queue && queue.length > 0) {
    console.log(`Processing ${queue.length} queued messages for ${userId}`)
    
    queue.forEach((queuedMsg, index) => {
      if (queuedMsg.attempts < queuedMsg.maxAttempts) {
        // Send the queued message
        socket.emit('message:received', queuedMsg.message)
        
        // Notify sender of delivery
        const senderSocket = usersByUserId.get(queuedMsg.message.senderId)
        if (senderSocket) {
          io.to(senderSocket.socketId).emit('message:status', {
            messageId: queuedMsg.message.id,
            tempId: queuedMsg.message.tempId,
            status: 'delivered',
            conversationId: queuedMsg.message.conversationId,
            timestamp: new Date().toISOString()
          } as MessageStatus)
        }
        
        // Remove from queue
        queue.splice(index, 1)
      }
    })
    
    if (queue.length === 0) {
      messageQueue.delete(userId)
    }
  }
}

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`)

  // User joins with their identity
  socket.on('user:join', (data: { userId: string; username: string; phone: string }) => {
    const { userId, username, phone } = data
    
    const user: User = {
      id: userId,
      username,
      phone,
      socketId: socket.id,
      lastSeen: new Date()
    }
    
    usersByUserId.set(userId, user)
    usersBySocketId.set(socket.id, userId)
    
    // Broadcast user online status
    io.emit('user:online', { userId, username })
    
    // Send current online users to the new user
    const onlineUsers = Array.from(usersByUserId.values())
    socket.emit('users:online', onlineUsers)
    
    console.log(`${username} (${userId}) joined, online users: ${usersByUserId.size}`)
    
    // Process any queued messages for this user
    processQueuedMessages(userId, socket)
  })

  // Handle private message with temp ID for optimistic updates
  socket.on('message:private', (data: { 
    content: string
    senderId: string
    senderName: string
    receiverId: string
    conversationId: string
    tempId: string
  }) => {
    const { content, senderId, senderName, receiverId, conversationId, tempId } = data
    
    // Create message with real ID
    const message = createPrivateMessage(content, senderId, senderName, receiverId, conversationId, tempId)
    
    // Get receiver's socket
    const receiver = usersByUserId.get(receiverId)
    const sender = usersByUserId.get(senderId)
    
    // Send confirmation to sender with real message ID
    socket.emit('message:confirmed', {
      tempId,
      message,
      status: 'sent'
    })
    
    if (receiver) {
      // Receiver is online - send message directly
      io.to(receiver.socketId).emit('message:received', message)
      
      // Notify sender of delivery
      if (sender) {
        io.to(sender.socketId).emit('message:status', {
          messageId: message.id,
          tempId,
          status: 'delivered',
          conversationId,
          timestamp: new Date().toISOString()
        } as MessageStatus)
      }
      
      console.log(`Private message from ${senderName} to ${receiver.username}: ${content}`)
    } else {
      // Receiver is offline - queue the message
      console.log(`Private message from ${senderName} to offline user ${receiverId}: ${content}`)
      
      let queue = messageQueue.get(receiverId)
      if (!queue) {
        queue = []
        messageQueue.set(receiverId, queue)
      }
      
      queue.push({
        message,
        attempts: 0,
        lastAttempt: new Date(),
        maxAttempts: 10
      })
    }
  })

  // Handle message read receipt
  socket.on('message:read', (data: { 
    messageId: string
    conversationId: string
    readerId: string
    senderId: string
  }) => {
    const { messageId, conversationId, readerId, senderId } = data
    
    // Notify the original sender that their message was read
    const sender = usersByUserId.get(senderId)
    
    if (sender) {
      io.to(sender.socketId).emit('message:status', {
        messageId,
        status: 'read',
        conversationId,
        timestamp: new Date().toISOString()
      } as MessageStatus)
      
      console.log(`Message ${messageId} read by ${readerId}`)
    }
  })

  // Handle bulk read receipts for conversation
  socket.on('conversation:read', (data: { 
    conversationId: string
    readerId: string
    messageIds: string[]
    senderId: string
  }) => {
    const { conversationId, readerId, messageIds, senderId } = data
    
    const sender = usersByUserId.get(senderId)
    
    if (sender && messageIds.length > 0) {
      io.to(sender.socketId).emit('messages:read', {
        messageIds,
        status: 'read',
        conversationId,
        timestamp: new Date().toISOString()
      })
      
      console.log(`${messageIds.length} messages in conversation ${conversationId} read by ${readerId}`)
    }
  })

  // Handle typing indicator
  socket.on('typing:start', (data: { conversationId: string; userId: string; userName: string }) => {
    const { conversationId, userId, userName } = data
    
    socket.broadcast.emit('typing:indicator', {
      conversationId,
      userId,
      userName,
      isTyping: true
    } as TypingIndicator)
  })

  socket.on('typing:stop', (data: { conversationId: string; userId: string; userName: string }) => {
    const { conversationId, userId, userName } = data
    
    socket.broadcast.emit('typing:indicator', {
      conversationId,
      userId,
      userName,
      isTyping: false
    } as TypingIndicator)
  })

  // Handle message reaction
  socket.on('message:react', (data: {
    messageId: string
    conversationId: string
    userId: string
    emoji: string
    userName: string
  }) => {
    // Broadcast reaction to all participants
    io.emit('message:reaction', data)
    console.log(`${data.userName} reacted with ${data.emoji} to message ${data.messageId}`)
  })

  // Handle message delete
  socket.on('message:delete', (data: {
    messageId: string
    conversationId: string
    deletedBy: string
    deleteForEveryone: boolean
  }) => {
    if (data.deleteForEveryone) {
      // Broadcast deletion to all users
      io.emit('message:deleted', data)
      console.log(`Message ${data.messageId} deleted for everyone by ${data.deletedBy}`)
    }
  })

  // Handle message edit
  socket.on('message:edit', (data: {
    messageId: string
    conversationId: string
    newContent: string
    editedBy: string
  }) => {
    // Broadcast edit to all participants
    io.emit('message:edited', {
      ...data,
      editedAt: new Date().toISOString()
    })
    console.log(`Message ${data.messageId} edited by ${data.editedBy}`)
  })

  // Handle heartbeat for connection health
  socket.on('heartbeat', (data: { userId: string }) => {
    const user = usersByUserId.get(data.userId)
    if (user) {
      user.lastSeen = new Date()
      socket.emit('heartbeat:ack', { timestamp: new Date().toISOString() })
    }
  })

  // Handle disconnect
  socket.on('disconnect', () => {
    const userId = usersBySocketId.get(socket.id)
    
    if (userId) {
      const user = usersByUserId.get(userId)
      
      if (user) {
        // Remove user from maps
        usersByUserId.delete(userId)
        usersBySocketId.delete(socket.id)
        
        // Broadcast user offline status with last seen
        io.emit('user:offline', { 
          userId, 
          username: user.username,
          lastSeen: user.lastSeen.toISOString()
        })
        
        console.log(`${user.username} (${userId}) disconnected, online users: ${usersByUserId.size}`)
      }
    } else {
      console.log(`Unknown user disconnected: ${socket.id}`)
    }
  })

  socket.on('error', (error) => {
    console.error(`Socket error (${socket.id}):`, error)
  })
})

// Clean up stale queued messages every 5 minutes
setInterval(() => {
  const now = new Date()
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  messageQueue.forEach((queue, userId) => {
    const filtered = queue.filter(msg => {
      const age = now.getTime() - msg.lastAttempt.getTime()
      return age < maxAge && msg.attempts < msg.maxAttempts
    })
    
    if (filtered.length === 0) {
      messageQueue.delete(userId)
    } else if (filtered.length !== queue.length) {
      messageQueue.set(userId, filtered)
    }
  })
  
  console.log(`Queue cleanup: ${messageQueue.size} users with queued messages`)
}, 5 * 60 * 1000)

const PORT = parseInt(process.env.PORT || '3003', 10)
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat WebSocket server running on port ${PORT}`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down server...')
  httpServer.close(() => {
    console.log('WebSocket server closed')
    process.exit(0)
  })
})
