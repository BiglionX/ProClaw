import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  LocalStoragePasswordStorage,
  getPasswordStorage,
  isTauriEnvironment,
  _resetPasswordStorageForTests,
} from './passwordStorage';

describe('hashPassword / verifyPassword (bcrypt)', () => {
  it('hashPassword 返回标准 bcrypt 格式 $2a$10$...', () => {
    const hash = hashPassword('hello123');
    expect(hash).toMatch(/^\$2[aby]?\$10\$/);
    // 60 字符长
    expect(hash.length).toBe(60);
  });

  it('同密码两次哈希输出不同（bcrypt salt 随机）', () => {
    const h1 = hashPassword('same');
    const h2 = hashPassword('same');
    expect(h1).not.toBe(h2);
    // 但都能验证通过
    expect(verifyPassword('same', h1)).toBe(true);
    expect(verifyPassword('same', h2)).toBe(true);
  });

  it('verifyPassword 正确密码通过', () => {
    const hash = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', hash)).toBe(true);
  });

  it('verifyPassword 错误密码失败', () => {
    const hash = hashPassword('mypassword');
    expect(verifyPassword('wrongpassword', hash)).toBe(false);
  });

  it('verifyPassword 对空输入/空 hash 返回 false', () => {
    expect(verifyPassword('', hashPassword('x'))).toBe(false);
    expect(verifyPassword('x', '')).toBe(false);
    expect(verifyPassword('x', null)).toBe(false);
    expect(verifyPassword('x', undefined)).toBe(false);
  });

  it('verifyPassword 对非 bcrypt 格式 hash 返回 false', () => {
    expect(verifyPassword('anything', 'plaintext')).toBe(false);
    expect(verifyPassword('anything', '$argon2id$v=19$...')).toBe(false);
  });

  it('hashPassword 对空密码抛错', () => {
    expect(() => hashPassword('')).toThrow();
  });
});

describe('LocalStoragePasswordStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetPasswordStorageForTests();
  });

  it('get 不存在的账号返回 null', async () => {
    const storage = new LocalStoragePasswordStorage();
    expect(await storage.get('nonexistent')).toBeNull();
  });

  it('set 后 get 能取回原 hash', async () => {
    const storage = new LocalStoragePasswordStorage();
    const hash = hashPassword('secret');
    await storage.set('acc-1', hash);
    expect(await storage.get('acc-1')).toBe(hash);
  });

  it('delete 后 get 返回 null', async () => {
    const storage = new LocalStoragePasswordStorage();
    await storage.set('acc-1', hashPassword('secret'));
    await storage.delete('acc-1');
    expect(await storage.get('acc-1')).toBeNull();
  });

  it('不同账号的 hash 独立存储', async () => {
    const storage = new LocalStoragePasswordStorage();
    const h1 = hashPassword('p1');
    const h2 = hashPassword('p2');
    await storage.set('acc-1', h1);
    await storage.set('acc-2', h2);
    expect(await storage.get('acc-1')).toBe(h1);
    expect(await storage.get('acc-2')).toBe(h2);
  });

  it('set 同一账号覆盖之前的 hash', async () => {
    const storage = new LocalStoragePasswordStorage();
    await storage.set('acc-1', hashPassword('old'));
    const newHash = hashPassword('new');
    await storage.set('acc-1', newHash);
    expect(await storage.get('acc-1')).toBe(newHash);
    // 旧密码不能再验证
    expect(verifyPassword('old', newHash)).toBe(false);
  });
});

describe('getPasswordStorage 工厂', () => {
  beforeEach(() => {
    localStorage.clear();
    _resetPasswordStorageForTests();
  });

  it('非 Tauri 环境返回 LocalStoragePasswordStorage', () => {
    // jsdom 注入 window 但没有 __TAURI_INTERNALS__
    expect(isTauriEnvironment()).toBe(false);
    const storage = getPasswordStorage();
    expect(storage).toBeInstanceOf(LocalStoragePasswordStorage);
  });

  it('多次调用返回同一实例（单例）', () => {
    const s1 = getPasswordStorage();
    const s2 = getPasswordStorage();
    expect(s1).toBe(s2);
  });
});
