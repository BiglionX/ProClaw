import { create } from 'zustand';
import { getSupabaseClient, type User, type Session } from './supabase';
import { exchangeCodeForToken, getUserInfo, logout as oidcLogout } from './oidc-client';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  oidcTokens: { access_token: string; refresh_token: string; id_token: string } | null;

  login: (email: string, password: string) => Promise<void>;
  loginWithOidc: () => Promise<void>;
  handleOidcCallback: (code: string, state: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '操作失败';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  error: null,
  oidcTokens: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = getSupabaseClient();
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

      window.location.href = '/app/dashboard';
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      set({
        user: data.user,
        session: data.session,
        isLoading: false,
      });
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      set({
        user: null,
        session: null,
        isLoading: false,
      });

      window.location.href = '/';
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = getSupabaseClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('获取会话失败:', sessionError);
        set({
          user: null,
          session: null,
          error: sessionError.message || '获取会话失败',
          isLoading: false,
        });
        return;
      }

      set({
        user: session?.user || null,
        session: session,
        isLoading: false,
      });
    } catch (error: unknown) {
      console.error('检查认证状态失败:', error);
      set({
        user: null,
        session: null,
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  loginWithOidc: async () => {
    // 通过中间件触发服务端 OIDC + PKCE 流程
    // 中间件会生成 PKCE、存入 cookie、重定向到 account.proclaw.cc/oauth/authorize
    // 回调由 /auth/callback 服务端处理，建立 Supabase session
    set({ isLoading: true, error: null });
    window.location.href = '/app/dashboard';
  },

  handleOidcCallback: async (code: string, state: string) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await exchangeCodeForToken(code, state);
      const userInfo = await getUserInfo(tokens.access_token);

      const oidcUser = {
        id: userInfo.sub,
        email: userInfo.email || '',
        created_at: new Date().toISOString(),
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

      window.location.href = '/app/dashboard';
    } catch (error: unknown) {
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
