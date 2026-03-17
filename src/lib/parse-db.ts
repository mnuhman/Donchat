/**
 * Don Chat - Parse Database Operations
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import Parse, { User, Conversation, Message } from '@/lib/parse'

// Create or get existing conversation between two users
export async function createOrGetConversation(
  userId: string,
  recipientId: string
): Promise<Conversation> {
  try {
    // Check if conversation already exists
    const user = await new Parse.Query(User).get(userId, { useMasterKey: true }) as User
    const recipient = await new Parse.Query(User).get(recipientId, { useMasterKey: true }) as User

    // Query for existing conversation with both participants
    const query1 = new Parse.Query('Conversation')
    query1.equalTo('participants', user)
    query1.equalTo('participants', recipient)

    const existingConversation = await query1.first({ useMasterKey: true })
    
    if (existingConversation) {
      return existingConversation as Conversation
    }

    // Create new conversation
    const conversation = new Conversation()
    conversation.set('participants', [user, recipient])
    await conversation.save(null, { useMasterKey: true })

    return conversation
  } catch (error) {
    console.error('Create conversation error:', error)
    throw error
  }
}

// Get all conversations for a user
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const user = await new Parse.Query(User).get(userId, { useMasterKey: true }) as User

    const query = new Parse.Query('Conversation')
    query.equalTo('participants', user)
    query.descending('updatedAt')
    query.include('participants')

    const conversations = await query.find({ useMasterKey: true })
    return conversations as Conversation[]
  } catch (error) {
    console.error('Get conversations error:', error)
    return []
  }
}

// Send a message
export async function sendMessage(
  conversationId: string,
  senderId: string,
  receiverId: string,
  content: string
): Promise<Message> {
  try {
    const sender = await new Parse.Query(User).get(senderId, { useMasterKey: true }) as User
    const receiver = await new Parse.Query(User).get(receiverId, { useMasterKey: true }) as User
    const conversation = await new Parse.Query('Conversation').get(conversationId, { useMasterKey: true }) as Conversation

    const message = new Message()
    message.set('content', content)
    message.set('sender', sender)
    message.set('receiver', receiver)
    message.set('conversation', conversation)
    message.set('isEdited', false)

    await message.save(null, { useMasterKey: true })

    // Update conversation's last message and updatedAt
    conversation.set('lastMessage', content)
    await conversation.save(null, { useMasterKey: true })

    return message
  } catch (error) {
    console.error('Send message error:', error)
    throw error
  }
}

// Get messages for a conversation
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  try {
    const conversation = await new Parse.Query('Conversation').get(conversationId, { useMasterKey: true })

    const query = new Parse.Query('Message')
    query.equalTo('conversation', conversation)
    query.notEqualTo('deletedAt', undefined)
    query.ascending('createdAt')
    query.include('sender')

    const messages = await query.find({ useMasterKey: true })
    return messages as Message[]
  } catch (error) {
    console.error('Get messages error:', error)
    return []
  }
}

// Edit a message
export async function editMessage(
  messageId: string,
  newContent: string
): Promise<Message> {
  try {
    const message = await new Parse.Query('Message').get(messageId, { useMasterKey: true }) as Message
    message.set('content', newContent)
    message.set('isEdited', true)
    await message.save(null, { useMasterKey: true })
    return message
  } catch (error) {
    console.error('Edit message error:', error)
    throw error
  }
}

// Delete a message (soft delete)
export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const message = await new Parse.Query('Message').get(messageId, { useMasterKey: true }) as Message
    message.set('deletedAt', new Date())
    await message.save(null, { useMasterKey: true })
  } catch (error) {
    console.error('Delete message error:', error)
    throw error
  }
}

// Clear all messages in a conversation
export async function clearConversationMessages(
  conversationId: string
): Promise<void> {
  try {
    const conversation = await new Parse.Query('Conversation').get(conversationId, { useMasterKey: true })

    const query = new Parse.Query('Message')
    query.equalTo('conversation', conversation)

    const messages = await query.find({ useMasterKey: true })
    
    // Soft delete all messages
    for (const message of messages) {
      message.set('deletedAt', new Date())
    }
    
    await Parse.Object.saveAll(messages, { useMasterKey: true })
  } catch (error) {
    console.error('Clear messages error:', error)
    throw error
  }
}

// Convert Parse objects to plain JSON for API responses
export function userToJSON(user: User) {
  return {
    id: user.id,
    name: user.get('name') || '',
    email: user.get('email') || '',
    phone: user.get('phone') || null,
    bio: user.get('bio') || null,
    avatar: user.get('avatar') || null,
    isOnline: user.get('isOnline') || false,
    lastSeen: user.get('lastSeen')?.toISOString() || null,
    createdAt: user.get('createdAt')?.toISOString(),
    updatedAt: user.get('updatedAt')?.toISOString()
  }
}

export function conversationToJSON(conversation: Conversation, currentUserId: string) {
  const participants = conversation.get('participants') || []
  const otherParticipant = participants.find((p: User) => p.id !== currentUserId)

  return {
    id: conversation.id,
    updatedAt: conversation.get('updatedAt')?.toISOString(),
    participants: participants.map((p: User) => userToJSON(p)),
    lastMessage: conversation.get('lastMessage') || '',
    otherParticipant: otherParticipant ? userToJSON(otherParticipant) : null
  }
}

export function messageToJSON(message: Message) {
  const sender = message.get('sender')
  const receiver = message.get('receiver')

  return {
    id: message.id,
    content: message.get('content'),
    senderId: sender?.id || '',
    receiverId: receiver?.id || null,
    conversationId: message.get('conversation')?.id || '',
    isEdited: message.get('isEdited') || false,
    createdAt: message.get('createdAt')?.toISOString(),
    sender: sender ? userToJSON(sender) : null
  }
}
