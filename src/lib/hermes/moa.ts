/**
 * Hermes Skills - MoAOrchestrator
 *
 * Mixture of Agents:让多个 LLM 并行提议,再用单一裁判模型综合。
 *
 * 触发条件(可选短路):
 *   - minQueryLength:query 太短不开
 *   - keywordsAny/All:必须包含/不能包含某些词
 *   - taskTypes:某些任务永远开
 *   - userOptIn:用户在设置里强制开关
 *
 * 工作流程:
 *   1. 评估是否触发(triggerConditions)
 *   2. 并行调用 proposers(用 Promise.all)
 *   3. 任一失败:剔除,余下 ≥ 2 个继续;< 2 个降级为单模型直连
 *   4. 全部失败:降级为单模型直连
 *   5. 调 aggregator 综合所有提议
 *   6. 解析 verdict,提取 finalOutput / confidence / per-proposer scores
 *
 * 关键设计:
 *   - proposer 角色注入到 system prompt,让差异化更明显(fast=简洁、thorough=详细、creative=发散)
 *   - 裁判 system prompt 强制结构化 JSON 输出,便于解析
 *   - 单点失败不污染整体:每个 proposer 独立 try/catch
 *   - 完整可观测:proposals + verdictScores 全留在 MoAResult
 */

import type { BaseMessage } from '@langchain/core/messages';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import type {
  MoAAggregator,
  MoAProposal,
  MoAProposer,
  MoAResult,
  MoATriggerCondition,
  ModelResolver,
  ClassifiedError,
} from './healingTypes';
import { DefaultErrorClassifier } from './selfHealingExecutor';
import { getMoaSignalBus, type MoASignalBus, type MoASignalEvent } from './moaSignal';

/* =========================== 配置 =========================== */

export interface MoAConfig {
  /** 提议层模型列表(必填,至少 2 个) */
  proposers: MoAProposer[];
  /** 裁判层模型(必填,1 个) */
  aggregator: MoAAggregator;
  /** 全局触发条件 */
  trigger?: MoATriggerCondition;
  /** 强制开关(覆盖 trigger)。true=永远走 MoA,false=永远不走 */
  force?: boolean;
  /** 单个 proposer 超时 ms,默认 30_000 */
  perProposerTimeoutMs?: number;
  /** 裁判超时 ms,默认 45_000 */
  aggregatorTimeoutMs?: number;
  /** 失败 proposer 数量超过此值则降级为单模型,默认 1(余下 ≥ 2 个继续) */
  maxFailedProposers?: number;
  /** 关联的 skill id 列表(用于 signal event,通常由 BaseAgent 注入) */
  associatedSkillIds?: string[];
  /** 用户 query(用于 signal event) */
  query?: string;
  /** 触发者 Agent 名(用于 signal event) */
  agentName?: string;
  /** 自定义 signal bus(默认走全局单例,便于测试时替换) */
  signalBus?: MoASignalBus;
}

const DEFAULTS = {
  perProposerTimeoutMs: 30_000,
  aggregatorTimeoutMs: 45_000,
  maxFailedProposers: 1,
};

/* =========================== 内部类型 =========================== */

type AggregatorResult =
  | {
      ok: true;
      finalOutput: string;
      confidence: number;
      scores: Array<{ providerId: string; score: number }>;
      reasoning?: string;
    }
  | {
      ok: false;
      reason: 'verdict_json_missing' | 'verdict_json_parse_error' | 'confidence_too_low' | 'aggregator_threw';
      detail?: string;
      confidence?: number;
      scores?: Array<{ providerId: string; score: number }>;
      partialOutput?: string;
    };

/* =========================== 角色提示词 =========================== */

const ROLE_PROMPTS: Record<MoAProposer['role'], string> = {
  fast: '请用最简洁、最直接的方式回答,优先速度而非完整度。1-3 句话。',
  thorough: '请深度分析这个问题,列举多个角度、可能场景、风险点,给出详尽答案。',
  creative: '请从非传统角度思考,给出有创意的、非常规的答案。',
  balanced: '请给出平衡的、考虑多种因素的实用答案。',
};

const AGGREGATOR_SYSTEM_PROMPT = `你是一个模型委员会裁判(MoA Aggregator),负责综合多个 AI 模型的提议,产出最优答案。

输入格式:
- system:原始系统提示词
- user:用户的原始问题
- proposals:多个模型的提议,每个含 providerId / role / output

你的职责:
1. 对比所有提议,找出共同点和差异
2. 给出综合后的最终答案
3. 为每个提议评分(0-10),说明哪些贡献最大

严格约束:
- 只输出合法 JSON,不要 markdown 包裹
- finalOutput 必须是综合后的最终答案(中文,与用户问题同语言)
- confidence 是 0~1 的小数,基于提议一致性 + 答案完整度
- score 给每个 providerId 一个 0~10 的整数

输出 schema:
{
  "finalOutput": "综合后的答案",
  "confidence": 0.85,
  "scores": [
    {"providerId": "...", "score": 8, "reason": "..."},
    {"providerId": "...", "score": 6, "reason": "..."}
  ],
  "reasoning": "为什么综合成这样"
}`;

/* =========================== 主类 =========================== */

export class MoAOrchestrator {
  private cfg: Required<Omit<MoAConfig, 'force' | 'trigger'>> &
    Pick<MoAConfig, 'force' | 'trigger'>;
  private classifier = new DefaultErrorClassifier();

  constructor(
    private readonly resolver: ModelResolver,
    config: MoAConfig,
  ) {
    if (!config.proposers || config.proposers.length < 2) {
      throw new Error('MoAOrchestrator 需要至少 2 个 proposers');
    }
    if (!config.aggregator) {
      throw new Error('MoAOrchestrator 必须配置 aggregator');
    }
    this.cfg = {
      perProposerTimeoutMs: config.perProposerTimeoutMs ?? DEFAULTS.perProposerTimeoutMs,
      aggregatorTimeoutMs: config.aggregatorTimeoutMs ?? DEFAULTS.aggregatorTimeoutMs,
      maxFailedProposers: config.maxFailedProposers ?? DEFAULTS.maxFailedProposers,
      proposers: config.proposers,
      aggregator: config.aggregator,
      trigger: config.trigger,
      force: config.force,
      associatedSkillIds: config.associatedSkillIds ?? [],
      query: config.query ?? '',
      agentName: config.agentName ?? 'unknown',
      signalBus: config.signalBus ?? getMoaSignalBus(),
    };
  }

  /** 评估是否触发 MoA */
  shouldTrigger(
    query: string,
    options: { taskType?: string; userOptIn?: boolean } = {},
  ): { triggered: boolean; reason: string } {
    if (this.cfg.force === true) return { triggered: true, reason: 'force=true' };
    if (this.cfg.force === false) return { triggered: false, reason: 'force=false' };

    const cond = this.cfg.trigger;
    if (!cond) return { triggered: true, reason: 'no conditions specified, default on' };

    // 用户在设置里强制开关
    if (cond.userOptIn === true) return { triggered: true, reason: 'user opt-in' };
    if (cond.userOptIn === false) return { triggered: false, reason: 'user opt-out' };

    // 任务类型
    if (cond.taskTypes && cond.taskTypes.length > 0) {
      if (options.taskType && cond.taskTypes.includes(options.taskType)) {
        return { triggered: true, reason: `taskType=${options.taskType}` };
      }
      // taskTypes 明确配置了却未命中 → 不触发(不能落到下面的"默认通过")
      return {
        triggered: false,
        reason: `taskType=${options.taskType ?? '(未声明)'} 不在允许列表 [${cond.taskTypes.join(', ')}]`,
      };
    }

    // query 长度
    if (typeof cond.minQueryLength === 'number' && query.length < cond.minQueryLength) {
      return { triggered: false, reason: `query 长度 ${query.length} < ${cond.minQueryLength}` };
    }

    // 关键词(任一)
    if (cond.keywordsAny && cond.keywordsAny.length > 0) {
      const matched = cond.keywordsAny.some((k) => query.includes(k));
      if (!matched) {
        return { triggered: false, reason: 'query 不含触发关键词' };
      }
    }

    // 关键词(全部)
    if (cond.keywordsAll && cond.keywordsAll.length > 0) {
      const allMatched = cond.keywordsAll.every((k) => query.includes(k));
      if (!allMatched) {
        return { triggered: false, reason: 'query 不含全部触发关键词' };
      }
    }

    return { triggered: true, reason: '默认通过' };
  }

  /**
   * 主入口。返回 MoAResult;若未触发或全部失败,会走 fallback 到 single-model。
   */
  async run(
    request: { messages: BaseMessage[]; taskType?: string },
  ): Promise<MoAResult> {
    const start = Date.now();

    // 0. 提取 user query(用于 shouldTrigger)
    const userQuery = this.extractUserQuery(request.messages);
    const triggerEval = this.shouldTrigger(userQuery, { taskType: request.taskType });

    // 用 try/finally 保证无论如何都 emit moa:completed
    let result: MoAResult | null = null;
    try {
      result = await this.runInternal(request, userQuery, triggerEval, start);
      return result;
    } catch (e) {
      // 极端兜底:runInternal 自己不抛,这里也兜住
      result = {
        triggered: false,
        triggerReason: `unexpected: ${e instanceof Error ? e.message : String(e)}`,
        finalOutput: '',
        source: 'single-model-fallback',
        confidence: 0,
        proposals: [],
        totalDurationMs: Date.now() - start,
      };
      return result;
    } finally {
      if (result) {
        this.emitSignal(result, userQuery);
      }
    }
  }

  private emitSignal(result: MoAResult, query: string): void {
    try {
      const bus = this.cfg.signalBus ?? getMoaSignalBus();
      const baseEvent: Omit<MoASignalEvent, 'kind'> = {
        result,
        associatedSkillIds: this.cfg.associatedSkillIds ?? [],
        query,
        agentName: this.cfg.agentName ?? 'unknown',
        timestamp: new Date().toISOString(),
      };
      // 总是发 moa:completed
      bus.emit('moa:completed', { kind: 'moa:completed', ...baseEvent });
      // 根据 source 决定额外发哪种
      if (result.source === 'aggregator') {
        bus.emit('moa:aggregated', { kind: 'moa:aggregated', ...baseEvent });
      } else {
        bus.emit('moa:fallback', { kind: 'moa:fallback', ...baseEvent });
      }
    } catch (e) {
      console.warn('[MoAOrchestrator] emit signal failed:', e);
    }
  }

  private async runInternal(
    request: { messages: BaseMessage[]; taskType?: string },
    userQuery: string,
    triggerEval: { triggered: boolean; reason: string },
    start: number,
  ): Promise<MoAResult> {

    if (!triggerEval.triggered) {
      return this.fallbackToSingleModel(request, `not triggered: ${triggerEval.reason}`, start);
    }

    // 1. 并行提议
    const proposals = await this.runProposers(request);

    // 2. 评估提议成功率
    const successCount = proposals.filter((p) => p.success).length;
    const failedCount = proposals.length - successCount;

    if (successCount < 2 || failedCount > this.cfg.maxFailedProposers) {
      // 全部失败或失败太多 → 降级
      const fallbackReason =
        successCount === 0
          ? '全部 proposer 失败'
          : `成功 ${successCount} < 2 或失败数 ${failedCount} 超过上限`;
      return this.fallbackToSingleModel(
        request,
        fallbackReason,
        start,
        proposals,
      );
    }

    // 3. 调裁判聚合
    const aggregatorResult = await this.runAggregator(request, proposals);
    if (!aggregatorResult.ok) {
      const detail =
        aggregatorResult.reason === 'confidence_too_low'
          ? `confidence=${aggregatorResult.confidence?.toFixed(2)}`
          : aggregatorResult.detail ?? '';
      return this.fallbackToSingleModel(
        request,
        `aggregator 失败: ${aggregatorResult.reason}${detail ? ` (${detail})` : ''}`,
        start,
        proposals,
      );
    }

    return {
      triggered: true,
      triggerReason: triggerEval.reason,
      finalOutput: aggregatorResult.finalOutput,
      source: 'aggregator',
      confidence: aggregatorResult.confidence,
      proposals,
      verdictScores: aggregatorResult.scores,
      totalDurationMs: Date.now() - start,
    };
  }

  /* =========================== 内部 =========================== */

  private async runProposers(
    request: { messages: BaseMessage[] },
  ): Promise<MoAProposal[]> {
    const tasks = this.cfg.proposers.map((p) => this.runOneProposer(p, request.messages));
    return Promise.all(tasks);
  }

  private async runOneProposer(
    proposer: MoAProposer,
    baseMessages: BaseMessage[],
  ): Promise<MoAProposal> {
    const start = Date.now();
    try {
      const llm = await this.resolver(proposer.providerId, proposer.model);
      const messages = this.injectRolePrompt(baseMessages, proposer);

      const output = await withTimeout(
        llm.invoke(messages),
        this.cfg.perProposerTimeoutMs,
        `proposer ${proposer.providerId}`,
      );
      const text = typeof output === 'object' && output && 'content' in output
        ? String((output as { content: unknown }).content)
        : String(output);

      return {
        proposer,
        output: text,
        success: true,
        durationMs: Date.now() - start,
      };
    } catch (e) {
      const classified: ClassifiedError = this.classifier.classify(e);
      return {
        proposer,
        output: '',
        success: false,
        error: classified,
        durationMs: Date.now() - start,
      };
    }
  }

  private injectRolePrompt(messages: BaseMessage[], proposer: MoAProposer): BaseMessage[] {
    const roleText = ROLE_PROMPTS[proposer.role];
    const tag = `[MoA Proposer · role=${proposer.role} · provider=${proposer.providerId} · weight=${proposer.weight}]`;
    const injected = new SystemMessage(`${roleText}\n\n${tag}`);

    // 把原 system 消息保留,新角色提示插在最后
    return [...messages, injected];
  }

  private extractUserQuery(messages: BaseMessage[]): string {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m && m._getType() === 'human') {
        return typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      }
    }
    return '';
  }

  private async runAggregator(
    request: { messages: BaseMessage[] },
    proposals: MoAProposal[],
  ): Promise<AggregatorResult> {
    try {
      const llm = await this.resolver(
        this.cfg.aggregator.providerId,
        this.cfg.aggregator.model,
      );

      const userMessage = this.extractUserQuery(request.messages);
      const originalSystem = request.messages
        .filter((m) => m._getType() === 'system')
        .map((m) => (typeof m.content === 'string' ? m.content : ''))
        .join('\n');

      const proposalsPayload = proposals
        .filter((p) => p.success)
        .map((p) => ({
          providerId: p.proposer.providerId,
          role: p.proposer.role,
          weight: p.proposer.weight,
          output: p.output.slice(0, 2000), // 截断,防 token 爆炸
        }));

      const aggregatorMessages: BaseMessage[] = [
        new SystemMessage(
          `${this.cfg.aggregator.systemPrompt ?? ''}\n\n${AGGREGATOR_SYSTEM_PROMPT}`.trim(),
        ),
        new HumanMessage(
          JSON.stringify({
            system: originalSystem.slice(0, 1000),
            user: userMessage,
            proposals: proposalsPayload,
          }, null, 2),
        ),
      ];

      const raw = await withTimeout(
        llm.invoke(aggregatorMessages),
        this.cfg.aggregatorTimeoutMs,
        'aggregator',
      );

      const text = typeof raw === 'object' && raw && 'content' in raw
        ? String((raw as { content: unknown }).content)
        : String(raw);

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { ok: false, reason: 'verdict_json_missing' };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        return {
          ok: false,
          reason: 'verdict_json_parse_error',
          detail: e instanceof Error ? e.message : String(e),
        };
      }

      const confidence = Number(parsed.confidence ?? 0.5);
      const minConfidence = this.cfg.aggregator.minConfidence ?? 0.4;
      const scores = Array.isArray(parsed.scores)
        ? parsed.scores.map((s: any) => ({
            providerId: String(s.providerId ?? ''),
            score: Number(s.score ?? 0),
          }))
        : [];

      if (confidence < minConfidence) {
        return {
          ok: false,
          reason: 'confidence_too_low',
          confidence,
          scores,
          partialOutput: String(parsed.finalOutput ?? ''),
        };
      }

      return {
        ok: true,
        finalOutput: String(parsed.finalOutput ?? ''),
        confidence,
        scores,
        reasoning: parsed.reasoning,
      };
    } catch (e) {
      return {
        ok: false,
        reason: 'aggregator_threw',
        detail: e instanceof Error ? e.message : String(e),
      };
    }
  }

  private async fallbackToSingleModel(
    request: { messages: BaseMessage[] },
    reason: string,
    start: number,
    proposals: MoAProposal[] = [],
  ): Promise<MoAResult> {
    // 优先复用提议阶段成功过的 proposer 做单模型直连(它刚证明自己可用);
    // 都没有成功过再退回 weight 最高的。
    const fallbackProposer =
      proposals.find((p) => p.success)?.proposer ??
      [...this.cfg.proposers].sort((a, b) => b.weight - a.weight)[0] ??
      this.cfg.proposers[0];

    try {
      const llm = await this.resolver(fallbackProposer.providerId, fallbackProposer.model);
      const raw = await withTimeout(
        llm.invoke(request.messages),
        this.cfg.perProposerTimeoutMs,
        `fallback single (${fallbackProposer.providerId})`,
      );
      const text = typeof raw === 'object' && raw && 'content' in raw
        ? String((raw as { content: unknown }).content)
        : String(raw);

      return {
        triggered: false,
        triggerReason: reason,
        finalOutput: text,
        source: 'single-model-fallback',
        confidence: 0.5,
        proposals,
        totalDurationMs: Date.now() - start,
      };
    } catch {
      return {
        triggered: false,
        triggerReason: `${reason} 且 fallback 也失败`,
        finalOutput: '',
        source: 'single-model-fallback',
        confidence: 0,
        proposals,
        totalDurationMs: Date.now() - start,
      };
    }
  }
}

/* =========================== 工具 =========================== */

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let handle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    handle = setTimeout(
      () => reject(new Error(`[${label}] timeout after ${ms}ms`)),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (handle) clearTimeout(handle);
  }) as Promise<T>;
}