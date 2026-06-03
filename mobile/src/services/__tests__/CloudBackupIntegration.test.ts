/// <reference types="jest" />

/**
 * 云备份集成测试
 * 测试 CloudBackupProvider + EncryptionUtil 的完整工作流：
 * 1. 使用真实的 EncryptionUtil 加密/解密数据
 * 2. CloudBackupProvider 上传 -> mock Supabase Storage
 * 3. 下载 -> 解密 -> 合并到数据库
 * 4. 验证冲突记录
 */

import { CloudBackupProvider } from '../CloudBackupProvider';
import { encryptBlock, decryptBlock } from '../../utils/EncryptionUtil';
import type { IDatabase } from '../DatabaseFactory';

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

jest.mock('../SyncEngine', () => {
  const actual = jest.requireActual('../SyncEngine');
  return {
    ...actual,
    applyRemoteChanges: jest.fn(() => Promise.resolve([])),
  };
});

// In-memory mock storage
class MockStorage {
  private store: Map<string, string> = new Map();

  async upload(path: string, content: string): Promise<boolean> {
    this.store.set(path, content);
    return true;
  }

  async download(path: string): Promise<string | null> {
    return this.store.get(path) || null;
  }

  async list(prefix: string): Promise<string[]> {
    const files: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        files.push(key);
      }
    }
    return files.sort();
  }

  clear(): void {
    this.store.clear();
  }
}

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('云备份集成测试', () => {
  let provider: CloudBackupProvider;
  let mockDb: IDatabase;
  let storage: MockStorage;

  beforeEach(() => {
    jest.clearAllMocks();

    storage = new MockStorage();
    provider = new CloudBackupProvider();

    mockDb = {
      execAsync: jest.fn(),
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
      closeAsync: jest.fn(),
    };

    const { getPendingChanges, markSynced } = require('../ChangeLogManager');
    const { getDeviceId, updateLastSyncTime } = require('../SyncMetadataManager');
    getPendingChanges.mockResolvedValue([]);
    markSynced.mockResolvedValue(undefined);
    getDeviceId.mockResolvedValue('device_integration_001');
    updateLastSyncTime.mockResolvedValue(undefined);
  });

  describe('加密/解密集成', () => {
    it('should encrypt and decrypt with real EncryptionUtil', () => {
      const originalData = JSON.stringify({
        product_spu: [
          { id: 'spu_001', name: '集成测试商品', price: 99.9, last_modified: 1000 },
        ],
      });
      const password = 'IntegrationP@ss1';

      // Encrypt with auth tag (new format)
      const encrypted = encryptBlock(originalData, password);

      // Should have 4 parts (salt:iv:ciphertext:authTag)
      const parts = encrypted.split(':');
      expect(parts.length).toBe(4);

      // Decrypt
      const decrypted = decryptBlock(encrypted, password);
      expect(decrypted).toBe(originalData);

      // Verify integrity
      const { verifyBlockIntegrity } = require('../../utils/EncryptionUtil');
      expect(verifyBlockIntegrity(encrypted, password)).toBe(true);
    });

    it('should produce different outputs for same data (non-deterministic encryption)', () => {
      const data = '{"test": "data"}';
      const password = 'TestP@ss1';

      const enc1 = encryptBlock(data, password);
      const enc2 = encryptBlock(data, password);

      expect(enc1).not.toBe(enc2);
    });

    it('should reject wrong password for encrypted block', () => {
      const original = '敏感数据';
      const encrypted = encryptBlock(original, 'CorrectP@ss1');

      expect(() => decryptBlock(encrypted, 'WrongP@ss1')).toThrow();
    });

    it('should maintain backward compatibility with old 3-part format', () => {
      // Simulate old format (salt:iv:ciphertext without auth tag)
      const { encryptBlock: realEncrypt } = require('../../utils/EncryptionUtil');

      // We need to simulate old format: manually create it
      const { generateSalt, deriveKey } = require('../../utils/EncryptionUtil');
      const salt = generateSalt();
      const iv = '0123456789ab';
      const key = deriveKey('BackupP@ss1', salt);

      // Encrypt with old-style approach (no auth tag)
      const CryptoJS = require('crypto-js');
      const encrypted = CryptoJS.AES.encrypt('old format data', key, {
        iv: CryptoJS.enc.Hex.parse(iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      });
      const oldFormat = `${salt}:${iv}:${encrypted.toString()}`;

      // Should still be decryptable
      const decrypted = decryptBlock(oldFormat, 'BackupP@ss1');
      expect(decrypted).toBe('old format data');
    });
  });

  describe('上传/下载集成', () => {
    const backupPassword = 'CloudP@ss1';
    const supabaseUrl = 'https://test.supabase.co';
    const supabaseKey = 'test-anon-key';
    const userId = 'user_integration_001';

    it('should upload encrypted data and decrypt on download', async () => {
      await provider.initialize(mockDb, {
        backupPassword,
        supabaseUrl,
        supabaseKey,
        userId,
        enabled: true,
      });

      const { getPendingChanges, markSynced } = require('../ChangeLogManager');
      getPendingChanges.mockResolvedValue([]);
      markSynced.mockResolvedValue(undefined);

      // Mock successful upload
      mockFetch.mockImplementation(async (url: string, options?: any) => {
        // File listing - must check BEFORE /object/ to avoid matching list URLs against download handler
        if (url.includes('/storage/v1/object/list/')) {
          const prefixMatch = url.match(/\/list\/(.+)$/);
          const prefix = prefixMatch ? prefixMatch[1] : '';
          const files = await storage.list(prefix);
          const entries = files.map(f => ({
            name: f.replace(prefix, ''),
          }));
          return { ok: true, json: async () => entries };
        }

        // Object upload/download (must come AFTER list check)
        if (url.includes('/storage/v1/object/')) {
          if (options?.method === 'PUT') {
            // Store the uploaded content
            const pathMatch = url.match(/\/object\/(.+)$/);
            if (pathMatch) {
              storage.upload(pathMatch[1], options.body);
            }
            return { ok: true };
          }
          if (!options?.method || options.method === 'GET') {
            const pathMatch = url.match(/\/object\/(.+)$/);
            if (pathMatch) {
              const content = await storage.download(pathMatch[1]);
              if (content) {
                return { ok: true, text: async () => content };
              }
            }
            return { ok: false, status: 404 };
          }
        }

        return { ok: true };
      });

      // === Upload Phase ===
      const uploadResult = await provider.upload({
        deviceId: 'device_001',
        profileId: 'profile_001',
        timestamp: 5000,
        changes: [
          { id: 1, table_name: 'product_spu', row_id: 'spu_001', operation: 'insert', old_value: null, new_value: '{"name":"商品"}', timestamp: 5000, sync_status: 'pending' },
        ],
      });

      expect(uploadResult.success).toBe(true);

      // === Download Phase ===
      const downloadResult = await provider.download(4000, 'device_001');

      expect(downloadResult).not.toBeNull();
      expect(downloadResult!.changes.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty upload (no pending changes)', async () => {
      await provider.initialize(mockDb, {
        backupPassword,
        supabaseUrl,
        supabaseKey,
        userId,
        enabled: true,
      });

      mockFetch.mockResolvedValue({ ok: true });

      const result = await provider.upload({
        deviceId: 'device_001',
        profileId: 'profile_001',
        timestamp: 6000,
        changes: [],
      });

      expect(result.success).toBe(true);
      expect(result.applied).toBe(0);
    });

    it('should detect encryption tampering', async () => {
      // Create an encrypted block
      const originalData = '{"test": "data"}';
      const encrypted = encryptBlock(originalData, 'TestP@ss1');

      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      const tamperedCiphertext = parts[2] + 'ff'; // Append garbage
      const tamperedBlock = `${parts[0]}:${parts[1]}:${tamperedCiphertext}:${parts[3]}`;

      // Decryption should fail due to auth tag mismatch
      expect(() => decryptBlock(tamperedBlock, 'TestP@ss1')).toThrow('认证标签不匹配');
    });
  });
});
