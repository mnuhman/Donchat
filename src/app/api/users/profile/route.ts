/**
 * Don Chat - User Profile API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Get current user profile
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to get profile' },
      { status: 500 }
    )
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { name, email, bio, avatar } = await request.json()

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: name || user.name,
        email: email || null,
        bio: bio || null,
        avatar: avatar || null,
      }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
