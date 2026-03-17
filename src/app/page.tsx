/**
 * Don Chat - Real-time messaging application with AI assistant
 * Repository: https://github.com/mnuhman/Donchat.git
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageCircle, 
  Send, 
  LogOut, 
  User, 
  Loader2, 
  Search,
  Users,
  Settings,
  Sparkles,
  Bot,
  Mail,
  Lock,
  ArrowRight
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

interface Message {
  id: string
  content: string
  senderId: string
  receiverId?: string
  createdAt: string
  sender: {
    id: string
    name: string
    avatar?: string | null
    phone: string
  }
  receiver?: {
    id: string
    name: string
  }
}

interface ChatUser {
  id: string
  name: string
  phone: string
  email?: string | null
  bio?: string | null
  avatar?: string | null
  isOnline: boolean
  lastSeen?: string | null
}

interface Conversation {
  id: string
  updatedAt: string
  participants: ChatUser[]
  messages: {
    id: string
    content: string
    sender: {
      id: string
      name: string
    }
  }[]
}

interface SocketMessage {
  id: string
  content: string
  senderId: string
  senderName: string
  receiverId: string
  conversationId: string
  timestamp: string
}

interface OnlineUser {
  id: string
  username: string
  phone: string
}

export default function DonChat() {
  const { user, isAuthenticated, setUser, logout } = useAuthStore()
  
  // Auth state
  const [isLoading, setIsLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  
  // Chat state
  const [users, setUsers] = useState<ChatUser[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [typingUser, setTypingUser] = useState<{ userId: string; userName: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMobileChat, setShowMobileChat] = useState(false)
  
  // AI Chat state
  const [isAiChat, setIsAiChat] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([])
  const [isAiThinking, setIsAiThinking] = useState(false)
  
  // Profile state
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // AI Assistant user
  const AI_USER: ChatUser = {
    id: 'ai-assistant',
    name: 'Don AI',
    phone: 'AI',
    email: 'ai@donchat.com',
    bio: 'I am Don AI, your intelligent assistant!',
    avatar: null,
    isOnline: true,
    lastSeen: null
  }

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [setUser])

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    }
  }, [])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations)
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err)
    }
  }, [])

  // Fetch messages
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
  }, [])

  // Fetch users and conversations when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      void Promise.all([fetchUsers(), fetchConversations()])
    }
  }, [isAuthenticated, user, fetchUsers, fetchConversations])

  // Initialize socket when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const socketInstance = io('/?XTransformPort=3003', {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
      })

      socketRef.current = socketInstance

      socketInstance.on('connect', () => {
        setIsConnected(true)
        socketInstance.emit('user:join', { 
          userId: user.id,
          username: user.name,
          phone: user.phone || ''
        })
      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)
      })

      socketInstance.on('users:online', (onlineUsersList: OnlineUser[]) => {
        setOnlineUsers(onlineUsersList)
      })

      socketInstance.on('user:online', (data: OnlineUser) => {
        setOnlineUsers(prev => {
          if (!prev.find(u => u.id === data.id)) {
            return [...prev, data]
          }
          return prev
        })
        setUsers(prev => prev.map(u => 
          u.id === data.id ? { ...u, isOnline: true } : u
        ))
      })

      socketInstance.on('user:offline', (data: { userId: string }) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== data.userId))
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isOnline: false, lastSeen: new Date().toISOString() } : u
        ))
      })

      socketInstance.on('message:received', (msg: SocketMessage) => {
        if (selectedConversation?.id === msg.conversationId) {
          const newMessage: Message = {
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            createdAt: msg.timestamp,
            sender: {
              id: msg.senderId,
              name: msg.senderName,
              phone: '',
            }
          }
          setMessages(prev => [...prev, newMessage])
        }
        void fetchConversations()
      })

      socketInstance.on('typing:indicator', (data: { userId: string; userName: string; isTyping: boolean }) => {
        if (data.isTyping && data.userId !== user?.id) {
          setTypingUser({ userId: data.userId, userName: data.userName })
        } else {
          setTypingUser(null)
        }
      })

      return () => {
        socketInstance.disconnect()
      }
    }
  }, [isAuthenticated, user, selectedConversation?.id, fetchConversations])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser])

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setIsAuthLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setAuthError(data.error || 'Login failed')
        return
      }

      setUser(data.user)
      setAuthEmail('')
      setAuthPassword('')
    } catch {
      setAuthError('Failed to login. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setIsAuthLoading(true)

    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters')
      setIsAuthLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setAuthError(data.error || 'Registration failed')
        return
      }

      setUser(data.user)
      setAuthName('')
      setAuthEmail('')
      setAuthPassword('')
    } catch {
      setAuthError('Failed to create account. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const startConversation = async (recipient: ChatUser) => {
    setSelectedUser(recipient)
    setIsAiChat(false)
    setAiMessages([])
    
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: recipient.id })
      })

      if (res.ok) {
        const data = await res.json()
        setSelectedConversation(data.conversation)
        setMessages([])
        void fetchMessages(data.conversation.id)
        void fetchConversations()
        setShowMobileChat(true)
      }
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
  }

  const selectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setIsAiChat(false)
    setAiMessages([])
    const otherParticipant = conversation.participants.find(p => p.id !== user?.id)
    setSelectedUser(otherParticipant || null)
    void fetchMessages(conversation.id)
    setShowMobileChat(true)
  }

  const sendMessage = useCallback(async () => {
    if (!inputMessage.trim() || !socketRef.current || !user || !selectedConversation || !selectedUser) return

    const messageContent = inputMessage.trim()
    setInputMessage('')

    socketRef.current.emit('typing:stop', {
      conversationId: selectedConversation.id,
      userId: user.id,
      userName: user.name
    })

    socketRef.current.emit('message:private', {
      content: messageContent,
      senderId: user.id,
      senderName: user.name,
      receiverId: selectedUser.id,
      conversationId: selectedConversation.id
    })

    try {
      await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: messageContent,
          receiverId: selectedUser.id
        })
      })
    } catch (err) {
      console.error('Failed to save message:', err)
    }

    void fetchConversations()
  }, [inputMessage, user, selectedConversation, selectedUser, fetchConversations])

  const handleInputChange = (value: string) => {
    setInputMessage(value)
    
    if (socketRef.current && selectedConversation && user) {
      if (value.trim()) {
        socketRef.current.emit('typing:start', {
          conversationId: selectedConversation.id,
          userId: user.id,
          userName: user.name
        })
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
        
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit('typing:stop', {
            conversationId: selectedConversation.id,
            userId: user.id,
            userName: user.name
          })
        }, 3000)
      }
    }
  }

  // Start AI Chat
  const startAiChat = () => {
    setIsAiChat(true)
    setSelectedUser(AI_USER)
    setSelectedConversation(null)
    setMessages([])
    setShowMobileChat(true)
  }

  // Send message to AI
  const sendAiMessage = useCallback(async () => {
    if (!inputMessage.trim() || isAiThinking) return

    const messageContent = inputMessage.trim()
    setInputMessage('')

    const userMessage = { role: 'user', content: messageContent }
    const updatedMessages = [...aiMessages, userMessage]
    setAiMessages(updatedMessages)
    setIsAiThinking(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversationId: user?.id || 'default',
          history: aiMessages
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setAiMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
      }
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }])
    } finally {
      setIsAiThinking(false)
    }
  }, [inputMessage, isAiThinking, aiMessages, user?.id])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isAiChat) {
        void sendAiMessage()
      } else {
        void sendMessage()
      }
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const confirmLogout = async () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    await fetch('/api/auth/logout', { method: 'POST' })
    logout()
    setMessages([])
    setConversations([])
    setUsers([])
    setShowLogoutConfirm(false)
  }

  const openProfile = () => {
    if (user) {
      setProfileName(user.name || '')
      setProfileEmail(user.email || '')
      setProfileBio(user.bio || '')
      setProfileAvatar(user.avatar || '')
      setShowProfile(true)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setProfileAvatar(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const saveProfile = async () => {
    setIsSavingProfile(true)
    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
          bio: profileBio,
          avatar: profileAvatar || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        setUser(data.user)
        setShowProfile(false)
      }
    } catch (err) {
      console.error('Failed to save profile:', err)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return 'Offline'
    const date = new Date(lastSeen)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `Last seen ${days}d ago`
    if (hours > 0) return `Last seen ${hours}h ago`
    if (minutes > 0) return `Last seen ${minutes}m ago`
    return 'Just now'
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-sky-500" />
          <p className="text-sky-400">Loading Don Chat...</p>
        </div>
      </div>
    )
  }

  // Auth pages - Login & Register
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-teal-500/10 px-6 py-4 md:px-10">
          <div className="flex items-center gap-2 text-teal-600">
            <div className="w-8 h-8 flex items-center justify-center bg-teal-600/10 rounded-lg">
              <MessageCircle className="text-teal-600 h-5 w-5" />
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">donchat</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-sm text-slate-500 dark:text-slate-400">
              {authMode === 'login' ? "New to donchat?" : "Already have an account?"}
            </span>
            <button 
              onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}
              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-teal-600/10 text-teal-600 text-sm font-bold leading-normal hover:bg-teal-600/20 transition-colors"
            >
              <span className="truncate">{authMode === 'login' ? 'Register' : 'Login'}</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 md:p-10">
          <div className="bg-white dark:bg-slate-800/50 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-xl shadow-xl overflow-hidden border border-teal-500/5">
            {/* Hero Section - Left Side */}
            <div className="hidden lg:flex flex-col justify-center p-12 bg-teal-600 relative overflow-hidden text-white">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <h1 className="text-4xl font-extrabold mb-4 leading-tight">Connect instantly with your community</h1>
                <p className="text-teal-100 text-lg opacity-90 leading-relaxed">
                  Join thousands of teams using donchat to streamline their communication and boost productivity in a clean, focused environment.
                </p>
                <div className="mt-12 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-full">
                      <Lock className="h-5 w-5" />
                    </div>
                    <span>End-to-end encryption by default</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-full">
                      <Bot className="h-5 w-5" />
                    </div>
                    <span>AI-powered assistant built-in</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-2 rounded-full">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <span>Real-time low-latency messaging</span>
                  </div>
                </div>
              </div>
              {/* Decorative Background Element */}
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            {/* Form Section - Right Side */}
            <div className="flex flex-col justify-center p-8 md:p-16 lg:p-20 bg-white dark:bg-slate-900">
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {authMode === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  {authMode === 'login' ? 'Please enter your details to sign in' : 'Enter your details to get started'}
                </p>
              </div>

              {authError && (
                <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm">
                  {authError}
                </div>
              )}

              <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-6">
                {authMode === 'register' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Your name"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        required
                        className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-teal-500/20 dark:border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="email"
                      placeholder="alex@company.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-teal-500/20 dark:border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      required
                      className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-teal-500/20 dark:border-teal-500/10 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-teal-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-teal-700 shadow-lg shadow-teal-600/20 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {authMode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'login' ? 'Login' : 'Create Account'}
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>

                <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8">
                  {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}
                    className="text-teal-600 font-bold hover:underline"
                  >
                    {authMode === 'login' ? 'Register for free' : 'Sign in'}
                  </button>
                </p>
              </form>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-10 py-6 border-t border-teal-500/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 uppercase tracking-widest font-medium">
            <p>© 2024 donchat inc. all rights reserved.</p>
            <div className="flex gap-6">
              <a className="hover:text-teal-600 transition-colors cursor-pointer">Privacy Policy</a>
              <a className="hover:text-teal-600 transition-colors cursor-pointer">Terms of Service</a>
              <a className="hover:text-teal-600 transition-colors cursor-pointer">Help Center</a>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Chat interface
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900">
      <header className="border-b border-sky-900 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-teal-600 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Don Chat</h1>
              <p className="text-xs text-sky-400">
                {isConnected ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Disconnected
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || undefined} />
                <AvatarFallback className="bg-sky-500/20 text-sky-400 text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-sky-400">{user?.email}</p>
              </div>
            </div>
            
            <Avatar className="h-8 w-8 sm:hidden">
              <AvatarImage src={user?.avatar || undefined} />
              <AvatarFallback className="bg-sky-500/20 text-sky-400 text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={openProfile}
              className="text-sky-400 hover:text-white hover:bg-sky-900"
            >
              <Settings className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="text-sky-400 border-sky-800 hover:text-white hover:bg-sky-900 hover:border-sky-700 gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex container mx-auto px-4 py-4 gap-4 overflow-hidden">
        <aside className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col flex-shrink-0`}>
          <Card className="bg-slate-900/50 border-sky-900 flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-white text-lg">Messages</CardTitle>
                <Badge variant="secondary" className="bg-sky-500/20 text-sky-400">
                  {onlineUsers.length} online
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-700" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-sky-900/50 border-sky-800 text-white placeholder:text-sky-700"
                />
              </div>
            </CardHeader>
            
            <Separator className="bg-sky-900" />
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {/* AI Assistant Section */}
                <div className="mb-4">
                  <p className="text-xs text-sky-700 px-2 mb-2 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    AI Assistant
                  </p>
                  <button
                    onClick={startAiChat}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isAiChat 
                        ? 'bg-gradient-to-r from-purple-500/20 to-sky-500/20 border border-purple-500/30' 
                        : 'hover:bg-sky-900/50'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 bg-gradient-to-br from-purple-500 to-sky-500">
                        <AvatarFallback className="bg-transparent text-white">
                          <Bot className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-gradient-to-r from-purple-500 to-sky-500 rounded-full border-2 border-slate-900 animate-pulse" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate">Don AI</p>
                      <p className="text-xs text-purple-400 truncate">Ask me anything!</p>
                    </div>
                  </button>
                </div>

                {conversations.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-sky-700 px-2 mb-2">Recent Chats</p>
                    {conversations.map((conv) => {
                      const otherUser = conv.participants?.find(p => p.id !== user?.id)
                      const lastMessage = conv.messages?.[0]
                      const isSelected = selectedConversation?.id === conv.id
                      
                      if (!otherUser) return null
                      
                      return (
                        <button
                          key={conv.id}
                          onClick={() => selectConversation(conv)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-sky-500/20' 
                              : 'hover:bg-sky-900/50'
                          }`}
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={otherUser.avatar || undefined} />
                              <AvatarFallback className="bg-sky-900 text-sky-300">
                                {otherUser.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {onlineUsers.some(u => u.id === otherUser.id) && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-sky-500 rounded-full border-2 border-slate-900" />
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">{otherUser.name}</p>
                            <p className="text-xs text-sky-400 truncate">
                              {lastMessage ? (
                                `${lastMessage.sender.id === user?.id ? 'You: ' : ''}${lastMessage.content}`
                              ) : (
                                'Start chatting...'
                              )}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-sky-700 px-2 mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    All Users
                  </p>
                  {filteredUsers.length === 0 ? (
                    <p className="text-sm text-sky-700 text-center py-4">No users found</p>
                  ) : (
                    filteredUsers.map((u) => {
                      const isOnline = onlineUsers.some(ou => ou.id === u.id)
                      
                      return (
                        <button
                          key={u.id}
                          onClick={() => startConversation(u)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-sky-900/50 transition-colors"
                        >
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={u.avatar || undefined} />
                              <AvatarFallback className="bg-sky-900 text-sky-300">
                                {u.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {isOnline && (
                              <span className="absolute bottom-0 right-0 w-3 h-3 bg-sky-500 rounded-full border-2 border-slate-900" />
                            )}
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-white truncate">{u.name}</p>
                            <p className="text-xs text-sky-400 truncate">
                              {isOnline ? 'Online' : formatLastSeen(u.lastSeen)}
                            </p>
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </ScrollArea>
          </Card>
        </aside>
        
        <main className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
          {selectedUser ? (
            <Card className="bg-slate-900/50 border-sky-900 flex-1 flex flex-col overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-sky-900 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-sky-400"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ArrowRight className="h-5 w-5 rotate-180" />
                </Button>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedUser.avatar || undefined} />
                  <AvatarFallback className={isAiChat ? "bg-gradient-to-br from-purple-500 to-sky-500 text-white" : "bg-sky-900 text-sky-300"}>
                    {isAiChat ? <Bot className="h-5 w-5" /> : selectedUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-white">{selectedUser.name}</p>
                  <p className="text-xs text-sky-400">
                    {isAiChat ? 'AI Assistant' : (onlineUsers.some(u => u.id === selectedUser.id) ? 'Online' : formatLastSeen(selectedUser.lastSeen))}
                  </p>
                </div>
              </div>
              
              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {isAiChat ? (
                    aiMessages.length === 0 ? (
                      <div className="text-center py-8">
                        <Bot className="h-12 w-12 text-sky-400 mx-auto mb-3" />
                        <p className="text-sky-400">Hi! I'm Don AI. How can I help you today?</p>
                      </div>
                    ) : (
                      aiMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              msg.role === 'user'
                                ? 'bg-sky-600 text-white'
                                : 'bg-slate-800 text-sky-100'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        </div>
                      ))
                    )
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="h-12 w-12 text-sky-400 mx-auto mb-3" />
                      <p className="text-sky-400">Start a conversation with {selectedUser.name}</p>
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            msg.senderId === user?.id
                              ? 'bg-sky-600 text-white'
                              : 'bg-slate-800 text-sky-100'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {typingUser && !isAiChat && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-sky-100 rounded-lg p-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {isAiThinking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800 text-sky-100 rounded-lg p-3">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
              
              {/* Input */}
              <div className="p-4 border-t border-sky-900">
                <div className="flex gap-2">
                  <Input
                    placeholder={isAiChat ? "Ask Don AI..." : "Type a message..."}
                    value={inputMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isAiThinking}
                    className="bg-sky-900/50 border-sky-800 text-white placeholder:text-sky-700"
                  />
                  <Button 
                    onClick={isAiChat ? sendAiMessage : sendMessage}
                    disabled={!inputMessage.trim() || (isAiChat && isAiThinking)}
                    className="bg-gradient-to-r from-sky-500 to-teal-600 hover:from-sky-600 hover:to-teal-700"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-slate-900/50 border-sky-900 flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-16 w-16 text-sky-400 mx-auto mb-4" />
                <p className="text-sky-400 text-lg">Select a conversation to start chatting</p>
              </div>
            </Card>
          )}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="bg-slate-900 border-sky-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-sky-400">
              Are you sure you want to logout? You will need to login again to access your messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-sky-800 text-sky-400 hover:bg-sky-900">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmLogout}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile Dialog */}
      <Dialog open={showProfile} onOpenChange={setShowProfile}>
        <DialogContent className="bg-slate-900 border-sky-900">
          <DialogHeader>
            <DialogTitle className="text-white">Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex justify-center">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profileAvatar} />
                  <AvatarFallback className="bg-sky-900 text-sky-300 text-2xl">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 p-1 bg-sky-600 rounded-full cursor-pointer hover:bg-sky-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sky-300">Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-sky-900/50 border-sky-800 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sky-300">Email</Label>
              <Input
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="bg-sky-900/50 border-sky-800 text-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sky-300">Bio</Label>
              <Textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="bg-sky-900/50 border-sky-800 text-white resize-none"
                rows={3}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowProfile(false)}
                className="flex-1 border-sky-800 text-sky-400 hover:bg-sky-900"
              >
                Cancel
              </Button>
              <Button
                onClick={saveProfile}
                disabled={isSavingProfile}
                className="flex-1 bg-gradient-to-r from-sky-500 to-teal-600"
              >
                {isSavingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
