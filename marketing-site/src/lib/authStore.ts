import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session, Profile } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // 演示模式：允许任意登录
        if (import.meta.env.VITE_SUPABASE_URL === 'your_supabase_url_here' || 
            !import.meta.env.VITE_SUPABASE_URL?.startsWith('http')) {
          console.warn('⚠️  Demo mode: Simulating login');
          
          // 检查是否为超级管理员账户
          const isAdmin = email === '1055603323@qq.com' && password === '12345678';
          
          const mockUser = {
            id: isAdmin ? 'admin-super-001' : 'demo-user-001',
            email: email,
            created_at: new Date().toISOString(),
          };
          const mockProfile = {
            id: mockUser.id,
            username: email.split('@')[0],
            role: isAdmin ? ('admin' as const) : ('user' as const),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set({
            user: mockUser,
            session: null,
            profile: mockProfile,
            isLoading: false,
          });
          return;
        }
        throw error;
      }

      // 获取用户 profile
      console.log('Fetching profile for user:', data.user?.id);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user?.id)
        .single();

      if (profileError) {
        console.error('Failed to fetch profile:', profileError);
      } else {
        console.log('Profile fetched successfully:', profile);
      }

      set({
        user: data.user,
        session: data.session,
        profile: profile,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '登录失败',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, username?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        // 演示模式：允许任意注册
        if (import.meta.env.VITE_SUPABASE_URL === 'your_supabase_url_here' || 
            !import.meta.env.VITE_SUPABASE_URL?.startsWith('http')) {
          console.warn('⚠️  Demo mode: Simulating registration');
          const mockUser = {
            id: 'demo-user-' + Date.now(),
            email: email,
            created_at: new Date().toISOString(),
          };
          const mockProfile = {
            id: mockUser.id,
            username: username || email.split('@')[0],
            role: 'user' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          set({
            user: mockUser,
            session: null,
            profile: mockProfile,
            isLoading: false,
          });
          return;
        }
        throw error;
      }

      // 创建 profile
      if (data.user) {
        await supabase.from('profiles').insert({
          id: data.user.id,
          username: username || email.split('@')[0],
          role: 'user',
        });

        // 初始化 token balance
        await supabase.from('token_balances').insert({
          user_id: data.user.id,
          balance: 0,
          total_purchased: 0,
          total_used: 0,
        });
      }

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '注册失败',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        user: null,
        session: null,
        profile: null,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '登出失败',
        isLoading: false,
      });
      throw error;
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // 获取用户 profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        set({
          user: session.user,
          session: session,
          profile: profile,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          session: null,
          profile: null,
          isLoading: false,
        });
      }
    } catch (error: any) {
      set({
        error: error.message || '认证检查失败',
        isLoading: false,
      });
    }
  },

  updateProfile: async (data: Partial<Profile>) => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      // 更新本地状态
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...data } : null,
      }));
    } catch (error: any) {
      throw new Error(error.message || '更新个人资料失败');
    }
  },

  clearError: () => set({ error: null }),
}));
