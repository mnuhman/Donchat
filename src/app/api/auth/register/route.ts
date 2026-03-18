/**
 * Don Chat - Register API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, createSession } from '@/lib/auth'
import { db } from '@/lib/db'

// Force Node.js runtime for bcryptjs compatibility
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = body

    console.log('Register request received:', { name, email, hasPassword: !!password })

    if (!name || !email || !password) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      console.log('Invalid name')
      return NextResponse.json(
        { error: 'Name must be at least 2 characters' },
        { status: 400 }
      )
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      console.log('Invalid email')
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (typeof password !== 'string' || password.length < 6) {
      console.log('Invalid password')
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists
    console.log('Checking if user exists...')
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      console.log('User already exists')
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      )
    }

    // Create user
    console.log('Hashing password...')
    const hashedPassword = await hashPassword(password)
    
    console.log('Creating user in database...')
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        isOnline: true
      }
    })

    console.log('User created:', user.id)

    console.log('Creating session...')
    await createSession(user.id)

    console.log('Registration successful')
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
    console.error('Register error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
