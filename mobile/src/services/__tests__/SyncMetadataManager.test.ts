/// <reference types="jest" />

/**
 * SyncMetadataManager 单元测试
 * 测试设备ID、同步时间戳、sync_token 的读写操作
 */
import type { IDatabase } from '../DatabaseFactory';

// In-memory mock database
class MockDB implements IDatabase {
  private data: Record<string, string> = {};

  async execAsync(sql: string, _params?: any[]): Promise<void> {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('DELETE')) {
      this.data = {};
    }
  }

  async getAllAsync(_sql: string, _params?: any[]): Promise<any[]> {
    return Object.entries(this.data).map(([key, value]) => ({ key, value }));
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    if (params && params.length > 0) {
      const key = String(params[0]);
      const val = this.data[key];
      return val !== undefined ? { key, value: val } : null;
    }
    const match = sql.match(/WHERE\s+key\s*=\s*\?/i);
    if (match && params) {
      const key = String(params[0]);
      const val = this.data[key];
      return val !== undefined ? { key, value: val } : null;
    }
    return null;
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    if (sql.toUpperCase().includes('INSERT OR REPLACE') && params && params.length >= 2) {
      this.data[String(params[0])] = String(params[1]);
    } else if (sql.toUpperCase().includes('INSERT OR IGNORE') && params && params.length >= 2) {
      if (this.data[String(params[0])] === undefined) {
        this.data[String(params[0])] = String(params[1]);
      }
    }
    return { rowsAffected: 1 };
  }

  async closeAsync(): Promise<void> {
    this.data = {};
  }

  reset(): void {
    this.data = {};
  }
}

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'web',
    Version: 'jest',
  },
}));

describe('SyncMetadataManager', () => {
  let db: MockDB;

  beforeEach(() => {
    db = new MockDB();
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('getOrCreateDeviceId', () => {
    it('should return a device id string', async () => {
      const { getOrCreateDeviceId } = await import('../SyncMetadataManager');
      const deviceId = await getOrCreateDeviceId();
      expect(deviceId).toBeDefined();
      expect(typeof deviceId).toBe('string');
      expect(deviceId.startsWith('device_')).toBe(true);
    });

    it('should return consistent id for same inputs', async () => {
      // Mock loadServerUrl to return consistent value
      jest.mock('../AuthService', () => ({
        loadServerUrl: jest.fn().mockResolvedValue('http://test:3000'),
      }));

      const { getOrCreateDeviceId } = await import('../SyncMetadataManager');
      const id1 = await getOrCreateDeviceId();
      const id2 = await getOrCreateDeviceId();
      expect(id1).toBe(id2);
    });
  });

  describe('initSyncMetadata', () => {
    it('should create device_id and device_name records', async () => {
      const { initSyncMetadata, getDeviceId } = await import('../SyncMetadataManager');
      await initSyncMetadata(db, 'test_device_001');

      const deviceId = await getDeviceId(db);
      expect(deviceId).toBe('test_device_001');
    });

    it('should set last_sync_time to 0 on first init', async () => {
      const { initSyncMetadata, getLastSyncTime } = await import('../SyncMetadataManager');
      await initSyncMetadata(db, 'test_device_001');

      const lastSync = await getLastSyncTime(db);
      expect(lastSync).toBe(0);
    });
  });

  describe('getDeviceId', () => {
    it('should return null when no device_id is set', async () => {
      const { getDeviceId } = await import('../SyncMetadataManager');
      const deviceId = await getDeviceId(db);
      expect(deviceId).toBeNull();
    });

    it('should return stored device_id', async () => {
      const { initSyncMetadata, getDeviceId } = await import('../SyncMetadataManager');
      await initSyncMetadata(db, 'device_abc123');
      const deviceId = await getDeviceId(db);
      expect(deviceId).toBe('device_abc123');
    });
  });

  describe('getLastSyncTime / updateLastSyncTime', () => {
    it('should return 0 when no sync time has been recorded', async () => {
      const { getLastSyncTime } = await import('../SyncMetadataManager');
      const lastSync = await getLastSyncTime(db);
      expect(lastSync).toBe(0);
    });

    it('should update and retrieve last sync time', async () => {
      const { updateLastSyncTime, getLastSyncTime } = await import('../SyncMetadataManager');
      const timestamp = Date.now();
      await updateLastSyncTime(db, timestamp);

      const result = await getLastSyncTime(db);
      expect(result).toBe(timestamp);
    });
  });

  describe('getSyncToken / updateSyncToken', () => {
    it('should return null when no sync token is set', async () => {
      const { getSyncToken } = await import('../SyncMetadataManager');
      const token = await getSyncToken(db);
      expect(token).toBeNull();
    });

    it('should update and retrieve sync token', async () => {
      const { updateSyncToken, getSyncToken } = await import('../SyncMetadataManager');
      await updateSyncToken(db, 'token_abc_123');

      const token = await getSyncToken(db);
      expect(token).toBe('token_abc_123');
    });

    it('should overwrite existing sync token', async () => {
      const { updateSyncToken, getSyncToken } = await import('../SyncMetadataManager');
      await updateSyncToken(db, 'old_token');
      await updateSyncToken(db, 'new_token');

      const token = await getSyncToken(db);
      expect(token).toBe('new_token');
    });
  });

  describe('clearSyncMetadata', () => {
    it('should clear all sync metadata records', async () => {
      const { initSyncMetadata, clearSyncMetadata, getDeviceId, getLastSyncTime } = await import('../SyncMetadataManager');
      await initSyncMetadata(db, 'device_001');

      // Verify data exists before clear
      const deviceId = await getDeviceId(db);
      expect(deviceId).not.toBeNull();

      await clearSyncMetadata(db);

      // Verify data is cleared
      const deviceIdAfter = await getDeviceId(db);
      expect(deviceIdAfter).toBeNull();

      const lastSync = await getLastSyncTime(db);
      expect(lastSync).toBe(0);
    });
  });
});
