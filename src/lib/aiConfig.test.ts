import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getAIConfig, saveAIConfig, testAIConnection, AIConfig, AIProvider } from '../lib/aiConfig';

const STORAGE_KEY = 'proclaw-ai-config';

describe('aiConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getAIConfig', () => {
    it('当 localStorage 没有配置时应返回默认配置', async () => {
      const config = await getAIConfig();
      expect(config.defaultProvider).toBe('default-service');
      expect(config.providers.length).toBeGreaterThan(0);
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(2000);
    });

    it('当 localStorage 有配置时应返回保存的配置', async () => {
      const savedConfig: AIConfig = {
        defaultProvider: 'openai',
        providers: [],
        temperature: 0.5,
        maxTokens: 4000,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfig));

      const config = await getAIConfig();
      expect(config.defaultProvider).toBe('openai');
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(4000);
    });

    it('当 localStorage 中 JSON 无效时应返回默认配置', async () => {
      localStorage.setItem(STORAGE_KEY, 'invalid-json');
      const config = await getAIConfig();
      expect(config.defaultProvider).toBe('default-service');
    });
  });

  describe('saveAIConfig', () => {
    it('应该保存配置到 localStorage', async () => {
      const newConfig: AIConfig = {
        defaultProvider: 'openai',
        providers: [],
        temperature: 0.3,
        maxTokens: 1000,
      };

      await saveAIConfig(newConfig);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.defaultProvider).toBe('openai');
      expect(parsed.temperature).toBe(0.3);
    });

    it('保存后读取应返回相同配置', async () => {
      const newConfig: AIConfig = {
        defaultProvider: 'aliyun',
        providers: [],
        temperature: 0.8,
        maxTokens: 3000,
      };

      await saveAIConfig(newConfig);
      const config = await getAIConfig();
      expect(config.defaultProvider).toBe('aliyun');
      expect(config.temperature).toBe(0.8);
    });
  });

  describe('testAIConnection', () => {
    it('default 类型 Provider 应直接返回成功', async () => {
      const provider: AIProvider = {
        id: 'default-service',
        name: 'ProClaw 集成 LLM',
        type: 'default',
        endpoint: '',
        apiKey: '',
        model: '',
        isActive: true,
      };

      const result = await testAIConnection(provider);
      expect(result.success).toBe(true);
    });

    it('没有 API Key 应返回失败', async () => {
      const provider: AIProvider = {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4',
        isActive: false,
      };

      const result = await testAIConnection(provider);
      expect(result.success).toBe(false);
      expect(result.message).toContain('API Key');
    });

    it('有 API Key 且连接成功应返回成功', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const provider: AIProvider = {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        model: 'gpt-4',
        isActive: true,
      };

      const result = await testAIConnection(provider);
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
        })
      );
    });

    it('连接失败时应返回失败', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API Key' } }),
      });

      const provider: AIProvider = {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'invalid-key',
        model: 'gpt-4',
        isActive: true,
      };

      const result = await testAIConnection(provider);
      expect(result.success).toBe(false);
    });

    it('网络错误时应返回失败', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const provider: AIProvider = {
        id: 'openai',
        name: 'OpenAI',
        type: 'openai',
        endpoint: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4',
        isActive: true,
      };

      const result = await testAIConnection(provider);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Network error');
    });
  });
});
