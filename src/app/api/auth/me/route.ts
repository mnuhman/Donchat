/**
 * Don Chat - Get Current User API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ 
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isOnline: user.isOnline
      }
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
}
