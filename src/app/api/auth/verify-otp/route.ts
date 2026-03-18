/**
 * Don Chat - Verify OTP API
 * Verifies OTP and creates/returns user session
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { cookies } from 'next/headers'
import crypto from 'crypto'

export const runtime = 'nodejs'

// Generate session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate device fingerprint hash
function generateDeviceFingerprint(userAgent?: string, ip?: string): string {
  const components = [userAgent || '', ip || '']
  return crypto.createHash('sha256').update(components.join('|')).digest('hex').substring(0, 32)
}

export async function POST(request: NextRequest) {
  try {
    const { email, otp, deviceFingerprint, rememberDevice } = await request.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find valid OTP
    const otpRecord = await db.oTP.findFirst({
      where: {
        email: normalizedEmail,
        code: otp,
        used: false,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    // Mark OTP as used
    await db.oTP.update({
      where: { id: otpRecord.id },
      data: { used: true }
    })

    // Check if user exists
    let user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    // If new user, create account
    if (!user) {
      // Extract name from email
      const nameFromEmail = normalizedEmail.split('@')[0]
        .split(/[._-]/)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')

      user = await db.user.create({
        data: {
          email: normalizedEmail,
          name: nameFromEmail,
          password: null, // OTP users don't have passwords
          isOnline: true,
          lastSeen: new Date()
        }
      })
    } else {
      // Update user online status
      await db.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date()
        }
      })
    }

    // Generate session token
    const sessionToken = generateSessionToken()
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Get client info
    const userAgent = request.headers.get('user-agent') || undefined
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || undefined

    // Create session
    await db.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        deviceFingerprint: deviceFingerprint || generateDeviceFingerprint(userAgent, ip),
        ipAddress: ip,
        userAgent,
        expiresAt: sessionExpiresAt
      }
    })

    // Add trusted device if requested
    if (rememberDevice && deviceFingerprint) {
      await db.trustedDevice.upsert({
        where: {
          userId_deviceFingerprint: {
            userId: user.id,
            deviceFingerprint: deviceFingerprint
          }
        },
        update: {
          lastUsed: new Date()
        },
        create: {
          userId: user.id,
          deviceFingerprint: deviceFingerprint,
          deviceName: userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop',
          lastUsed: new Date()
        }
      })
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
      path: '/'
    })

    // Also set auth token for compatibility
    cookieStore.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: sessionExpiresAt,
      path: '/'
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      },
      isNewUser: !otpRecord.userId
    })
  } catch (error) {
    console.error('Verify OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
