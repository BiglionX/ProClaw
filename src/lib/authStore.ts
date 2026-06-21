import { create } from 'zustand';
import { Session, supabase, User } from '../lib/supabase';
import { startOidcAuth, exchangeCodeForToken, getUserInfo, logout as oidcLogout, refreshToken } from './oidc-client';

export const MOCK_PASSWORD = import.meta.env.VITE_MOCK_PASSWORD || `mock-${Date.now()}`;

const MOCK_ACCOUNTS = [
  {
    username: 'boss',
    password: MOCK_PASSWORD,
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
  loginDialogOpen: boolean;
  oidcTokens: { access_token: string; refresh_token: string; id_token: string } | null;

  login: (email: string, password: string) => Promise<void>;
  loginWithOidc: () => Promise<string>;
  handleOidcCallback: (code: string, state: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  openLoginDialog: () => void;
  closeLoginDialog: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,
  loginDialogOpen: false,
  oidcTokens: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      // 检查是否为模拟账号登录
      const mockAccount = MOCK_ACCOUNTS.find(
        acc => acc.username === email && acc.password === password
      );

      if (mockAccount) {
        // 模拟账号登录成功
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

  loginWithOidc: async () => {
    set({ isLoading: true, error: null });
    try {
      const authUrl = await startOidcAuth();
      set({ isLoading: false });
      return authUrl;
    } catch (error: any) {
      set({
        error: error.message || 'OIDC login initialization failed',
        isLoading: false,
      });
      throw error;
    }
  },

  handleOidcCallback: async (code: string, state: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await exchangeCodeForToken(code, state);
      const userInfo = await getUserInfo(tokens.access_token);

      const oidcUser = {
        id: userInfo.sub,
        email: userInfo.email || '',
        role: userInfo.is_admin ? 'admin' : 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as User;

      const oidcSession = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        expires_at: Math.floor(Date.now() / 1000) + tokens.expires_in,
        token_type: tokens.token_type,
        user: oidcUser,
      } as Session;

      set({
        user: oidcUser,
        session: oidcSession,
        oidcTokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          id_token: tokens.id_token,
        },
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'OIDC callback handling failed',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  openLoginDialog: () => set({ loginDialogOpen: true }),
  closeLoginDialog: () => set({ loginDialogOpen: false, error: null }),
}));
