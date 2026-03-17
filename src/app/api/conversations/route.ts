/**
 * Don Chat - Conversations API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Get all conversations for current user
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const conversations = await db.conversation.findMany({
      where: {
        participants: {
          some: {
            id: user.id
          }
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            isOnline: true,
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    )
  }
}

// Create or get conversation with another user
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { recipientId } = await request.json()

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      )
    }

    // Check if conversation already exists between these users
    const existingConversation = await db.conversation.findFirst({
      where: {
        AND: [
          {
            participants: {
              some: {
                id: user.id
              }
            }
          },
          {
            participants: {
              some: {
                id: recipientId
              }
            }
          }
        ]
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            isOnline: true,
          }
        }
      }
    })

    if (existingConversation) {
      return NextResponse.json({ conversation: existingConversation })
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        participants: {
          connect: [
            { id: user.id },
            { id: recipientId }
          ]
        }
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
            isOnline: true,
          }
        }
      }
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
