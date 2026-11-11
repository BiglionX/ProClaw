/**
 * ProClaw 桌面端鉴权 Store (v13.1.1: 本地账号无登录模式)
 *
 * 核心决策（v13.1.1）：
 * - 离线优先：所有功能可离线使用，无需登录即可访问主功能
 * - 开机即用：创建账号即登录、刷新即恢复、切换账号无需密码
 * - 退出后回到离线访客状态（账号列表保留，下次开机可见）
 *
 * 实现细节：
 * - 账号信息持久化到 SQLite users 表
 * - 密码哈希同步入库（argon2）作为兜底
 * - 密码明文由 OS keyring 托管（Windows Credential Manager / macOS Keychain / Linux Secret Service）
 * - 当前活跃账号 ID 写到 localStorage 用于会话恢复
 */

import { create } from 'zustand';
import { ipcInvoke } from './tauri';
import {
  deleteKeyringPassword,
} from './keyring';

// ========== 类型 ==========

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  user_type?: string;
  last_login_at?: string | null;
}

// 兼容旧字段（保留避免破坏现有调用方）
export interface User extends LocalUser {
  created_at: string;
  updated_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user: User;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  localUsers: LocalUser[];
  hasInitialized: boolean;
  isLoading: boolean;
  error: string | null;

  // v13.1.1 核心方法
  initialize: () => Promise<void>;
  registerLocal: (email: string, password: string, displayName?: string) => Promise<User>;
  switchAccount: (accountId: string) => Promise<void>;
  refreshLocalUsers: () => Promise<void>;

  // 兼容旧 API
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

// ========== 常量 ==========

const ACTIVE_ACCOUNT_KEY = 'proclaw-active-account';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30; // 30 天

// ========== 工具 ==========

function loadActiveAccountId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

function saveActiveAccountId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
    }
  } catch {
    /* ignore */
  }
}

function toUserObject(local: LocalUser, existing?: User | null): User {
  const stamped = local as LocalUser & {
    created_at?: string | null;
    updated_at?: string | null;
  };
  const same = existing && existing.id === local.id ? existing : null;
  const created_at = stamped.created_at || same?.created_at || new Date().toISOString();
  const updated_at = stamped.updated_at || same?.updated_at || created_at;
  return {
    ...local,
    created_at,
    updated_at,
  };
}

function buildSession(user: User): Session {
  return {
    access_token: `local-access-${user.id}`,
    refresh_token: `local-refresh-${user.id}`,
    expires_at: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
    expires_in: SESSION_DURATION_SECONDS,
    token_type: 'bearer',
    user,
  };
}

// ========== Store ==========

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  session: null,
  localUsers: [],
  hasInitialized: false,
  isLoading: false,
  error: null,

  /**
   * 启动时调用：拉取本地账号列表，若有上次活跃账号则恢复
   * 无账号时静默等待用户在引导页创建
   */
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const resp = await ipcInvoke<{ data: LocalUser[] }>('list_local_users_cmd');
      const users = resp?.data || [];
      const activeId = loadActiveAccountId();

      let activeUser: LocalUser | null = null;
      if (activeId) {
        activeUser = users.find(u => u.id === activeId) || null;
        // v13.1.1 P0-1：activeId 失效时不要静默换账号——清空记录让用户主动选择
        // （保留账号列表显示在 NoUserWelcome 引导页，用户点选谁就激活谁）
        if (!activeUser) {
          saveActiveAccountId(null);
        }
      }

      const current = useAuthStore.getState();
      if (activeUser && current.hasInitialized && current.user?.id === activeUser.id) {
        set({
          localUsers: users,
          isLoading: false,
          hasInitialized: true,
          error: null,
        });
      } else if (activeUser) {
        const userObj = toUserObject(activeUser, current.user);
        set({
          localUsers: users,
          user: userObj,
          session: buildSession(userObj),
          isLoading: false,
          hasInitialized: true,
          error: null,
        });
      } else {
        set({
          localUsers: users,
          user: null,
          session: null,
          isLoading: false,
          hasInitialized: true,
        });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || '初始化本地账号失败',
        hasInitialized: true,
      });
    }
  },

  /**
   * v13.1.1 原子化注册（Rust 端 SQLite + keyring 一次完成）
   * 注册成功后自动激活账号并更新 localUsers 列表
   */
  registerLocal: async (email, password, displayName) => {
    set({ isLoading: true, error: null });
    try {
      // 1. 一次性写 SQLite + keyring（Rust 端原子化；keyring 失败时回滚 SQLite）
      const created = await ipcInvoke<{
        id: string;
        email: string;
        name: string;
        role: string;
        is_first_user: boolean;
      }>('register_local_cmd', {
        email,
        password,
        displayName: displayName || null,
      });

      // 2. 激活该账号
      const localUser: LocalUser = {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role,
        permissions: ['*'], // 本地账号默认全部权限（B7 修复）
        last_login_at: new Date().toISOString(),
      };
      const userObj = toUserObject(localUser, useAuthStore.getState().user);
      const session = buildSession(userObj);

      // 3. 拉取最新列表（v13.1.1 P1-3：list 失败用空数组兜底，不要回滚——user 已激活）
      let users: LocalUser[] = [];
      try {
        const resp = await ipcInvoke<{ data: LocalUser[] }>('list_local_users_cmd');
        users = resp?.data || [];
      } catch (listErr) {
        console.warn('[Auth] registerLocal 后 list_local_users 失败，localUsers 留空:', listErr);
      }
      saveActiveAccountId(userObj.id);

      set({
        localUsers: users,
        user: userObj,
        session,
        isLoading: false,
      });

      return userObj;
    } catch (err: any) {
      const msg = err?.message || '注册本地账号失败';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  /**
   * 切换本地账号（无需密码）
   * 依据 v13.1.1 决策：本地账号模式下，点谁切谁
   */
  switchAccount: async accountId => {
    set({ isLoading: true, error: null });
    try {
      const switched = await ipcInvoke<LocalUser>('switch_local_account_cmd', {
        accountId,
      });
      const userObj = toUserObject(switched, useAuthStore.getState().user);
      const session = buildSession(userObj);
      saveActiveAccountId(accountId);

      set({
        user: userObj,
        session,
        isLoading: false,
      });
    } catch (err: any) {
      const msg = err?.message || '切换账号失败';
      set({ isLoading: false, error: msg });
      throw new Error(msg);
    }
  },

  /**
   * 刷新本地账号列表（管理面板 / 删除账号后用）
   */
  refreshLocalUsers: async () => {
    try {
      const resp = await ipcInvoke<{ data: LocalUser[] }>('list_local_users_cmd');
      set({ localUsers: resp?.data || [] });
    } catch (err: any) {
      console.error('[Auth] refreshLocalUsers failed:', err);
    }
  },

  /**
   * 兼容旧 API：login 等同于 register（本地账号模式下"登录"即注册）
   * 若账号已存在，则尝试切换 + 验证密码
   */
  login: async (email, password) => {
    const existing = useAuthStore.getState().localUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      // 切换到该账号（v13.1.1 无密码切换；密码参数被忽略）
      await useAuthStore.getState().switchAccount(existing.id);
      return;
    }
    // 不存在则注册（兼容旧"注册即登录"语义）
    await useAuthStore.getState().registerLocal(email, password);
  },

  /**
   * 兼容旧 API
   */
  register: async (email, password) => {
    await useAuthStore.getState().registerLocal(email, password);
  },

  /**
   * 退出当前账号（保留账号列表，下次开机可选）
   * v13.1.1：退出后回到离线访客状态
   */
  logout: async () => {
    saveActiveAccountId(null);
    set({
      user: null,
      session: null,
      isLoading: false,
      error: null,
    });
  },

  /**
   * 兼容旧 API：等同于 initialize
   */
  checkAuth: async () => {
    if (useAuthStore.getState().hasInitialized) return;
    await useAuthStore.getState().initialize();
  },

  clearError: () => set({ error: null }),
}));

// 仅供内部使用：删除账号时同步清理 keyring
export async function deleteLocalAccount(accountId: string): Promise<void> {
  await ipcInvoke('delete_user_cmd', { id: accountId });
  await deleteKeyringPassword(accountId);
  await useAuthStore.getState().refreshLocalUsers();
  // 若删除的是当前活跃账号，清除本地活跃记录
  if (loadActiveAccountId() === accountId) {
    saveActiveAccountId(null);
    useAuthStore.setState({
      user: null,
      session: null,
    });
  }
}

// 导出供测试/调试使用
export { ACTIVE_ACCOUNT_KEY, loadActiveAccountId, saveActiveAccountId };