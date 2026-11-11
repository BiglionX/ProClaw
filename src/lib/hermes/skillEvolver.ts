/**
 * Hermes Skills - 进化引擎 (SkillEvolver)
 *
 * P0-B 核心:把 BaseAgent 喂进来的 ExecutionTrace,经过多重信号评估,
 * 调用 LLM 做 reflection,落地为 create / optimize / merge 三种动作。
 *
 * 关键设计:
 *  - 异步队列:不阻塞 Agent 主流程
 *  - 去重:同一 query 24h 内最多触发一次
 *  - 待审核:AI 生成的新技能 status='pending_review',需 UI 确认
 *  - 冷却:LLM 反思调用有限速,避免打爆 Provider
 *  - 可观测:每次进化都进 evolution_log 表(P0-B 阶段用 console 替代)
 *
 * 演化链追踪:optimize/merge 都会带 parentVersion,
 * 未来可在 UI 展示「这个技能是怎么从 v1 进化到 v3 的」。
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type {
  ExecutionTrace,
  ScoredSkill,
  Skill,
  ToolCallRecord,
} from './types';
import type { SkillStore } from './skillStore';
import type { DatabaseExecutor } from './skillStore';
import { evaluateOutcome, type FeedbackSignals } from './feedbackSignals';
import {
  buildCreatePrompt,
  buildOptimizePrompt,
  buildMergePrompt,
  gateEvolution,
  type ReflectionResult,
} from './reflectionPrompt';

/* =========================== 配置 =========================== */

export interface EvolverConfig {
  /** 同一 query 24 小时内最多触发一次进化(去重) */
  dedupWindowMs?: number;
  /** 队列达到多少条就触发反思,默认 5 */
  batchSize?: number;
  /** 队列最长等待多久触发一次,默认 30s */
  flushIntervalMs?: number;
  /** LLM 调用之间的最小间隔,默认 500ms(限速) */
  llmCooldownMs?: number;
  /** 进化后是否需要人工审核(写入 pending_review) */
  requireReview?: boolean;
  /** 失败率阈值,达到就触发 optimize,默认 0.3 */
  optimizeThreshold?: number;
  /** 同一 Skill 的 usageCount 达到多少才考虑 optimize,默认 5 */
  minUsageForOptimize?: number;
}

const DEFAULTS: Required<EvolverConfig> = {
  dedupWindowMs: 24 * 60 * 60 * 1000,
  batchSize: 5,
  flushIntervalMs: 30_000,
  llmCooldownMs: 500,
  requireReview: true,
  optimizeThreshold: 0.3,
  minUsageForOptimize: 5,
};

/* =========================== 进化日志 =========================== */

export interface EvolutionLogEntry {
  id: number;
  timestamp: string;
  traceQuery: string;
  agentName: string;
  action: 'create' | 'optimize' | 'merge' | 'noop' | 'skip';
  skillId?: string;
  sourceSkillIds?: string[];
  reasoning: string;
  signals?: Partial<FeedbackSignals>;
  error?: string;
}

const EVOLUTION_LOG_SCHEMA = `
CREATE TABLE IF NOT EXISTS hermes_evolution_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  trace_query TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  skill_id TEXT,
  source_skill_ids TEXT,
  reasoning TEXT NOT NULL,
  signals TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_evolution_log_ts ON hermes_evolution_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_evolution_log_action ON hermes_evolution_log(action);
`;

/* =========================== 进化器 =========================== */

export class SkillEvolver {
  private queue: ExecutionTrace[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private recentFingerprints = new Map<string, number>(); // query hash -> timestamp
  private isFlushing = false;
  private lastLlmCallAt = 0;
  private cfg: Required<EvolverConfig>;
  private logIdCounter = 0;

  constructor(
    private readonly llm: () => Promise<BaseChatModel>,
    private readonly store: SkillStore,
    private readonly db: DatabaseExecutor,
    config: EvolverConfig = {},
  ) {
    this.cfg = { ...DEFAULTS, ...config };
    this.initLog();
    this.startTimer();
    this.startCleanupTimer();
  }

  /** 关闭定时器(测试用) */
  dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 主入口:Agent.execute() 结束时调用,把 trace 喂进来。
   * 不阻塞调用方(调用方 void 即可);内部异步更新统计与入队。
   */
  async recordExecution(trace: ExecutionTrace): Promise<void> {
    // 1. 立即更新 Skill 使用统计(优先级高)
    if (trace.skillIdsUsed && trace.skillIdsUsed.length > 0) {
      const success = trace.outcome === 'success';
      for (const id of trace.skillIdsUsed) {
        try {
          await this.store.recordUsage(id, success);
        } catch {
          /* ignore single skill failure */
        }
      }
    }

    // 2. 粗筛:是否值得进化
    const signals = evaluateOutcome(trace);
    const usedIds = trace.skillIdsUsed ?? [];
    const skillRows = await Promise.all(usedIds.map((id) => this.store.getById(id)));
    const skillStats = skillRows
      .filter((s): s is Skill => s !== null)
      .map((s) => ({
        skillId: s.id,
        usageCount: s.usageCount,
        successCount: s.successCount,
        failureCount: s.failureCount,
      }));

    const gate = gateEvolution(trace, signals, skillStats);

    // 3. 去重
    const fingerprint = fingerprintTrace(trace);
    const lastSeen = this.recentFingerprints.get(fingerprint);
    if (lastSeen && Date.now() - lastSeen < this.cfg.dedupWindowMs) {
      await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'skip',
        reasoning: `去重:24h 内已处理过类似 trace (${gate.reason})`,
      });
      return;
    }
    this.recordFingerprint(fingerprint);

    if (!gate.shouldEvolve) {
      await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'skip',
        reasoning: gate.reason,
      });
      return;
    }

    this.queue.push(trace);

    // 4. 触发条件
    if (this.queue.length >= this.cfg.batchSize) {
      void this.flush();
    }
  }

  /**
   * 校验 LLM 返回的 ReflectionResult,过滤无效 toolName / 缺字段
   * 防止凭空写入引用不存在 Tool 的技能。
   */
  private validateReflection(
    raw: ReflectionResult | null,
    availableTools: Set<string>,
  ): ReflectionResult | null {
    if (!raw) return null;
    if (!['create', 'optimize', 'merge', 'noop'].includes(raw.action)) return null;
    if (raw.action === 'noop') return raw;

    if (!raw.skill) return null;
    const s = raw.skill;

    // 字段完整性
    if (!s.name || typeof s.name !== 'string') return null;
    if (!s.description || typeof s.description !== 'string') return null;
    if (!Array.isArray(s.triggerPhrases) || s.triggerPhrases.length === 0) return null;
    if (!Array.isArray(s.toolTemplates)) return null;
    if (!Array.isArray(s.tags)) return null;

    // toolTemplates 中每个 toolName 必须在 availableTools 中
    const filteredTemplates = s.toolTemplates.filter(
      (t) =>
        t &&
        typeof t.toolName === 'string' &&
        availableTools.has(t.toolName) &&
        typeof t.exampleInvocation === 'string',
    );

    // 过滤后没有任何 tool 的技能不应被创建
    if (filteredTemplates.length === 0) {
      return {
        ...raw,
        action: 'noop',
        reasoning: `${raw.reasoning ?? ''} [auto-corrected: toolTemplates 全部 toolName 不在 availableTools 中]`,
      };
    }

    return {
      ...raw,
      skill: {
        ...s,
        toolTemplates: filteredTemplates,
      },
    };
  }

  /** 强制刷新(测试用,或 Agent 会话结束时调用) */
  async flush(): Promise<EvolutionLogEntry[]> {
    // 互斥:避免 setInterval 和 recordExecution 同时触发 flush
    if (this.isFlushing) return [];
    if (this.queue.length === 0) return [];
    this.isFlushing = true;
    try {
      const batch = this.queue.splice(0, this.cfg.batchSize);
      const logs: EvolutionLogEntry[] = [];
      for (const trace of batch) {
        try {
          const log = await this.evolveOne(trace);
          if (log) logs.push(log);
        } catch (e) {
          logs.push(
            await this.appendLog({
              timestamp: new Date().toISOString(),
              traceQuery: trace.query,
              agentName: trace.agentName,
              action: 'noop',
              error: e instanceof Error ? e.message : String(e),
              reasoning: 'evolveOne 抛错',
            }),
          );
        }
        // 限速
        await sleep(this.cfg.llmCooldownMs);
      }
      return logs;
    } finally {
      this.isFlushing = false;
    }
  }

  /* =========================== 内部:单条 trace 进化 =========================== */

  private async evolveOne(trace: ExecutionTrace): Promise<EvolutionLogEntry | null> {
    const signals = evaluateOutcome(trace);
    const rows = await Promise.all(
      (trace.skillIdsUsed ?? []).map((id) => this.store.getById(id)),
    );
    const skillStats = rows
      .filter((s): s is Skill => s !== null)
      .map((s) => ({
        skillId: s.id,
        usageCount: s.usageCount,
        successCount: s.successCount,
        failureCount: s.failureCount,
      }));

    const gate = gateEvolution(trace, signals, skillStats);
    if (!gate.shouldEvolve) return null;

    let reflection: ReflectionResult | null = null;

    try {
      if (gate.suggested === 'create') {
        reflection = await this.reflectCreate(trace);
      } else if (gate.suggested === 'optimize') {
        // 找失败率最高的技能
        const target = await this.findMostFailingSkill(skillStats);
        if (target) {
          reflection = await this.reflectOptimize(target, trace);
        }
      } else if (gate.suggested === 'merge') {
        const candidates = await this.findMergeCandidates(skillStats);
        if (candidates.length >= 2) {
          reflection = await this.reflectMerge(candidates, trace);
        }
      }
    } catch (e) {
      return await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'noop',
        reasoning: `LLM 反思失败:${e instanceof Error ? e.message : 'unknown'}`,
      });
    }

    if (!reflection) return null;

    // 落库
    return await this.applyReflection(reflection, trace, signals);
  }

  private async reflectCreate(trace: ExecutionTrace): Promise<ReflectionResult | null> {
    const availableTools = new Set(extractToolNames(trace.toolCalls));
    // 兜底:允许预设技能里已存在的 Tool 名(Llm 有时从 system prompt 中学到)
    for (const sk of await this.store.list({ status: 'active', limit: 100 })) {
      for (const t of sk.toolTemplates) availableTools.add(t.toolName);
    }
    const existingSkills = await this.store.list({ status: 'active', limit: 100 });
    const llm = await this.llm();
    const { system, user } = buildCreatePrompt(trace, Array.from(availableTools), existingSkills);
    const raw = await this.invokeJson(llm, system, user);
    const parsed = parseReflection(raw);
    return this.validateReflection(parsed, availableTools);
  }

  private async reflectOptimize(
    target: Skill,
    trigger: ExecutionTrace,
  ): Promise<ReflectionResult | null> {
    // optimize 时允许的 toolName = 原技能 + 本次 trace 用过的
    const allowed = new Set<string>(target.toolTemplates.map((t) => t.toolName));
    for (const c of trigger.toolCalls) allowed.add(c.toolName);
    const llm = await this.llm();
    const { system, user } = buildOptimizePrompt(target, [trigger]);
    const raw = await this.invokeJson(llm, system, user);
    const parsed = parseReflection(raw);
    return this.validateReflection(parsed, allowed);
  }

  private async reflectMerge(
    candidates: Skill[],
    trigger: ExecutionTrace,
  ): Promise<ReflectionResult | null> {
    const allowed = new Set<string>();
    for (const c of candidates) for (const t of c.toolTemplates) allowed.add(t.toolName);
    for (const c of trigger.toolCalls) allowed.add(c.toolName);
    const llm = await this.llm();
    const { system, user } = buildMergePrompt(candidates, [trigger]);
    const raw = await this.invokeJson(llm, system, user);
    const parsed = parseReflection(raw);
    return this.validateReflection(parsed, allowed);
  }

  private async invokeJson(
    llm: BaseChatModel,
    system: string,
    user: string,
  ): Promise<string> {
    const now = Date.now();
    const wait = this.lastLlmCallAt + this.cfg.llmCooldownMs - now;
    if (wait > 0) await sleep(wait);
    this.lastLlmCallAt = Date.now();

    const resp = await llm.invoke([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);
    const content = typeof resp.content === 'string' ? resp.content : JSON.stringify(resp.content);
    // 提取 JSON(防止 LLM 输出 ```json ... ``` 包裹)
    const m = content.match(/\{[\s\S]*\}/);
    return m ? m[0] : content;
  }

  /* =========================== 内部:落库 =========================== */

  private async applyReflection(
    reflection: ReflectionResult,
    trace: ExecutionTrace,
    signals: FeedbackSignals,
  ): Promise<EvolutionLogEntry> {
    if (reflection.action === 'noop' || !reflection.skill) {
      return await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'noop',
        reasoning: reflection.reasoning,
        signals,
      });
    }

    if (reflection.action === 'create') {
      const status = this.cfg.requireReview ? 'pending_review' : 'active';
      const created = await this.store.upsert({
        ...reflection.skill,
        source: 'learned',
        status,
        version: 1,
        tags: reflection.skill.tags ?? [],
      });
      return await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'create',
        skillId: created.id,
        reasoning: reflection.reasoning,
        signals,
      });
    }

    if (reflection.action === 'optimize') {
      if (!reflection.targetSkillId) {
        return await this.appendLog({
          timestamp: new Date().toISOString(),
          traceQuery: trace.query,
          agentName: trace.agentName,
          action: 'noop',
          reasoning: 'optimize 但缺少 targetSkillId',
        });
      }
      const before = await this.store.getById(reflection.targetSkillId);
      if (!before) {
        return await this.appendLog({
          timestamp: new Date().toISOString(),
          traceQuery: trace.query,
          agentName: trace.agentName,
          action: 'noop',
          reasoning: `optimize 目标 ${reflection.targetSkillId} 不存在`,
        });
      }
      // 过滤 toolTemplates,只保留原 Tool 名
      const originalToolNames = new Set(before.toolTemplates.map((t) => t.toolName));
      const filteredTemplates = reflection.skill.toolTemplates.filter((t) =>
        originalToolNames.has(t.toolName),
      );

      const optimized = await this.store.upsert({
        id: before.id,
        name: reflection.skill.name,
        description: reflection.skill.description,
        triggerPhrases: reflection.skill.triggerPhrases,
        toolTemplates: filteredTemplates,
        systemPromptAddition: reflection.skill.systemPromptAddition,
        tags: reflection.skill.tags,
        source: 'optimized',
        status: this.cfg.requireReview ? 'pending_review' : 'active',
        version: before.version + 1,
        parentVersion: before.version,
      });
      return await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'optimize',
        skillId: optimized.id,
        reasoning: reflection.reasoning,
        signals,
      });
    }

    if (reflection.action === 'merge') {
      const sourceIds = reflection.sourceSkillIds ?? [];
      if (sourceIds.length < 2) {
        return await this.appendLog({
          timestamp: new Date().toISOString(),
          traceQuery: trace.query,
          agentName: trace.agentName,
          action: 'noop',
          reasoning: 'merge 但 sourceSkillIds 不足 2 个',
        });
      }
      // 归档源 skills
      for (const id of sourceIds) {
        const src = await this.store.getById(id);
        if (src) {
          await this.store.upsert({ ...src, status: 'archived' });
        }
      }
      const status = this.cfg.requireReview ? 'pending_review' : 'active';
      const merged = await this.store.upsert({
        ...reflection.skill,
        source: 'learned',
        status,
        version: 1,
        tags: reflection.skill.tags ?? [],
      });
      return await this.appendLog({
        timestamp: new Date().toISOString(),
        traceQuery: trace.query,
        agentName: trace.agentName,
        action: 'merge',
        skillId: merged.id,
        sourceSkillIds: sourceIds,
        reasoning: reflection.reasoning,
        signals,
      });
    }

    return await this.appendLog({
      timestamp: new Date().toISOString(),
      traceQuery: trace.query,
      agentName: trace.agentName,
      action: 'noop',
      reasoning: `未知 action: ${reflection.action}`,
    });
  }

  /* =========================== 内部:辅助 =========================== */

  private async findMostFailingSkill(
    stats: Array<{
      skillId: string;
      usageCount: number;
      successCount: number;
      failureCount: number;
    }>,
  ): Promise<Skill | null> {
    let best: Skill | null = null;
    let worstRate = 0;
    for (const s of stats) {
      if (s.usageCount < this.cfg.minUsageForOptimize) continue;
      const rate = s.failureCount / s.usageCount;
      if (rate > this.cfg.optimizeThreshold && rate > worstRate) {
        const skill = await this.store.getById(s.skillId);
        if (skill) {
          best = skill;
          worstRate = rate;
        }
      }
    }
    return best;
  }

  private async findMergeCandidates(
    stats: Array<{
      skillId: string;
      usageCount: number;
      successCount: number;
      failureCount: number;
    }>,
  ): Promise<Skill[]> {
    const rows = await Promise.all(
      stats
        .filter((s) => s.usageCount >= this.cfg.minUsageForOptimize)
        .map((s) => this.store.getById(s.skillId)),
    );
    return rows.filter((s): s is Skill => s !== null);
  }

  private initLog(): void {
    try {
      this.db.exec(EVOLUTION_LOG_SCHEMA);
    } catch (e) {
      console.warn('[SkillEvolver] 初始化 evolution_log 失败:', e);
    }
  }

  private async appendLog(
    entry: Omit<EvolutionLogEntry, 'id'>,
  ): Promise<EvolutionLogEntry> {
    this.logIdCounter += 1;
    const full: EvolutionLogEntry = { id: this.logIdCounter, ...entry };
    try {
      await this.db.run(
        `INSERT INTO hermes_evolution_log
         (timestamp, trace_query, agent_name, action, skill_id, source_skill_ids, reasoning, signals, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          full.timestamp,
          full.traceQuery,
          full.agentName,
          full.action,
          full.skillId ?? null,
          full.sourceSkillIds ? JSON.stringify(full.sourceSkillIds) : null,
          full.reasoning,
          full.signals ? JSON.stringify(full.signals) : null,
          full.error ?? null,
        ],
      );
    } catch (e) {
      console.warn('[SkillEvolver] 写入 evolution_log 失败:', e);
    }
    return full;
  }

  /** 列出最近的进化日志(供 UI 展示) */
  async listEvolutionLog(limit = 50): Promise<EvolutionLogEntry[]> {
    try {
      const rows = await this.db.all<{
        id: number;
        timestamp: string;
        trace_query: string;
        agent_name: string;
        action: string;
        skill_id: string | null;
        source_skill_ids: string | null;
        reasoning: string;
        signals: string | null;
        error: string | null;
      }>(
        `SELECT * FROM hermes_evolution_log ORDER BY id DESC LIMIT ?`,
        [limit],
      );
      return rows.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        traceQuery: r.trace_query,
        agentName: r.agent_name,
        action: r.action as EvolutionLogEntry['action'],
        skillId: r.skill_id ?? undefined,
        sourceSkillIds: r.source_skill_ids ? JSON.parse(r.source_skill_ids) : undefined,
        reasoning: r.reasoning,
        signals: r.signals ? JSON.parse(r.signals) : undefined,
        error: r.error ?? undefined,
      }));
    } catch {
      return [];
    }
  }

  private startTimer(): void {
    this.timer = setInterval(() => {
      if (this.queue.length > 0) {
        void this.flush();
      }
    }, this.cfg.flushIntervalMs);
    // 防止 timer 阻止进程退出
    if (typeof this.timer === 'object' && this.timer !== null && 'unref' in this.timer) {
      (this.timer as unknown as { unref: () => void }).unref();
    }
  }

  /** LRU 上限,超过则清理最早的 25% */
  private static readonly FINGERPRINT_LRU_MAX = 10_000;

  /** 记录指纹,带 LRU 上限保护 */
  private recordFingerprint(fingerprint: string): void {
    this.recentFingerprints.set(fingerprint, Date.now());
    // 超过上限,清理最早的 25%
    if (this.recentFingerprints.size > SkillEvolver.FINGERPRINT_LRU_MAX) {
      const sortedByTs = Array.from(this.recentFingerprints.entries()).sort(
        (a, b) => a[1] - b[1],
      );
      const toRemove = Math.floor(SkillEvolver.FINGERPRINT_LRU_MAX * 0.25);
      for (let i = 0; i < toRemove && i < sortedByTs.length; i++) {
        const entry = sortedByTs[i];
        if (entry) this.recentFingerprints.delete(entry[0]);
      }
    }
  }

  /** 定期清理 dedupWindowMs 之外的指纹,避免内存只增不减 */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      const cutoff = Date.now() - this.cfg.dedupWindowMs;
      let removed = 0;
      for (const [k, ts] of this.recentFingerprints.entries()) {
        if (ts < cutoff) {
          this.recentFingerprints.delete(k);
          removed += 1;
        }
      }
      if (removed > 0 && typeof console !== 'undefined') {
        console.debug(`[SkillEvolver] cleaned ${removed} expired fingerprints`);
      }
    }, Math.max(this.cfg.flushIntervalMs * 2, 60_000));
    if (
      typeof this.cleanupTimer === 'object' &&
      this.cleanupTimer !== null &&
      'unref' in this.cleanupTimer
    ) {
      (this.cleanupTimer as unknown as { unref: () => void }).unref();
    }
  }
}

/* =========================== 工具函数 =========================== */

function fingerprintTrace(trace: ExecutionTrace): string {
  // 用 query + 调用的 Tool 序列做指纹
  const tools = trace.toolCalls.map((c) => c.toolName).join(',');
  return `${trace.agentName}|${trace.query.slice(0, 80)}|${tools}`;
}

function extractToolNames(calls: ToolCallRecord[]): string[] {
  return Array.from(new Set(calls.map((c) => c.toolName)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseReflection(raw: string): ReflectionResult | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.action === 'string' &&
      ['create', 'optimize', 'merge', 'noop'].includes(parsed.action)
    ) {
      return parsed as ReflectionResult;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 工具:把 Agent 检索结果转成 ExecutionTrace 中需要的 skillIds 数组
 */
export function skillIdsFromScored(scored: ScoredSkill[]): string[] {
  return scored.map((s) => s.skill.id);
}