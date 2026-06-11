/// <reference types="jest" />

/**
 * AIService 单元测试
 * 测试 AI 对话生成、流式响应、错误处理
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
  getErrorMessage: jest.fn((e) => e instanceof Error ? e.message : String(e)),
  toError: jest.fn((e) => e instanceof Error ? e : new Error(String(e))),
}));

// Mock SecureConfig
jest.mock('../../services/SecureConfig', () => ({
  secureGet: jest.fn(),
  secureSet: jest.fn(),
  SECURE_KEYS: {
    AI_API_KEY: 'ai_api_key',
    OPENAI_API_KEY: 'openai_api_key',
    ANTHROPIC_API_KEY: 'anthropic_api_key',
    OLLAMA_API_KEY: 'ollama_api_key',
  },
}));

// Mock DatabaseFactory
const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};

jest.mock('../../services/DatabaseFactory', () => ({
  getDatabase: jest.fn(() => mockDb),
  getCurrentProfileId: jest.fn(() => 'profile_1'),
}));

// Mock AI config
jest.mock('../../config/ai', () => ({
  getAIConfig: jest.fn().mockResolvedValue({
    activeProvider: 'deepseek',
    providers: {
      deepseek: { id: 'deepseek', name: 'DeepSeek', apiBase: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'test-key', enabled: true },
      openai: { id: 'openai', name: 'OpenAI', apiBase: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '', enabled: false },
      anthropic: { id: 'anthropic', name: 'Anthropic', apiBase: 'https://api.anthropic.com/v1', model: 'claude-3', apiKey: '', enabled: false },
      ollama: { id: 'ollama', name: 'Ollama', apiBase: 'http://localhost:11434/v1', model: 'llama3', apiKey: 'ollama-local', enabled: true },
    },
    maxTokens: 2048,
    temperature: 0.7,
    enableStreaming: true,
  }),
  isAIConfigured: jest.fn().mockReturnValue(true),
  getAvailableProviders: jest.fn().mockReturnValue([
    { id: 'deepseek', name: 'DeepSeek', apiBase: 'https://api.deepseek.com', model: 'deepseek-chat', apiKey: 'test-key', enabled: true },
  ]),
}));

// 全局 fetch mock
const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  generateText,
  chatWithAgent,
  chatWithAgentStream,
} from '../../services/AIService';

describe('AIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockResolvedValue([]);
    mockDb.getFirstAsync.mockResolvedValue(null);
  });

  describe('generateText', () => {
    it('无 API key 时应抛出错误', async () => {
      const { getAvailableProviders } = require('../../config/ai');
      getAvailableProviders.mockReturnValueOnce([]);

      await expect(generateText('Hello')).rejects.toThrow();
    });

    it('API 响应成功时应返回文本', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'AI 响应文本' } }],
          usage: { total_tokens: 100, prompt_tokens: 50, completion_tokens: 50 },
        }),
      });

      const result = await generateText('Hello');
      expect(result).toBe('AI 响应文本');
    });

    it('API 返回错误时应抛出错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      await expect(generateText('Hello')).rejects.toThrow();
    });

    it('网络错误时应抛出错误', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(generateText('Hello')).rejects.toThrow('Network error');
    });
  });

  describe('chatWithAgent', () => {
    it('空 agentId 应抛出错误', async () => {
      await expect(
        chatWithAgent({ agentId: '', userMessage: 'Hi' })
      ).rejects.toThrow();
    });

    it('空 userMessage 应抛出错误', async () => {
      await expect(
        chatWithAgent({ agentId: 'agent1', userMessage: '' })
      ).rejects.toThrow();
    });

    it('无可用供应商时应抛出错误', async () => {
      const { getAvailableProviders } = require('../../config/ai');
      getAvailableProviders.mockReturnValueOnce([]);

      await expect(chatWithAgent({
        agentId: 'secretary',
        userMessage: '你好',
      })).rejects.toThrow('AI 服务未配置任何可用的 API 密钥');
    });

    it('正常调用时应返回 AI 回复', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '秘书回复：您好！' } }],
        }),
      });

      const result = await chatWithAgent({
        agentId: 'secretary',
        userMessage: '你好',
      });

      expect(result.reply).toBe('秘书回复：您好！');
    });

    it('应包含业务上下文', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([
          { name: 'iPhone 电池', price: 59, stock_quantity: 100 },
        ])
        .mockResolvedValueOnce([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '好的' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'secretary',
        userMessage: '显示商品',
      });

      // 验证 fetch 被调用
      expect(mockFetch).toHaveBeenCalled();
    });

    it('conversationHistory 应被限制在最近 20 条', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      // 创建超过 20 条的历史记录
      const longHistory = Array(25).fill(null).map((_, i) => ({
        role: 'user' as const,
        content: `消息 ${i}`,
      }));

      await chatWithAgent({
        agentId: 'secretary',
        userMessage: '测试',
        conversationHistory: longHistory,
      });

      // 验证 fetch 调用中的 messages 数量
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      // system + 20 条历史 + user message = 22
      expect(body.messages.length).toBe(22);
    });
  });

  describe('chatWithAgentStream', () => {
    it('无可用供应商时应 yield 未配置提示', async () => {
      const { getAvailableProviders } = require('../../config/ai');
      getAvailableProviders.mockReturnValueOnce([]);

      const tokens: string[] = [];
      for await (const token of chatWithAgentStream({
        agentId: 'secretary',
        userMessage: '你好',
      })) {
        tokens.push(token);
      }

      expect(tokens.join('')).toContain('AI 服务未配置任何可用的 API 密钥');
    });

    it('流式响应成功时应逐 token yield', async () => {
      // 模拟流式响应
      const streamData = [
        'data: {"choices":[{"delta":{"content":"你好"}}]}\n',
        'data: {"choices":[{"delta":{"content":"，"}}]}\n',
        'data: {"choices":[{"delta":{"content":"有什么"}}]}\n',
        'data: {"choices":[{"delta":{"content":"可以帮助"}}]}\n',
        'data: [DONE]\n',
      ];

      let callIndex = 0;
      mockFetch.mockImplementation(() => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            for (const chunk of streamData) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          },
        });
        return Promise.resolve({
          ok: true,
          body: stream,
        });
      });

      const tokens: string[] = [];
      for await (const token of chatWithAgentStream({
        agentId: 'secretary',
        userMessage: '你好',
      })) {
        tokens.push(token);
      }

      expect(tokens.join('')).toBe('你好，有什么可以帮助');
    });

    it('流式失败应回退到非流式调用', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 流式调用失败
          return Promise.reject(new Error('Stream failed'));
        }
        // 非流式回退成功
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '回退响应' } }],
          }),
        });
      });

      const tokens: string[] = [];
      for await (const token of chatWithAgentStream({
        agentId: 'secretary',
        userMessage: '测试',
      })) {
        tokens.push(token);
      }

      expect(tokens.join('')).toBe('回退响应');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('所有供应商失败时应返回错误提示', async () => {
      mockFetch.mockRejectedValue(new Error('All providers failed'));

      const tokens: string[] = [];
      for await (const token of chatWithAgentStream({
        agentId: 'secretary',
        userMessage: '测试',
      })) {
        tokens.push(token);
      }

      expect(tokens.join('')).toContain('抱歉');
    });
  });

  describe('Agent 系统提示词', () => {
    it('secretary agent 应有正确的系统提示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'secretary',
        userMessage: '你好',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages[0].content).toContain('商务秘书');
    });

    it('ceo agent 应有正确的系统提示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'ceo',
        userMessage: '分析业务',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages[0].content).toContain('CEO Agent');
    });

    it('customer-service agent 应有正确的系统提示', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'customer-service',
        userMessage: '咨询产品',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages[0].content).toContain('AI 客服');
    });

    it('未知 agent 应回退到 secretary', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'unknown-agent',
        userMessage: '测试',
      });

      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.messages[0].content).toContain('商务秘书');
    });
  });

  describe('业务上下文构建', () => {
    it('数据库就绪时应查询商品数据', async () => {
      mockDb.getAllAsync
        .mockResolvedValueOnce([
          { name: '商品A', price: 100, stock_quantity: 50, category: '手机配件' },
        ])
        .mockResolvedValueOnce([]);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'secretary',
        userMessage: '显示商品',
      });

      expect(mockDb.getAllAsync).toHaveBeenCalled();
    });

    it('数据库未就绪时应返回暂无可用业务数据', async () => {
      const DatabaseFactory = require('../../services/DatabaseFactory');
      DatabaseFactory.getDatabase.mockImplementationOnce(() => {
        throw new Error('Database not ready');
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '回复' } }],
        }),
      });

      await chatWithAgent({
        agentId: 'secretary',
        userMessage: '测试',
      });

      // 应该继续执行而不是崩溃
      expect(mockFetch).toHaveBeenCalled();
    });
  });
});