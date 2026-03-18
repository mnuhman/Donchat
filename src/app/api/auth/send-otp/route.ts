/**
 * Don Chat - Send OTP API
 * Generates and sends OTP to user's email
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// In production, integrate with actual email service
async function sendOTPEmail(email: string, otp: string, _name?: string): Promise<void> {
  // For demo purposes, log the OTP
  console.log(`\n========================================`)
  console.log(`OTP for ${email}: ${otp}`)
  console.log(`========================================\n`)
  
  // In production, use a real email service like:
  // - Resend
  // - SendGrid
  // - AWS SES
  // - Nodemailer
  
  // Example with a hypothetical email service:
  // await emailService.send({
  //   to: email,
  //   subject: 'Your DonChat Verification Code',
  //   html: `
  //     <h1>Your verification code is: ${otp}</h1>
  //     <p>This code will expire in 2 minutes.</p>
  //   `
  // })
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Check for recent OTP requests (rate limiting)
    const recentOtps = await db.oTP.findMany({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: new Date(Date.now() - 60 * 1000) // Last 1 minute
        }
      }
    })

    if (recentOtps.length >= 3) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait a minute.' },
        { status: 429 }
      )
    }

    // Generate new OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000) // 2 minutes

    // Invalidate old OTPs for this email
    await db.oTP.updateMany({
      where: {
        email: normalizedEmail,
        used: false
      },
      data: { used: true }
    })

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    // Create new OTP record
    await db.oTP.create({
      data: {
        email: normalizedEmail,
        code: otp,
        type: existingUser ? 'LOGIN' : 'VERIFY',
        expiresAt,
        userId: existingUser?.id
      }
    })

    // Send OTP email
    await sendOTPEmail(normalizedEmail, otp, name || existingUser?.name)

    return NextResponse.json({
      success: true,
      message: 'OTP sent successfully',
      // In development, return the OTP for testing
      ...(process.env.NODE_ENV === 'development' && { otp })
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
