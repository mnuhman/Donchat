/**
 * Don Chat - Authentication Utilities
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

const SALT_ROUNDS = 10
const SESSION_COOKIE = 'donchat_session'
const USER_COOKIE = 'donchat_user'

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create session
export async function createSession(userId: string): Promise<string> {
  const sessionId = uuidv4()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Update user online status
  try {
    await db.user.update({
      where: { id: userId },
      data: { isOnline: true }
    })
  } catch {
    // Ignore if update fails
  }

  // Store session in cookies
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  })

  cookieStore.set(USER_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  })

  return sessionId
}

// Get current user
export async function getCurrentUser() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(USER_COOKIE)?.value

  if (!userId) return null

  try {
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    return user
  } catch {
    return null
  }
}

// Logout
export async function logout() {
  const cookieStore = await cookies()
  const userId = cookieStore.get(USER_COOKIE)?.value

  // Update user offline status
  if (userId) {
    try {
      await db.user.update({
        where: { id: userId },
        data: { 
          isOnline: false,
          lastSeen: new Date()
        }
      })
    } catch {
      // Ignore errors
    }
  }

  cookieStore.delete(SESSION_COOKIE)
  cookieStore.delete(USER_COOKIE)
}

// Validate email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate password strength
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  return { valid: true }
}
