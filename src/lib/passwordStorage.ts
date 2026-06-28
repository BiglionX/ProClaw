/**
 * PRD v13.1 §本地密码升级
 *
 * 设计目标：
 * 1. 把 v13.0 MVP "username 即登录" 升级为 "username + password"
 * 2. 密码用 bcrypt 哈希（cost=10 ≈ 100ms 同步计算），永不明文落盘
 * 3. 存储后端抽象：浏览器 vite dev → localStorage；Tauri 桌面 → OS Keyring
 * 4. 向后兼容：v13.0 时期创建的本地账号（无 passwordHash）仍可登录（仅 username 匹配）
 *
 * 实施教训：
 * - bcryptjs 纯 JS，浏览器/Node/Tauri-WebView 都能跑，无需 native binding
 * - 同步 API（hashSync/compareSync）在 e2e/单测里更稳定，避免 await 时序
 * - TauriKeyringStorage 留 TODO：v13.2 接 Tauri command + `keyring` crate
 */
import bcrypt from 'bcryptjs';

// ========== 哈希工具 ==========

const BCRYPT_PREFIX = '$2';

/** bcrypt 同步哈希（cost=10 ≈ 100ms） */
export function hashPassword(plain: string): string {
  if (!plain) throw new Error('密码不能为空');
  return bcrypt.hashSync(plain, 10);
}

/** bcrypt 同步验证 */
export function verifyPassword(plain: string, hash: string | null | undefined): boolean {
  if (!plain || !hash || !hash.startsWith(BCRYPT_PREFIX)) return false;
  try {
    return bcrypt.compareSync(plain, hash);
  } catch {
    return false;
  }
}

// ========== 存储后端抽象 ==========

export interface PasswordStorage {
  /** 取账号密码哈希，没有返回 null */
  get(accountId: string): Promise<string | null>;
  /** 存账号密码哈希（覆盖） */
  set(accountId: string, hash: string): Promise<void>;
  /** 删账号密码哈希（删除账号时调用） */
  delete(accountId: string): Promise<void>;
}

function passwordKey(accountId: string): string {
  return `proclaw-pw:${accountId}`;
}

/** 浏览器/vite dev 环境的 localStorage 后端（MVP 默认） */
export class LocalStoragePasswordStorage implements PasswordStorage {
  async get(accountId: string): Promise<string | null> {
    try {
      return localStorage.getItem(passwordKey(accountId));
    } catch {
      return null;
    }
  }
  async set(accountId: string, hash: string): Promise<void> {
    try {
      localStorage.setItem(passwordKey(accountId), hash);
    } catch {
      /* ignore */
    }
  }
  async delete(accountId: string): Promise<void> {
    try {
      localStorage.removeItem(passwordKey(accountId));
    } catch {
      /* ignore */
    }
  }
}

/**
 * Tauri 桌面环境后端（v13.1 真接）
 *
 * 调用 src-tauri/src/password_storage_commands.rs 的 3 个 command：
 *   - password_keyring_get/set/delete
 * 后端用 `keyring` crate 写 OS 原生密码管理器（macOS Keychain / Windows Credential Manager / Linux Secret Service）。
 *
 * v13.1：去掉 try/catch fallback——OS Keyring 不可用时直接抛错，前端 catch 后可提示用户或跳过本地密码能力。
 */
export class TauriKeyringStorage implements PasswordStorage {
  async get(accountId: string): Promise<string | null> {
    const { invoke } = await import('@tauri-apps/api/core');
    // 后端 Ok(Some(hash)) → 返回 hash；Ok(None) → null；Err(msg) → throw
    return await invoke<string | null>('password_keyring_get', { key: passwordKey(accountId) });
  }
  async set(accountId: string, hash: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('password_keyring_set', { key: passwordKey(accountId), value: hash });
  }
  async delete(accountId: string): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('password_keyring_delete', { key: passwordKey(accountId) });
  }
}

/** Tauri 2 检测：window.__TAURI_INTERNALS__ 是 Tauri 2 注入的全局 */
export function isTauriEnvironment(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** 工厂：根据环境返回对应后端（单例） */
let cachedStorage: PasswordStorage | null = null;
export function getPasswordStorage(): PasswordStorage {
  if (!cachedStorage) {
    cachedStorage = isTauriEnvironment()
      ? new TauriKeyringStorage()
      : new LocalStoragePasswordStorage();
  }
  return cachedStorage;
}

/** 单测/迁移用：重置缓存（强制重新选后端） */
export function _resetPasswordStorageForTests(): void {
  cachedStorage = null;
}
