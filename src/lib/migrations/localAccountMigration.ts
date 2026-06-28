/**
 * PRD v13.1：本地账号迁移脚本
 *
 * 职责：
 *   1. 清理孤儿密码哈希（localStorage 里有 proclaw-pw:xxx 但对应账号已删除）
 *   2. 写入完成标志，避免每次启动都跑
 *
 * 为什么不迁移"明文密码"？
 *   v13.0 MVP 时期 LocalAccount 接口根本没有 password 字段（只有 id/username/displayName/createdAt），
 *   所以历史 localStorage 里没有任何明文密码可以迁移。本次升级本质是「新增密码能力」。
 *
 * 调用时机：authStore.checkAuth() 末尾，确保 localStorage 数据恢复后再扫描。
 */
import type { LocalAccount } from '../authStore';

const MIGRATION_KEY = 'proclaw-migration-v13.1-complete';
const PASSWORD_KEY_PREFIX = 'proclaw-pw:';
const ACCOUNTS_KEY = 'proclaw-local-accounts';

export interface MigrationResult {
  ran: boolean;
  removed: number;
  kept: number;
  /** 之前是否已迁移完成 */
  alreadyDone: boolean;
}

export function runLocalAccountMigration(): MigrationResult {
  // 已迁移：直接返回
  if (typeof localStorage !== 'undefined') {
    const flag = localStorage.getItem(MIGRATION_KEY);
    if (flag) {
      return { ran: false, removed: 0, kept: 0, alreadyDone: true };
    }
  }

  let removed = 0;
  let kept = 0;

  try {
    // 1. 收集当前所有账号 ID
    const accountsRaw = localStorage.getItem(ACCOUNTS_KEY);
    const accounts: LocalAccount[] = accountsRaw ? JSON.parse(accountsRaw) : [];
    const validIds = new Set(accounts.map(a => a.id));

    // 2. 反向扫描 localStorage 找 password 哈希（避免删除时索引位移）
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(PASSWORD_KEY_PREFIX)) {
        const id = key.slice(PASSWORD_KEY_PREFIX.length);
        if (validIds.has(id)) {
          kept++;
        } else {
          localStorage.removeItem(key);
          removed++;
        }
      }
    }

    // 3. 写入完成标志
    localStorage.setItem(
      MIGRATION_KEY,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        removed,
        kept,
      }),
    );
  } catch {
    /* localStorage 不可用时静默 */
  }

  return { ran: true, removed, kept, alreadyDone: false };
}

/** 单测 / 强制重跑用：清除完成标志 */
export function _resetMigrationFlagForTests(): void {
  try {
    localStorage.removeItem(MIGRATION_KEY);
  } catch {
    /* ignore */
  }
}
