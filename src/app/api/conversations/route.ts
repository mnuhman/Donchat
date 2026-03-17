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

    const participations = await db.conversationParticipant.findMany({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    avatar: true,
                    isOnline: true,
                  }
                }
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              include: {
                sender: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        }
      },
      orderBy: {
        conversation: { updatedAt: 'desc' }
      }
    })

    const conversations = participations.map(p => {
      const otherParticipant = p.conversation.participants.find(
        pp => pp.userId !== user.id
      )

      return {
        id: p.conversation.id,
        updatedAt: p.conversation.updatedAt.toISOString(),
        participants: p.conversation.participants.map(pp => ({
          id: pp.user.id,
          name: pp.user.name,
          phone: pp.user.phone,
          avatar: pp.user.avatar,
          isOnline: pp.user.isOnline
        })),
        lastMessage: p.conversation.messages[0] ? {
          id: p.conversation.messages[0].id,
          content: p.conversation.messages[0].content,
          sender: p.conversation.messages[0].sender
        } : null
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

// Create a new conversation
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

    // Check if conversation already exists
    const existingParticipation = await db.conversationParticipant.findFirst({
      where: { userId: user.id },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    })

    const existingConversation = existingParticipation?.conversation.participants.some(
      p => p.userId === recipientId
    )

    if (existingConversation) {
      return NextResponse.json({
        conversation: existingParticipation?.conversation
      })
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        participants: {
          create: [
            { userId: user.id },
            { userId: recipientId }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                avatar: true,
                isOnline: true
              }
            }
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
