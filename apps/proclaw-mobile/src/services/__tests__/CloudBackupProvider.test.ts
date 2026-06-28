/// <reference types="jest" />

/**
 * CloudBackupProvider 单元测试
 * 测试初始化、上传、下载、重试逻辑和状态查询
 */

import { CloudBackupProvider } from '../CloudBackupProvider';
import type { IDatabase } from '../DatabaseFactory';

jest.setTimeout(30000);

declare const global: typeof globalThis;

// Mock dependencies
jest.mock('../ChangeLogManager', () => ({
  getPendingChanges: jest.fn(),
  markSynced: jest.fn(),
  getPendingCount: jest.fn(),
}));

jest.mock('../SyncMetadataManager', () => ({
  getDeviceId: jest.fn(),
  updateLastSyncTime: jest.fn(),
  getLastSyncTime: jest.fn(),
}));

jest.mock('../../utils/EncryptionUtil', () => ({
  encryptBlock: jest.fn((data: string) => `encrypted:${data}`),
  decryptBlock: jest.fn((data: string) => {
    const prefix = 'encrypted:';
    if (data.startsWith(prefix)) return data.substring(prefix.length);
    throw new Error('解密失败');
  }),
}));

jest.mock('../SyncEngine', () => {
  const actual = jest.requireActual('../SyncEngine');
  return {
    ...actual,
    applyRemoteChanges: jest.fn(() => Promise.resolve([])),
  };
});

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('CloudBackupProvider', () => {
  let provider: CloudBackupProvider;
  let mockDb: IDatabase;

  beforeEach(() => {
    jest.clearAllMocks();

    provider = new CloudBackupProvider();

    mockDb = {
      execAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      closeAsync: jest.fn(),
    };

    // Reset mockFetch to default implementation (resolves ok)
    mockFetch.mockResolvedValue({ ok: true });

    // Default mock implementations
    const { getPendingChanges, markSynced } = require('../ChangeLogManager');
    const { getDeviceId, updateLastSyncTime } = require('../SyncMetadataManager');
    getPendingChanges.mockResolvedValue([]);
    markSynced.mockResolvedValue(undefined);
    getDeviceId.mockResolvedValue('device_test_001');
    updateLastSyncTime.mockResolvedValue(undefined);
  });

  describe('initialize / isConfigured', () => {
    it('should not be configured before initialization', () => {
      expect(provider.isConfigured()).toBe(false);
    });

    it('should be configured after proper initialization', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });
      expect(provider.isConfigured()).toBe(true);
    });

    it('should not be configured when disabled', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: false,
      });
      expect(provider.isConfigured()).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return false when not configured', async () => {
      expect(await provider.isAvailable()).toBe(false);
    });

    it('should return true when supabase is reachable', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      mockFetch.mockResolvedValueOnce({ ok: true });
      expect(await provider.isAvailable()).toBe(true);
    });

    it('should return false when supabase is unreachable', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      expect(await provider.isAvailable()).toBe(false);
    });
  });

  describe('upload', () => {
    it('should return error when not configured', async () => {
      const result = await provider.upload({
        deviceId: 'd1', profileId: 'p1', timestamp: 1000, changes: [],
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Cloud backup not configured');
    });

    it('should upload changes and mark as synced on success', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      const { getPendingChanges, markSynced } = require('../ChangeLogManager');
      getPendingChanges.mockResolvedValue([
        { id: 1, table_name: 'product_spu', row_id: 'p1', operation: 'insert', old_value: null, new_value: '{}', timestamp: 1000, sync_status: 'pending' },
      ]);

      // Mock successful upload
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await provider.upload({
        deviceId: 'd1',
        profileId: 'p1',
        timestamp: 2000,
        changes: [
          { id: 1, table_name: 'product_spu', row_id: 'p1', operation: 'insert', old_value: null, new_value: '{}', timestamp: 1000, sync_status: 'pending' },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(1);
      expect(markSynced).toHaveBeenCalledWith(mockDb, [1]);
    });

    it('should retry on upload failure', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      // Use mockImplementation to avoid exponential backoff timing issues
      let callCount = 0;
      mockFetch.mockImplementation(async () => {
        callCount++;
        if (callCount <= 2) {
          return { ok: false }; // First 2 calls fail
        }
        return { ok: true }; // Third call succeeds
      });

      const result = await provider.upload({
        deviceId: 'd1', profileId: 'p1', timestamp: 2000, changes: [],
      }, 3);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 30000);

    it('should fail after exhausting retries', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      // Always fail - uploadToStorage catches fetch errors and returns false
      mockFetch.mockReset();
      mockFetch.mockResolvedValue({ ok: false });

      const result = await provider.upload({
        deviceId: 'd1', profileId: 'p1', timestamp: 2000, changes: [], 
      }, 2); // maxRetries = 2

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    }, 30000);
  });

  describe('download', () => {
    it('should return null when not configured', async () => {
      const result = await provider.download(1000, 'd1');
      expect(result).toBeNull();
    });

    it('should return null when no remote files', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      // Mock empty file list
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });

      const result = await provider.download(1000, 'd1');
      expect(result).toBeNull();
    });

    it('should download, decrypt and merge remote changes', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      // Mock file list response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ name: 'd1/5000.enc' }],
      });

      // Mock download response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'encrypted:{"product_spu":[{"id":1,"table_name":"product_spu","row_id":"p1","operation":"insert","old_value":null,"new_value":"{\\"name\\":\\"商品\\"}","timestamp":5000,"sync_status":"pending"}]}',
      });

      const result = await provider.download(1000, 'd1');

      expect(result).not.toBeNull();
      expect(result!.changes).toHaveLength(1);
      expect(result!.changes[0].table_name).toBe('product_spu');
    });
  });

  describe('getStatus', () => {
    it('should return backup status with pending count and last sync time', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      const { getPendingCount } = require('../ChangeLogManager');
      const { getLastSyncTime } = require('../SyncMetadataManager');
      getPendingCount.mockResolvedValue(5);
      getLastSyncTime.mockResolvedValue(3000);

      const status = await provider.getStatus(mockDb);

      expect(status.pendingChanges).toBe(5);
      expect(status.lastSyncTime).toBe(3000);
      expect(status.isSyncing).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should clear config and db reference', async () => {
      await provider.initialize(mockDb, {
        backupPassword: 'TestP@ss1',
        supabaseUrl: 'https://test.supabase.co',
        supabaseKey: 'test-key',
        userId: 'user_001',
        enabled: true,
      });

      expect(provider.isConfigured()).toBe(true);
      await provider.disconnect();
      expect(provider.isConfigured()).toBe(false);
    });
  });
});
