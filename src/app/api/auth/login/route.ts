/**
 * Don Chat - Login API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Force Node.js runtime for bcryptjs compatibility
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    console.log('Login request received:', { email, hasPassword: !!password })

    if (!email || !password) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    console.log('Looking up user...')
    const user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user || !user.password) {
      console.log('User not found')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('Verifying password...')
    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      console.log('Invalid password')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update online status
    console.log('Updating online status...')
    await db.user.update({
      where: { id: user.id },
      data: { isOnline: true }
    })

    console.log('Creating session...')
    await createSession(user.id)

    console.log('Login successful for user:', user.id)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
