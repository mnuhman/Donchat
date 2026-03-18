/**
 * DonChat - WhatsApp-Style Chat Application
 * Repository: https://github.com/mnuhman/Donchat.git
 * 
 * Features:
 * - Private, Group, Broadcast, AI, and Secret chats
 * - Real-time messaging with WebSocket
 * - Message reactions, replies, forwarding, starring
 * - Emoji picker
 * - Theme toggle (light/dark)
 * - Typing indicators & read receipts
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  ArrowRight,
  Video,
  Phone,
  MoreVertical,
  CheckCheck,
  Paperclip,
  Smile,
  FileText,
  Archive,
  Plus,
  ChevronLeft,
  X,
  Bell,
  Ban,
  Image as ImageIcon,
  File,
  Mic,
  Star,
  Reply,
  Forward,
  Trash2,
  Copy,
  Check,
  Moon,
  Sun,
  Shield,
  Globe,
  Hash,
  UserPlus,
  Edit3,
  CheckCircle2,
  Clock,
  SmilePlus,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

// Types
interface Message {
  id: string
  tempId?: string // Temporary ID for optimistic updates
  content: string
  type: string
  mediaUrl?: string
  senderId: string
  receiverId?: string
  conversationId: string
  replyToId?: string
  replyTo?: Message
  isEdited: boolean
  isForwarded: boolean
  deletedAt?: string
  readBy?: string
  createdAt: string
  updatedAt: string
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  reactions: MessageReaction[]
  sender: {
    id: string
    name: string
    avatar?: string | null
  }
  _optimistic?: boolean // Flag for optimistic UI updates
}

interface MessageReaction {
  id: string
  emoji: string
  userId: string
}

interface ChatUser {
  id: string
  name: string
  email?: string | null
  bio?: string | null
  avatar?: string | null
  status?: string | null
  isOnline: boolean
  lastSeen?: string | null
}

interface Conversation {
  id: string
  type: string
  name?: string | null
  avatar?: string | null
  updatedAt: string
  participants: ChatUser[]
  lastMessage?: {
    id: string
    content: string
    sender: {
      id: string
      name: string
    }
  } | null
}

interface SocketMessage {
  id: string
  tempId?: string
  content: string
  senderId: string
  senderName: string
  receiverId: string
  conversationId: string
  timestamp: string
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
}

interface MessageStatus {
  messageId: string
  tempId?: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  conversationId: string
  timestamp: string
}

interface OnlineUser {
  id: string
  username: string
}

// Emoji picker data
const EMOJI_CATEGORIES = {
  'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯'],
  'Gestures': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️'],
  'Objects': ['🎉', '🎊', '🎈', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '⚽', '🏀', '🎮', '🎯', '🎬', '🎤', '🎧', '🎵', '🎶', '.instrument', '📱', '💻', '⌨️', '🖥️', '🖨️', '📷', '📹', '🎥', '📺', '📻', '⏰', '⌚', '💡', ' 🔦', '📱', '🔋', '🔌', '💰', '💵', '💳', '📧', '📨', '📩', '📤', '📥', '📦', '📫', '📬', '✉️', '📝', '📄', '📃', '📑', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📋', '📍', '📎', '🖇️', '📏', '📐', '✂️', '🗃️', '🗄️', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚'],
}

const MESSAGE_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

export default function DonChat() {
  const { user, isAuthenticated, setUser, logout } = useAuthStore()
  const { toast } = useToast()
  
  // Auth state
  const [isLoading, setIsLoading] = useState(true)
  const [authStep, setAuthStep] = useState<'email' | 'otp'>('email')
  const [authEmail, setAuthEmail] = useState('')
  const [authOtp, setAuthOtp] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [emailExists, setEmailExists] = useState<boolean | null>(null)
  const [otpTimer, setOtpTimer] = useState(0)
  const [canResendOtp, setCanResendOtp] = useState(false)
  const [autoLoginDetected, setAutoLoginDetected] = useState(false)
  const [deviceFingerprint, setDeviceFingerprint] = useState('')
  
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
  const [showRightSidebar, setShowRightSidebar] = useState(true)
  const [showNewMessageBadge, setShowNewMessageBadge] = useState(false)
  const [isAtBottom, setIsAtBottom] = useState(true)
  
  // AI Chat state
  const [isAiChat, setIsAiChat] = useState(false)
  const [aiMessages, setAiMessages] = useState<Array<{ role: string; content: string }>>([])
  const [isAiThinking, setIsAiThinking] = useState(false)
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true)
  
  // Profile state
  const [showProfile, setShowProfile] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileAvatar, setProfileAvatar] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  // Message actions state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  
  // New chat state
  const [showNewChatDialog, setShowNewChatDialog] = useState(false)
  const [newChatType, setNewChatType] = useState<'PRIVATE' | 'GROUP' | 'BROADCAST' | 'SECRET'>('PRIVATE')
  const [newChatName, setNewChatName] = useState('')
  
  // Delete confirmation states
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null)
  const [showDeleteChatConfirm, setShowDeleteChatConfirm] = useState(false)
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set())
  const [isMuted, setIsMuted] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)
  
  // Real-time messaging states
  const [pendingMessages, setPendingMessages] = useState<Map<string, Message>>(new Map())
  const [offlineQueue, setOfflineQueue] = useState<Message[]>([])
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('excellent')
  
  // Scroll-based navbar state
  const [isNavbarVisible, setIsNavbarVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Assistant user
  const AI_USER: ChatUser = {
    id: 'ai-assistant',
    name: 'Don AI',
    email: 'ai@donchat.com',
    bio: 'I am Don AI, your intelligent assistant! Ask me anything.',
    avatar: null,
    status: 'Always ready to help',
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

  // Theme effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

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
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })

      socketRef.current = socketInstance

      socketInstance.on('connect', () => {
        setIsConnected(true)
        setConnectionQuality('excellent')
        socketInstance.emit('user:join', { 
          userId: user.id,
          username: user.name,
        })
        
        // Process offline queue when reconnected
        if (offlineQueue.length > 0) {
          offlineQueue.forEach(msg => {
            socketInstance.emit('message:private', {
              content: msg.content,
              senderId: msg.senderId,
              senderName: user.name,
              receiverId: msg.receiverId,
              conversationId: msg.conversationId,
              tempId: msg.tempId
            })
          })
          setOfflineQueue([])
        }
      })

      socketInstance.on('disconnect', () => {
        setIsConnected(false)
        setConnectionQuality('disconnected')
      })

      socketInstance.on('connect_error', () => {
        setConnectionQuality('poor')
      })

      socketInstance.on('reconnect_attempt', (attemptNumber) => {
        setConnectionQuality(attemptNumber > 3 ? 'poor' : 'good')
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

      socketInstance.on('user:offline', (data: { userId: string; lastSeen?: string }) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== data.userId))
        setUsers(prev => prev.map(u => 
          u.id === data.userId ? { ...u, isOnline: false, lastSeen: data.lastSeen || new Date().toISOString() } : u
        ))
      })

      // Handle message confirmation from server
      socketInstance.on('message:confirmed', (data: { tempId: string; message: SocketMessage; status: string }) => {
        // Remove from pending and add to messages
        setPendingMessages(prev => {
          const newMap = new Map(prev)
          newMap.delete(data.tempId)
          return newMap
        })
        
        // Update the message with real ID and status
        setMessages(prev => prev.map(msg => {
          if (msg.tempId === data.tempId) {
            return {
              ...msg,
              id: data.message.id,
              status: 'sent',
              _optimistic: false
            }
          }
          return msg
        }))
      })

      // Handle message status updates (delivered, read)
      socketInstance.on('message:status', (data: MessageStatus) => {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.messageId || msg.tempId === data.tempId) {
            return { ...msg, status: data.status }
          }
          return msg
        }))
      })

      // Handle incoming messages
      socketInstance.on('message:received', (msg: SocketMessage) => {
        // Check if message already exists (avoid duplicates)
        const messageExists = messages.some(m => m.id === msg.id)
        
        if (!messageExists) {
          const newMessage: Message = {
            id: msg.id,
            tempId: msg.tempId,
            content: msg.content,
            type: 'TEXT',
            senderId: msg.senderId,
            receiverId: msg.receiverId,
            conversationId: msg.conversationId,
            createdAt: msg.timestamp,
            updatedAt: msg.timestamp,
            isEdited: false,
            isForwarded: false,
            status: msg.status || 'delivered',
            reactions: [],
            sender: {
              id: msg.senderId,
              name: msg.senderName,
            }
          }
          
          // Add message with animation
          setMessages(prev => [...prev, newMessage])
          
          // Send read receipt if chat is active and user is at bottom
          if (selectedConversation?.id === msg.conversationId && isAtBottom) {
            socketInstance.emit('message:read', {
              messageId: msg.id,
              conversationId: msg.conversationId,
              readerId: user.id,
              senderId: msg.senderId
            })
          } else if (selectedConversation?.id === msg.conversationId && !isAtBottom) {
            setShowNewMessageBadge(true)
          }
        }
        void fetchConversations()
      })

      // Handle messages read event
      socketInstance.on('messages:read', (data: { messageIds: string[]; status: string; conversationId: string; timestamp: string }) => {
        setMessages(prev => prev.map(msg => {
          if (data.messageIds.includes(msg.id)) {
            return { ...msg, status: 'read' }
          }
          return msg
        }))
      })

      // Handle typing indicator
      socketInstance.on('typing:indicator', (data: { userId: string; userName: string; isTyping: boolean }) => {
        if (data.isTyping && data.userId !== user?.id) {
          setTypingUser({ userId: data.userId, userName: data.userName })
        } else {
          setTypingUser(null)
        }
      })

      // Heartbeat for connection health
      const heartbeatInterval = setInterval(() => {
        if (socketInstance.connected) {
          socketInstance.emit('heartbeat', { userId: user.id })
        }
      }, 30000)

      return () => {
        clearInterval(heartbeatInterval)
        socketInstance.disconnect()
      }
    }
  }, [isAuthenticated, user, selectedConversation?.id, fetchConversations, offlineQueue, isAtBottom, messages])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingUser, aiMessages])

  // Close emoji picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false)
        setShowReactionPicker(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll-based navbar hide/show
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < 10) {
        // At the top, always show navbar
        setIsNavbarVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down & past threshold, hide navbar
        setIsNavbarVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up, show navbar
        setIsNavbarVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Generate device fingerprint
  const generateDeviceFingerprint = useCallback(() => {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.colorDepth.toString(),
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || 'unknown'
    ]
    return btoa(components.join('|')).substring(0, 32)
  }, [])

  // Initialize device fingerprint on mount
  useEffect(() => {
    setDeviceFingerprint(generateDeviceFingerprint())
  }, [generateDeviceFingerprint])

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => {
        setOtpTimer(otpTimer - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (otpTimer === 0 && authStep === 'otp') {
      setCanResendOtp(true)
    }
  }, [otpTimer, authStep])

  // Format timer as MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Check email and send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setIsAuthLoading(true)

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(authEmail)) {
      setAuthError('Please enter a valid email address')
      setIsAuthLoading(false)
      return
    }

    try {
      // Check if email exists
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      })
      const checkData = await checkRes.json()

      setEmailExists(checkData.exists)

      if (checkData.exists) {
        // Existing user - show auto-login indicator
        setAutoLoginDetected(true)
        
        // Simulate auto-login (in production, verify trusted device)
        setTimeout(() => {
          // For now, still send OTP for security
          void sendOtp()
        }, 1500)
      } else {
        // New user - send OTP
        await sendOtp()
      }
    } catch {
      setAuthError('Failed to check email. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  // Send OTP
  const sendOtp = async () => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail })
      })

      const data = await res.json()

      if (!res.ok) {
        setAuthError(data.error || 'Failed to send OTP')
        return
      }

      setAuthStep('otp')
      setOtpTimer(120) // 2 minutes
      setCanResendOtp(false)
      setAutoLoginDetected(false)
      setAuthError('')

      toast({
        title: 'OTP Sent',
        description: `Verification code sent to ${authEmail}`
      })
    } catch {
      setAuthError('Failed to send OTP. Please try again.')
    }
  }

  // Verify OTP
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setAuthError('')
    setIsAuthLoading(true)

    if (authOtp.length !== 6) {
      setAuthError('Please enter a valid 6-digit code')
      setIsAuthLoading(false)
      return
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: authEmail, 
          otp: authOtp,
          deviceFingerprint,
          rememberDevice: true
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setAuthError(data.error || 'Verification failed')
        return
      }

      setUser(data.user)
      setAuthEmail('')
      setAuthOtp('')
      setAuthStep('email')
      setEmailExists(null)

      toast({
        title: data.isNewUser ? 'Welcome to DonChat!' : 'Welcome back!',
        description: data.isNewUser ? 'Your account has been created' : 'Successfully logged in'
      })
    } catch {
      setAuthError('Verification failed. Please try again.')
    } finally {
      setIsAuthLoading(false)
    }
  }

  // Handle OTP input change
  const handleOtpChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6)
    setAuthOtp(numericValue)
    
    // Auto-verify when 6 digits entered
    if (numericValue.length === 6) {
      setTimeout(() => {
        void handleVerifyOtp()
      }, 100)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setCanResendOtp(false)
    setOtpTimer(120)
    setAuthOtp('')
    await sendOtp()
  }

  // Go back to email step
  const handleBackToEmail = () => {
    setAuthStep('email')
    setAuthOtp('')
    setAuthError('')
    setEmailExists(null)
    setAutoLoginDetected(false)
    setOtpTimer(0)
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
    if (!inputMessage.trim() || !user || !selectedConversation || !selectedUser) return

    const messageContent = inputMessage.trim()
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      content: messageContent,
      type: 'TEXT',
      senderId: user.id,
      receiverId: selectedUser.id,
      conversationId: selectedConversation.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isEdited: false,
      isForwarded: false,
      status: 'sending',
      reactions: [],
      _optimistic: true,
      sender: {
        id: user.id,
        name: user.name,
        avatar: user.avatar
      }
    }
    
    // Add message to UI immediately (optimistic update)
    setMessages(prev => [...prev, optimisticMessage])
    setInputMessage('')
    setReplyingTo(null)
    
    // Stop typing indicator
    if (socketRef.current) {
      socketRef.current.emit('typing:stop', {
        conversationId: selectedConversation.id,
        userId: user.id,
        userName: user.name
      })
    }

    // Check if connected
    if (!isConnected || !socketRef.current) {
      // Add to offline queue
      setOfflineQueue(prev => [...prev, optimisticMessage])
      setPendingMessages(prev => new Map(prev).set(tempId, optimisticMessage))
      toast({
        title: 'Offline',
        description: 'Message will be sent when connection is restored',
      })
      return
    }

    // Send via WebSocket with temp ID
    socketRef.current.emit('message:private', {
      tempId,
      content: messageContent,
      senderId: user.id,
      senderName: user.name,
      receiverId: selectedUser.id,
      conversationId: selectedConversation.id,
      replyToId: replyingTo?.id
    })

    // Save to database
    try {
      const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: messageContent,
          receiverId: selectedUser.id,
          replyToId: replyingTo?.id
        })
      })
      
      if (!res.ok) {
        // Update message status to failed
        setMessages(prev => prev.map(msg => 
          msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
        ))
        throw new Error('Failed to save message')
      }
      
      const data = await res.json()
      
      // Update with real message ID from server
      if (data.message) {
        setMessages(prev => prev.map(msg => 
          msg.tempId === tempId ? { 
            ...msg, 
            id: data.message.id, 
            status: 'sent',
            _optimistic: false 
          } : msg
        ))
      }
    } catch (err) {
      console.error('Failed to save message:', err)
      toast({
        title: 'Error',
        description: 'Failed to send message. Click to retry.',
        variant: 'destructive'
      })
    }

    void fetchConversations()
  }, [inputMessage, user, selectedConversation, selectedUser, fetchConversations, replyingTo, isConnected, toast])

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
    setReplyingTo(null)

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

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString()
  }

  // Message actions
  const handleReply = (message: Message) => {
    setReplyingTo(message)
  }

  const handleCopy = async (content: string, messageId: string) => {
    await navigator.clipboard.writeText(content)
    setCopiedMessageId(messageId)
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const handleForward = (message: Message) => {
    setForwardingMessage(message)
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })
      // Refresh messages
      if (selectedConversation) {
        void fetchMessages(selectedConversation.id)
      }
    } catch (err) {
      console.error('Failed to add reaction:', err)
    }
    setShowReactionPicker(null)
  }

  const insertEmoji = (emoji: string) => {
    setInputMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  // Delete message handler
  const handleDeleteMessage = (message: Message) => {
    setMessageToDelete(message)
    setShowDeleteMessageConfirm(true)
  }

  const confirmDeleteMessage = async () => {
    if (!messageToDelete || !selectedConversation) return

    try {
      const res = await fetch(`/api/conversations/${selectedConversation.id}/messages?messageId=${messageToDelete.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageToDelete.id))
        toast({
          title: 'Message deleted',
          description: 'The message has been deleted successfully.'
        })
      }
    } catch (err) {
      console.error('Failed to delete message:', err)
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive'
      })
    } finally {
      setShowDeleteMessageConfirm(false)
      setMessageToDelete(null)
    }
  }

  // Delete conversation handler
  const handleDeleteChat = () => {
    setShowDeleteChatConfirm(true)
  }

  const confirmDeleteChat = async () => {
    if (!selectedConversation) return

    try {
      const res = await fetch(`/api/conversations/${selectedConversation.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setConversations(prev => prev.filter(c => c.id !== selectedConversation.id))
        setSelectedConversation(null)
        setSelectedUser(null)
        setMessages([])
        setShowMobileChat(false)
        toast({
          title: 'Chat deleted',
          description: 'The conversation has been deleted successfully.'
        })
      }
    } catch (err) {
      console.error('Failed to delete chat:', err)
      toast({
        title: 'Error',
        description: 'Failed to delete chat',
        variant: 'destructive'
      })
    } finally {
      setShowDeleteChatConfirm(false)
    }
  }

  // Star message handler
  const handleStarMessage = (messageId: string) => {
    setStarredMessages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(messageId)) {
        newSet.delete(messageId)
        toast({
          title: 'Unstarred',
          description: 'Message removed from starred messages'
        })
      } else {
        newSet.add(messageId)
        toast({
          title: 'Starred',
          description: 'Message added to starred messages'
        })
      }
      return newSet
    })
  }

  // Video call handler
  const handleVideoCall = () => {
    toast({
      title: 'Video Call',
      description: 'Video calling feature coming soon! 📹'
    })
  }

  // Audio call handler
  const handleAudioCall = () => {
    toast({
      title: 'Voice Call',
      description: 'Voice calling feature coming soon! 📞'
    })
  }

  // Mute notifications handler
  const handleMuteNotifications = () => {
    setIsMuted(prev => !prev)
    toast({
      title: isMuted ? 'Notifications Enabled' : 'Notifications Muted',
      description: isMuted 
        ? 'You will receive notifications for this chat' 
        : 'You won\'t receive notifications for this chat'
    })
  }

  // Block user handler
  const handleBlockUser = () => {
    setIsBlocked(prev => !prev)
    toast({
      title: isBlocked ? 'User Unblocked' : 'User Blocked',
      description: isBlocked 
        ? `${selectedUser?.name} has been unblocked` 
        : `${selectedUser?.name} has been blocked`
    })
  }

  // Search in chat handler
  const handleSearchInChat = () => {
    toast({
      title: 'Search in Chat',
      description: 'Search feature coming soon! 🔍'
    })
  }

  // Attachment handler
  const handleAttachment = () => {
    fileInputRef.current?.click()
    toast({
      title: 'Attach File',
      description: 'Select a file to attach'
    })
  }

  // Voice message handler
  const handleVoiceMessage = () => {
    toast({
      title: 'Voice Message',
      description: 'Voice recording feature coming soon! 🎤'
    })
  }

  // Forward message handler
  const executeForward = async (targetUserId: string) => {
    if (!forwardingMessage || !user) return

    try {
      // Create or get conversation with target user
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: targetUserId })
      })

      if (res.ok) {
        const data = await res.json()
        // Send the forwarded message
        await fetch(`/api/conversations/${data.conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: forwardingMessage.content,
            receiverId: targetUserId,
            forwarded: true
          })
        })
        toast({
          title: 'Message Forwarded',
          description: 'Message has been forwarded successfully'
        })
        void fetchConversations()
      }
    } catch (err) {
      console.error('Failed to forward message:', err)
      toast({
        title: 'Error',
        description: 'Failed to forward message',
        variant: 'destructive'
      })
    } finally {
      setForwardingMessage(null)
    }
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredConversations = conversations.filter(conv => 
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-slate-950 dark:to-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="size-16 rounded-2xl bg-emerald-500 flex items-center justify-center animate-pulse">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">Loading DonChat...</p>
        </div>
      </div>
    )
  }

  // Auth pages - Login & Register
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans">
        {/* Header */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-emerald-500/10 px-6 py-4 md:px-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-emerald-600">
            <div className="w-10 h-10 flex items-center justify-center bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
              <MessageCircle className="text-white h-5 w-5" />
            </div>
            <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">DonChat</h2>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4 md:p-10">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-2xl shadow-2xl overflow-hidden border border-emerald-500/5">
            {/* Hero Section - Left Side */}
            <div className="hidden lg:flex flex-col justify-center p-12 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden text-white">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-sm">
                  <MessageCircle className="h-8 w-8" />
                </div>
                <h1 className="text-4xl font-extrabold mb-4 leading-tight">Connect instantly with your community</h1>
                <p className="text-emerald-100 text-lg opacity-90 leading-relaxed">
                  Join thousands using DonChat for seamless communication with end-to-end encryption, AI assistance, and beautiful design.
                </p>
                <div className="mt-12 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Shield className="h-5 w-5" />
                    </div>
                    <span>End-to-end encryption</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Bot className="h-5 w-5" />
                    </div>
                    <span>AI-powered assistant</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Users className="h-5 w-5" />
                    </div>
                    <span>Group chats & broadcasts</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white/10 p-3 rounded-full">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span>Real-time messaging</span>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/5 rounded-full blur-3xl"></div>
            </div>

            {/* Form Section - Right Side */}
            <div className="flex flex-col justify-center p-8 md:p-16 lg:p-20 bg-white dark:bg-slate-900">
              {/* Auto-login indicator */}
              {autoLoginDetected ? (
                <div className="text-center animate-fade-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Welcome back!</h2>
                  <p className="text-slate-500 dark:text-slate-400">Recognizing you...</p>
                </div>
              ) : authStep === 'email' ? (
                /* Email Step */
                <>
                  <div className="mb-10">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Welcome to DonChat
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      Enter your email to continue
                    </p>
                  </div>

                  {authError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                          type="email"
                          placeholder="you@example.com"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          required
                          autoFocus
                          className="w-full pl-12 pr-4 py-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                      </div>
                    </div>

                    {/* Email detection message */}
                    {emailExists !== null && (
                      <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        emailExists 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                      }`}>
                        {emailExists ? (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Existing user - We&apos;ll log you in</span>
                          </>
                        ) : (
                          <>
                            <User className="h-4 w-4" />
                            <span>New user - Please verify your email</span>
                          </>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAuthLoading || !authEmail.trim()}
                      className="w-full bg-emerald-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAuthLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </form>

                  <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8">
                    By continuing, you agree to our{' '}
                    <a className="text-emerald-600 font-medium hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a className="text-emerald-600 font-medium hover:underline">Privacy Policy</a>
                  </p>
                </>
              ) : (
                /* OTP Step */
                <>
                  <button
                    onClick={handleBackToEmail}
                    className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Back</span>
                  </button>

                  <div className="mb-10">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                      Verify your email
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      We&apos;ve sent a 6-digit code to <span className="font-medium text-slate-700 dark:text-slate-300">{authEmail}</span>
                    </p>
                  </div>

                  {authError && (
                    <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg p-3 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {authError}
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Verification Code</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter 6-digit code"
                        value={authOtp}
                        onChange={(e) => handleOtpChange(e.target.value)}
                        maxLength={6}
                        autoFocus
                        className="w-full px-4 py-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-center text-2xl font-bold tracking-[0.5em] placeholder:text-slate-400 placeholder:text-base placeholder:tracking-normal"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthLoading || authOtp.length !== 6}
                      className="w-full bg-emerald-500 text-white py-4 rounded-lg font-bold text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transform active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAuthLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify
                          <Check className="h-5 w-5" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Timer and Resend */}
                  <div className="mt-6 text-center">
                    {otpTimer > 0 ? (
                      <p className="text-slate-500 dark:text-slate-400">
                        Resend code in <span className="font-medium text-slate-700 dark:text-slate-300">{formatTimer(otpTimer)}</span>
                      </p>
                    ) : (
                      <button
                        onClick={handleResendOtp}
                        disabled={!canResendOtp}
                        className="text-emerald-600 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Resend verification code
                      </button>
                    )}
                  </div>

                  {/* Development hint */}
                  <p className="mt-4 text-xs text-center text-slate-400">
                    Check console for OTP code
                  </p>
                </>
              )}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-10 py-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400 uppercase tracking-widest font-medium">
            <p>© 2024 DonChat. All rights reserved.</p>
            <div className="flex gap-6">
              <a className="hover:text-emerald-600 transition-colors cursor-pointer">Privacy Policy</a>
              <a className="hover:text-emerald-600 transition-colors cursor-pointer">Terms of Service</a>
              <a className="hover:text-emerald-600 transition-colors cursor-pointer">Help Center</a>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Chat interface - WhatsApp Style
  return (
    <div className="h-screen w-full overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      <div className="flex h-full w-full overflow-hidden relative">
        {/* Left Narrow Nav - Hidden on mobile/tablet, shown on desktop (lg+) */}
        <aside className="hidden lg:flex w-20 flex-col items-center py-4 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="mb-8">
            <div className="size-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <MessageCircle className="h-6 w-6" />
            </div>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-emerald-600 bg-emerald-500/10 p-3 rounded-xl min-h-12 min-w-12">
                    <MessageCircle className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Chats</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/5 transition-colors p-3 rounded-xl min-h-12 min-w-12">
                    <Users className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Groups</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/5 transition-colors p-3 rounded-xl min-h-12 min-w-12">
                    <Hash className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Channels</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/5 transition-colors p-3 rounded-xl min-h-12 min-w-12">
                    <Archive className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Archived</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </nav>
          <div className="flex flex-col gap-2 mt-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/5 transition-colors p-3 rounded-xl min-h-12 min-w-12"
                  >
                    {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={openProfile}
                    className="text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/5 transition-colors p-3 rounded-xl min-h-12 min-w-12"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={handleLogout}
                    className="text-slate-400 hover:text-red-500 hover:bg-red-500/5 transition-colors p-3 rounded-xl min-h-12 min-w-12"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div 
              className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-emerald-500/20 overflow-hidden cursor-pointer mt-2"
              onClick={openProfile}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-emerald-600 font-semibold text-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Conversation List Sidebar - Full width on mobile, fixed width on tablet/desktop */}
        <section className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col absolute md:relative top-0 left-0 right-0 bottom-16 md:bottom-0 z-20 md:z-auto`}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Chats</h1>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                        {connectionQuality === 'excellent' && <Wifi className="h-3.5 w-3.5 text-emerald-500" />}
                        {connectionQuality === 'good' && <Wifi className="h-3.5 w-3.5 text-yellow-500" />}
                        {connectionQuality === 'poor' && <Wifi className="h-3.5 w-3.5 text-orange-500" />}
                        {connectionQuality === 'disconnected' && <WifiOff className="h-3.5 w-3.5 text-red-500" />}
                        <span className="text-xs text-slate-500">{onlineUsers.length}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {connectionQuality === 'excellent' && 'Connected • Excellent'}
                      {connectionQuality === 'good' && 'Connected • Good'}
                      {connectionQuality === 'poor' && 'Unstable Connection'}
                      {connectionQuality === 'disconnected' && 'Offline'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={() => setShowNewChatDialog(true)}
                        className="size-11 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>New Chat</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input 
                className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-emerald-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                placeholder="Search or start new chat"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* AI Assistant */}
            <div className="px-2 pb-2">
              <button
                onClick={startAiChat}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  isAiChat 
                    ? 'bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/20' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="size-12 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 size-3 bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">Don AI</p>
                  <p className="text-xs text-purple-500 truncate">Ask me anything!</p>
                </div>
                <Sparkles className="h-4 w-4 text-purple-400" />
              </button>
            </div>

            {/* Recent Chats */}
            {filteredConversations.length > 0 && (
              <div className="px-2 py-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Recent</p>
                {filteredConversations.map((conv) => {
                  const otherUser = conv.participants?.find(p => p.id !== user?.id)
                  const lastMessage = conv.lastMessage
                  const isSelected = selectedConversation?.id === conv.id
                  
                  if (!otherUser) return null
                  
                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                        isSelected 
                          ? 'bg-emerald-500/10' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {otherUser.avatar ? (
                          <img src={otherUser.avatar} alt={otherUser.name} className="size-12 rounded-full object-cover" />
                        ) : (
                          <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-emerald-600 font-semibold">
                            {otherUser.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {onlineUsers.some(u => u.id === otherUser.id) && (
                          <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-center mb-0.5">
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{otherUser.name}</h3>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {formatTime(conv.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          {lastMessage ? (
                            `${lastMessage.sender.id === user?.id ? '✓✓ ' : ''}${lastMessage.content}`
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
            
            {/* All Users */}
            <div className="px-2 py-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                All Users
              </p>
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No users found</p>
              ) : (
                filteredUsers.map((u) => {
                  const isOnline = onlineUsers.some(ou => ou.id === u.id)
                  
                  return (
                    <button
                      key={u.id}
                      onClick={() => startConversation(u)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className="relative shrink-0">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="size-12 rounded-full object-cover" />
                        ) : (
                          <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-emerald-600 font-semibold">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isOnline && (
                          <div className="absolute bottom-0 right-0 size-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{u.name}</h3>
                        <p className="text-xs text-slate-400 truncate">
                          {isOnline ? 'Online' : formatLastSeen(u.lastSeen)}
                        </p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </section>

        {/* Main Chat Area - Full width on mobile when chat selected */}
        <main className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-slate-50 dark:bg-slate-900 overflow-hidden absolute md:relative top-0 left-0 right-0 bottom-16 md:bottom-0 z-10 md:z-auto`}>
          {selectedUser ? (
            <>
              {/* Chat Header */}
              <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-2 sm:px-4 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowMobileChat(false)}
                    className="md:hidden size-11 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <div className="relative">
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt={selectedUser.name} className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className={`size-10 rounded-full flex items-center justify-center ${isAiChat ? 'bg-gradient-to-br from-purple-500 to-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-emerald-600'}`}>
                        {isAiChat ? <Bot className="h-5 w-5" /> : selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {(isAiChat || onlineUsers.some(u => u.id === selectedUser.id)) && (
                      <span className="absolute bottom-0 right-0 size-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">{selectedUser.name}</h2>
                    <span className="text-xs text-slate-500">
                      {isAiChat ? 'AI Assistant' : onlineUsers.some(u => u.id === selectedUser.id) ? 'Online' : formatLastSeen(selectedUser.lastSeen)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 sm:gap-1">
                  <button 
                    onClick={handleVideoCall}
                    className="size-11 sm:size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <Video className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleAudioCall}
                    className="size-11 sm:size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <Phone className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={handleSearchInChat}
                    className="size-11 sm:size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    <Search className="h-5 w-5" />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="size-11 sm:size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setShowRightSidebar(!showRightSidebar)}>
                        <User className="h-4 w-4 mr-2" />
                        Contact Info
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleMuteNotifications}>
                        <Bell className="h-4 w-4 mr-2" />
                        {isMuted ? 'Unmute Notifications' : 'Mute Notifications'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast({ title: 'Starred Messages', description: 'View all starred messages' })}>
                        <Star className="h-4 w-4 mr-2" />
                        Starred Messages
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={handleDeleteChat}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </header>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1" style={{
                backgroundImage: isDarkMode 
                  ? 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23334155\' fill-opacity=\'0.1\'%3E%3Ccircle cx=\'5\' cy=\'5\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
                  : 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23cbd5e1\' fill-opacity=\'0.2\'%3E%3Ccircle cx=\'5\' cy=\'5\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
              }}>
                {/* Date Separator */}
                <div className="flex items-center justify-center py-4">
                  <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-3 py-1 rounded-lg shadow-sm">
                    Today
                  </span>
                </div>

                {isAiChat ? (
                  aiMessages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="size-20 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                        <Bot className="h-10 w-10 text-white" />
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-lg font-medium mb-2">Don AI</p>
                      <p className="text-slate-500 dark:text-slate-500 text-sm">Hi! I'm Don AI. How can I help you today?</p>
                    </div>
                  ) : (
                    aiMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {msg.role !== 'user' && (
                          <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center mt-1 shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                        <div className={`${msg.role === 'user' 
                          ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-md' 
                          : 'bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md shadow-sm'} px-4 py-2`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">Start a conversation with {selectedUser.name}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 max-w-[85%] ${msg.senderId === user?.id ? 'ml-auto flex-row-reverse' : ''}`}
                    >
                      {msg.senderId !== user?.id && (
                        <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mt-1 shrink-0 text-emerald-600 font-semibold text-xs">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="relative group">
                        {/* Reply indicator */}
                        {msg.replyTo && (
                          <div className="mb-1 text-xs text-slate-500 dark:text-slate-400 border-l-2 border-emerald-500 pl-2 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-r">
                            <span className="font-medium text-emerald-600">{msg.replyTo.sender.name}</span>
                            <p className="truncate">{msg.replyTo.content}</p>
                          </div>
                        )}
                        <div className={`message-bubble ${msg._optimistic ? 'sending' : ''} ${msg.senderId === user?.id 
                          ? 'bg-emerald-500 text-white rounded-2xl rounded-tr-md' 
                          : 'bg-white dark:bg-slate-800 rounded-2xl rounded-tl-md shadow-sm'} px-3 py-2`}>
                          {msg.isForwarded && (
                            <p className="text-[10px] opacity-70 mb-1 flex items-center gap-1">
                              <Forward className="h-3 w-3" /> Forwarded
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] opacity-70">{formatTime(msg.createdAt)}</span>
                            {msg.senderId === user?.id && (
                              <span className="flex items-center">
                                {msg.status === 'sending' && (
                                  <Loader2 className="h-3 w-3 opacity-70 animate-spin" />
                                )}
                                {msg.status === 'sent' && (
                                  <Check className="h-3 w-3 opacity-70" />
                                )}
                                {msg.status === 'delivered' && (
                                  <CheckCheck className="h-3 w-3 opacity-70" />
                                )}
                                {msg.status === 'read' && (
                                  <CheckCheck className="h-3 w-3 text-blue-400" />
                                )}
                                {msg.status === 'failed' && (
                                  <button 
                                    onClick={() => toast({ title: 'Retry', description: 'Retrying message...' })}
                                    className="text-red-400 hover:text-red-300"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                                {(!msg.status || msg.status === 'sent') && !msg._optimistic && (
                                  <CheckCheck className="h-3 w-3 opacity-70" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Reactions */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {msg.reactions.map((reaction, idx) => (
                              <span key={idx} className="bg-white dark:bg-slate-700 text-sm rounded-full px-1.5 shadow-sm">
                                {reaction.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Message actions */}
                        <div className={`absolute ${msg.senderId === user?.id ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-slate-100 dark:bg-slate-700 rounded-full shadow-sm px-1`}>
                          <button 
                            onClick={() => handleReaction(msg.id, '👍')}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-sm"
                          >
                            👍
                          </button>
                          <button 
                            onClick={() => handleReaction(msg.id, '❤️')}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full text-sm"
                          >
                            ❤️
                          </button>
                          <button 
                            onClick={() => setShowReactionPicker(msg.id)}
                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full"
                          >
                            <SmilePlus className="h-4 w-4 text-slate-500" />
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-full">
                                <MoreVertical className="h-4 w-4 text-slate-500" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={msg.senderId === user?.id ? 'start' : 'end'}>
                              <DropdownMenuItem onClick={() => handleReply(msg)}>
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleForward(msg)}>
                                <Forward className="h-4 w-4 mr-2" />
                                Forward
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopy(msg.content, msg.id)}>
                                {copiedMessageId === msg.id ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                {copiedMessageId === msg.id ? 'Copied' : 'Copy'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStarMessage(msg.id)}>
                                <Star className={`h-4 w-4 mr-2 ${starredMessages.has(msg.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                {starredMessages.has(msg.id) ? 'Unstar' : 'Star'}
                              </DropdownMenuItem>
                              {msg.senderId === user?.id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => toast({ title: 'Edit Message', description: 'Edit feature coming soon!' })}>
                                    <Edit3 className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteMessage(msg)}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {typingUser && !isAiChat && (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mt-1 shrink-0 text-emerald-600 font-semibold text-xs">
                      {typingUser.userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                
                {isAiThinking && (
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 to-emerald-500 flex items-center justify-center mt-1 shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
                
                {/* Scroll to bottom button */}
                {showNewMessageBadge && (
                  <button
                    onClick={() => {
                      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                      setShowNewMessageBadge(false)
                    }}
                    className="absolute bottom-20 right-4 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-emerald-600 transition-colors animate-bounce"
                  >
                    <ChevronLeft className="h-4 w-4 rotate-[-90deg]" />
                    <span className="text-sm font-medium">New messages</span>
                  </button>
                )}
              </div>

              {/* Reply Preview */}
              {replyingTo && (
                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3">
                  <div className="flex-1 border-l-2 border-emerald-500 pl-3">
                    <p className="text-xs text-emerald-600 font-medium">Replying to {replyingTo.sender.name}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{replyingTo.content}</p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}

              {/* Message Input */}
              <footer className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1 sm:gap-2">
                  {/* Emoji Picker */}
                  <div className="relative" ref={emojiPickerRef}>
                    <button 
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="size-11 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 w-72 max-h-64 overflow-y-auto">
                        {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                          <div key={category} className="mb-2">
                            <p className="text-xs font-medium text-slate-500 mb-1">{category}</p>
                            <div className="grid grid-cols-8 gap-1">
                              {emojis.map((emoji, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => insertEmoji(emoji)}
                                  className="size-9 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-base"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={handleAttachment}
                    className="size-11 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" />
                  
                  <input 
                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 min-h-11"
                    placeholder={isAiChat ? "Ask Don AI..." : "Type a message..."}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isAiThinking}
                  />
                  
                  <button 
                    onClick={handleVoiceMessage}
                    className="size-11 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Mic className="h-5 w-5" />
                  </button>
                  
                  <button 
                    onClick={isAiChat ? sendAiMessage : sendMessage}
                    disabled={!inputMessage.trim() || (isAiChat && isAiThinking)}
                    className="size-11 flex items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors disabled:opacity-50"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="text-center">
                <div className="size-24 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-12 w-12 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">DonChat Web</h2>
                <p className="text-slate-500 dark:text-slate-400">Send and receive messages with end-to-end encryption</p>
                <p className="text-xs text-slate-400 mt-2">Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Contact Info - Only shown on xl screens */}
        {selectedUser && showRightSidebar && (
          <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hidden xl:flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="p-8 flex flex-col items-center text-center">
                <div className="size-32 rounded-full bg-slate-200 dark:bg-slate-700 mb-4 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                  {selectedUser.avatar ? (
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${isAiChat ? 'bg-gradient-to-br from-purple-500 to-emerald-500 text-white' : 'text-emerald-600'}`}>
                      {isAiChat ? <Bot className="h-16 w-16" /> : (
                        <span className="text-4xl font-bold">{selectedUser.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  )}
                </div>
                <h2 className="font-bold text-xl text-slate-900 dark:text-slate-100">{selectedUser.name}</h2>
                <p className="text-sm text-slate-500 mb-6">{isAiChat ? 'AI Assistant' : selectedUser.email || 'DonChat User'}</p>
                
                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={() => toast({ title: 'Profile', description: 'View full profile' })}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                  >
                    <User className="h-5 w-5" />
                    <span className="text-xs font-medium">Profile</span>
                  </button>
                  <button 
                    onClick={handleMuteNotifications}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${isMuted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    <Bell className="h-5 w-5" />
                    <span className="text-xs font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button 
                    onClick={handleBlockUser}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${isBlocked ? 'bg-red-500/10 text-red-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                  >
                    <Ban className="h-5 w-5" />
                    <span className="text-xs font-medium">{isBlocked ? 'Unblock' : 'Block'}</span>
                  </button>
                </div>
              </div>
              
              <div className="px-6 space-y-6 text-left">
                {selectedUser.bio && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">About</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedUser.bio}</p>
                  </div>
                )}
                
                {selectedUser.status && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{selectedUser.status}</p>
                  </div>
                )}
                
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Media, Links & Docs</h3>
                    <button className="text-emerald-600 text-xs font-medium">View All</button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Encryption</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span>Messages are end-to-end encrypted</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={handleDeleteChat}
                className="w-full py-3 text-red-500 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
              >
                Delete Chat
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Toaster for notifications */}
      <Toaster />

      {/* Mobile Bottom Navigation Bar - Only visible on mobile (< lg) */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 px-2 py-1 safe-area-inset-bottom z-50 transition-transform duration-300 ${isNavbarVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex items-center justify-around">
          <button 
            onClick={() => { setShowMobileChat(false); setIsAiChat(false); }}
            className={`flex flex-col items-center justify-center gap-0.5 p-2 min-h-12 min-w-12 rounded-xl transition-colors ${!showMobileChat ? 'text-emerald-600 bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600'}`}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-medium">Chats</span>
          </button>
          <button 
            onClick={() => setShowMobileChat(false)}
            className="flex flex-col items-center justify-center gap-0.5 p-2 min-h-12 min-w-12 rounded-xl transition-colors text-slate-400 hover:text-emerald-600"
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium">Groups</span>
          </button>
          <button 
            onClick={() => startAiChat()}
            className={`flex flex-col items-center justify-center gap-0.5 p-2 min-h-12 min-w-12 rounded-xl transition-colors ${isAiChat ? 'text-emerald-600 bg-emerald-500/10' : 'text-slate-400 hover:text-emerald-600'}`}
          >
            <Bot className="h-5 w-5" />
            <span className="text-[10px] font-medium">AI</span>
          </button>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="flex flex-col items-center justify-center gap-0.5 p-2 min-h-12 min-w-12 rounded-xl transition-colors text-slate-400 hover:text-emerald-600"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            <span className="text-[10px] font-medium">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
          <button 
            onClick={openProfile}
            className="flex flex-col items-center justify-center gap-0.5 p-2 min-h-12 min-w-12 rounded-xl transition-colors text-slate-400 hover:text-emerald-600"
          >
            <Settings className="h-5 w-5" />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to logout? You will need to login again to access your messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
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
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="size-24 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border-4 border-emerald-500/20">
                  {profileAvatar ? (
                    <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-emerald-600 font-semibold text-3xl">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-emerald-500 rounded-full cursor-pointer hover:bg-emerald-600 transition-colors shadow-lg">
                  <Plus className="h-4 w-4 text-white" />
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
              <Label className="text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Email</Label>
              <Input
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 dark:text-slate-300">Bio</Label>
              <Textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 resize-none"
                rows={3}
                placeholder="Tell us about yourself..."
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowProfile(false)}
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={saveProfile}
                disabled={isSavingProfile}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
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

      {/* New Chat Dialog */}
      <Dialog open={showNewChatDialog} onOpenChange={setShowNewChatDialog}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {(['PRIVATE', 'GROUP', 'BROADCAST', 'SECRET'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewChatType(type)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    newChatType === type 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {type === 'PRIVATE' && <User className="h-5 w-5 text-emerald-500" />}
                    {type === 'GROUP' && <Users className="h-5 w-5 text-emerald-500" />}
                    {type === 'BROADCAST' && <Hash className="h-5 w-5 text-emerald-500" />}
                    {type === 'SECRET' && <Shield className="h-5 w-5 text-emerald-500" />}
                    <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{type.toLowerCase()}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {type === 'PRIVATE' && '1-on-1 encrypted chat'}
                    {type === 'GROUP' && 'Chat with multiple people'}
                    {type === 'BROADCAST' && 'One-way channel'}
                    {type === 'SECRET' && 'Self-destructing messages'}
                  </p>
                </button>
              ))}
            </div>
            
            {(newChatType === 'GROUP' || newChatType === 'BROADCAST') && (
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300">Name</Label>
                <Input
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder={newChatType === 'GROUP' ? 'Group name' : 'Channel name'}
                  className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewChatDialog(false)}
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setShowNewChatDialog(false)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forward Message Dialog */}
      <Dialog open={!!forwardingMessage} onOpenChange={() => setForwardingMessage(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-100">Forward Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">{forwardingMessage?.content}</p>
            </div>
            <p className="text-sm text-slate-500">Select a chat to forward this message:</p>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => executeForward(u.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-emerald-600 font-semibold">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{u.name}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Message Confirmation Dialog */}
      <AlertDialog open={showDeleteMessageConfirm} onOpenChange={setShowDeleteMessageConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Delete Message</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteMessage}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Chat Confirmation Dialog */}
      <AlertDialog open={showDeleteChatConfirm} onOpenChange={setShowDeleteChatConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-slate-100">Delete Chat</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this chat? All messages will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteChat}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
