/**
 * Don Chat - Users API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

// Get all users except current user
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const users = await db.user.findMany({
      where: {
        NOT: {
          id: user.id
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    )
  }
}
