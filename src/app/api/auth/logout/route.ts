/**
 * Don Chat - Logout API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextResponse } from 'next/server'
import { getCurrentUser, clearSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST() {
  try {
    const user = await getCurrentUser()

    if (user) {
      // Update offline status
      await db.user.update({
        where: { id: user.id },
        data: {
          isOnline: false,
          lastSeen: new Date()
        }
      })
    }

    await clearSession()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true })
  }
}
