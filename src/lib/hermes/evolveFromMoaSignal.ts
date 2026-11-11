/**
 * Hermes Skills - MoA 信号 → SkillEvolver 反馈连接器
 *
 * 把 MoASignalBus 的事件转成 ExecutionTrace,喂给 SkillEvolver,
 * 沿用现有的 LLM 反思 + create/optimize/merge 流程。
 *
 * 4 种信号驱动的进化方向:
 *  1. 低置信度 → create 反思「为什么综合出来不确定」
 *  2. 评分极差 → optimize 反思「某个 provider 表现差,技能触发它可能有问题」
 *  3. 提议高度一致 → merge 反思「可以拆技能 / 加权强化」
 *  4. proposer 数量不足 → create 反思「fallback 走得太狠,需要新技能覆盖」
 *
 * 设计:
 *  - 完全事件驱动:订阅 moa:* 事件,被动接收
 *  - 不耦合 MoA 与 Evolver:可独立替换任意一边
 *  - 节流:同一 skill id 24h 内最多反馈一次(避免噪声风暴)
 */

import type { SkillEvolver } from './skillEvolver';
import type { ExecutionTrace, ToolCallRecord } from './types';
import type { SkillStore } from './skillStore';
import {
  getMoaSignalBus,
  type MoASignalEvent,
  type MoASignalBus,
  type MoASignalThresholds,
  DEFAULT_SIGNAL_THRESHOLDS,
  textJaccardSimilarity,
} from './moaSignal';

/* =========================== 反馈原因 =========================== */

export type MoAEvolutionReason =
  | 'low_confidence' // 置信度低
  | 'verdict_spread' // 评分差异大
  | 'high_agreement' // 提议高度一致
  | 'too_few_proposers' // proposer 太少(都 fallback 了)
  | 'aggregator_failed'; // 裁判自己挂了

export interface MoAEvolutionDecision {
  shouldEvolve: boolean;
  reason: MoAEvolutionReason | 'no_action';
  /** 失败原因描述,用于 EvolutionLogEntry.reasoning */
  explanation: string;
  /** 转化后的 ExecutionTrace(若 shouldEvolve=true) */
  trace?: ExecutionTrace;
}

/* =========================== 分析 =========================== */

function verdictScoreSpread(scores: Array<{ score: number }> | undefined): number {
  if (!scores || scores.length === 0) return 0;
  const values = scores.map((s) => s.score);
  return Math.max(...values) - Math.min(...values);
}

function averagePairwiseSimilarity(outputs: string[]): number {
  if (outputs.length < 2) return 1;
  let total = 0;
  let count = 0;
  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      total += textJaccardSimilarity(outputs[i], outputs[j]);
      count += 1;
    }
  }
  return count === 0 ? 0 : total / count;
}

/** MoA 提议 toolName 前缀(下划线开头,避免与真实 tool 命名空间冲突) */
const MOA_TOOL_PREFIX = '__hermes_moa__:';

function extractToolCalls(result: MoASignalEvent['result']): ToolCallRecord[] {
  // MoA 提议本身不是 Tool call,但我们可以把提议视为「隐式 tool 调用」
  // 记录给 Evolver,让 LLM 在反思时能看到 proposer 实际输出了什么。
  // 用 __hermes_moa__: 前缀避免污染 availableTools(LLM 优化技能时会过滤掉)
  return result.proposals
    .filter((p) => p.success)
    .map((p) => ({
      toolName: `${MOA_TOOL_PREFIX}${p.proposer.providerId}:${p.proposer.role}`,
      input: { role: p.proposer.role, weight: p.proposer.weight },
      output: p.output.slice(0, 500),
      durationMs: p.durationMs,
      timestamp: new Date().toISOString(),
    }));
}

/* =========================== 决策核心 =========================== */

/**
 * 根据 MoA 信号判断是否触发进化,以及触发哪种类型。
 * 不依赖外部状态,可纯函数测试。
 *
 * 优先级排序(从严重到机会):
 *   1. too_few_proposers  — MoA 退化到单模型(最严重)
 *   2. aggregator_failed  — 裁判挂了
 *   3. low_confidence     — 综合结果不确定
 *   4. verdict_spread     — 内部分歧大
 *   5. high_agreement     — 共识达成(机会信号,触发频率应该低)
 */
export function decideEvolutionFromSignal(
  event: MoASignalEvent,
  thresholds: Required<MoASignalThresholds> = DEFAULT_SIGNAL_THRESHOLDS,
): MoAEvolutionDecision {
  const { result, associatedSkillIds, query, agentName } = event;
  const successfulProposals = result.proposals.filter((p) => p.success);

  // 信号 1:proposer 太少(MoA 没起到多模型互校作用)
  if (successfulProposals.length < thresholds.minProposersForHealthy) {
    return {
      shouldEvolve: true,
      reason: 'too_few_proposers',
      explanation: `只有 ${successfulProposals.length} 个 proposer 成功(< ${thresholds.minProposersForHealthy}),说明 MoA 没起到「多模型互校」作用。可能需要专门处理 fallback 的技能。`,
      trace: {
        agentName,
        query,
        toolCalls: extractToolCalls(result),
        outcome: 'partial',
        finalOutput: result.finalOutput,
        failureReason: `moa_too_few_proposers=${successfulProposals.length}`,
        skillIdsUsed: associatedSkillIds,
        durationMs: result.totalDurationMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 信号 2:裁判自己挂了
  if (
    result.source === 'single-model-fallback' &&
    result.triggerReason?.includes('aggregator')
  ) {
    return {
      shouldEvolve: true,
      reason: 'aggregator_failed',
      explanation: `裁判模型失败,降级为单模型。Reason: ${result.triggerReason}`,
      trace: {
        agentName,
        query,
        toolCalls: extractToolCalls(result),
        outcome: 'partial',
        finalOutput: result.finalOutput,
        failureReason: `moa_aggregator_failed: ${result.triggerReason}`,
        skillIdsUsed: associatedSkillIds,
        durationMs: result.totalDurationMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 信号 3:低置信度
  if (
    result.source === 'aggregator' &&
    result.confidence < thresholds.lowConfidence
  ) {
    return {
      shouldEvolve: true,
      reason: 'low_confidence',
      explanation: `MoA 综合置信度仅 ${result.confidence.toFixed(2)},低于阈值 ${thresholds.lowConfidence}。可能需要更明确的技能或更好的 system prompt。`,
      trace: {
        agentName,
        query,
        toolCalls: extractToolCalls(result),
        outcome: 'partial',
        finalOutput: result.finalOutput,
        failureReason: `moa_confidence_low=${result.confidence}`,
        skillIdsUsed: associatedSkillIds,
        durationMs: result.totalDurationMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 信号 4:评分差异大
  const spread = verdictScoreSpread(result.verdictScores);
  if (
    result.source === 'aggregator' &&
    spread >= thresholds.verdictScoreSpread
  ) {
    const lowest = result.verdictScores?.reduce((a, b) => (a.score < b.score ? a : b));
    return {
      shouldEvolve: true,
      reason: 'verdict_spread',
      explanation: `裁判评分极差 ${spread}(阈值 ${thresholds.verdictScoreSpread}),provider ${lowest?.providerId} 评分最低 (${lowest?.score})。可能该 provider 的 LLM 不擅长当前任务。`,
      trace: {
        agentName,
        query,
        toolCalls: extractToolCalls(result),
        outcome: 'partial',
        finalOutput: result.finalOutput,
        failureReason: `moa_verdict_spread=${spread},lowest=${lowest?.providerId}`,
        skillIdsUsed: associatedSkillIds,
        durationMs: result.totalDurationMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  // 信号 5:提议高度一致(共识机会,触发频率应该低)
  const avgSimilarity = averagePairwiseSimilarity(successfulProposals.map((p) => p.output));
  if (
    successfulProposals.length >= 2 &&
    avgSimilarity >= thresholds.highAgreementCosine
  ) {
    return {
      shouldEvolve: true,
      reason: 'high_agreement',
      explanation: `${successfulProposals.length} 个提议平均相似度 ${(avgSimilarity * 100).toFixed(0)}%,说明该问题已有共识。可以拆解为更专用的小技能,或给当前技能加权。`,
      trace: {
        agentName,
        query,
        toolCalls: extractToolCalls(result),
        outcome: 'success',
        finalOutput: result.finalOutput,
        failureReason: `moa_high_agreement=${avgSimilarity.toFixed(2)}`,
        skillIdsUsed: associatedSkillIds,
        durationMs: result.totalDurationMs,
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    shouldEvolve: false,
    reason: 'no_action',
    explanation: `MoA 信号在阈值内:confidence=${result.confidence.toFixed(2)}, spread=${spread.toFixed(1)}, avgSimilarity=${avgSimilarity.toFixed(2)}, proposers=${successfulProposals.length}`,
  };
}

/* =========================== 连接器 =========================== */

export interface EvolveFromMoaSignalOptions {
  store: SkillStore;
  evolver: SkillEvolver;
  /** 自定义 signal bus(默认全局单例) */
  bus?: MoASignalBus;
  /** 自定义阈值 */
  thresholds?: Required<MoASignalThresholds>;
  /** 调试日志开关 */
  verbose?: boolean;
}

/**
 * 订阅 MoA 信号并自动喂给 Evolver。
 * 返回 unsubscribe 函数。
 *
 * 用法:
 * ```ts
 * const unsub = bindEvolverToMoaSignals({
 *   store, evolver,
 * });
 *
 * // 之后卸载时:
 * unsub();
 * ```
 */
export function bindEvolverToMoaSignals(
  options: EvolveFromMoaSignalOptions,
): () => void {
  const bus = options.bus ?? getMoaSignalBus();
  const thresholds = options.thresholds ?? DEFAULT_SIGNAL_THRESHOLDS;

  const listener = (event: MoASignalEvent) => {
    const decision = decideEvolutionFromSignal(event, thresholds);
    if (!decision.shouldEvolve || !decision.trace) {
      if (options.verbose) {
        console.debug(
          `[MoA→Evolver] skip: ${decision.reason} - ${decision.explanation}`,
        );
      }
      return;
    }
    if (options.verbose) {
      console.info(
        `[MoA→Evolver] trigger: ${decision.reason} - ${decision.explanation}`,
      );
    }
    // 异步喂入(统计写入 + 门控),listener 不等待结果
    void options.evolver.recordExecution(decision.trace);
  };

  bus.on('moa:completed', listener);

  return () => {
    bus.off('moa:completed', listener);
  };
}