/**
 * Hermes Skills - SelfHealing 与 MoA 的共享类型定义
 *
 * 这两个模块都需要描述"LLM 调用失败/重试/降级"相关概念,
 * 放在一起便于统一演进。
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { Tool } from '@langchain/core/tools';

/* ============================================================
 * 共用错误类型
 * ============================================================ */

/** 错误分类,供 healing 与 MoA 共用 */
export type ErrorCategory =
  | 'timeout' // 超时
  | 'rate_limit' // 429
  | '5xx' // 服务端错误
  | '4xx' // 客户端错误(不可重试)
  | 'schema_invalid' // 工具调用 schema 不匹配
  | 'tool_call_invalid' // LLM 输出了不合法的 tool_call JSON
  | 'context_overflow' // 上下文超出
  | 'network' // 网络错误
  | 'auth' // 401/403
  | 'unknown'; // 未分类

export interface ClassifiedError {
  category: ErrorCategory;
  retryable: boolean;
  message: string;
  /** 原始异常 */
  cause?: unknown;
}

/* ============================================================
 * SelfHealing 相关
 * ============================================================ */

/** 单次 LLM 调用尝试的快照 */
export interface LlmAttempt {
  /** 第 N 次尝试,从 1 开始 */
  index: number;
  /** 调用的 provider id(deepseek / openai / ollama / ...) */
  providerId: string;
  /** 该 provider 的 model name */
  model: string;
  /** 本次尝试是否成功 */
  success: boolean;
  /** 错误分类(失败时) */
  error?: ClassifiedError;
  /** 调用耗时 ms */
  durationMs: number;
  /** 尝试中是否触发了 schema 修复 */
  schemaRepairAttempted?: boolean;
  timestamp: string;
}

/** 完整执行结果 */
export interface HealingResult<T = unknown> {
  /** 最终输出 */
  output: T;
  /** 是否成功 */
  success: boolean;
  /** 所有尝试 */
  attempts: LlmAttempt[];
  /** 触发了降级 */
  fellBack: boolean;
  /** 触发了 schema 修复 */
  schemaRepaired: boolean;
  /** 最终使用的 provider id */
  providerId: string;
}

/** 降级策略 */
export interface FallbackStrategy {
  /** provider id 列表,按优先级排序,第一个为首选 */
  chain: string[];
  /** 失败多少次后切换 provider(默认 1,即一次失败就降级) */
  failuresBeforeFallback: number;
}

/** 错误分类器 */
export interface ErrorClassifier {
  classify(err: unknown): ClassifiedError;
}

/* ============================================================
 * MoA 相关
 * ============================================================ */

/** MoA 的提议层模型配置 */
export interface MoAProposer {
  providerId: string;
  model?: string;
  /** 加权,数字越大越被裁判倾向 */
  weight: number;
  /** 角色标签,会注入到 system prompt 帮助差异化 */
  role: 'fast' | 'thorough' | 'creative' | 'balanced';
  /** 仅在该条件命中时启用 */
  enabledWhen?: MoATriggerCondition;
}

/** 触发条件 */
export interface MoATriggerCondition {
  /** query 长度下限 */
  minQueryLength?: number;
  /** query 必须包含的关键词(任一) */
  keywordsAny?: string[];
  /** query 必须包含的关键词(全部) */
  keywordsAll?: string[];
  /** 任务类型(对齐 ProClaw TaskType) */
  taskTypes?: string[];
  /** 商户/用户在系统设置里强制开启 */
  userOptIn?: boolean;
}

/** 裁判层配置 */
export interface MoAAggregator {
  providerId: string;
  model?: string;
  systemPrompt?: string;
  /** 信心阈值:低于该值则不输出最终答案,降级为单模型直连 */
  minConfidence?: number;
}

/** 单个 proposer 的结果 */
export interface MoAProposal {
  proposer: MoAProposer;
  /** 提议内容 */
  output: string;
  /** 提议是否成功 */
  success: boolean;
  error?: ClassifiedError;
  durationMs: number;
}

/** MoA 完整结果 */
export interface MoAResult {
  /** 触发了吗?(false 表示降级为单模型直连) */
  triggered: boolean;
  /** 触发原因 */
  triggerReason?: string;
  /** 最终输出(可能来自裁判综合 / 单一 proposer / fallback) */
  finalOutput: string;
  /** 来源:'aggregator' | 'proposer-fallback' | 'single-model-fallback' */
  source: 'aggregator' | 'proposer-fallback' | 'single-model-fallback';
  /** 信心度 0~1,裁判模型给出 */
  confidence: number;
  /** 全部提议 */
  proposals: MoAProposal[];
  /** 裁判对每个 proposer 的评分 */
  verdictScores?: Array<{ providerId: string; score: number }>;
  /** 总耗时 */
  totalDurationMs: number;
}

/* ============================================================
 * 共享:Provider 解析器
 * ============================================================ */

/** 从 providerId 解析到 LangChain 模型实例 */
export type ModelResolver = (providerId: string, model?: string) => Promise<BaseChatModel>;

/** 抽象的 LLM 调用请求 */
export interface LlmInvokeRequest {
  messages: BaseMessage[];
  tools?: Tool[];
  /** 是否要求 LLM 输出结构化 JSON */
  jsonMode?: boolean;
}