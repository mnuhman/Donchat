/**
 * Don Chat - Messages API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Get messages for a conversation
export async function GET(
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

    const messages = await db.message.findMany({
      where: {
        conversationId: id,
        deletedAt: null
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    )
  }
}

// Send a message
export async function POST(
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
    const { content, receiverId } = await request.json()

    if (!content || !receiverId) {
      return NextResponse.json(
        { error: 'Content and receiver ID are required' },
        { status: 400 }
      )
    }

    const message = await db.message.create({
      data: {
        content,
        senderId: user.id,
        receiverId,
        conversationId: id
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true
          }
        }
      }
    })

    // Update conversation updatedAt
    await db.conversation.update({
      where: { id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}

// Edit a message
export async function PUT(
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

    const { messageId, content } = await request.json()

    if (!messageId || !content) {
      return NextResponse.json(
        { error: 'Message ID and content are required' },
        { status: 400 }
      )
    }

    // Verify message belongs to user
    const existingMessage = await db.message.findUnique({
      where: { id: messageId }
    })

    if (!existingMessage || existingMessage.senderId !== user.id) {
      return NextResponse.json(
        { error: 'Message not found or not authorized' },
        { status: 404 }
      )
    }

    const message = await db.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
            phone: true
          }
        }
      }
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Edit message error:', error)
    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    )
  }
}

// Delete a message or clear all messages
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
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const clearAll = searchParams.get('clearAll')

    if (clearAll === 'true') {
      // Soft delete all messages in conversation
      await db.message.updateMany({
        where: { conversationId: id },
        data: { deletedAt: new Date() }
      })

      return NextResponse.json({ success: true })
    }

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    // Soft delete message
    await db.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}
