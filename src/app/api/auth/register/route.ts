/**
 * Don Chat - Register API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createSession, validateEmail, validatePassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || !validateEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        isOnline: true
      }
    })

    // Create session
    await createSession(user.id)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        isOnline: user.isOnline
      }
    })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    )
  }
}
