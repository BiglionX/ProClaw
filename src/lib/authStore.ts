import { create } from 'zustand'
import { supabase, User, Session } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message || '登录失败',
        isLoading: false,
      })
      throw error
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message || '注册失败',
        isLoading: false,
      })
      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      set({
        user: null,
        session: null,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message || '登出失败',
        isLoading: false,
      })
      throw error
    }
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      set({
        user: session?.user || null,
        session: session,
        isLoading: false,
      })
    } catch (error: any) {
      set({
        error: error.message || '认证检查失败',
        isLoading: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
