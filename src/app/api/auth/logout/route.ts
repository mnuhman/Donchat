/**
 * Don Chat - Logout API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { logoutUser, clearSessionCookie } from '@/lib/parse-auth'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('parseSessionToken')?.value

    if (sessionToken) {
      await logoutUser(sessionToken)
    }

    await clearSessionCookie()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ success: true })
  }
}
