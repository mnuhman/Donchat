/**
 * Don Chat - Conversations API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// Force Node.js runtime for database operations
export const runtime = 'nodejs'

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
                    email: true,
                    bio: true,
                    avatar: true,
                    isOnline: true,
                    lastSeen: true
                  }
                }
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              where: { deletedAt: null },
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
        type: p.conversation.type,
        name: p.conversation.name,
        avatar: p.conversation.avatar,
        updatedAt: p.conversation.updatedAt.toISOString(),
        participants: p.conversation.participants.map(pp => ({
          id: pp.user.id,
          name: pp.user.name,
          email: pp.user.email,
          bio: pp.user.bio,
          avatar: pp.user.avatar,
          isOnline: pp.user.isOnline,
          lastSeen: pp.user.lastSeen?.toISOString() || null
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

    // Check if conversation already exists between these two users
    const existingParticipations = await db.conversationParticipant.findMany({
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
                    email: true,
                    bio: true,
                    avatar: true,
                    isOnline: true,
                    lastSeen: true
                  }
                }
              }
            }
          }
        }
      }
    })

    // Find conversation where both users are participants
    const existingConversation = existingParticipations.find(p => 
      p.conversation.participants.some(pp => pp.userId === recipientId)
    )

    if (existingConversation) {
      return NextResponse.json({
        conversation: {
          id: existingConversation.conversation.id,
          type: existingConversation.conversation.type,
          name: existingConversation.conversation.name,
          avatar: existingConversation.conversation.avatar,
          updatedAt: existingConversation.conversation.updatedAt.toISOString(),
          participants: existingConversation.conversation.participants.map(pp => ({
            id: pp.user.id,
            name: pp.user.name,
            email: pp.user.email,
            bio: pp.user.bio,
            avatar: pp.user.avatar,
            isOnline: pp.user.isOnline,
            lastSeen: pp.user.lastSeen?.toISOString() || null
          }))
        }
      })
    }

    // Create new conversation
    const conversation = await db.conversation.create({
      data: {
        type: 'PRIVATE',
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
                email: true,
                bio: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        avatar: conversation.avatar,
        updatedAt: conversation.updatedAt.toISOString(),
        participants: conversation.participants.map(pp => ({
          id: pp.user.id,
          name: pp.user.name,
          email: pp.user.email,
          bio: pp.user.bio,
          avatar: pp.user.avatar,
          isOnline: pp.user.isOnline,
          lastSeen: pp.user.lastSeen?.toISOString() || null
        }))
      }
    })
  } catch (error) {
    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
