/**
 * Don Chat - Messages API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/parse-auth'
import { 
  sendMessage, 
  getConversationMessages, 
  editMessage, 
  deleteMessage, 
  clearConversationMessages,
  messageToJSON 
} from '@/lib/parse-db'

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
    const messages = await getConversationMessages(id)

    return NextResponse.json({
      messages: messages.map(m => messageToJSON(m))
    })
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

    const message = await sendMessage(id, user.id, receiverId, content)

    return NextResponse.json({
      message: messageToJSON(message)
    })
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

    const message = await editMessage(messageId, content)

    return NextResponse.json({
      message: messageToJSON(message)
    })
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
      await clearConversationMessages(id)
      return NextResponse.json({ success: true })
    }

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      )
    }

    await deleteMessage(messageId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete message error:', error)
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    )
  }
}
