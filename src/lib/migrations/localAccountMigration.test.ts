import { describe, it, expect, beforeEach } from 'vitest';
import {
  runLocalAccountMigration,
  _resetMigrationFlagForTests,
} from './localAccountMigration';

describe('runLocalAccountMigration', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetMigrationFlagForTests();
  });

  it('首次跑：返回 ran=true, alreadyDone=false', () => {
    const r = runLocalAccountMigration();
    expect(r.ran).toBe(true);
    expect(r.alreadyDone).toBe(false);
  });

  it('设置完成标志后第二次跑：返回 alreadyDone=true', () => {
    runLocalAccountMigration();
    const r = runLocalAccountMigration();
    expect(r.ran).toBe(false);
    expect(r.alreadyDone).toBe(true);
  });

  it('清理对应账号已删除的孤儿 hash', () => {
    // 模拟账号列表：只有 acc-A
    localStorage.setItem(
      'proclaw-local-accounts',
      JSON.stringify([
        { id: 'acc-A', username: 'alice', displayName: 'Alice', createdAt: '2026-01-01' },
      ]),
    );
    // 模拟孤儿 hash：acc-A 有效，acc-DELETED 孤儿
    localStorage.setItem('proclaw-pw:acc-A', 'hash-A');
    localStorage.setItem('proclaw-pw:acc-DELETED', 'orphan-hash');

    const r = runLocalAccountMigration();
    expect(r.removed).toBe(1);
    expect(r.kept).toBe(1);

    // 验证：孤儿被删，合法保留
    expect(localStorage.getItem('proclaw-pw:acc-DELETED')).toBeNull();
    expect(localStorage.getItem('proclaw-pw:acc-A')).toBe('hash-A');
  });

  it('无账号也无密码哈希时不报错', () => {
    const r = runLocalAccountMigration();
    expect(r.removed).toBe(0);
    expect(r.kept).toBe(0);
  });

  it('写入完成标志包含 timestamp', () => {
    runLocalAccountMigration();
    const flag = localStorage.getItem('proclaw-migration-v13.1-complete');
    expect(flag).not.toBeNull();
    const parsed = JSON.parse(flag!);
    expect(parsed.timestamp).toBeTruthy();
    expect(new Date(parsed.timestamp).getTime()).toBeGreaterThan(0);
  });

  it('不影响非 proclaw-pw: 前缀的键', () => {
    localStorage.setItem('other-key', 'other-value');
    localStorage.setItem('proclaw-pw:orphan', 'orphan-hash');
    // 无账号 → orphan 被删，但 other-key 保留
    runLocalAccountMigration();
    expect(localStorage.getItem('other-key')).toBe('other-value');
    expect(localStorage.getItem('proclaw-pw:orphan')).toBeNull();
  });
});
