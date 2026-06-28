/**
 * AI 配置 - 手机端多供应商 LLM 调用配置
 *
 * PRD v11.2 Phase 3: 从单 DeepSeek 扩展为多供应商回退链，增加流式支持。
 *
 * ## 供应商优先级（回退链）
 *   DeepSeek → OpenAI → Anthropic → Ollama
 *
 * ## API Key 加载优先级（每个供应商独立）
 *   1. 安全存储（expo-secure-store）— 用户配置
 *   2. 构建时环境变量 EXPO_PUBLIC_{PROVIDER}_API_KEY
 *   3. 密钥为空则该供应商自动跳过
 */
import { secureGet, secureSet, SECURE_KEYS } from '../services/SecureConfig';

// ============ 供应商定义 ============

export type ProviderId = 'deepseek' | 'openai' | 'anthropic' | 'ollama';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  apiBase: string;
  model: string;
  apiKey: string;
  enabled: boolean;
}

export interface AIConfig {
  /** 当前活跃的供应商 */
  activeProvider: ProviderId;
  /** 所有可用供应商配置 */
  providers: Record<ProviderId, ProviderConfig>;
  /** 全局参数 */
  maxTokens: number;
  temperature: number;
  /** 是否启用流式响应 */
  enableStreaming: boolean;
}

// ============ 环境变量声明 ============

declare const process: {
  env: {
    EXPO_PUBLIC_AI_API_KEY?: string;
    EXPO_PUBLIC_AI_API_BASE?: string;
    EXPO_PUBLIC_AI_MODEL?: string;
    EXPO_PUBLIC_OPENAI_API_KEY?: string;
    EXPO_PUBLIC_OPENAI_API_BASE?: string;
    EXPO_PUBLIC_ANTHROPIC_API_KEY?: string;
    EXPO_PUBLIC_ANTHROPIC_API_BASE?: string;
    EXPO_PUBLIC_OLLAMA_API_BASE?: string;
  };
};

// ============ 默认供应商配置（不含密钥） ============

const PROVIDER_DEFAULTS: Record<ProviderId, Omit<ProviderConfig, 'apiKey' | 'enabled'>> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    apiBase: process.env.EXPO_PUBLIC_AI_API_BASE || 'https://api.deepseek.com',
    model: process.env.EXPO_PUBLIC_AI_MODEL || 'deepseek-chat',
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    apiBase: process.env.EXPO_PUBLIC_OPENAI_API_BASE || 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    apiBase: process.env.EXPO_PUBLIC_ANTHROPIC_API_BASE || 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (本地)',
    apiBase: process.env.EXPO_PUBLIC_OLLAMA_API_BASE || 'http://localhost:11434/v1',
    model: 'llama3',
  },
};

/** 回退优先级：DeepSeek > OpenAI > Anthropic > Ollama */
const FALLBACK_ORDER: ProviderId[] = ['deepseek', 'openai', 'anthropic', 'ollama'];

// ============ 安全存储键 → 供应商映射 ============

const PROVIDER_KEY_MAP: Record<ProviderId, string> = {
  deepseek: SECURE_KEYS.AI_API_KEY,
  openai: SECURE_KEYS.OPENAI_API_KEY,
  anthropic: SECURE_KEYS.ANTHROPIC_API_KEY,
  ollama: SECURE_KEYS.OLLAMA_API_KEY,
};

const ENV_KEY_MAP: Record<ProviderId, string | undefined> = {
  deepseek: process.env.EXPO_PUBLIC_AI_API_KEY,
  openai: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  anthropic: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY,
  ollama: undefined, // Ollama 本地，无需密钥
};

// ============ 全局默认参数 ============

const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

// ============ 运行时状态 ============

let cachedConfig: AIConfig | null = null;
let initialised = false;
// 审计 C7：初始化互斥锁，防止并发调用导致配置被构建两次
let initPromise: Promise<void> | null = null;

// ============ 公开 API ============

/**
 * 初始化 AI 配置（从安全存储加载各供应商 API 密钥）
 * 审计 C7：并发调用复用同一个 Promise
 */
export async function initAIConfig(): Promise<void> {
  if (initialised) return;
  if (initPromise) return initPromise;
  initPromise = _doInitAIConfig();
  return initPromise;
}

async function _doInitAIConfig(): Promise<void> {

  const providers = {} as Record<ProviderId, ProviderConfig>;

  for (const id of FALLBACK_ORDER) {
    let apiKey = '';

    // 1. 安全存储
    try {
      const stored = await secureGet(PROVIDER_KEY_MAP[id]);
      if (stored) apiKey = stored;
    } catch { /* 静默 */ }

    // 2. 环境变量兜底（仅当安全存储为空）
    if (!apiKey && ENV_KEY_MAP[id]) {
      apiKey = ENV_KEY_MAP[id]!;
    }

    // Ollama 无需密钥
    if (id === 'ollama' && !apiKey) {
      apiKey = 'ollama-local'; // 占位，Ollama 不验证 Bearer
    }

    providers[id] = {
      ...PROVIDER_DEFAULTS[id],
      apiKey,
      enabled: !!apiKey,
    };
  }

  // 确定活跃供应商：第一个有密钥的
  let activeProvider: ProviderId = 'deepseek';
  for (const id of FALLBACK_ORDER) {
    if (providers[id].enabled) {
      activeProvider = id;
      break;
    }
  }

  cachedConfig = {
    activeProvider,
    providers,
    maxTokens: DEFAULT_MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    enableStreaming: true,
  };

  initialised = true;
}

/** 检查是否有任一供应商可用 */
export function isAIConfigured(): boolean {
  if (!cachedConfig) return false;
  return Object.values(cachedConfig.providers).some((p) => p.enabled);
}

/** 获取完整配置 */
export async function getAIConfig(): Promise<AIConfig> {
  if (!initialised) await initAIConfig();
  return cachedConfig!;
}

/** 同步获取配置 */
export function getAIConfigSync(): AIConfig | null {
  return cachedConfig;
}

/**
 * 保存供应商 API Key
 */
export async function setProviderApiKey(providerId: ProviderId, apiKey: string): Promise<void> {
  await secureSet(PROVIDER_KEY_MAP[providerId], apiKey);
  // 刷新缓存
  if (cachedConfig) {
    cachedConfig.providers[providerId].apiKey = apiKey;
    cachedConfig.providers[providerId].enabled = !!apiKey;
    // 重新确定活跃供应商
    for (const id of FALLBACK_ORDER) {
      if (cachedConfig.providers[id].enabled) {
        cachedConfig.activeProvider = id;
        break;
      }
    }
  }
}

/**
 * 获取排序后的可用供应商列表（回退链顺序）
 */
export function getAvailableProviders(): ProviderConfig[] {
  if (!cachedConfig) return [];
  return FALLBACK_ORDER
    .map((id) => cachedConfig!.providers[id])
    .filter((p) => p.enabled);
}

export { FALLBACK_ORDER };
