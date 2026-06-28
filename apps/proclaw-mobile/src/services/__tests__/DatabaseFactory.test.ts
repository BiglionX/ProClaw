/// <reference types="jest" />

/**
 * DatabaseFactory 单元测试
 * 测试 openDatabase、getDatabase、closeDatabase、closeAllDatabases
 * 使用 mock 的 expo-sqlite
 */

// 必须在 import 前配置 Platform mock
const mockPlatformOS = 'ios';
jest.mock('react-native', () => ({
  Platform: { OS: mockPlatformOS },
}));

// Mock expo-sqlite
const mockDbInstance = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  closeAsync: jest.fn().mockResolvedValue(undefined),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDbInstance),
}), { virtual: true });

// ProfileManager 依赖 AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

import {
  openDatabase,
  getDatabase,
  closeDatabase,
  closeAllDatabases,
  getCurrentProfileId,
  isDatabaseOpen,
} from '../DatabaseFactory';

import type { IDatabase } from '../DatabaseFactory';

describe('DatabaseFactory', () => {
  beforeEach(() => {
    // 清理所有数据库连接
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    // 清理内部状态（通过公开 API 关闭再重新打开）
    return closeAllDatabases().catch(() => {});
  });

  afterAll(async () => {
    await closeAllDatabases().catch(() => {});
  });

  describe('openDatabase', () => {
    it('should open a database for a profile', async () => {
      const db = await openDatabase('profile_test1');
      expect(db).toBeDefined();
      expect(typeof db.execAsync).toBe('function');
      expect(typeof db.getAllAsync).toBe('function');
      expect(typeof db.getFirstAsync).toBe('function');
      expect(typeof db.runAsync).toBe('function');
      expect(typeof db.closeAsync).toBe('function');
    });

    it('should return the same instance for the same profile (cached)', async () => {
      const db1 = await openDatabase('profile_cache_test');
      const db2 = await openDatabase('profile_cache_test');
      expect(db1).toBe(db2);
    });

    it('should close previous database when opening a different profile', async () => {
      const db1 = await openDatabase('profile_a');
      const db2 = await openDatabase('profile_b');
      expect(db1).not.toBe(db2);
    });
  });

  describe('getDatabase', () => {
    it('should return the current profile database', async () => {
      await openDatabase('profile_getdb');
      const db = getDatabase();
      expect(db).toBeDefined();
    });

    it('should throw when no database is open', () => {
      // 确保当前没有打开的数据库
      // closeAllDatabases 已在 beforeEach 中调用
      expect(() => getDatabase()).toThrow();
    });

    it('should return the correct database after switching profiles', async () => {
      const dbA = await openDatabase('profile_switch_a');
      const dbB = await openDatabase('profile_switch_b');

      const currentDb = getDatabase();
      // 当前活跃的应该是 profile_switch_b
      expect(currentDb).toBe(dbB);
    });
  });

  describe('closeDatabase', () => {
    it('should close a specific database', async () => {
      await openDatabase('profile_close1');
      expect(isDatabaseOpen('profile_close1')).toBe(true);

      await closeDatabase('profile_close1');
      expect(isDatabaseOpen('profile_close1')).toBe(false);
    });

    it('should set currentProfileId to null when closing current', async () => {
      await openDatabase('profile_current');
      expect(getCurrentProfileId()).toBe('profile_current');

      await closeDatabase('profile_current');
      expect(getCurrentProfileId()).toBeNull();
    });

    it('should not throw when closing non-existent database', async () => {
      await expect(
        closeDatabase('nonexistent_profile')
      ).resolves.not.toThrow();
    });
  });

  describe('closeAllDatabases', () => {
    it('should close all open databases', async () => {
      await openDatabase('profile_1');
      await openDatabase('profile_2');
      await openDatabase('profile_3');

      await closeAllDatabases();

      expect(isDatabaseOpen('profile_1')).toBe(false);
      expect(isDatabaseOpen('profile_2')).toBe(false);
      expect(isDatabaseOpen('profile_3')).toBe(false);
      expect(getCurrentProfileId()).toBeNull();
    });

    it('should be idempotent', async () => {
      await closeAllDatabases();
      await expect(closeAllDatabases()).resolves.not.toThrow();
    });
  });

  describe('getCurrentProfileId', () => {
    it('should return null initially', () => {
      expect(getCurrentProfileId()).toBeNull();
    });

    it('should return the current profile ID after openDatabase', async () => {
      await openDatabase('profile_id_test');
      expect(getCurrentProfileId()).toBe('profile_id_test');
    });
  });

  describe('isDatabaseOpen', () => {
    it('should return false for unopened profile', () => {
      expect(isDatabaseOpen('unopened')).toBe(false);
    });

    it('should return true for opened profile', async () => {
      await openDatabase('profile_open_check');
      expect(isDatabaseOpen('profile_open_check')).toBe(true);
    });

    it('should return false after closing', async () => {
      await openDatabase('profile_then_close');
      await closeDatabase('profile_then_close');
      expect(isDatabaseOpen('profile_then_close')).toBe(false);
    });
  });

  describe('IDatabase interface (Native wrapper)', () => {
    it('should provide a working IDatabase wrapper', async () => {
      const db = await openDatabase('profile_interface_test');
      expect(db).toBeDefined();

      // execAsync should work
      await expect(
        db.execAsync('CREATE TABLE test (id INT)')
      ).resolves.not.toThrow();

      // getAllAsync should work
      const results = await db.getAllAsync('SELECT * FROM test');
      expect(Array.isArray(results)).toBe(true);

      // getFirstAsync should work
      const first = await db.getFirstAsync('SELECT * FROM test');
      expect(first).toBeNull();

      // runAsync should return rowsAffected
      const result = await db.runAsync('INSERT INTO test VALUES (1)');
      expect(result).toHaveProperty('rowsAffected');
    });
  });
});
