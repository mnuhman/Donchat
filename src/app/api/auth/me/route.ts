/**
 * Don Chat - Get Current User API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/parse-auth'
import { userToJSON } from '@/lib/parse-db'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({ user: userToJSON(user) })
  } catch (error) {
    console.error('Get current user error:', error)
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    )
  }
}
