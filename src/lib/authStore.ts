import { create } from 'zustand';
import { Session, supabase, User, isSupabaseConfigured } from '../lib/supabase';
import { startOidcAuth, exchangeCodeForToken, getUserInfo, logout as oidcLogout } from './oidc-client';
import { getPasswordStorage, hashPassword } from './passwordStorage';
import { runLocalAccountMigration } from './migrations/localAccountMigration';

export const MOCK_PASSWORD = import.meta.env.VITE_MOCK_PASSWORD || 'IamBigBoss';

const AUTH_STORAGE_KEY = 'proclaw-auth-session';
const LOCAL_AUTH_STORAGE_KEY = 'proclaw-local-auth';

/**
 * PRD v13.0 §2：身份类型
 * - offline  : 离线访客（首次启动默认）
 * - local    : 本地账号（桌面端独占凭证）
 * - premium  : 增值账号（OIDC/Supabase 云端登录）
 * - demo     : 演示账号（boss/IamBigBoss）
 */
export type IdentityState = 'offline' | 'local' | 'premium' | 'demo';

export interface LocalAccount {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

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

function persistLocalAccount(account: LocalAccount) {
  try {
    localStorage.setItem(LOCAL_AUTH_STORAGE_KEY, JSON.stringify(account));
  } catch {
    /* ignore */
  }
}

function loadPersistedLocalAccount(): LocalAccount | null {
  try {
    const raw = localStorage.getItem(LOCAL_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPersistedLocalAccount() {
  try {
    localStorage.removeItem(LOCAL_AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * PRD v13.0 §2：根据 user / localAccount 派生身份类型
 */
export function resolveIdentityState(
  user: User | null,
  localAccount: LocalAccount | null
): IdentityState {
  if (user) {
    if (user.id?.startsWith('mock-')) return 'demo';
    return 'premium';
  }
  if (localAccount) return 'local';
  return 'offline';
}

interface AuthState {
  user: User | null;
  session: Session | null;
  localAccount: LocalAccount | null;
  identityState: IdentityState;
  isLoading: boolean;
  error: string | null;
  loginDialogOpen: boolean;
  requireUpgradeOpen: boolean;
  requireUpgradeFeature: 'cloud-backup' | 'ai-team' | 'token' | 'marketing' | 'sync' | 'invitation' | 'plugin-store' | null;
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

  // PRD v13.0：本地账号 + 拦截能力
  // v13.1：可选 password，hash 存于 PasswordStorage（不混入 account JSON）
  // v13.1.1：本地账号「类似普通办公软件开机即用」——不提供 loginLocal 入口，
  //         创建即登录、刷新即恢复；切换账号不需要密码。
  createLocalAccount: (username: string, password?: string, displayName?: string) => Promise<LocalAccount>;
  switchLocalAccount: (accountId: string) => Promise<void>;
  listLocalAccounts: () => LocalAccount[];
  logoutLocal: () => Promise<void>;
  openRequireUpgrade: (feature: NonNullable<AuthState['requireUpgradeFeature']>) => void;
  closeRequireUpgrade: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  localAccount: null,
  identityState: 'offline',
  isLoading: false,
  error: null,
  loginDialogOpen: false,
  requireUpgradeOpen: false,
  requireUpgradeFeature: null,
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
          identityState: 'demo',
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
        identityState: 'premium',
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
        identityState: 'premium',
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
        // PRD v13.0：退出增值账号后回到本地账号状态（若存在），否则离线访客
        identityState: get().localAccount ? 'local' : 'offline',
        isLoading: false,
      });
    } catch (error: any) {
      clearPersistedAuth();
      set({
        user: null,
        session: null,
        oidcTokens: null,
        identityState: get().localAccount ? 'local' : 'offline',
        error: error.message || '登出失败',
        isLoading: false,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // v13.1：先跑迁移（清理孤儿 hash + 标记完成），再恢复 localStorage
      runLocalAccountMigration();

      // PRD v13.0：先恢复本地账号（优先级最高）
      const persistedLocal = loadPersistedLocalAccount();
      const persisted = loadPersistedAuth();
      if (persisted) {
        set({
          user: persisted.user,
          session: persisted.session,
          localAccount: persistedLocal,
          identityState: resolveIdentityState(persisted.user, persistedLocal),
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
          localAccount: persistedLocal,
          identityState: resolveIdentityState(session?.user || null, persistedLocal),
          isLoading: false,
        });
        return;
      }

      set({
        user: null,
        session: null,
        localAccount: persistedLocal,
        identityState: resolveIdentityState(null, persistedLocal),
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
        identityState: 'premium',
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

  // ========== PRD v13.0：本地账号体系；v13.1 加 password 哈希；v13.1.1 去掉登录入口 ==========
  // v13.1.1：本地账号「类似普通办公软件开机即用」——不提供 loginLocal 入口，
  //         创建即登录、刷新即恢复；切换账号也不需要密码（点谁进谁）。
  // v13.1 password 字段保留：bcrypt 哈希存于 PasswordStorage，将来可用于「删除账号二次确认」等场景。

  createLocalAccount: async (username: string, password?: string, displayName?: string) => {
    const trimmed = username.trim();
    if (!trimmed) {
      throw new Error('用户名不能为空');
    }
    const all = get().listLocalAccounts();
    if (all.find(a => a.username === trimmed)) {
      throw new Error('本地账号已存在');
    }
    const account: LocalAccount = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      username: trimmed,
      displayName: displayName?.trim() || trimmed,
      createdAt: new Date().toISOString(),
    };
    // v13.1：如有 password 则 bcrypt 哈希后存到 PasswordStorage（不混入 account JSON）
    if (password) {
      const storage = getPasswordStorage();
      await storage.set(account.id, hashPassword(password));
    }
    // 存到 localStorage.MOCK_LOCAL_ACCOUNTS_KEY
    try {
      const raw = localStorage.getItem('proclaw-local-accounts');
      const list: LocalAccount[] = raw ? JSON.parse(raw) : [];
      list.push(account);
      localStorage.setItem('proclaw-local-accounts', JSON.stringify(list));
    } catch {
      /* ignore */
    }
    persistLocalAccount(account);
    set({
      localAccount: account,
      identityState: resolveIdentityState(get().user, account),
    });
    return account;
  },

  switchLocalAccount: async (accountId: string) => {
    const all = get().listLocalAccounts();
    const account = all.find(a => a.id === accountId);
    if (!account) {
      throw new Error('本地账号不存在');
    }
    // v13.1.1：去掉密码验证——「类似普通办公软件开机即用」，点谁进谁
    persistLocalAccount(account);
    set({
      localAccount: account,
      identityState: resolveIdentityState(get().user, account),
    });
  },

  listLocalAccounts: () => {
    try {
      const raw = localStorage.getItem('proclaw-local-accounts');
      return raw ? (JSON.parse(raw) as LocalAccount[]) : [];
    } catch {
      return [];
    }
  },

  logoutLocal: async () => {
    clearPersistedLocalAccount();
    set({
      localAccount: null,
      identityState: get().user ? resolveIdentityState(get().user, null) : 'offline',
    });
  },

  // ========== PRD v13.0 §9：增值能力拦截 ==========
  openRequireUpgrade: (feature) => {
    set({ requireUpgradeOpen: true, requireUpgradeFeature: feature });
  },
  closeRequireUpgrade: () => {
    set({ requireUpgradeOpen: false, requireUpgradeFeature: null });
  },
}));
