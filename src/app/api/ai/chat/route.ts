/**
 * Don Chat - AI Chat API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'

// Reuse ZAI instance across requests
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZai() {
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

    const zai = await getZai()

    // Build conversation history for context
    // Note: Use 'assistant' role for system prompts in this SDK
    const messages = [
      {
        role: 'assistant' as const,
        content: `You are Don AI, a helpful and friendly AI assistant for the Don Chat messaging app. 
You help users with their questions, provide information, and engage in friendly conversation.
Be concise but helpful in your responses. You can help with:
- General questions and information
- Coding and technical help
- Creative writing and ideas
- Casual conversation
Keep responses under 500 words unless more detail is needed.`
      },
      ...(history || []).map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      {
        role: 'user' as const,
        content: message
      }
    ]

    // Call AI API using correct method
    const completion = await zai.chat.completions.create({
      messages: messages,
      thinking: { type: 'disabled' }
    })

    const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversationId
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process AI chat',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
