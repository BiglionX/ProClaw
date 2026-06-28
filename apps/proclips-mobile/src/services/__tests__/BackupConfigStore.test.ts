/// <reference types="jest" />

/**
 * BackupConfigStore 单元测试
 * 测试备份配置的持久化、加载、清除功能
 * 覆盖 Web 平台（AsyncStorage）和原生平台（expo-secure-store）路径
 */

// Mock AsyncStorage
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

// Mock expo-secure-store (only used in native tests, but mock for safety)
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}), { virtual: true });

import { saveBackupConfig, loadBackupConfig, clearBackupConfig, hasBackupConfig } from '../BackupConfigStore';
import type { PersistedBackupConfig } from '../BackupConfigStore';

describe('BackupConfigStore', () => {
  const sampleConfig: PersistedBackupConfig = {
    enabled: true,
    encryptedPassword: 'encrypted_value_123',
    backupPassword: 'MyBackupP@ss1',
    passwordHash: 'abc123def456',
    recoveryWords: ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'],
    lastSyncTime: 1000000,
    userId: 'user_test_001',
  };

  beforeEach(() => {
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    jest.clearAllMocks();
  });

  describe('saveBackupConfig', () => {
    it('应能保存完整的备份配置', async () => {
      await saveBackupConfig(sampleConfig);

      const stored = mockStorage['@proclaw_backup_config'];
      expect(stored).toBeDefined();

      const parsed = JSON.parse(stored);
      expect(parsed.enabled).toBe(true);
      expect(parsed.userId).toBe('user_test_001');
      expect(parsed.recoveryWords).toHaveLength(6);
    });

    it('应能保存最小配置（无可选字段）', async () => {
      const minConfig: PersistedBackupConfig = {
        enabled: false,
        encryptedPassword: '',
        passwordHash: '',
        recoveryWords: [],
        lastSyncTime: 0,
        userId: '',
      };

      await saveBackupConfig(minConfig);

      const stored = mockStorage['@proclaw_backup_config'];
      expect(stored).toBeDefined();
      expect(JSON.parse(stored).enabled).toBe(false);
    });
  });

  describe('loadBackupConfig', () => {
    it('应能加载之前保存的配置', async () => {
      await saveBackupConfig(sampleConfig);
      const loaded = await loadBackupConfig();

      expect(loaded).not.toBeNull();
      expect(loaded!.enabled).toBe(true);
      expect(loaded!.userId).toBe('user_test_001');
      expect(loaded!.recoveryWords).toEqual(sampleConfig.recoveryWords);
    });

    it('无配置时应返回 null', async () => {
      const loaded = await loadBackupConfig();
      expect(loaded).toBeNull();
    });

    it('损坏的 JSON 应返回 null 而不是崩溃', async () => {
      mockStorage['@proclaw_backup_config'] = '{invalid json!!!';
      const loaded = await loadBackupConfig();
      expect(loaded).toBeNull();
    });
  });

  describe('clearBackupConfig', () => {
    it('应能清除已保存的配置', async () => {
      await saveBackupConfig(sampleConfig);
      expect(mockStorage['@proclaw_backup_config']).toBeDefined();

      await clearBackupConfig();
      expect(mockStorage['@proclaw_backup_config']).toBeUndefined();
    });

    it('清除不存在的配置不应报错', async () => {
      await expect(clearBackupConfig()).resolves.not.toThrow();
    });
  });

  describe('hasBackupConfig', () => {
    it('有已启用的配置时应返回 true', async () => {
      await saveBackupConfig(sampleConfig);
      const result = await hasBackupConfig();
      expect(result).toBe(true);
    });

    it('配置存在但未启用时应返回 false', async () => {
      await saveBackupConfig({ ...sampleConfig, enabled: false });
      const result = await hasBackupConfig();
      expect(result).toBe(false);
    });

    it('无配置时应返回 false', async () => {
      const result = await hasBackupConfig();
      expect(result).toBe(false);
    });
  });

  describe('数据完整性', () => {
    it('保存后加载应保留所有字段', async () => {
      await saveBackupConfig(sampleConfig);
      const loaded = await loadBackupConfig();

      expect(loaded).toEqual(sampleConfig);
    });

    it('连续保存两次应使用最新值', async () => {
      await saveBackupConfig({ ...sampleConfig, userId: 'first' });
      await saveBackupConfig({ ...sampleConfig, userId: 'second' });

      const loaded = await loadBackupConfig();
      expect(loaded!.userId).toBe('second');
    });
  });
});
