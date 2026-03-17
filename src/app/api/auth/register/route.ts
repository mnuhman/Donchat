/**
 * Don Chat - Register API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { registerUser, setSessionCookie } from '@/lib/parse-auth'
import { userToJSON } from '@/lib/parse-db'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const { user, sessionToken } = await registerUser(name, email, password)
    
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      user: userToJSON(user),
      sessionToken
    })
  } catch (error: unknown) {
    console.error('Register error:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json(
      { error: message },
      { status: 400 }
    )
  }
}
