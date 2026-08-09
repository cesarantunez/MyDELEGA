import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/auth/auth-service'
import {
  login as authLogin,
  logout as authLogout,
  fetchProfile,
} from '../lib/auth/auth-service'

interface AuthState {
  user: Profile | null
  /** Hay sesion de Supabase (aunque falte perfil → onboarding) */
  hasSession: boolean
  /** Sesion + perfil listos */
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
  clearError: () => void
}

let authListenerStarted = false

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hasSession: false,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const profile = await fetchProfile()
      set({ hasSession: true, user: profile, isAuthenticated: profile !== null })
    } else {
      set({ hasSession: false, user: null, isAuthenticated: false })
    }

    if (!authListenerStarted) {
      authListenerStarted = true
      supabase.auth.onAuthStateChange((event) => {
        // setTimeout: nunca llamar a supabase dentro del callback (deadlock conocido)
        setTimeout(() => {
          if (event === 'SIGNED_OUT') {
            set({ hasSession: false, user: null, isAuthenticated: false })
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
            if (!get().user) {
              fetchProfile().then((profile) => {
                set({ hasSession: true, user: profile, isAuthenticated: profile !== null })
              })
            } else {
              set({ hasSession: true })
            }
          }
        }, 0)
      })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      await authLogin(email, password)
      const profile = await fetchProfile()
      set({ hasSession: true, user: profile, isAuthenticated: profile !== null, isLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesion'
      set({ error: message, isLoading: false })
      throw err
    }
  },

  logout: async () => {
    await authLogout()
    set({ user: null, hasSession: false, isAuthenticated: false })
  },

  refreshProfile: async () => {
    const profile = await fetchProfile()
    set({ user: profile, isAuthenticated: profile !== null })
  },

  clearError: () => set({ error: null }),
}))
