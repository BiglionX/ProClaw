import { create } from 'zustand';
import { Session, supabase, User } from '../lib/supabase';

// 模拟账号配置 - 用于快速体验软件功能
const MOCK_ACCOUNTS = [
  {
    username: 'boss',
    password: 'IamBigBoss',
    user: {
      id: 'mock-boss-001',
      email: 'boss@proclaw.demo',
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as User,
    session: {
      access_token: 'mock-access-token-boss',
      refresh_token: 'mock-refresh-token-boss',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: 'mock-boss-001',
        email: 'boss@proclaw.demo',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User,
    } as Session,
  },
];

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // 检查是否为模拟账号登录
      const mockAccount = MOCK_ACCOUNTS.find(
        (acc) => acc.username === email && acc.password === password
      );

      if (mockAccount) {
        // 模拟账号登录成功
        console.log('✅ 使用模拟账号登录:', mockAccount.username);
        set({
          user: mockAccount.user,
          session: mockAccount.session,
          isLoading: false,
        });
        return;
      }

      // 如果不是模拟账号,尝试真实 Supabase 登录
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
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

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

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

      set({
        user: session?.user || null,
        session: session,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '认证检查失败',
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
