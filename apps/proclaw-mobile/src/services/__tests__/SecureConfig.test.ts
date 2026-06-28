/// <reference types="jest" />

/**
 * SecureConfig 单元测试
 * 测试安全存储服务的跨平台行为
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

// 动态导入以获取最新 mock
let secureGet: typeof import('../../services/SecureConfig').secureGet;
let secureSet: typeof import('../../services/SecureConfig').secureSet;
let secureDelete: typeof import('../../services/SecureConfig').secureDelete;
let SECURE_KEYS: typeof import('../../services/SecureConfig').SECURE_KEYS;

beforeAll(async () => {
  const module = await import('../../services/SecureConfig');
  secureGet = module.secureGet;
  secureSet = module.secureSet;
  secureDelete = module.secureDelete;
  SECURE_KEYS = module.SECURE_KEYS;
});

describe('SecureConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SECURE_KEYS', () => {
    it('应包含所有 AI 相关的密钥定义', () => {
      expect(SECURE_KEYS.AI_API_KEY).toBe('proclaw_ai_api_key');
      expect(SECURE_KEYS.AI_API_BASE).toBe('proclaw_ai_api_base');
      expect(SECURE_KEYS.AI_MODEL).toBe('proclaw_ai_model');
    });

    it('应包含多供应商密钥定义', () => {
      expect(SECURE_KEYS.OPENAI_API_KEY).toBe('proclaw_openai_api_key');
      expect(SECURE_KEYS.ANTHROPIC_API_KEY).toBe('proclaw_anthropic_api_key');
      expect(SECURE_KEYS.OLLAMA_API_KEY).toBe('proclaw_ollama_api_key');
    });
  });

  describe('secureGet (非 Web 平台)', () => {
    it('应从 SecureStore 获取值', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('test-value');

      const result = await secureGet('test-key');

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('test-key');
      expect(result).toBe('test-value');
    });

    it('SecureStore 失败时应返回 null', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Keychain error'));

      const result = await secureGet('test-key');

      expect(result).toBeNull();
    });

    it('非 Web 平台不应记录调试日志', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('value');

      await secureGet('test-key');

      // 非 Web 平台使用 SecureStore，不记录 debug 日志
      const { logger } = require('../../utils/logger');
      expect(logger.debug).not.toHaveBeenCalled();
    });
  });

  describe('secureSet (非 Web 平台)', () => {
    it('应保存值到 SecureStore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureSet('test-key', 'test-value');

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('SecureStore 失败时应记录警告日志', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Keychain error'));

      await secureSet('test-key', 'value');

      const { logger } = require('../../utils/logger');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('不应抛出异常', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Keychain error'));

      await expect(secureSet('test-key', 'value')).resolves.not.toThrow();
    });
  });

  describe('secureDelete (非 Web 平台)', () => {
    it('应从 SecureStore 删除值', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      await secureDelete('test-key');

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key');
    });

    it('SecureStore 失败时应记录警告日志', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Keychain error'));

      await secureDelete('test-key');

      const { logger } = require('../../utils/logger');
      expect(logger.warn).toHaveBeenCalled();
    });

    it('不应抛出异常', async () => {
      mockSecureStore.deleteItemAsync.mockRejectedValue(new Error('Keychain error'));

      await expect(secureDelete('test-key')).resolves.not.toThrow();
    });
  });
});