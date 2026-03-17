/**
 * Don Chat - Login API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { loginUser, setSessionCookie } from '@/lib/parse-auth'
import { userToJSON } from '@/lib/parse-db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { user, sessionToken } = await loginUser(email, password)
    
    await setSessionCookie(sessionToken)

    return NextResponse.json({
      user: userToJSON(user),
      sessionToken
    })
  } catch (error: unknown) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json(
      { error: message },
      { status: 401 }
    )
  }
}
