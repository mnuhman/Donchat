/**
 * Don Chat - Parse Authentication
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import Parse, { User } from '@/lib/parse'
import { cookies } from 'next/headers'

// Get current user from session token
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('parseSessionToken')?.value

    if (!sessionToken) {
      return null
    }

    // Become the user with the session token
    const user = await Parse.User.become<User>(sessionToken)
    return user
  } catch (error) {
    console.error('Get current user error:', error)
    return null
  }
}

// Register new user
export async function registerUser(name: string, email: string, password: string): Promise<{ user: User; sessionToken: string }> {
  try {
    const user = new User()
    user.set('username', email)
    user.set('email', email)
    user.set('password', password)
    user.set('name', name)
    user.set('isOnline', false)

    const createdUser = await user.signUp()
    const sessionToken = createdUser.getSessionToken()

    return { user: createdUser, sessionToken }
  } catch (error: unknown) {
    console.error('Register error:', error)
    const parseError = error as { code?: number; message?: string }
    throw new Error(parseError.message || 'Registration failed')
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<{ user: User; sessionToken: string }> {
  try {
    const user = await Parse.User.logIn<User>(email, password)
    const sessionToken = user.getSessionToken()

    // Update online status
    user.set('isOnline', true)
    await user.save(null, { useMasterKey: true })

    return { user, sessionToken }
  } catch (error: unknown) {
    console.error('Login error:', error)
    const parseError = error as { code?: number; message?: string }
    throw new Error(parseError.message || 'Login failed')
  }
}

// Logout user
export async function logoutUser(sessionToken: string): Promise<void> {
  try {
    // Become the user and logout
    const user = await Parse.User.become<User>(sessionToken)
    
    // Update online status
    user.set('isOnline', false)
    user.set('lastSeen', new Date())
    await user.save(null, { useMasterKey: true })

    // Logout
    await Parse.User.logOut()
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// Set session cookie
export async function setSessionCookie(sessionToken: string) {
  const cookieStore = await cookies()
  cookieStore.set('parseSessionToken', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  })
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('parseSessionToken')
}

// Update user profile
export async function updateUserProfile(
  sessionToken: string,
  data: { name?: string; email?: string; bio?: string; avatar?: string | null }
): Promise<User> {
  try {
    const user = await Parse.User.become<User>(sessionToken)

    if (data.name) user.set('name', data.name)
    if (data.email) {
      user.set('email', data.email)
      user.set('username', data.email)
    }
    if (data.bio !== undefined) user.set('bio', data.bio)
    if (data.avatar !== undefined) user.set('avatar', data.avatar)

    await user.save(null, { useMasterKey: true })
    return user
  } catch (error: unknown) {
    console.error('Update profile error:', error)
    const parseError = error as { message?: string }
    throw new Error(parseError.message || 'Failed to update profile')
  }
}

// Delete user account
export async function deleteUserAccount(sessionToken: string): Promise<void> {
  try {
    const user = await Parse.User.become<User>(sessionToken)

    // Delete user's messages
    const messageQuery = new Parse.Query('Message')
    messageQuery.equalTo('sender', user)
    const sentMessages = await messageQuery.find({ useMasterKey: true })
    
    const receivedQuery = new Parse.Query('Message')
    receivedQuery.equalTo('receiver', user)
    const receivedMessages = await receivedQuery.find({ useMasterKey: true })

    const allMessages = [...sentMessages, ...receivedMessages]
    await Parse.Object.destroyAll(allMessages, { useMasterKey: true })

    // Delete user
    await user.destroy({ useMasterKey: true })
  } catch (error: unknown) {
    console.error('Delete account error:', error)
    const parseError = error as { message?: string }
    throw new Error(parseError.message || 'Failed to delete account')
  }
}

// Get all users except current
export async function getAllUsers(currentUserId: string): Promise<User[]> {
  try {
    const query = new Parse.Query(User)
    query.notEqualTo('objectId', currentUserId)
    query.ascending('name')
    
    const users = await query.find({ useMasterKey: true })
    return users as User[]
  } catch (error) {
    console.error('Get users error:', error)
    return []
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const query = new Parse.Query(User)
    const user = await query.get(userId, { useMasterKey: true })
    return user as User
  } catch (error) {
    console.error('Get user error:', error)
    return null
  }
}
