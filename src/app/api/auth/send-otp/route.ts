/**
 * Don Chat - Send OTP API
 * Generates and sends OTP to user's email
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Resend } from 'resend'

export const runtime = 'nodejs'

// Initialize Resend lazily - only when needed
let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Send OTP email using Resend
async function sendOTPEmail(email: string, otp: string, name?: string): Promise<void> {
  const userName = name || email.split('@')[0]
  
  // Try to get Resend client
  const resendClient = getResendClient()
  
  // If no API key, just log the OTP
  if (!resendClient) {
    console.log(`\n========================================`)
    console.log(`OTP for ${email}: ${otp}`)
    console.log(`(RESEND_API_KEY not configured)`)
    console.log(`========================================\n`)
    return
  }
  
  try {
    const { data, error } = await resendClient.emails.send({
      from: 'DonChat <onboarding@resend.dev>',
      to: email,
      subject: 'Your DonChat Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>DonChat Verification Code</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
          <div style="max-width: 480px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">💬 DonChat</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 32px 24px;">
              <h2 style="color: #18181b; margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">Hi ${userName}!</h2>
              <p style="color: #71717a; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
                Use the verification code below to sign in to your DonChat account.
              </p>
              
              <!-- OTP Code -->
              <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="color: #059669; margin: 0 0 8px 0; font-size: 14px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                <p style="color: #047857; margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</p>
              </div>
              
              <p style="color: #71717a; margin: 0 0 16px 0; font-size: 14px; line-height: 1.5;">
                <strong>⏱️ This code will expire in 2 minutes.</strong>
              </p>
              
              <p style="color: #a1a1aa; margin: 0; font-size: 14px; line-height: 1.5;">
                If you didn't request this code, you can safely ignore this email. Someone might have entered your email address by mistake.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #fafafa; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="color: #a1a1aa; margin: 0 0 8px 0; font-size: 12px;">
                © 2024 DonChat. All rights reserved.
              </p>
              <p style="color: #d4d4d8; margin: 0; font-size: 11px;">
                This is an automated message, please do not reply.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hi ${userName}!

Your DonChat verification code is: ${otp}

This code will expire in 2 minutes.

If you didn't request this code, you can safely ignore this email.

© 2024 DonChat
      `
    })

    if (error) {
      console.error('Resend email error:', error)
      // Fall back to console log
      console.log(`\n========================================`)
      console.log(`OTP for ${email}: ${otp}`)
      console.log(`========================================\n`)
    } else {
      console.log(`✅ OTP email sent to ${email}, ID: ${data?.id}`)
    }
  } catch (err) {
    console.error('Failed to send email:', err)
    // Fall back to console log
    console.log(`\n========================================`)
    console.log(`OTP for ${email}: ${otp}`)
    console.log(`========================================\n`)
  }
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
      message: 'OTP sent to your email',
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
