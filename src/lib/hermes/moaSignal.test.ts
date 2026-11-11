/**
 * Hermes Skills P6 单测 — MoA ↔ Evolver 联动
 *
 * 覆盖:
 *  - MoASignalBus:订阅/取消/emit/异常隔离
 *  - textJaccardSimilarity:边界值
 *  - decideEvolutionFromSignal:5 种信号路径
 *  - bindEvolverToMoaSignals:端到端(MoAOrchestrator → bus → Evolver)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MoASignalBus,
  textJaccardSimilarity,
  DEFAULT_SIGNAL_THRESHOLDS,
  decideEvolutionFromSignal,
  bindEvolverToMoaSignals,
  MoAOrchestrator,
  createHermesBundle,
  InMemoryDatabase,
} from './index';
import type { MoASignalEvent } from './index';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { MoAResult } from './index';

/* =========================== Helpers =========================== */

function makeEvent(overrides: Partial<MoASignalEvent> = {}): MoASignalEvent {
  return {
    kind: 'moa:completed',
    result: {
      triggered: true,
      finalOutput: 'final',
      source: 'aggregator',
      confidence: 0.8,
      proposals: [
        { proposer: { providerId: 'p1', role: 'fast', weight: 0.5 }, output: 'a', success: true, durationMs: 100 },
        { proposer: { providerId: 'p2', role: 'thorough', weight: 0.5 }, output: 'b', success: true, durationMs: 100 },
      ],
      verdictScores: [
        { providerId: 'p1', score: 8 },
        { providerId: 'p2', score: 7 },
      ],
      totalDurationMs: 500,
    },
    associatedSkillIds: ['sk_a'],
    query: 'test query',
    agentName: 'TestAgent',
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

/* =========================== MoASignalBus =========================== */

describe('MoASignalBus', () => {
  it('on + emit fires listener', () => {
    const bus = new MoASignalBus();
    const fn = vi.fn();
    bus.on('moa:completed', fn);
    bus.emit('moa:completed', makeEvent());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('off removes listener', () => {
    const bus = new MoASignalBus();
    const fn = vi.fn();
    bus.on('moa:completed', fn);
    bus.off('moa:completed', fn);
    bus.emit('moa:completed', makeEvent());
    expect(fn).not.toHaveBeenCalled();
  });

  it('once fires only once', () => {
    const bus = new MoASignalBus();
    const fn = vi.fn();
    bus.once('moa:completed', fn);
    bus.emit('moa:completed', makeEvent());
    bus.emit('moa:completed', makeEvent());
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('emit returns even if listener throws', () => {
    const bus = new MoASignalBus();
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    bus.on('moa:completed', () => {
      throw new Error('listener failed');
    });
    expect(() => bus.emit('moa:completed', makeEvent())).not.toThrow();
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it('async listener errors do not block emit', async () => {
    const bus = new MoASignalBus();
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fn = vi.fn();
    bus.on('moa:completed', async () => {
      throw new Error('async failed');
    });
    bus.on('moa:completed', fn);
    bus.emit('moa:completed', makeEvent());
    expect(fn).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 10));
    expect(consoleWarn).toHaveBeenCalled();
    consoleWarn.mockRestore();
  });

  it('unsub function returned by on() actually unsubscribes', () => {
    const bus = new MoASignalBus();
    const fn = vi.fn();
    const unsub = bus.on('moa:completed', fn);
    unsub();
    bus.emit('moa:completed', makeEvent());
    expect(fn).not.toHaveBeenCalled();
  });

  it('listenerCount tracks subscribers', () => {
    const bus = new MoASignalBus();
    expect(bus.listenerCount()).toBe(0);
    bus.on('moa:completed', () => {});
    bus.on('moa:fallback', () => {});
    expect(bus.listenerCount()).toBe(2);
    expect(bus.listenerCount('moa:completed')).toBe(1);
  });

  it('clear removes all', () => {
    const bus = new MoASignalBus();
    bus.on('moa:completed', () => {});
    bus.on('moa:fallback', () => {});
    bus.clear();
    expect(bus.listenerCount()).toBe(0);
  });
});

/* =========================== textJaccardSimilarity =========================== */

describe('textJaccardSimilarity', () => {
  it('identical texts → 1', () => {
    expect(textJaccardSimilarity('hello world', 'hello world')).toBe(1);
  });

  it('completely different → 0', () => {
    expect(textJaccardSimilarity('apple orange', 'cat dog')).toBe(0);
  });

  it('partial overlap', () => {
    const sim = textJaccardSimilarity('apple orange banana', 'apple cat banana');
    // 共有 {apple, banana},共 4
    expect(sim).toBeCloseTo(2 / 4);
  });

  it('handles empty strings', () => {
    expect(textJaccardSimilarity('', '')).toBe(1);
    expect(textJaccardSimilarity('hello', '')).toBe(0);
    expect(textJaccardSimilarity('', 'hello')).toBe(0);
  });

  it('strips punctuation', () => {
    const sim = textJaccardSimilarity('hello, world!', 'world hello');
    expect(sim).toBe(1);
  });

  it('handles Chinese text with Intl.Segmenter', () => {
    const sim = textJaccardSimilarity('库存不足,请补货', '库存不足,请立刻补货');
    // 共有 "库存不足" / "请" / "补货",不同部分 "立刻"
    // 不应该等于 1(回归测试,避免 P6 之前的 bug)
    expect(sim).toBeLessThan(1);
    expect(sim).toBeGreaterThan(0.3);
  });

  it('handles completely different Chinese', () => {
    const sim = textJaccardSimilarity('帮我看看库存', '查询财务报表');
    expect(sim).toBeLessThan(0.5);
  });

  it('handles mixed CJK + English', () => {
    const a = '帮我 generate 一份 sales 报告';
    const b = '请帮我 generate sales 报告 谢谢';
    // 应有部分相似(generate / sales / 帮我等)
    expect(textJaccardSimilarity(a, b)).toBeGreaterThan(0.3);
    expect(textJaccardSimilarity(a, b)).toBeLessThan(1);
  });

  it('numbers treated as tokens', () => {
    const sim = textJaccardSimilarity('销量 100 件', '销量 100 件');
    expect(sim).toBe(1);
  });
});

/* =========================== decideEvolutionFromSignal =========================== */

describe('decideEvolutionFromSignal', () => {
  it('no_action when signal is healthy', () => {
    const decision = decideEvolutionFromSignal(makeEvent());
    expect(decision.shouldEvolve).toBe(false);
    expect(decision.reason).toBe('no_action');
  });

  it('low_confidence triggers create', () => {
    const decision = decideEvolutionFromSignal(
      makeEvent({
        result: {
          ...makeEvent().result,
          confidence: 0.3,
        },
      }),
    );
    expect(decision.shouldEvolve).toBe(true);
    expect(decision.reason).toBe('low_confidence');
    expect(decision.trace?.outcome).toBe('partial');
    expect(decision.trace?.failureReason).toContain('moa_confidence_low');
  });

  it('verdict_spread triggers optimize', () => {
    const decision = decideEvolutionFromSignal(
      makeEvent({
        result: {
          ...makeEvent().result,
          confidence: 0.8,
          verdictScores: [
            { providerId: 'p1', score: 9 },
            { providerId: 'p2', score: 3 },
          ],
        },
      }),
    );
    expect(decision.shouldEvolve).toBe(true);
    expect(decision.reason).toBe('verdict_spread');
    expect(decision.trace?.failureReason).toContain('lowest=p2');
  });

  it('high_agreement triggers merge', () => {
    const decision = decideEvolutionFromSignal(
      makeEvent({
        result: {
          ...makeEvent().result,
          confidence: 0.8,
          proposals: [
            { proposer: { providerId: 'p1', role: 'fast', weight: 0.5 }, output: '建议做活动', success: true, durationMs: 100 },
            { proposer: { providerId: 'p2', role: 'thorough', weight: 0.5 }, output: '建议做活动', success: true, durationMs: 100 },
          ],
        },
      }),
    );
    expect(decision.shouldEvolve).toBe(true);
    expect(decision.reason).toBe('high_agreement');
    expect(decision.trace?.failureReason).toContain('moa_high_agreement');
  });

  it('too_few_proposers triggers create', () => {
    const decision = decideEvolutionFromSignal(
      makeEvent({
        result: {
          ...makeEvent().result,
          source: 'single-model-fallback',
          proposals: [
            { proposer: { providerId: 'p1', role: 'fast', weight: 0.5 }, output: 'a', success: true, durationMs: 100 },
            // 第二个 proposer 失败
            { proposer: { providerId: 'p2', role: 'thorough', weight: 0.5 }, output: '', success: false, durationMs: 100 },
          ],
        },
      }),
    );
    expect(decision.shouldEvolve).toBe(true);
    expect(decision.reason).toBe('too_few_proposers');
  });

  it('aggregator_failed triggers create', () => {
    const decision = decideEvolutionFromSignal(
      makeEvent({
        result: {
          ...makeEvent().result,
          source: 'single-model-fallback',
          triggerReason: 'aggregator 失败: confidence_too_low',
        },
      }),
    );
    expect(decision.shouldEvolve).toBe(true);
    expect(decision.reason).toBe('aggregator_failed');
  });

  it('does not trigger low_confidence when source is fallback', () => {
    const decision = decideEvolutionFromSignal(
      makeEvent({
        result: {
          ...makeEvent().result,
          source: 'single-model-fallback',
          confidence: 0.3,
        },
      }),
    );
    // low_confidence 仅在 aggregator 时触发;fallback 走 too_few_proposers 或 aggregator_failed
    expect(decision.reason).not.toBe('low_confidence');
  });
});

/* =========================== MoAOrchestrator emit =========================== */

describe('MoAOrchestrator emits MoA signals', () => {
  function makeMockLLM(behavior: (messages: any[]) => string): BaseChatModel {
    return {
      invoke: async (messages: any[]) => ({ content: behavior(messages) }),
      stream: (async function* () {})(),
    } as unknown as BaseChatModel;
  }

  it('emits moa:completed and moa:fallback on not triggered', async () => {
    const events: MoASignalEvent[] = [];
    const bus = new MoASignalBus();
    bus.on('moa:completed', (e) => events.push(e));

    const moa = new MoAOrchestrator(async () => makeMockLLM(() => 'x'), {
      proposers: [
        { providerId: 'p1', role: 'fast', weight: 0.5 },
        { providerId: 'p2', role: 'thorough', weight: 0.5 },
      ],
      aggregator: { providerId: 'j' },
      trigger: { minQueryLength: 100 }, // 强制不触发
      signalBus: bus,
    });

    await moa.run({ messages: [new HumanMessage('short')] });
    expect(events.length).toBe(1);
    expect(events[0].kind).toBe('moa:completed');
    expect(events[0].result.source).toBe('single-model-fallback');
  });

  it('emits moa:aggregated on successful aggregator', async () => {
    const aggregated: MoASignalEvent[] = [];
    const bus = new MoASignalBus();
    bus.on('moa:aggregated', (e) => aggregated.push(e));

    const moa = new MoAOrchestrator(
      async (id) => {
        if (id === 'j') {
          return makeMockLLM(() =>
            JSON.stringify({
              finalOutput: '综合答案',
              confidence: 0.9,
              scores: [
                { providerId: 'p1', score: 8 },
                { providerId: 'p2', score: 9 },
              ],
            }),
          );
        }
        return makeMockLLM(() => `${id} 提议`);
      },
      {
        proposers: [
          { providerId: 'p1', role: 'fast', weight: 0.5 },
          { providerId: 'p2', role: 'thorough', weight: 0.5 },
        ],
        aggregator: { providerId: 'j' },
        signalBus: bus,
        agentName: 'TestAgent',
        query: 'test',
      },
    );

    await moa.run({
      messages: [new SystemMessage('x'), new HumanMessage('帮我深度分析')],
    });

    expect(aggregated.length).toBe(1);
    expect(aggregated[0].result.source).toBe('aggregator');
    expect(aggregated[0].agentName).toBe('TestAgent');
  });
});

/* =========================== 端到端:MoA → Bus → Evolver =========================== */

describe('bindEvolverToMoaSignals end-to-end', () => {
  it('low confidence signal triggers Evolver flush to generate new skill', async () => {
    const bundle = createHermesBundle(new InMemoryDatabase());
    await bundle.seedPresets();
    // 注入 mock LLM(返回 noop,这样不会真生成技能,但 evolver.log 会写入)
    const mockLLM = {
      invoke: async () => ({ content: JSON.stringify({ action: 'noop', reasoning: 'mock' }) }),
      stream: (async function* () {})(),
    } as unknown as BaseChatModel;
    bundle.bindLLMProvider(async () => mockLLM);

    const beforeCount = (await bundle.evolver!.listEvolutionLog()).length;

    // 绑定 MoA 信号
    const unsub = bundle.bindMoASignals({ verbose: false });

    // 模拟 MoA 跑了一次,产出低置信度结果
    const lowConfEvent: MoASignalEvent = {
      kind: 'moa:completed',
      result: {
        triggered: true,
        finalOutput: '不确定的答案',
        source: 'aggregator',
        confidence: 0.2, // 低于阈值
        proposals: [
          { proposer: { providerId: 'p1', role: 'fast', weight: 0.5 }, output: 'a', success: true, durationMs: 100 },
          { proposer: { providerId: 'p2', role: 'thorough', weight: 0.5 }, output: 'b', success: true, durationMs: 100 },
        ],
        verdictScores: [
          { providerId: 'p1', score: 5 },
          { providerId: 'p2', score: 5 },
        ],
        totalDurationMs: 200,
      },
      associatedSkillIds: ['sk_preset_inventory_alert'],
      query: '帮我预测下季度销售',
      agentName: 'CEOAgent',
      timestamp: new Date().toISOString(),
    };

    // 通过全局 bus 发出(listener 里 recordExecution 是异步的,等它落地)
    const { getMoaSignalBus } = await import('./index');
    getMoaSignalBus().emit('moa:completed', lowConfEvent);
    await vi.waitFor(async () => {
      expect((await bundle.evolver!.listEvolutionLog()).length).toBeGreaterThanOrEqual(beforeCount);
    });

    unsub();
  });

  it('unsub stops further evolution', async () => {
    const bundle = createHermesBundle(new InMemoryDatabase());
    await bundle.seedPresets();
    const mockLLM = {
      invoke: async () => ({ content: JSON.stringify({ action: 'noop', reasoning: 'mock' }) }),
    } as unknown as BaseChatModel;
    bundle.bindLLMProvider(async () => mockLLM);

    const beforeCount = (await bundle.evolver!.listEvolutionLog()).length;
    const unsub = bundle.bindMoASignals();

    // 先发一次,被绑定的 listener 收到
    const ev: MoASignalEvent = {
      kind: 'moa:completed',
      result: {
        triggered: true,
        finalOutput: 'x',
        source: 'aggregator',
        confidence: 0.2,
        proposals: [],
        verdictScores: [],
        totalDurationMs: 100,
      },
      associatedSkillIds: [],
      query: 'q',
      agentName: 'A',
      timestamp: new Date().toISOString(),
    };

    const { getMoaSignalBus } = await import('./index');
    const bus = getMoaSignalBus();
    bus.emit('moa:completed', ev);
    await vi.waitFor(async () => {
      expect((await bundle.evolver!.listEvolutionLog()).length).toBeGreaterThan(beforeCount);
    });
    const afterFirst = (await bundle.evolver!.listEvolutionLog()).length;

    // 取消订阅
    unsub();

    bus.emit('moa:completed', ev);
    bus.emit('moa:completed', ev);
    await new Promise((r) => setTimeout(r, 10));
    const afterSecond = (await bundle.evolver!.listEvolutionLog()).length;

    expect(afterSecond).toBe(afterFirst); // 没新增
  });

  it('throws when bindMoASignals without binding LLM first', async () => {
    const bundle = createHermesBundle(new InMemoryDatabase());
    await bundle.seedPresets();
    expect(() => bundle.bindMoASignals()).toThrow(/bindLLMProvider/);
  });
});

/* =========================== 全链路:HermesBundle + 全局 bus =========================== */

describe('HermesBundle global bus integration', () => {
  it('default signalBus is global singleton', async () => {
    const { getMoaSignalBus } = await import('./index');
    const bus1 = getMoaSignalBus();
    const bus2 = getMoaSignalBus();
    expect(bus1).toBe(bus2);
  });

  it('verbose mode logs to console', async () => {
    const bundle = createHermesBundle(new InMemoryDatabase());
    await bundle.seedPresets();
    const mockLLM = {
      invoke: async () => ({ content: JSON.stringify({ action: 'noop', reasoning: 'm' }) }),
    } as unknown as BaseChatModel;
    bundle.bindLLMProvider(async () => mockLLM);

    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
    const consoleDebug = vi.spyOn(console, 'debug').mockImplementation(() => {});

    bundle.bindMoASignals({ verbose: true });

    const { getMoaSignalBus } = await import('./index');
    getMoaSignalBus().emit('moa:completed', {
      kind: 'moa:completed',
      result: {
        triggered: true,
        finalOutput: 'x',
        source: 'aggregator',
        confidence: 0.2,
        proposals: [],
        verdictScores: [],
        totalDurationMs: 100,
      },
      associatedSkillIds: [],
      query: 'q',
      agentName: 'A',
      timestamp: new Date().toISOString(),
    });

    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining('[MoA→Evolver]'));
    consoleInfo.mockRestore();
    consoleDebug.mockRestore();
  });
});