import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOllama } from '@langchain/ollama';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIConfig, TaskType } from './aiConfig';

export interface TestResult {
  success: boolean;
  message: string;
  providerId: string;
}

export interface LLMProviderInfo {
  id: string;
  name: string;
  type: 'openai' | 'anthropic' | 'ollama' | 'custom';
  model: string;
  isActive: boolean;
}

/**
 * LLM提供商管理器
 * 统一管理多个LLM提供商，实现智能路由和错误处理
 */
export class LLMProviderManager {
  private providers: Map<string, BaseChatModel> = new Map();
  private config: AIConfig | null = null;
  private providerInfo: Map<string, LLMProviderInfo> = new Map();

  /**
   * 初始化所有配置的LLM提供商
   */
  async initialize(config: AIConfig): Promise<void> {
    this.config = config;
    this.providers.clear();
    this.providerInfo.clear();

    // 初始化OpenAI
    if (config.providers.some(p => p.type === 'openai' && p.isActive)) {
      const openaiProvider = config.providers.find(p => p.type === 'openai');
      if (openaiProvider && openaiProvider.apiKey) {
        try {
          const chatModel = new ChatOpenAI({
            modelName: openaiProvider.model || 'gpt-4',
            apiKey: openaiProvider.apiKey,
            temperature: config.temperatureByTask?.business_insight ?? config.temperature,
            maxTokens: config.maxTokens,
            configuration: {
              baseURL: openaiProvider.endpoint,
            },
          });
          this.providers.set('openai', chatModel);
          this.providerInfo.set('openai', {
            id: 'openai',
            name: 'OpenAI',
            type: 'openai',
            model: openaiProvider.model,
            isActive: true,
          });
        } catch (error) {
          console.error('Failed to initialize OpenAI:', error);
        }
      }
    }

    // 初始化Anthropic Claude
    if (config.providers.some(p => p.type === 'anthropic' && p.isActive)) {
      const anthropicProvider = config.providers.find(p => p.type === 'anthropic');
      if (anthropicProvider && anthropicProvider.apiKey) {
        try {
          const chatModel = new ChatAnthropic({
            modelName: anthropicProvider.model || 'claude-3-sonnet-20240229',
            apiKey: anthropicProvider.apiKey,
            temperature: config.temperatureByTask?.business_insight ?? config.temperature,
            maxTokens: config.maxTokens,
          });
          this.providers.set('anthropic', chatModel);
          this.providerInfo.set('anthropic', {
            id: 'anthropic',
            name: 'Anthropic Claude',
            type: 'anthropic',
            model: anthropicProvider.model,
            isActive: true,
          });
        } catch (error) {
          console.error('Failed to initialize Anthropic:', error);
        }
      }
    }

    // 初始化Ollama（本地模型）
    const ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434';
    if (config.providers.some(p => p.type === 'ollama' && p.isActive)) {
      const ollamaProvider = config.providers.find(p => p.type === 'ollama');
      if (ollamaProvider) {
        try {
          const chatModel = new ChatOllama({
            baseUrl: ollamaEndpoint,
            model: ollamaProvider.model || 'llama2',
            temperature: config.temperatureByTask?.business_insight ?? config.temperature,
          });
          this.providers.set('ollama', chatModel);
          this.providerInfo.set('ollama', {
            id: 'ollama',
            name: 'Ollama (Local)',
            type: 'ollama',
            model: ollamaProvider.model,
            isActive: true,
          });
        } catch (error) {
          console.error('Failed to initialize Ollama:', error);
        }
      }
    }

    console.log(`LLM Provider Manager initialized with ${this.providers.size} providers`);
  }

  /**
   * 根据任务类型获取最优的LLM提供商
   * 智能路由策略：
   * - 复杂分析任务优先使用GPT-4或Claude
   * - 简单任务可以使用本地模型
   * - 考虑成本和性能平衡
   */
  async getProvider(taskType: TaskType): Promise<BaseChatModel> {
    if (this.providers.size === 0) {
      throw new Error('No LLM providers initialized. Call initialize() first.');
    }

    // 根据任务类型选择模型
    const preferredModel = this.config?.defaultModelForTask?.[taskType];
    
    if (preferredModel && this.providers.has(preferredModel)) {
      const provider = this.providers.get(preferredModel);
      if (provider) return provider;
    }

    // 默认优先级：OpenAI > Anthropic > Ollama
    const priority = ['openai', 'anthropic', 'ollama'];
    for (const providerId of priority) {
      const provider = this.providers.get(providerId);
      if (provider) return provider;
    }

    // 返回第一个可用的提供商
    const firstProvider = this.providers.values().next().value;
    if (firstProvider) return firstProvider;

    throw new Error('No available LLM provider');
  }

  /**
   * 测试指定提供商的连接
   */
  async testConnection(providerId: string): Promise<TestResult> {
    const provider = this.providers.get(providerId);
    const info = this.providerInfo.get(providerId);

    if (!provider || !info) {
      return {
        success: false,
        message: `Provider ${providerId} not found`,
        providerId,
      };
    }

    try {
      // 发送测试消息
      await provider.invoke([
        { role: 'user', content: 'Say "OK" if you can read this.' }
      ]);

      return {
        success: true,
        message: `✅ ${info.name} 连接成功`,
        providerId,
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ ${info.name} 连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
        providerId,
      };
    }
  }

  /**
   * 获取所有已配置的提供商信息
   */
  getAllProviders(): LLMProviderInfo[] {
    return Array.from(this.providerInfo.values());
  }

  /**
   * 检查是否有可用的提供商
   */
  hasAvailableProviders(): boolean {
    return this.providers.size > 0;
  }

  /**
   * 获取提供商统计信息
   */
  getStats(): {
    total: number;
    active: number;
    providers: string[];
  } {
    return {
      total: this.providerInfo.size,
      active: this.providers.size,
      providers: Array.from(this.providers.keys()),
    };
  }
}

// 单例实例
let llmProviderManager: LLMProviderManager | null = null;

/**
 * 获取LLM提供商管理器单例
 */
export function getLLMProviderManager(): LLMProviderManager {
  if (!llmProviderManager) {
    llmProviderManager = new LLMProviderManager();
  }
  return llmProviderManager;
}

/**
 * 便捷函数：获取适合任务的LLM
 */
export async function getLLMForTask(taskType: TaskType): Promise<BaseChatModel> {
  const manager = getLLMProviderManager();
  return await manager.getProvider(taskType);
}
