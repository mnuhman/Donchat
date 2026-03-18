/**
 * Don Chat - Single Conversation API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

// Delete a conversation (soft delete by removing participant)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if user is participant of this conversation
    const participation = await db.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: user.id
      }
    })

    if (!participation) {
      return NextResponse.json(
        { error: 'Conversation not found or not authorized' },
        { status: 404 }
      )
    }

    // Delete all messages in the conversation first (hard delete for privacy)
    await db.message.deleteMany({
      where: { conversationId: id }
    })

    // Delete all participants
    await db.conversationParticipant.deleteMany({
      where: { conversationId: id }
    })

    // Delete the conversation
    await db.conversation.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

// Clear all messages in a conversation (keep conversation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if user is participant of this conversation
    const participation = await db.conversationParticipant.findFirst({
      where: {
        conversationId: id,
        userId: user.id
      }
    })

    if (!participation) {
      return NextResponse.json(
        { error: 'Conversation not found or not authorized' },
        { status: 404 }
      )
    }

    // Soft delete all messages (set deletedAt)
    await db.message.updateMany({
      where: { conversationId: id },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Clear conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to clear conversation' },
      { status: 500 }
    )
  }
}
