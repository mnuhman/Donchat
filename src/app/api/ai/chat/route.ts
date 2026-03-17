/**
 * Don Chat - AI Chat API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

// Store AI conversations in memory (in production, use database)
const aiConversations = new Map<string, Array<{ role: string; content: string }>>()

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create()
  }
  return zaiInstance
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, history } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const zai = await getZAI()

    // System prompt for Don AI Assistant
    const systemPrompt = `You are Don AI, a friendly and helpful AI assistant integrated into the Don Chat messaging app. 

Your personality:
- You are helpful, friendly, and conversational
- You respond concisely but informatively
- You can help with questions, creative tasks, coding, and general conversation
- You're knowledgeable about technology, science, history, and many other topics
- You have a slight sense of humor and are engaging to chat with

Important guidelines:
- Keep responses reasonably concise (not too long, not too short)
- Use emojis occasionally to make conversations more engaging
- Be helpful and supportive
- If you don't know something, admit it honestly
- Format code blocks properly when sharing code
- Be respectful and inclusive

You are chatting through a messaging app, so keep the tone conversational and friendly.`

    // Build messages array
    let messages: Array<{ role: string; content: string }> = [
      { role: 'assistant', content: systemPrompt }
    ]

    // Add conversation history if provided
    if (history && Array.isArray(history)) {
      messages = messages.concat(history.map((msg: { role: string; content: string }) => ({
        role: msg.role,
        content: msg.content
      })))
    }

    // Add current message
    messages.push({ role: 'user', content: message })

    // Get completion from AI
    const completion = await zai.chat.completions.create({
      messages: messages,
      thinking: { type: 'disabled' }
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    // Store conversation (limit to last 20 messages)
    if (conversationId) {
      const existingHistory = aiConversations.get(conversationId) || []
      const updatedHistory = [
        ...existingHistory,
        { role: 'user', content: message },
        { role: 'assistant', content: aiResponse }
      ].slice(-20)
      aiConversations.set(conversationId, updatedHistory)
    }

    return NextResponse.json({
      success: true,
      response: aiResponse
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to get AI response' },
      { status: 500 }
    )
  }
}
