/**
 * Don Chat - Users API
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { NextResponse } from 'next/server'
import { getCurrentUser, getAllUsers } from '@/lib/parse-auth'
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

    const users = await getAllUsers(user.id)

    return NextResponse.json({ 
      users: users.map(u => userToJSON(u))
    })
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    )
  }
}
