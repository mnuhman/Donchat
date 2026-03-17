/**
 * Don Chat - Auth Store
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  name: string
  email: string
  avatar?: string | null
  bio?: string | null
  isOnline: boolean
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false
        }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        }),
      setLoading: (loading) =>
        set({
          isLoading: loading
        })
    }),
    {
      name: 'donchat-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)
