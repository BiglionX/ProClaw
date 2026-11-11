/**
 * Hermes Skills - MoA 信号总线
 *
 * 解决「MoA 结果如何驱动 SkillEvolver 进化」的耦合问题。
 *
 * 设计原则:
 *  - 极简 EventEmitter,无依赖(不引入 node:events,在浏览器/Tauri 环境通用)
 *  - 类型安全:订阅者能拿到精确的 MoASignalEvent 类型
 *  - 同步发出、异步消费:不影响 MoAOrchestrator 的返回值
 *  - 多次订阅:支持插件化的多个订阅者(如分析、日志、UI)
 *
 * 三类信号:
 *  - 'moa:completed' — MoA 跑完一次,无论成功还是 fallback 都发
 *  - 'moa:aggregated' — 仅当走了 aggregator(成功)时发
 *  - 'moa:fallback' — 仅当走了 fallback 时发
 */

import type { MoAResult } from './healingTypes';

/* =========================== 信号事件 =========================== */

export type MoASignalKind = 'moa:completed' | 'moa:aggregated' | 'moa:fallback';

export interface MoASignalEvent {
  /** 信号类型 */
  kind: MoASignalKind;
  /** MoA 完整结果 */
  result: MoAResult;
  /** 关联的 skill id 列表(从当前 Agent 上一次 retrieve 拿到的) */
  associatedSkillIds: string[];
  /** 用户原始 query(便于关联 Agent) */
  query: string;
  /** 触发者(通常是 Agent 名) */
  agentName: string;
  /** 时间戳 */
  timestamp: string;
}

/* =========================== 信号阈值 =========================== */

/**
 * 多信号驱动的阈值配置。
 * 调整这些值即可控制「MoA 反馈触发 Evolver」的灵敏度。
 */
export interface MoASignalThresholds {
  /** 置信度低于该值 → 触发 create 反思「为什么综合不出来」 */
  lowConfidence: number;
  /** top/bottom 评分差超过该值 → 触发 optimize 反思「某个 Tool 表现差」 */
  verdictScoreSpread: number;
  /** 所有提议文本相似度高于该值 → 触发 merge / 加权 反思「可以强化技能」 */
  highAgreementCosine: number;
  /** 提议数量低于该值(说明 fallback 走得太狠)→ 触发 create 反思 */
  minProposersForHealthy: number;
}

export const DEFAULT_SIGNAL_THRESHOLDS: Required<MoASignalThresholds> = {
  lowConfidence: 0.4,
  verdictScoreSpread: 4,
  highAgreementCosine: 0.85,
  minProposersForHealthy: 2,
};

/* =========================== 信号总线 =========================== */

type Listener<T> = (event: T) => void | Promise<void>;

export class MoASignalBus {
  private listeners = new Map<MoASignalKind, Set<Listener<MoASignalEvent>>>();

  /** 订阅特定类型信号 */
  on(kind: MoASignalKind, listener: Listener<MoASignalEvent>): () => void {
    if (!this.listeners.has(kind)) {
      this.listeners.set(kind, new Set());
    }
    this.listeners.get(kind)!.add(listener);
    return () => this.off(kind, listener);
  }

  /** 取消订阅 */
  off(kind: MoASignalKind, listener: Listener<MoASignalEvent>): void {
    this.listeners.get(kind)?.delete(listener);
  }

  /** 一次性订阅 */
  once(kind: MoASignalKind, listener: Listener<MoASignalEvent>): void {
    const wrapped: Listener<MoASignalEvent> = (e) => {
      this.off(kind, wrapped);
      return listener(e);
    };
    this.on(kind, wrapped);
  }

  /** 发出信号(同步,但 listener 可以 async) */
  emit(kind: MoASignalKind, event: MoASignalEvent): void {
    const set = this.listeners.get(kind);
    if (!set) return;
    for (const listener of Array.from(set)) {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          // 异步 listener 不阻塞,失败 console.warn
          result.catch((e) => console.warn('[MoASignalBus] async listener failed:', e));
        }
      } catch (e) {
        console.warn('[MoASignalBus] sync listener threw:', e);
      }
    }
  }

  /** 清除所有订阅(测试用) */
  clear(): void {
    this.listeners.clear();
  }

  /** 当前订阅数(调试用) */
  listenerCount(kind?: MoASignalKind): number {
    if (kind) return this.listeners.get(kind)?.size ?? 0;
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }
}

/* =========================== 全局单例 =========================== */

let _bus: MoASignalBus | null = null;

export function getMoaSignalBus(): MoASignalBus {
  if (!_bus) _bus = new MoASignalBus();
  return _bus;
}

export function setMoaSignalBus(bus: MoASignalBus): void {
  _bus = bus;
}

/* =========================== 工具:文本相似度 =========================== */

/**
 * 简易文本相似度:Jaccard(词汇集合交并比)
 * 0 = 完全不相似,1 = 完全相同
 *
 * 中英文混合场景:
 *  - 英文/拉丁文:按空格分词
 *  - 中文/日文/韩文:用 Intl.Segmenter 按词切分;老环境兜底用单字
 *  - 数字串:作为整体保留
 */
export function textJaccardSimilarity(a: string, b: string): number {
  const aEmpty = !a;
  const bEmpty = !b;
  if (aEmpty && bEmpty) return 1;
  if (aEmpty || bEmpty) return 0;
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];

  // 1) 数字串(单独)
  const numberMatches = lower.match(/\d+(?:\.\d+)?/g) ?? [];
  tokens.push(...numberMatches);

  // 2) 英文/拉丁文(按空格分,过滤标点)
  const stripped = lower.replace(/[\p{P}\p{N}]/gu, ' ');
  tokens.push(...stripped.split(/\s+/).filter((t) => t.length > 1));

  // 3) CJK 字符:Intl.Segmenter 按词,Tauri 桌面与主流浏览器均支持
  const cjkSegments = cjkSegment(lower);
  tokens.push(...cjkSegments);

  return tokens;
}

/**
 * CJK 字符级分词(Intl.Segmenter),不可用时兜底为单字。
 */
function cjkSegment(text: string): string[] {
  const cjk = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g);
  if (!cjk) return [];
  const cjkText = cjk.join('');

  // 尝试用 Intl.Segmenter(Chrome / Edge / Tauri WebView 都支持)
  try {
    // @ts-expect-error Intl.Segmenter 在 TS 老 lib 上未声明
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      // @ts-expect-error 同上
      const seg = new Intl.Segmenter('zh', { granularity: 'word' });
      const words: string[] = [];
      for (const s of seg.segment(cjkText)) {
        const w = s.segment.trim();
        if (w.length >= 2) words.push(w.toLowerCase());
      }
      if (words.length > 0) return words;
    }
  } catch {
    // 兜底
  }

  // 老环境兜底:按 2字字符级切分
  const out: string[] = [];
  for (let i = 0; i < cjkText.length - 1; i++) {
    out.push(cjkText.slice(i, i + 2));
  }
  return out;
}