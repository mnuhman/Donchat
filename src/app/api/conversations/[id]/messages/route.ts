/**
 * Don Chat - Conversation Messages API
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

    // Verify user is part of conversation
    const conversation = await db.conversation.findFirst({
      where: {
        id,
        participants: {
          some: {
            id: user.id
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const messages = await db.message.findMany({
      where: {
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
        },
        receiver: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
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

// Send message to conversation
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

    if (!content) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    // Verify user is part of conversation
    const conversation = await db.conversation.findFirst({
      where: {
        id,
        participants: {
          some: {
            id: user.id
          }
        }
      },
      include: {
        participants: true
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Create message
    const message = await db.message.create({
      data: {
        content,
        senderId: user.id,
        receiverId: receiverId || null,
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

    // Update conversation timestamp
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
