/**
 * Hermes Skills 系统 - 类型定义
 *
 * 参考 NousResearch Hermes Agent 的 Skill 概念,移植到 ProClaw。
 * Skill = Agent 在执行某类任务时沉淀的可复用"经验包",由触发场景、工具调用模板、辅助提示词组成。
 *
 * 设计原则:
 * - 与现有 LangChain Tool 系统兼容:ToolTemplate 引用现有 Tool 的 name
 * - 演进可追踪:version + parentVersion 形成进化链
 * - 本地化:所有字段都是可序列化的 JSON/SQLite 友好类型
 */

import type { z } from 'zod';

/** Skill 的来源 */
export type SkillSource = 'preset' | 'learned' | 'optimized';

/** Skill 的状态 */
export type SkillStatus = 'active' | 'pending_review' | 'archived';

/**
 * 单个 Tool 的调用模板
 * 描述 Skill 在执行时如何调用底层 Tool
 */
export interface ToolTemplate {
  /** 现有 LangChain Tool 的 name,用于反查工具实例 */
  toolName: string;
  /** 该 Tool 的输入 zod schema(冗余存储,便于 LLM 学习) */
  inputSchema: Record<string, unknown>;
  /** 给 LLM 看的示例输入,帮助它理解何时调用 */
  exampleInvocation: string;
  /** 调用顺序权重,数字越小越靠前 */
  order?: number;
  /** 调用条件(LLM 可读的描述,如"仅在用户问库存时") */
  whenToUse?: string;
}

/**
 * 单条 Tool 调用记录(用于评估与进化)
 */
export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  error?: string;
  durationMs: number;
  timestamp: string;
}

/**
 * Agent 执行的四元组(用于驱动 SkillEvolver)
 */
export interface ExecutionTrace {
  agentName: string;
  query: string;
  toolCalls: ToolCallRecord[];
  outcome: 'success' | 'failure' | 'partial';
  finalOutput: string;
  failureReason?: string;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  skillIdsUsed: string[];
  durationMs: number;
  timestamp: string;
}

/**
 * Skill 主体
 */
export interface Skill {
  id: string;
  name: string;
  description: string;
  triggerPhrases: string[];
  toolTemplates: ToolTemplate[];
  systemPromptAddition: string;
  source: SkillSource;
  status: SkillStatus;
  version: number;
  parentVersion?: number;
  usageCount: number;
  successCount: number;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

/**
 * 检索返回的 Skill + 相关性分数
 */
export interface ScoredSkill {
  skill: Skill;
  /** BM25 原始分数 */
  bm25Score: number;
  /** 综合分数:bm25Score * successRate */
  compositeScore: number;
}

/**
 * Skill 检索选项
 */
export interface SkillRetrievalOptions {
  /** 返回数量上限,默认 5 */
  topK?: number;
  /** 最低综合分数门槛,默认 0.1 */
  minScore?: number;
  /** 是否只返回 active 状态 */
  activeOnly?: boolean;
  /** 按 tag 过滤 */
  tags?: string[];
  /** Agent 名(用于按 Agent 分组的技能过滤,预留字段) */
  agentName?: string;
}

/**
 * 写入 Skill 的输入(P0-A 只读,不实现 evolve)
 */
export interface SkillUpsertInput {
  id?: string;
  name: string;
  description: string;
  triggerPhrases: string[];
  toolTemplates: ToolTemplate[];
  systemPromptAddition?: string;
  source?: SkillSource;
  status?: SkillStatus;
  version?: number;
  parentVersion?: number;
  tags?: string[];
}

/**
 * 预设技能的工厂函数返回值
 */
export type PresetSkillFactory = () => SkillUpsertInput;