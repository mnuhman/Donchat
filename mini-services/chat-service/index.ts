/**
 * Don Chat - WebSocket Server
 * Repository: https://github.com/mnuhman/Donchat.git
 * 
 * Real-time messaging service using Socket.io
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
}

interface PrivateMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  receiverId: string
  conversationId: string
  timestamp: string
}

interface TypingIndicator {
  conversationId: string
  userId: string
  userName: string
  isTyping: boolean
}

// Map of userId -> User (for quick lookup)
const usersByUserId = new Map<string, User>()
// Map of socketId -> userId
const usersBySocketId = new Map<string, string>()

const generateMessageId = () => Math.random().toString(36).substr(2, 9)

const createPrivateMessage = (
  content: string, 
  senderId: string, 
  senderName: string, 
  receiverId: string,
  conversationId: string
): PrivateMessage => ({
  id: generateMessageId(),
  content,
  senderId,
  senderName,
  receiverId,
  conversationId,
  timestamp: new Date().toISOString()
})

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`)

  // User joins with their identity
  socket.on('user:join', (data: { userId: string; username: string; phone: string }) => {
    const { userId, username, phone } = data
    
    const user: User = {
      id: userId,
      username,
      phone,
      socketId: socket.id
    }
    
    usersByUserId.set(userId, user)
    usersBySocketId.set(socket.id, userId)
    
    // Broadcast user online status
    io.emit('user:online', { userId, username })
    
    // Send current online users to the new user
    const onlineUsers = Array.from(usersByUserId.values())
    socket.emit('users:online', onlineUsers)
    
    console.log(`${username} (${userId}) joined, online users: ${usersByUserId.size}`)
  })

  // Handle private message
  socket.on('message:private', (data: { 
    content: string
    senderId: string
    senderName: string
    receiverId: string
    conversationId: string
  }) => {
    const { content, senderId, senderName, receiverId, conversationId } = data
    
    // Create message
    const message = createPrivateMessage(content, senderId, senderName, receiverId, conversationId)
    
    // Get receiver's socket
    const receiver = usersByUserId.get(receiverId)
    
    // Send to sender (for confirmation)
    socket.emit('message:received', message)
    
    // Send to receiver if online
    if (receiver) {
      io.to(receiver.socketId).emit('message:received', message)
      console.log(`Private message from ${senderName} to ${receiver.username}: ${content}`)
    } else {
      console.log(`Private message from ${senderName} to offline user ${receiverId}: ${content}`)
    }
  })

  // Handle typing indicator
  socket.on('typing:start', (data: { conversationId: string; userId: string; userName: string }) => {
    const { conversationId, userId, userName } = data
    
    // Find all participants in the conversation and notify them
    // For now, we broadcast to all (in real app, you'd track conversation participants)
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

  // Handle disconnect
  socket.on('disconnect', () => {
    const userId = usersBySocketId.get(socket.id)
    
    if (userId) {
      const user = usersByUserId.get(userId)
      
      if (user) {
        // Remove user from maps
        usersByUserId.delete(userId)
        usersBySocketId.delete(socket.id)
        
        // Broadcast user offline status
        io.emit('user:offline', { userId, username: user.username })
        
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

const PORT = 3003
httpServer.listen(PORT, () => {
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
