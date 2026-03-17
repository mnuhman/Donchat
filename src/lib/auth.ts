/**
 * Don Chat - Authentication Library
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { cookies } from 'next/headers'
import { db } from './db'
import bcrypt from 'bcryptjs'

const SESSION_COOKIE = 'donchat_session'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function createSession(userId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

export async function getSession(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE)?.value || null
}

export async function getCurrentUser() {
  const userId = await getSession()
  if (!userId) return null

  try {
    const user = await db.user.findUnique({
      where: { id: userId }
    })
    return user
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

export async function clearSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
