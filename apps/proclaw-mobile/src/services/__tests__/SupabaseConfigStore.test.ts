/// <reference types="jest" />

/**
 * SupabaseConfigStore 单元测试
 * 测试 Supabase 连接配置持久化服务
 */

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock errorUtils
jest.mock('../../utils/errorUtils', () => ({
  getErrorMessage: jest.fn((e, defaultMsg) => e instanceof Error ? e.message : defaultMsg),
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock expo-secure-store
const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore);

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// 全局 fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

// 动态导入
let saveSupabaseConfig: typeof import('../../services/SupabaseConfigStore').saveSupabaseConfig;
let loadSupabaseConfig: typeof import('../../services/SupabaseConfigStore').loadSupabaseConfig;
let clearSupabaseConfig: typeof import('../../services/SupabaseConfigStore').clearSupabaseConfig;
let hasSupabaseConfig: typeof import('../../services/SupabaseConfigStore').hasSupabaseConfig;
let getSupabaseUrl: typeof import('../../services/SupabaseConfigStore').getSupabaseUrl;
let getSupabaseApiKey: typeof import('../../services/SupabaseConfigStore').getSupabaseApiKey;
let testSupabaseConnection: typeof import('../../services/SupabaseConfigStore').testSupabaseConnection;

beforeAll(async () => {
  const module = await import('../../services/SupabaseConfigStore');
  saveSupabaseConfig = module.saveSupabaseConfig;
  loadSupabaseConfig = module.loadSupabaseConfig;
  clearSupabaseConfig = module.clearSupabaseConfig;
  hasSupabaseConfig = module.hasSupabaseConfig;
  getSupabaseUrl = module.getSupabaseUrl;
  getSupabaseApiKey = module.getSupabaseApiKey;
  testSupabaseConnection = module.testSupabaseConnection;
});

describe('SupabaseConfigStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveSupabaseConfig', () => {
    it('应保存配置到 SecureStore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await saveSupabaseConfig('https://test.supabase.co', 'test-api-key');

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        '@proclaw_supabase_config',
        expect.stringContaining('test.supabase.co')
      );
    });

    it('应自动去除 URL 和 API Key 的空白', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await saveSupabaseConfig('  https://test.supabase.co  ', '  test-key  ');

      const callArg = JSON.parse(mockSecureStore.setItemAsync.mock.calls[0][1]);
      expect(callArg.url).toBe('https://test.supabase.co');
      expect(callArg.apiKey).toBe('test-key');
    });

    it('configured 应在 URL 和 API Key 都非空时为 true', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await saveSupabaseConfig('https://test.supabase.co', 'test-key');

      const callArg = JSON.parse(mockSecureStore.setItemAsync.mock.calls[0][1]);
      expect(callArg.configured).toBe(true);
    });

    it('空 URL 或空 API Key 时 configured 应为 false', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await saveSupabaseConfig('', 'test-key');

      const callArg = JSON.parse(mockSecureStore.setItemAsync.mock.calls[0][1]);
      expect(callArg.configured).toBe(false);
    });

    it('应记录成功日志', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await saveSupabaseConfig('https://test.supabase.co', 'key');

      const { logger } = require('../../utils/logger');
      expect(logger.log).toHaveBeenCalledWith('[SupabaseConfig] Configuration saved');
    });

    it('SecureStore 失败时应回退到 AsyncStorage', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('SecureStore error'));
      mockAsyncStorage.setItem.mockResolvedValue(undefined);

      await saveSupabaseConfig('https://test.supabase.co', 'key');

      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
    });

    it('两个存储都失败时应抛出异常', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('SecureStore failed'));
      mockAsyncStorage.setItem.mockRejectedValue(new Error('AsyncStorage failed'));

      await expect(
        saveSupabaseConfig('https://test.supabase.co', 'key')
      ).rejects.toThrow();
    });
  });

  describe('loadSupabaseConfig', () => {
    it('应从 SecureStore 加载配置', async () => {
      const configJson = JSON.stringify({
        url: 'https://test.supabase.co',
        apiKey: 'test-key',
        configured: true,
      });
      mockSecureStore.getItemAsync.mockResolvedValue(configJson);

      const result = await loadSupabaseConfig();

      expect(result?.url).toBe('https://test.supabase.co');
      expect(result?.apiKey).toBe('test-key');
    });

    it('配置不存在时应返回 null', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await loadSupabaseConfig();

      expect(result).toBeNull();
    });

    it('SecureStore 失败时应回退到 AsyncStorage', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('SecureStore error'));
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify({
        url: 'https://fallback.supabase.co',
        apiKey: 'fallback-key',
        configured: true,
      }));

      const result = await loadSupabaseConfig();

      expect(result?.url).toBe('https://fallback.supabase.co');
    });

    it('JSON 解析失败时应返回 null', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('invalid-json');

      const result = await loadSupabaseConfig();

      expect(result).toBeNull();
    });
  });

  describe('clearSupabaseConfig', () => {
    it('应从 SecureStore 删除配置', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      await clearSupabaseConfig();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('@proclaw_supabase_config');
    });

    it('SecureStore 失败时应回退到 AsyncStorage', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('SecureStore error'));
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);

      await clearSupabaseConfig();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalled();
    });

    it('失败时应静默处理', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('AsyncStorage failed'));

      await expect(clearSupabaseConfig()).resolves.not.toThrow();
    });
  });

  describe('hasSupabaseConfig', () => {
    it('配置存在且 configured 为 true 时应返回 true', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
        url: 'https://test.supabase.co',
        apiKey: 'key',
        configured: true,
      }));

      const result = await hasSupabaseConfig();

      expect(result).toBe(true);
    });

    it('configured 为 false 时应返回 false', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
        url: '',
        apiKey: '',
        configured: false,
      }));

      const result = await hasSupabaseConfig();

      expect(result).toBe(false);
    });

    it('配置为 null 时应返回 false', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await hasSupabaseConfig();

      expect(result).toBe(false);
    });
  });

  describe('getSupabaseUrl', () => {
    it('应返回配置的 URL', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
        url: 'https://test.supabase.co',
        apiKey: 'key',
        configured: true,
      }));

      const result = await getSupabaseUrl();

      expect(result).toBe('https://test.supabase.co');
    });

    it('无配置时应返回空字符串', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getSupabaseUrl();

      expect(result).toBe('');
    });
  });

  describe('getSupabaseApiKey', () => {
    it('应返回配置的 API Key', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify({
        url: 'https://test.supabase.co',
        apiKey: 'test-key-123',
        configured: true,
      }));

      const result = await getSupabaseApiKey();

      expect(result).toBe('test-key-123');
    });

    it('无配置时应返回空字符串', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue(null);

      const result = await getSupabaseApiKey();

      expect(result).toBe('');
    });
  });

  describe('testSupabaseConnection', () => {
    it('空 URL 或 API Key 应返回错误', async () => {
      const result = await testSupabaseConnection('', 'key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('请填写');
    });

    it('连接成功时应返回成功结果', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await testSupabaseConnection('https://test.supabase.co', 'test-key');

      expect(result.success).toBe(true);
      expect(result.latencyMs).toBeDefined();
    });

    it('401 响应也应视为成功（仅需表名）', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await testSupabaseConnection('https://test.supabase.co', 'test-key');

      expect(result.success).toBe(true);
    });

    it('其他 HTTP 错误应返回失败', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await testSupabaseConnection('https://test.supabase.co', 'test-key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('404');
    });

    it('网络错误应返回失败', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));

      const result = await testSupabaseConnection('https://test.supabase.co', 'test-key');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Connection refused');
    });

    it('URL 末尾斜杠应被去除', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await testSupabaseConnection('https://test.supabase.co/', 'key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('test.supabase.co'),
        expect.any(Object)
      );
    });

    it('应发送正确的 headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await testSupabaseConnection('https://test.supabase.co', 'my-api-key');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'HEAD',
          headers: expect.objectContaining({
            apikey: 'my-api-key',
            Authorization: 'Bearer my-api-key',
          }),
        })
      );
    });
  });
});