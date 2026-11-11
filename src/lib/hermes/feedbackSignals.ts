/**
 * Hermes Skills - 反馈信号判断器
 *
 * P0-B 阶段采用「多重信号自动判断」,来源:
 *  1. 工具调用层:Tool 是否返回 success=true / 是否抛错
 *  2. LLM 回应层:是否包含「错误/无法/抱歉/我不确定」等失败关键词
 *  3. 时长维度:异常超时(<100ms 或 > 60s)视为可疑信号
 *  4. 失败次数:同一 trace 内的重试次数(预留,P1-A SelfHealing 接入后自动可用)
 *
 * 后续 P1+ 可以叠加用户点赞/点踩、对话重做等显式信号。
 */

import type { ExecutionTrace, ToolCallRecord } from './types';

/** 各维度信号 */
export interface FeedbackSignals {
  /** 工具层:所有调用都成功 */
  allToolsSucceeded: boolean;
  /** 工具层:至少一次调用失败 */
  anyToolFailed: boolean;
  /** 工具层:成功调用占总调用比例 */
  toolSuccessRate: number;
  /** 文本层:LLM 回应是否包含「失败/不确定」语义 */
  llmOutputLooksConfident: boolean;
  /** 时长层:执行时长是否合理(100ms ~ 60s) */
  durationPlausible: boolean;
  /** 综合判定 */
  outcome: 'success' | 'failure' | 'partial';
  /** 综合置信度 0~1,供 SkillEvolver 决定是否触发反思 */
  confidence: number;
  /** 失败原因(若有) */
  failureReason?: string;
}

/** 失败关键词 — 中英文混合,LlmOutputLooksConfident 用 */
const FAILURE_PATTERNS: RegExp[] = [
  /抱歉/,
  /无法/,
  /不能/,
  /不确定/,
  /不知道/,
  /sorry/i,
  /i (can'?t|cannot|don'?t know)/i,
  /unable to/i,
  /failed/i,
  /error/i,
  /\?\?\?/, // 异常输出占位符
];

const MIN_PLAUSABLE_MS = 100;
const MAX_PLAUSABLE_MS = 60_000;

export function evaluateOutcome(trace: ExecutionTrace): FeedbackSignals {
  const toolResult = evaluateTools(trace.toolCalls);
  const textResult = evaluateLlmText(trace.finalOutput);
  const durationResult = evaluateDuration(trace.durationMs);

  // 综合判定
  let outcome: 'success' | 'failure' | 'partial';
  if (toolResult.successRate === 1 && textResult.confident && durationResult.plausible) {
    outcome = 'success';
  } else if (toolResult.successRate === 0) {
    outcome = 'failure';
  } else {
    outcome = 'partial';
  }

  // 置信度:四个维度各占 0.25。
  // 关键修正:失败信号也是强信号(工具全挂 / 显式失败标记),而不是惩罚项。
  // 旧公式 toolConf=successRate、explicitConf=failure?0 会让失败 trace 的
  // confidence 永远 ≤0.35,低于 gateEvolution 的 0.6 门槛,进化器永远不触发 create。
  const toolConf = toolResult.successRate === 1 ? 1 : toolResult.successRate === 0 ? 1 : 0.5;
  const textConf = textResult.confident ? 1 : 0.4;
  const durationConf = durationResult.plausible ? 1 : 0.5;
  const explicitConf = trace.outcome === 'success' ? 1 : trace.outcome === 'failure' ? 1 : 0.6;

  const confidence = Number(((toolConf + textConf + durationConf + explicitConf) / 4).toFixed(3));

  const failureReason =
    outcome === 'failure'
      ? describeFailure(toolResult, textResult, durationResult)
      : outcome === 'partial'
        ? describePartialFailure(toolResult, textResult)
        : undefined;

  return {
    allToolsSucceeded: toolResult.successRate === 1,
    anyToolFailed: toolResult.failureCount > 0,
    toolSuccessRate: toolResult.successRate,
    llmOutputLooksConfident: textResult.confident,
    durationPlausible: durationResult.plausible,
    outcome,
    confidence,
    failureReason,
  };
}

/* =========================== 内部判定 =========================== */

function evaluateTools(calls: ToolCallRecord[]): {
  successCount: number;
  failureCount: number;
  successRate: number;
} {
  if (calls.length === 0) {
    return { successCount: 0, failureCount: 0, successRate: 1 };
  }
  let success = 0;
  let failure = 0;
  for (const c of calls) {
    if (c.error) failure += 1;
    else if (looksLikeErrorOutput(c.output)) failure += 1;
    else success += 1;
  }
  return {
    successCount: success,
    failureCount: failure,
    successRate: Number((success / calls.length).toFixed(3)),
  };
}

function looksLikeErrorOutput(output: string): boolean {
  if (!output) return false;
  const trimmed = output.trim().slice(0, 500);
  // 工具约定的错误前缀(JSON 形式)
  if (/^\s*\{\s*"(?:success|ok)\"\s*:\s*false/i.test(trimmed)) return true;
  // 抛错字样
  if (/error|exception|stack\s*trace/i.test(trimmed.slice(0, 200))) return true;
  return false;
}

function evaluateLlmText(text: string): { confident: boolean; matchedPattern?: string } {
  if (!text) return { confident: false };
  const trimmed = text.trim().slice(0, 1000);
  for (const p of FAILURE_PATTERNS) {
    if (p.test(trimmed)) return { confident: false, matchedPattern: p.source };
  }
  // 太短的回应也视为可疑
  if (trimmed.length < 8) return { confident: false, matchedPattern: 'too_short' };
  return { confident: true };
}

function evaluateDuration(ms: number): { plausible: boolean; reason?: string } {
  if (ms < MIN_PLAUSABLE_MS) return { plausible: false, reason: 'too_fast' };
  if (ms > MAX_PLAUSABLE_MS) return { plausible: false, reason: 'timeout' };
  return { plausible: true };
}

function describeFailure(
  t: { successRate: number },
  txt: { confident: boolean; matchedPattern?: string },
  d: { plausible: boolean; reason?: string },
): string {
  const parts: string[] = [];
  if (t.successRate === 0) parts.push('所有工具调用失败');
  if (!txt.confident) parts.push(`LLM 回应含失败语义 (${txt.matchedPattern ?? 'unknown'})`);
  if (!d.plausible) parts.push(`时长异常 (${d.reason ?? 'unknown'})`);
  return parts.join('; ');
}

function describePartialFailure(
  t: { successRate: number },
  txt: { confident: boolean },
): string {
  const parts: string[] = [];
  if (t.successRate < 1) parts.push(`部分工具失败 (成功率 ${t.successRate})`);
  if (!txt.confident) parts.push('LLM 回应包含不确定性');
  return parts.join('; ');
}