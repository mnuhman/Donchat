/**
 * Don Chat - User Profile API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

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
        email: email || user.email,
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

// Delete user account
export async function DELETE() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Delete user's messages
    await db.message.deleteMany({
      where: {
        OR: [
          { senderId: user.id },
          { receiverId: user.id }
        ]
      }
    })

    // Delete user's conversation participants
    await db.conversationParticipant.deleteMany({
      where: { userId: user.id }
    })

    // Delete orphaned conversations
    const orphanedConversations = await db.conversation.findMany({
      where: {
        participants: { none: {} }
      }
    })

    if (orphanedConversations.length > 0) {
      await db.conversation.deleteMany({
        where: {
          id: { in: orphanedConversations.map(c => c.id) }
        }
      })
    }

    // Delete the user
    await db.user.delete({
      where: { id: user.id }
    })

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Delete account error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
