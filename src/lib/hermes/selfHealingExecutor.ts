/**
 * Hermes Skills - SelfHealingExecutor
 *
 * 把"裸的 llm.invoke()"封装为可自愈的调用链。
 *
 * 三大能力:
 *  1. 重试:同 provider 内指数退避(仅对 retryable 错误)
 *  2. 降级:用尽重试后切换到 fallback provider
 *  3. Schema 修复:LLM 输出 tool_call 不符 zod schema 时,
 *     自动追加提示让 LLM 重写,最多 N 次
 *
 * 接入点:
 *   - BaseAgent.execute() 中替换 `await llm.invoke(messages)`
 *   - 任何直接调 LLM 的地方都可以包一层
 *
 * 关键设计:
 *   - 完全可注入:resolver/strategy 都从外部传入,默认走 LLMProviderManager
 *   - 不破坏 LangChain 签名:输入 BaseMessage[],输出与 LLM 一致
 *   - 全过程可观测:每次 attempt 写入 attempts[],供日志/UI 展示
 */

import type { BaseMessage, AIMessage } from '@langchain/core/messages';
import type { Tool } from '@langchain/core/tools';
import type { z } from 'zod';
import type {
  ClassifiedError,
  ErrorCategory,
  ErrorClassifier,
  FallbackStrategy,
  HealingResult,
  LlmAttempt,
  LlmInvokeRequest,
  ModelResolver,
} from './healingTypes';

/* =========================== 配置 =========================== */

export interface SelfHealingConfig {
  /** 重试策略(同一 provider 内) */
  retry?: {
    /** 最大重试次数,默认 2 */
    maxAttempts?: number;
    /** 初始退避 ms,默认 500 */
    initialBackoffMs?: number;
    /** 退避倍数,默认 2 */
    backoffMultiplier?: number;
    /** 最大退避 ms,默认 5000 */
    maxBackoffMs?: number;
  };
  /** 降级策略 */
  fallback?: FallbackStrategy;
  /** Schema 修复 */
  schemaRepair?: {
    /** 是否启用,默认 true */
    enabled?: boolean;
    /** 最多修复次数,默认 2 */
    maxAttempts?: number;
  };
  /** 错误分类器(默认 DefaultErrorClassifier) */
  classifier?: ErrorClassifier;
  /** 单次调用超时 ms,默认 30_000 */
  perCallTimeoutMs?: number;
}

const DEFAULTS = {
  retry: {
    maxAttempts: 2,
    initialBackoffMs: 500,
    backoffMultiplier: 2,
    maxBackoffMs: 5_000,
  },
  fallback: {
    chain: [],
    failuresBeforeFallback: 1,
  },
  schemaRepair: {
    enabled: true,
    maxAttempts: 2,
  },
  perCallTimeoutMs: 30_000,
};

/* =========================== 默认错误分类器 =========================== */

export class DefaultErrorClassifier implements ErrorClassifier {
  classify(err: unknown): ClassifiedError {
    const e = err as { status?: number; code?: string; message?: string; name?: string };
    const msg = (e?.message ?? String(err)).toLowerCase();

    let category: ErrorCategory = 'unknown';
    let retryable = false;

    // 1. HTTP 状态码优先(精确分类)
    if (e?.status === 429 || /rate.?limit|too many requests/i.test(msg)) {
      category = 'rate_limit';
      retryable = true;
    } else if (e?.status === 408) {
      category = 'timeout';
      retryable = true;
    } else if (e?.status === 413 || /context.?length|maximum.?context|too.?long/i.test(msg)) {
      category = 'context_overflow';
      retryable = false; // 重试没用,得换模型或裁剪上下文
    } else if (e?.status === 422 || /invalid.?tool|schema|validation/i.test(msg)) {
      category = 'schema_invalid';
      retryable = true;
    } else if (e?.status === 401 || e?.status === 403) {
      // 必须放在通用 4xx 之前
      category = 'auth';
      retryable = false;
    } else if (typeof e?.status === 'number' && e.status >= 500) {
      category = '5xx';
      retryable = true;
    } else if (typeof e?.status === 'number' && e.status >= 400) {
      category = '4xx';
      retryable = false;
    }

    // 2. 消息兜底(无 status 字段时)
    if (category === 'unknown') {
      if (/timeout|etimedout|aborted/i.test(msg)) {
        category = 'timeout';
        retryable = true;
      } else if (/network|econnrefused|enotfound|econnreset/i.test(msg)) {
        category = 'network';
        retryable = true;
      } else if (/json|parse/i.test(msg)) {
        category = 'tool_call_invalid';
        retryable = true;
      }
    }

    return {
      category,
      retryable,
      message: e?.message ?? String(err),
      cause: err,
    };
  }
}

/* =========================== 主类 =========================== */

/** 深层必填配置:构造器里已用 DEFAULTS 合并,子对象字段不应再是可选的 */
type RequiredSelfHealingConfig = Required<SelfHealingConfig> & {
  retry: Required<NonNullable<SelfHealingConfig['retry']>>;
  fallback: Required<NonNullable<SelfHealingConfig['fallback']>>;
  schemaRepair: Required<NonNullable<SelfHealingConfig['schemaRepair']>>;
};

export class SelfHealingExecutor {
  private cfg: RequiredSelfHealingConfig;
  private attempts: LlmAttempt[] = [];

  constructor(
    private readonly resolver: ModelResolver,
    config: SelfHealingConfig = {},
  ) {
    this.cfg = {
      retry: { ...DEFAULTS.retry, ...(config.retry ?? {}) },
      fallback: { ...DEFAULTS.fallback, ...(config.fallback ?? {}) },
      schemaRepair: { ...DEFAULTS.schemaRepair, ...(config.schemaRepair ?? {}) },
      classifier: config.classifier ?? new DefaultErrorClassifier(),
      perCallTimeoutMs: config.perCallTimeoutMs ?? DEFAULTS.perCallTimeoutMs,
    };
  }

  /** 主入口:包一层 llm.invoke,带自愈 */
  async invoke(
    request: LlmInvokeRequest,
    options: { primaryProviderId?: string } = {},
  ): Promise<HealingResult<unknown>> {
    this.attempts = [];
    const primary = options.primaryProviderId ?? this.cfg.fallback.chain[0] ?? 'default-service';

    const providerChain = this.buildProviderChain(primary);
    let lastResult: HealingResult<unknown> | null = null;

    for (const providerId of providerChain) {
      const result = await this.tryProvider(providerId, request);
      lastResult = result;
      if (result.success) {
        if (providerId !== primary) result.fellBack = true;
        return result;
      }
    }

    // 全部 provider 失败 → 返回最后一个失败结果(让上层决定怎么处理)
    return (
      lastResult ?? {
        output: null,
        success: false,
        attempts: this.attempts,
        fellBack: false,
        schemaRepaired: false,
        providerId: primary,
      }
    );
  }

  /** 暴露历史 attempts,供日志/UI */
  getAttempts(): readonly LlmAttempt[] {
    return this.attempts;
  }

  /* =========================== 内部 =========================== */

  private buildProviderChain(primary: string): string[] {
    const chain = [primary];
    for (const p of this.cfg.fallback.chain) {
      if (p !== primary) chain.push(p);
    }
    return chain;
  }

  private async tryProvider(
    providerId: string,
    request: LlmInvokeRequest,
  ): Promise<HealingResult<unknown>> {
    const maxAttempts = this.cfg.retry.maxAttempts + 1; // +1 是首次
    let backoff = this.cfg.retry.initialBackoffMs;
    let lastError: ClassifiedError | null = null;
    let lastOutput: unknown = null;

    for (let i = 1; i <= maxAttempts; i++) {
      const start = Date.now();
      try {
        const llm = await this.resolver(providerId);
        const result = await this.invokeWithTimeout(llm, request, this.cfg.perCallTimeoutMs);
        const duration = Date.now() - start;
        this.attempts.push({
          index: i,
          providerId,
          model: this.extractModelName(llm),
          success: true,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        });
        lastOutput = result;
        return {
          output: result,
          success: true,
          attempts: [...this.attempts],
          fellBack: false,
          schemaRepaired: false,
          providerId,
        };
      } catch (e) {
        const classified = this.cfg.classifier.classify(e);
        const duration = Date.now() - start;
        this.attempts.push({
          index: i,
          providerId,
          model: '?',
          success: false,
          error: classified,
          durationMs: duration,
          timestamp: new Date().toISOString(),
        });
        lastError = classified;

        if (!classified.retryable) break;
        if (i < maxAttempts) {
          await sleep(backoff);
          backoff = Math.min(backoff * this.cfg.retry.backoffMultiplier, this.cfg.retry.maxBackoffMs);
        }
      }
    }

    return {
      output: lastOutput,
      success: false,
      attempts: [...this.attempts],
      fellBack: false,
      schemaRepaired: false,
      providerId,
      // @ts-expect-error - 错误信息放在 metadata 上,调用方通过 attempts 获取
      error: lastError,
    };
  }

  /**
   * 带超时的 invoke。用 AbortController 实现。
   * LangChain 1.x 大部分 ChatModel 的 invoke 接受第二个 options 参数,
   * 但兼容性参差不齐,这里用竞速方案。
   */
  private async invokeWithTimeout(
    llm: import('@langchain/core/language_models/chat_models').BaseChatModel,
    request: LlmInvokeRequest,
    timeoutMs: number,
  ): Promise<unknown> {
    const invokePromise = request.tools
          ? (llm as any).invoke(request.messages, { tools: request.tools })
          : llm.invoke(request.messages);

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(
        () => reject(new Error(`LLM invoke timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    try {
      return await Promise.race([invokePromise, timeoutPromise]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  private extractModelName(
    llm: import('@langchain/core/language_models/chat_models').BaseChatModel,
  ): string {
    return (llm as unknown as { modelName?: string; model?: string }).modelName
      ?? (llm as unknown as { model?: string }).model
      ?? 'unknown';
  }
}

/* =========================== Schema 修复器(P1-A 增量) =========================== */

/**
 * 校验 LLM 输出是否满足 Tool 的 zod schema,失败时把错误反馈给 LLM 重新生成。
 * 不替换 SelfHealingExecutor,而是叠加在外层。
 */
export class SchemaRepairLoop {
  constructor(
    private readonly resolver: ModelResolver,
    private readonly maxAttempts = 2,
  ) {}

  async invokeWithSchema<T>(
    request: LlmInvokeRequest,
    schema: z.ZodSchema<T>,
    options: { primaryProviderId?: string } = {},
  ): Promise<{ data: T; attempts: number; repaired: boolean }> {
    let lastRaw: unknown = null;
    let lastError: string | null = null;
    const baseMessages = [...request.messages];

    for (let attempt = 0; attempt <= this.maxAttempts; attempt++) {
      const llm = await this.resolver(options.primaryProviderId ?? 'default-service');

      // 构造本次 attempt 的 messages:
      // - 第 1 次:原始 messages + JSON 输出提示
      // - 第 N 次(N>1):原始 messages + JSON 提示 + 上一次的错误 + 上一次 LLM 实际输出(让 LLM 知道哪里错了)
      const repairHints: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'system',
          content: '请只输出合法 JSON,不要 markdown 包裹,不要解释性文字。',
        },
      ];

      if (attempt > 0 && lastError) {
        repairHints.push({
          role: 'user',
          content: `上一次的输出不符合 schema 要求。\n错误:${lastError}\n上一次输出:${JSON.stringify(lastRaw)?.slice(0, 500)}\n请修正后重新输出,只输出 JSON。`,
        });
      }

      const jsonHintMessages = [...baseMessages, ...repairHints];

      const raw = await llm.invoke(jsonHintMessages);
      const text = typeof raw.content === 'string' ? raw.content : JSON.stringify(raw.content);

      try {
        const parsed = JSON.parse(text);
        const result = schema.safeParse(parsed);
        if (result.success) {
          return { data: result.data, attempts: attempt + 1, repaired: attempt > 0 };
        }
        lastError = result.error.message;
        lastRaw = parsed;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        lastRaw = text;
      }
    }

    throw new SchemaRepairFailedError(
      `Schema 修复 ${this.maxAttempts + 1} 次后仍失败:lastError=${lastError}, lastRaw=${JSON.stringify(lastRaw)?.slice(0, 200)}`,
      lastError,
      lastRaw,
    );
  }
}

export class SchemaRepairFailedError extends Error {
  constructor(
    message: string,
    public readonly lastError: string | null,
    public readonly lastRaw: unknown,
  ) {
    super(message);
    this.name = 'SchemaRepairFailedError';
  }
}

/* =========================== 工具 =========================== */

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}