import { create } from 'zustand'
import type { User } from '../lib/auth/auth-service'
import {
  login as authLogin,
  logout as authLogout,
  getCurrentSession,
} from '../lib/auth/auth-service'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadSession: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const user = await authLogin(email, password)
      set({ user, isAuthenticated: true, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesion'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  logout: async () => {
    await authLogout()
    set({ user: null, isAuthenticated: false })
  },

  loadSession: () => {
    const user = getCurrentSession()
    if (user) {
      set({ user, isAuthenticated: true })
    }
  },

  clearError: () => set({ error: null }),
}))
