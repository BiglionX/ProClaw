/**
 * Hermes Skills P0-B 单测
 *
 * 不依赖真实 LLM — 用 MockLLMProvider 替代,返回预设的 JSON。
 * 覆盖:
 *  - 反馈信号评估(成功 / 部分 / 失败 / 异常时长)
 *  - 反思提示词构造(3 种 action + 粗筛 gate)
 *  - 进化器闭环:create / optimize / merge / noop / dedup
 *  - Evolution Log 写入
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createHermesBundle,
  InMemoryDatabase,
  evaluateOutcome,
  gateEvolution,
  buildCreatePrompt,
  buildOptimizePrompt,
  buildMergePrompt,
} from './index';
import type {
  ExecutionTrace,
  Skill,
  ToolCallRecord,
  FeedbackSignals,
} from './types';
import type { HermesBundle } from './index';

/* =========================== Mock LLM =========================== */

interface MockResponse {
  match: (system: string, user: string) => string;
}

class MockLLM {
  private responses: MockResponse[] = [];
  private calls: Array<{ system: string; user: string }> = [];

  /** 注册一个按 system prompt 关键字匹配的响应 */
  onSystemContains(keyword: string, response: string): void {
    this.responses.push({
      match: (sys) => (sys.includes(keyword) ? response : ''),
      user: () => '',
    });
  }

  /** 注册一个按 user JSON 中某字段匹配的响应 */
  onUserField(fieldPath: string, response: string): void {
    this.responses.push({
      match: (_sys, user) => {
        try {
          const obj = JSON.parse(user);
          const keys = fieldPath.split('.');
          let cur: any = obj;
          for (const k of keys) cur = cur?.[k];
          return cur ? response : '';
        } catch {
          return '';
        }
      },
      user: () => '',
    });
  }

  setDefault(response: string): void {
    this.responses.push({ match: () => response, user: () => '' });
  }

  async invoke(messages: Array<{ role: string; content: string }>) {
    const sys = messages.find((m) => m.role === 'system')?.content ?? '';
    const usr = messages.find((m) => m.role === 'user')?.content ?? '';
    this.calls.push({ system: sys, user: usr });
    for (const r of this.responses) {
      const out = r.match(sys, usr);
      if (out) return { content: out };
    }
    // 默认 noop
    return { content: JSON.stringify({ action: 'noop', reasoning: 'mock default' }) };
  }

  getCallCount(): number {
    return this.calls.length;
  }
}

/* =========================== 测试辅助 =========================== */

function makeTrace(overrides: Partial<ExecutionTrace> = {}): ExecutionTrace {
  return {
    agentName: 'TestAgent',
    query: '查询库存不足的商品',
    toolCalls: [
      {
        toolName: 'inventory_query_low_stock',
        input: { threshold: 10 },
        output: JSON.stringify({ success: true, items: [{ id: 'p1', stock: 3 }] }),
        durationMs: 200,
        timestamp: new Date().toISOString(),
      },
    ],
    outcome: 'success',
    finalOutput: '当前有 1 个商品库存不足',
    skillIdsUsed: ['sk_preset_inventory_alert'],
    durationMs: 800,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeFailingTrace(reason = '数据库锁超时'): ExecutionTrace {
  return makeTrace({
    query: '帮我把美业门店的预约改到明天下午',
    outcome: 'failure',
    finalOutput: '',
    failureReason: reason,
    toolCalls: [
      {
        toolName: 'booking_update',
        input: { bookingId: 'b_1', newDatetime: '2026-07-08T14:00:00' },
        output: '',
        error: reason,
        durationMs: 60000,
        timestamp: new Date().toISOString(),
      },
    ],
    skillIdsUsed: ['sk_preset_beauty_reschedule'],
    durationMs: 60000,
  });
}

describe('feedbackSignals.evaluateOutcome', () => {
  it('treats clean success as success with high confidence', () => {
    const signals = evaluateOutcome(makeTrace());
    expect(signals.outcome).toBe('success');
    expect(signals.allToolsSucceeded).toBe(true);
    expect(signals.llmOutputLooksConfident).toBe(true);
    expect(signals.durationPlausible).toBe(true);
    expect(signals.confidence).toBeGreaterThan(0.8);
  });

  it('treats tool failure as failure', () => {
    const signals = evaluateOutcome(makeFailingTrace('connection refused'));
    expect(signals.outcome).toBe('failure');
    expect(signals.anyToolFailed).toBe(true);
    expect(signals.confidence).toBeGreaterThan(0.5);
    expect(signals.failureReason).toBeDefined();
  });

  it('flags LLM 抱歉 as low confidence', () => {
    const signals = evaluateOutcome(
      makeTrace({ finalOutput: '抱歉,我无法访问你的数据库' }),
    );
    expect(signals.llmOutputLooksConfident).toBe(false);
    expect(signals.outcome).toBe('partial');
  });

  it('flags timeout duration as not plausible', () => {
    const signals = evaluateOutcome(makeTrace({ durationMs: 120000 }));
    expect(signals.durationPlausible).toBe(false);
    expect(signals.outcome).toBe('partial');
  });

  it('flags too-fast duration as suspicious', () => {
    const signals = evaluateOutcome(makeTrace({ durationMs: 50 }));
    expect(signals.durationPlausible).toBe(false);
  });

  it('detects success:false JSON in tool output', () => {
    const signals = evaluateOutcome(
      makeTrace({
        toolCalls: [
          {
            toolName: 'foo',
            input: {},
            output: '{"success": false, "error": "boom"}',
            durationMs: 100,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    );
    expect(signals.allToolsSucceeded).toBe(false);
    expect(signals.outcome).toBe('failure');
  });
});

describe('reflectionPrompt.gateEvolution', () => {
  it('suggests create on failure with high confidence', () => {
    const trace = makeFailingTrace();
    const signals: Partial<FeedbackSignals> = { outcome: 'failure', confidence: 0.9 };
    const gate = gateEvolution(trace, signals as FeedbackSignals, []);
    expect(gate.shouldEvolve).toBe(true);
    expect(gate.suggested).toBe('create');
  });

  it('skips on success with low failure stats', () => {
    const trace = makeTrace();
    const signals: Partial<FeedbackSignals> = { outcome: 'success', confidence: 0.95 };
    const gate = gateEvolution(trace, signals as FeedbackSignals, [
      { skillId: 'sk_preset_inventory_alert', usageCount: 10, successCount: 10, failureCount: 0 },
    ]);
    expect(gate.shouldEvolve).toBe(false);
  });

  it('suggests optimize when failure rate > 30%', () => {
    const trace = makeTrace();
    const signals: Partial<FeedbackSignals> = { outcome: 'success', confidence: 0.6 };
    const gate = gateEvolution(trace, signals as FeedbackSignals, [
      { skillId: 'sk_x', usageCount: 10, successCount: 4, failureCount: 6 },
    ]);
    expect(gate.shouldEvolve).toBe(true);
    expect(gate.suggested).toBe('optimize');
  });

  it('skips optimize when usage is too low', () => {
    const trace = makeTrace();
    const signals: Partial<FeedbackSignals> = { outcome: 'success', confidence: 0.5 };
    const gate = gateEvolution(trace, signals as FeedbackSignals, [
      { skillId: 'sk_x', usageCount: 2, successCount: 1, failureCount: 1 },
    ]);
    expect(gate.shouldEvolve).toBe(false);
  });
});

describe('reflectionPrompt builders', () => {
  it('buildCreatePrompt contains available tools and existing skills', () => {
    const trace = makeFailingTrace();
    const { system, user } = buildCreatePrompt(
      trace,
      ['booking_update', 'booking_query'],
      [],
    );
    expect(system).toContain('Hermes');
    expect(user).toContain('booking_update');
    expect(user).toContain('availableTools');
  });

  it('buildOptimizePrompt includes current skill and failure reason', () => {
    const target: Skill = {
      id: 'sk_x',
      name: 'X',
      description: 'd',
      triggerPhrases: ['a'],
      toolTemplates: [],
      systemPromptAddition: '',
      source: 'preset',
      status: 'active',
      version: 1,
      usageCount: 10,
      successCount: 4,
      failureCount: 6,
      createdAt: '',
      updatedAt: '',
      tags: [],
    };
    const { system, user } = buildOptimizePrompt(target, [makeFailingTrace()]);
    expect(user).toContain('sk_x');
    expect(user).toContain('successRate');
  });

  it('buildMergePrompt serializes candidates', () => {
    const a: Skill = {
      id: 'sk_a',
      name: 'A',
      description: '',
      triggerPhrases: [],
      toolTemplates: [],
      systemPromptAddition: '',
      source: 'preset',
      status: 'active',
      version: 1,
      usageCount: 0,
      successCount: 0,
      failureCount: 0,
      createdAt: '',
      updatedAt: '',
      tags: [],
    };
    const b: Skill = { ...a, id: 'sk_b', name: 'B' };
    const { user } = buildMergePrompt([a, b], [makeTrace()]);
    expect(user).toContain('sk_a');
    expect(user).toContain('sk_b');
  });
});

describe('SkillEvolver end-to-end (with MockLLM)', () => {
  let bundle: HermesBundle;
  let mock: MockLLM;

  beforeEach(async () => {
    // 端到端闭环必须落在真实可读写的执行器上 —— 早期用空 stub 导致
    // seedPresets/recordUsage/upsert 全部不生效,断言必然失败。
    bundle = createHermesBundle(new InMemoryDatabase());
    await bundle.seedPresets();
    mock = new MockLLM();
    bundle.bindLLMProvider(async () => mock as any);
  });

  it('create flow: failing trace generates a new pending_review skill', async () => {
    mock.onSystemContains('新建', JSON.stringify({
      action: 'create',
      skill: {
        name: '门店预约改期',
        description: '把客户的预约改到新时段',
        triggerPhrases: ['改预约', '改时间'],
        toolTemplates: [
          {
            toolName: 'booking_update',
            inputSchema: { type: 'object' },
            exampleInvocation: '{"bookingId":"b_1"}',
            whenToUse: '用户确认后改期',
            order: 1,
          },
        ],
        systemPromptAddition: '三步确认',
        tags: ['booking'],
      },
      reasoning: '原技能未覆盖该场景',
    }));

    const beforeCount = await bundle.store.count();
    await bundle.evolver!.recordExecution(makeFailingTrace('数据库锁'));
    await bundle.evolver!.flush();
    const afterCount = await bundle.store.count();

    expect(afterCount).toBe(beforeCount + 1);

    const newSkills = await bundle.store.list({ status: 'pending_review' });
    expect(newSkills.length).toBeGreaterThanOrEqual(1);
    expect(newSkills[0].source).toBe('learned');

    const logs = await bundle.evolver!.listEvolutionLog();
    expect(logs.some((l) => l.action === 'create')).toBe(true);
  });

  it('noop from LLM does not create new skill', async () => {
    mock.onSystemContains('新建', JSON.stringify({ action: 'noop', reasoning: '不需要' }));

    const before = await bundle.store.count();
    await bundle.evolver!.recordExecution(makeFailingTrace('超时'));
    await bundle.evolver!.flush();
    expect(await bundle.store.count()).toBe(before);

    const logs = await bundle.evolver!.listEvolutionLog();
    expect(logs.some((l) => l.action === 'noop')).toBe(true);
  });

  it('deduplicates identical traces within 24h', async () => {
    mock.onSystemContains('新建', JSON.stringify({ action: 'noop', reasoning: 'dedup' }));

    await bundle.evolver!.recordExecution(makeFailingTrace('超时'));
    await bundle.evolver!.flush();
    const callsAfter1 = mock.getCallCount();

    await bundle.evolver!.recordExecution(makeFailingTrace('超时'));
    await bundle.evolver!.flush();
    const callsAfter2 = mock.getCallCount();

    // 第二次不应触发 LLM 调用(被去重)
    expect(callsAfter2).toBe(callsAfter1);
  });

  it('optimize flow upgrades version and links parent', async () => {
    // 1. 先制造一个技能,使用计数拉到 10,失败率 60%。
    //    计数只能通过 recordUsage 累积(upsert 不写计数列,与生产语义一致)
    const sk = (await bundle.store.getById('sk_preset_inventory_alert'))!;
    for (let i = 0; i < 10; i++) {
      await bundle.store.recordUsage(sk.id, i < 4); // 4 成功,6 失败
    }
    expect((await bundle.store.getById(sk.id))!.usageCount).toBe(10);
    expect((await bundle.store.getById(sk.id))!.failureCount).toBe(6);

    mock.onSystemContains('优化', JSON.stringify({
      action: 'optimize',
      targetSkillId: sk.id,
      skill: {
        name: sk.name,
        description: '更精确的描述',
        triggerPhrases: ['库存不足', '低库存', '补货'],
        toolTemplates: sk.toolTemplates, // 保留同名 Tool
        systemPromptAddition: '优化后的补充',
        tags: sk.tags,
      },
      reasoning: '失败率过高',
    }));

    await bundle.evolver!.recordExecution({
      ...makeTrace({ skillIdsUsed: [sk.id] }),
      outcome: 'success',
    });
    await bundle.evolver!.flush();

    const after = (await bundle.store.getById(sk.id))!;
    expect(after.version).toBe(sk.version + 1);
    expect(after.parentVersion).toBe(sk.version);
    expect(after.source).toBe('optimized');
    expect(after.status).toBe('pending_review');
  });

  it('evolution log persists across reads', async () => {
    mock.onSystemContains('新建', JSON.stringify({ action: 'noop', reasoning: 'log test' }));
    await bundle.evolver!.recordExecution(makeFailingTrace());
    await bundle.evolver!.flush();
    const logs = await bundle.evolver!.listEvolutionLog();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]).toHaveProperty('timestamp');
    expect(logs[0]).toHaveProperty('reasoning');
  });

  it('successful trace with no failing skills just records usage, no evolve', async () => {
    const before = await bundle.store.count();
    const sk = (await bundle.store.getById('sk_preset_inventory_alert'))!;
    const beforeUsage = sk.usageCount;

    await bundle.evolver!.recordExecution(makeTrace());
    await bundle.evolver!.flush();

    expect(await bundle.store.count()).toBe(before);
    expect(mock.getCallCount()).toBe(0); // 没触发 LLM

    const afterSk = (await bundle.store.getById(sk.id))!;
    expect(afterSk.usageCount).toBe(beforeUsage + 1);
  });

  it('no-op when evolver is null (evolveSkill not bound)', async () => {
    const bare = createHermesBundle(new InMemoryDatabase());
    await bare.seedPresets();
    expect(bare.evolver).toBeNull();
    // 不应抛错
    await bare.store.upsert((await bare.store.getById('sk_preset_inventory_alert'))!);
  });
});