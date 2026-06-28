/// <reference types="jest" />

/**
 * PluginDownloader 单元测试
 * 测试 ZIP 解压、签名验证、插件下载安装流程
 */

import { extractPluginZip, verifySignature, downloadAndInstall } from '../PluginDownloader';
import type { FlowHubPluginInfo } from '../PluginDownloader';

declare const global: typeof globalThis;

// Mock JSZip
const mockFile = jest.fn();
const mockZip = {
  file: mockFile,
};
jest.mock('jszip', () => ({
  loadAsync: jest.fn(() => Promise.resolve(mockZip)),
}));

// Mock CryptoJS
jest.mock('crypto-js', () => {
  const WordArray = {
    create: jest.fn((words: number[]) => ({
      words,
      sigBytes: words.length,
      toString: (encoding?: any) => {
        if (encoding?.toString() === '') return 'mock-hex-string';
        return 'mock-hex-string';
      },
    })),
  };

  // 默认返回与测试断言一致的 hex 签名，使 verifySignature 走通完整 HMAC 流程
  const HmacSHA256 = jest.fn(() => ({
    toString: jest.fn(() => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'),
  }));

  // Hex.parse 必须返回有效 WordArray（否则 signingKey 为 null，验证直接被拒）
  const HexParseMock = jest.fn((hex: string) => ({
    words: [],
    sigBytes: (hex?.length ?? 0) / 2,
    toString: () => hex ?? '',
  }));

  return {
    HmacSHA256,
    lib: { WordArray },
    enc: { Hex: { parse: HexParseMock } },
  };
});

// Mock SecureConfig 以提供签名公钥（审计 S3 路径）
jest.mock('../SecureConfig', () => ({
  secureGet: jest.fn(async (key: string) => {
    if (key === 'proclaw_plugin_signing_key') {
      // 32 字节 hex（64 字符）足以走完 HMAC 流程
      return '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    }
    return null;
  }),
}));

// Mock Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock localStorage for Node.js test environment (in-memory store)
const localStorageStore: Record<string, string> = {};
(global as any).localStorage = {
  getItem: jest.fn((key: string) => localStorageStore[key] || null),
  setItem: jest.fn((key: string, value: string) => { localStorageStore[key] = value; }),
  clear: jest.fn(() => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }),
  removeItem: jest.fn((key: string) => { delete localStorageStore[key]; }),
  get length() { return Object.keys(localStorageStore).length; },
  key: jest.fn((index: number) => Object.keys(localStorageStore)[index] || null),
};

describe('PluginDownloader', () => {
  let mockPluginInfo: FlowHubPluginInfo;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPluginInfo = {
      id: 'plugin_catering',
      name: '餐厅管理插件',
      version: '1.0.0',
      description: '餐饮行业工作流',
      author: 'ProClaw Team',
      icon: '🍽️',
      permissions: ['products:read', 'products:write'],
      downloadUrl: 'https://flowhub.proclaw.com/plugins/catering/v1.0.0.zip',
      signatureUrl: 'https://flowhub.proclaw.com/plugins/catering/v1.0.0.sig',
      size: 512000,
      minAppVersion: '1.0.0',
      recommendedAgents: ['agent_kitchen_optimizer'],
      rating: 4.5,
      downloads: 1280,
    };
  });

  describe('extractPluginZip', () => {
    it('should extract manifest.json and up.sql from ZIP', async () => {
      mockFile
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve(JSON.stringify({ id: 'test_plugin', name: 'Test', version: '1.0', description: 'Test', author: 'T', icon: 'test', permissions: [], minAppVersion: '1.0' }))) })
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve('CREATE TABLE test (id TEXT PRIMARY KEY);')) })
        .mockReturnValueOnce(null);

      const result = await extractPluginZip(new ArrayBuffer(10));

      expect(result).not.toBeNull();
      expect(result!.manifest.id).toBe('test_plugin');
      expect(result!.upSql).toBe('CREATE TABLE test (id TEXT PRIMARY KEY);');
      expect(result!.downSql).toBe('');
    });

    it('should return null when manifest is missing', async () => {
      mockFile.mockReturnValue(null);

      const result = await extractPluginZip(new ArrayBuffer(10));
      expect(result).toBeNull();
    });

    it('should return null when up.sql is missing', async () => {
      mockFile
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve(JSON.stringify({ id: 'test', name: 'Test', version: '1.0', description: 'Test', author: 'T', icon: 'test', permissions: [], minAppVersion: '1.0' }))) })
        .mockReturnValueOnce(null);

      const result = await extractPluginZip(new ArrayBuffer(10));
      expect(result).toBeNull();
    });

    it('should handle down.sql not present gracefully', async () => {
      mockFile
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve(JSON.stringify({ id: 'test', name: 'Test', version: '1.0', description: 'Test', author: 'T', icon: 'test', permissions: [], minAppVersion: '1.0' }))) })
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve('CREATE TABLE test (id TEXT PRIMARY KEY);')) })
        .mockReturnValueOnce(null); // down.sql not present

      const result = await extractPluginZip(new ArrayBuffer(10));

      expect(result).not.toBeNull();
      expect(result!.downSql).toBe('');
    });
  });

  describe('verifySignature', () => {
    it('should verify valid signature', async () => {
      // Mock signature download returns matching signature
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      });

      const result = await verifySignature(mockPluginInfo, new ArrayBuffer(10));
      expect(result).toBe(true);
    });

    it('should reject invalid signature', async () => {
      // Return different signature
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'different_signature_value_here_that_does_not_match_whats_computed',
      });

      const result = await verifySignature(mockPluginInfo, new ArrayBuffer(10));
      expect(result).toBe(false);
    });

    // 审计 S5：无签名 URL 时拒绝插件（不允许 dev 模式放行）
    it('should reject unsigned plugin (审计 S5)', async () => {
      const pluginWithoutSig: FlowHubPluginInfo = {
        ...mockPluginInfo,
        signatureUrl: '',
      };

      const result = await verifySignature(pluginWithoutSig, new ArrayBuffer(10));
      expect(result).toBe(false);
    });

    // 审计 S4：签名获取失败时拒绝插件
    it('should reject when signature fetch fails (审计 S4)', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await verifySignature(mockPluginInfo, new ArrayBuffer(10));
      expect(result).toBe(false);
    });
  });

  describe('downloadAndInstall', () => {
    beforeEach(() => {
      // Clear localStorage mock
      localStorage.clear();
    });

    it('should download, verify, extract and install plugin', async () => {
      // Mock ZIP download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });

      // Mock signature download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      });

      // Mock JSZip extraction
      mockFile
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve(JSON.stringify({ id: 'plugin_catering', name: '餐厅管理插件', version: '1.0.0', description: 'Test', author: 'T', icon: 'test', permissions: [], minAppVersion: '1.0' }))) })
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve('CREATE TABLE catering_menu (id TEXT PRIMARY KEY);')) })
        .mockReturnValueOnce({ async: jest.fn(() => Promise.resolve('DROP TABLE catering_menu;')) });

      const result = await downloadAndInstall(mockPluginInfo, 'profiles/p1/plugins/catering');

      expect(result).toBe(true);
      // Verify storage was written (Platform.OS === 'web')
      const stored = localStorage.getItem('plugin_plugin_catering');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.manifest.id).toBe('plugin_catering');
      expect(parsed.installedAt).toBeDefined();
    });

    it('should fail when ZIP download fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await downloadAndInstall(mockPluginInfo, 'profiles/p1/plugins/catering');
      expect(result).toBe(false);
    });

    it('should fail when signature verification fails', async () => {
      // Mock ZIP download
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(100),
      });

      // Mock signature download with non-matching signature
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => 'non_matching_signature_value_here_9876543210abcdef',
      });

      const result = await downloadAndInstall(mockPluginInfo, 'profiles/p1/plugins/catering');
      expect(result).toBe(false);
    });
  });
});
