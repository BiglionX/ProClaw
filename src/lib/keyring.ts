/**
 * Tauri Keyring 接入（v13.1.1 本地账号无登录模式）
 *
 * 设计原则：
 * - 生产环境：直连 Rust keyring 命令，无任何 fallback（OS 原生凭据存储）
 * - 开发态：浏览器中无 keyring，回退到 localStorage 仅方便 vite dev 调试
 *   （生产打包后 import.meta.env.DEV=false，回退路径自然失效）
 *
 * 安全要求：
 * - 仅在本机 OS 凭据存储中保存密码，跨进程/跨用户不可访问
 * - 前端只在切换/登录时按需读取，绝不缓存到内存
 */

import { ipcInvoke, isTauri } from './tauri';

const DEV_PREFIX = '__proclaw_dev_keyring__:';

/**
 * 是否在 Tauri 桌面运行时（非浏览器 dev）
 */
export function isKeyringRuntime(): boolean {
  return isTauri();
}

/**
 * 写入或更新本地账号密码到 OS keyring
 * @throws 在生产环境（非 DEV 且非 Tauri）下抛错，提示需在桌面端运行
 */
export async function setKeyringPassword(accountId: string, password: string): Promise<void> {
  if (!accountId) throw new Error('accountId is required');
  if (!password) throw new Error('password is required');

  if (isTauri()) {
    await ipcInvoke<void>('keyring_set', { accountId, password });
    return;
  }

  // 浏览器 dev fallback（仅 DEV 模式生效）
  if (import.meta.env.DEV) {
    localStorage.setItem(DEV_PREFIX + accountId, password);
    return;
  }

  throw new Error('Keyring only available in Tauri desktop runtime');
}

/**
 * 从 OS keyring 读取本地账号密码
 * @returns 密码字符串；不存在或浏览器 dev 不可用时返回 null
 * Rust 端 keyring_get 已返回 Option<String>，语义明确（null = NoEntry）
 */
export async function getKeyringPassword(accountId: string): Promise<string | null> {
  if (!accountId) return null;

  if (isTauri()) {
    const result = await ipcInvoke<string | null>('keyring_get', { accountId });
    return result ?? null;
  }

  if (import.meta.env.DEV) {
    return localStorage.getItem(DEV_PREFIX + accountId);
  }

  return null;
}

/**
 * 删除本地账号密码（账号注销/迁移时调用）
 * 幂等：密码不存在也视为成功
 */
export async function deleteKeyringPassword(accountId: string): Promise<void> {
  if (!accountId) return;

  if (isTauri()) {
    await ipcInvoke<void>('keyring_delete', { accountId });
    return;
  }

  if (import.meta.env.DEV) {
    localStorage.removeItem(DEV_PREFIX + accountId);
    return;
  }
}

/**
 * 检查本地账号密码是否已存在（不返回密码内容）
 */
export async function hasKeyringPassword(accountId: string): Promise<boolean> {
  if (!accountId) return false;

  if (isTauri()) {
    return await ipcInvoke<boolean>('keyring_exists', { accountId });
  }

  if (import.meta.env.DEV) {
    return localStorage.getItem(DEV_PREFIX + accountId) !== null;
  }

  return false;
}