export interface AIProvider {
  id: string;
  name: string;
  type: 'default' | 'openai' | 'azure' | 'aliyun' | 'zhipu' | 'anthropic' | 'ollama' | 'custom';
  endpoint: string;
  apiKey: string;
  model: string;
  isActive: boolean;
}

export type TaskType = 
  | 'sales_forecast'
  | 'inventory_optimization'
  | 'anomaly_detection'
  | 'purchase_suggestion'
  | 'business_insight';

export interface AIConfig {
  defaultProvider: string;
  providers: AIProvider[];
  temperature: number;
  maxTokens: number;
  
  // 新增字段 - AI决策系统配置
  ollamaEndpoint?: string; // 本地Ollama地址
  defaultModelForTask?: Record<TaskType, string>; // 任务到模型的映射
  enableStreaming?: boolean; // 是否启用流式响应
  maxContextLength?: number; // 最大上下文长度
  temperatureByTask?: Record<TaskType, number>; // 不同任务的温度参数
}

const DEFAULT_CONFIG: AIConfig = {
  defaultProvider: 'default-service',
  temperature: 0.7,
  maxTokens: 2000,
  providers: [
    {
      id: 'default-service',
      name: 'ProClaw 集成 LLM（默认）',
      type: 'default',
      endpoint: 'https://ai.proclaw.cc/api/v1',
      apiKey: '',
      model: 'proclaw-gpt-4',
      isActive: true,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      type: 'openai',
      endpoint: 'https://api.openai.com/v1',
      apiKey: '',
      model: 'gpt-4',
      isActive: false,
    },
    {
      id: 'aliyun',
      name: '阿里云通义千问',
      type: 'aliyun',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      apiKey: '',
      model: 'qwen-turbo',
      isActive: false,
    },
    {
      id: 'zhipu',
      name: '智谱清言',
      type: 'zhipu',
      endpoint: 'https://open.bigmodel.cn/api/paas/v4',
      apiKey: '',
      model: 'glm-4',
      isActive: false,
    },
  ],
};

const STORAGE_KEY = 'proclaw-ai-config';

export async function getAIConfig(): Promise<AIConfig> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load AI config:', error);
  }
  return DEFAULT_CONFIG;
}

export async function saveAIConfig(config: AIConfig): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save AI config:', error);
    throw error;
  }
}

export async function testAIConnection(
  provider: AIProvider
): Promise<{ success: boolean; message: string }> {
  try {
    if (provider.type === 'default') {
      // ProClaw 集成 LLM 不需要 API Key
      return {
        success: true,
        message: 'ProClaw 集成 LLM 连接正常（无需配置）',
      };
    }

    if (!provider.apiKey) {
      return {
        success: false,
        message: '请输入 API Key',
      };
    }

    // 测试连接
    const response = await fetch(`${provider.endpoint}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return {
        success: true,
        message: `✅ ${provider.name} 连接成功`,
      };
    } else {
      const error = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `❌ 连接失败: ${error.error?.message || response.statusText}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ 连接失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}
