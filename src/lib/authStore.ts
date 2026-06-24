import { create } from 'zustand';
import { Session, supabase, User, isSupabaseConfigured } from '../lib/supabase';
import { startOidcAuth, exchangeCodeForToken, getUserInfo, logout as oidcLogout } from './oidc-client';

export const MOCK_PASSWORD = import.meta.env.VITE_MOCK_PASSWORD || 'IamBigBoss';

const AUTH_STORAGE_KEY = 'proclaw-auth-session';

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

function persistAuth(user: User, session: Session) {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, session }));
  } catch {
    /* ignore */
  }
}

function loadPersistedAuth(): { user: User; session: Session } | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPersistedAuth() {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

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
      const mockAccount = MOCK_ACCOUNTS.find(
        acc => acc.username === email && acc.password === password
      );

      if (mockAccount) {
        persistAuth(mockAccount.user, mockAccount.session);
        set({
          user: mockAccount.user,
          session: mockAccount.session,
          isLoading: false,
        });
        return;
      }

      if (!isSupabaseConfigured) {
        throw new Error('账号或密码错误');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && data.session) {
        persistAuth(data.user as User, data.session as Session);
      }

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
      if (!isSupabaseConfigured) {
        throw new Error('桌面版请使用本地账号登录，云端注册需配置 Supabase');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user && data.session) {
        persistAuth(data.user as User, data.session as Session);
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
    const { oidcTokens } = useAuthStore.getState();
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }

      if (oidcTokens?.refresh_token) {
        try {
          await oidcLogout(oidcTokens.refresh_token);
        } catch {
          /* ignore OIDC logout errors */
        }
      }

      clearPersistedAuth();
      set({
        user: null,
        session: null,
        oidcTokens: null,
        isLoading: false,
      });
    } catch (error: any) {
      clearPersistedAuth();
      set({
        user: null,
        session: null,
        oidcTokens: null,
        error: error.message || '登出失败',
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const persisted = loadPersistedAuth();
      if (persisted) {
        set({
          user: persisted.user,
          session: persisted.session,
          isLoading: false,
        });
        return;
      }

      if (isSupabaseConfigured) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        set({
          user: session?.user || null,
          session: session,
          isLoading: false,
        });
        return;
      }

      set({
        user: null,
        session: null,
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

      persistAuth(oidcUser, oidcSession);

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
