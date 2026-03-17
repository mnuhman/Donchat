/**
 * Don Chat - AI Chat API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, history } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Create AI instance
    const zai = await ZAI.create()

    // Build conversation history for context
    const messages = [
      {
        role: 'system',
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
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    // Call AI API
    const response = await zai.llm.chat({
      messages: messages,
      model: 'default'
    })

    const aiResponse = response.choices[0]?.message?.content || 'Sorry, I could not generate a response.'

    return NextResponse.json({
      success: true,
      response: aiResponse,
      conversationId
    })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process AI chat' },
      { status: 500 }
    )
  }
}
