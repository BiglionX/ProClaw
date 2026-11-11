/**
 * Hermes Skills P1 单测 — SelfHealingExecutor + MoAOrchestrator
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  SelfHealingExecutor,
  DefaultErrorClassifier,
  SchemaRepairLoop,
  SchemaRepairFailedError,
  MoAOrchestrator,
} from './index';
import type { MoAConfig } from './index';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type {
  MoAProposal,
  MoAResult,
  ModelResolver,
} from './healingTypes';

/* =========================== Mock LLM =========================== */

interface MockState {
  /** 每次调用 invoke 的行为(按调用顺序) */
  responses: Array<{ ok: boolean; content?: string; error?: Error }>;
  /** 调用计数器 */
  callCount: number;
}

function makeMockLLM(state: MockState, providerId: string): BaseChatModel {
  const llm = {
    async invoke(_messages: unknown) {
      const r = state.responses[state.callCount] ?? state.responses[state.responses.length - 1];
      state.callCount += 1;
      if (!r) throw new Error(`[${providerId}] no mock response registered`);
      if (!r.ok) throw r.error ?? new Error('mock error');
      return { content: r.content ?? '' };
    },
    async *stream(_messages: unknown) {
      const r = state.responses[state.callCount] ?? state.responses[state.responses.length - 1];
      state.callCount += 1;
      if (!r.ok) throw r.error ?? new Error('mock error');
      yield { content: r.content ?? '' };
    },
  };
  return llm as unknown as BaseChatModel;
}

/* =========================== SelfHealingExecutor =========================== */

describe('DefaultErrorClassifier', () => {
  const classifier = new DefaultErrorClassifier();

  it('classifies 429 as rate_limit (retryable)', () => {
    const c = classifier.classify({ status: 429, message: 'Too many requests' });
    expect(c.category).toBe('rate_limit');
    expect(c.retryable).toBe(true);
  });

  it('classifies 500 as 5xx (retryable)', () => {
    const c = classifier.classify({ status: 503, message: 'Service Unavailable' });
    expect(c.category).toBe('5xx');
    expect(c.retryable).toBe(true);
  });

  it('classifies 401 as auth (not retryable)', () => {
    const c = classifier.classify({ status: 401, message: 'Unauthorized' });
    expect(c.category).toBe('auth');
    expect(c.retryable).toBe(false);
  });

  it('classifies timeout by message', () => {
    const c = classifier.classify(new Error('Request timeout after 30s'));
    expect(c.category).toBe('timeout');
    expect(c.retryable).toBe(true);
  });

  it('classifies network errors', () => {
    const c = classifier.classify(new Error('ECONNREFUSED'));
    expect(c.category).toBe('network');
    expect(c.retryable).toBe(true);
  });

  it('classifies context overflow as not retryable', () => {
    const c = classifier.classify(new Error('context_length_exceeded: too long'));
    expect(c.category).toBe('context_overflow');
    expect(c.retryable).toBe(false);
  });

  it('classifies unknown as unknown', () => {
    const c = classifier.classify(new Error('weird thing'));
    expect(c.category).toBe('unknown');
    expect(c.retryable).toBe(false);
  });
});

describe('SelfHealingExecutor', () => {
  it('succeeds on first try without retry', async () => {
    const state: MockState = {
      responses: [{ ok: true, content: 'hello' }],
      callCount: 0,
    };
    const llm = makeMockLLM(state, 'primary');
    const executor = new SelfHealingExecutor(async () => llm, {
      retry: { maxAttempts: 2 },
      fallback: { chain: [], failuresBeforeFallback: 1 },
      perCallTimeoutMs: 5_000,
    });

    const result = await executor.invoke({
      messages: [new HumanMessage('hi')],
    });
    expect(result.success).toBe(true);
    expect(result.attempts.length).toBe(1);
    expect(result.fellBack).toBe(false);
    expect((result.output as { content: string }).content).toBe('hello');
  });

  it('retries on retryable error and succeeds on second attempt', async () => {
    const state: MockState = {
      responses: [
        { ok: false, error: Object.assign(new Error('rate limit'), { status: 429 }) },
        { ok: true, content: 'recovered' },
      ],
      callCount: 0,
    };
    const llm = makeMockLLM(state, 'primary');
    const executor = new SelfHealingExecutor(async () => llm, {
      retry: { maxAttempts: 2, initialBackoffMs: 10, backoffMultiplier: 1, maxBackoffMs: 100 },
      fallback: { chain: [], failuresBeforeFallback: 1 },
    });

    const result = await executor.invoke({ messages: [new HumanMessage('hi')] });
    expect(result.success).toBe(true);
    expect(result.attempts.length).toBe(2);
    expect(result.attempts[0].success).toBe(false);
    expect(result.attempts[1].success).toBe(true);
    expect((result.output as { content: string }).content).toBe('recovered');
  });

  it('falls back to next provider after retries exhausted', async () => {
    const primaryState: MockState = {
      responses: [
        { ok: false, error: Object.assign(new Error('5xx'), { status: 500 }) },
        { ok: false, error: Object.assign(new Error('5xx'), { status: 500 }) },
        { ok: false, error: Object.assign(new Error('5xx'), { status: 500 }) },
      ],
      callCount: 0,
    };
    const fallbackState: MockState = {
      responses: [{ ok: true, content: 'from fallback' }],
      callCount: 0,
    };
    const primaryLLM = makeMockLLM(primaryState, 'primary');
    const fallbackLLM = makeMockLLM(fallbackState, 'fallback');

    const resolver: ModelResolver = async (id) => (id === 'fallback' ? fallbackLLM : primaryLLM);
    const executor = new SelfHealingExecutor(resolver, {
      retry: { maxAttempts: 1, initialBackoffMs: 5 },
      fallback: { chain: ['fallback'], failuresBeforeFallback: 1 },
    });

    const result = await executor.invoke(
      { messages: [new HumanMessage('hi')] },
      // primaryProviderId 是 invoke 的第 2 个 options 参数,不是 request 字段
      { primaryProviderId: 'primary' },
    );
    expect(result.success).toBe(true);
    expect(result.fellBack).toBe(true);
    expect(result.providerId).toBe('fallback');
  });

  it('returns failure when all providers fail', async () => {
    const state: MockState = {
      responses: [
        { ok: false, error: Object.assign(new Error('5xx'), { status: 500 }) },
        { ok: false, error: Object.assign(new Error('5xx'), { status: 500 }) },
      ],
      callCount: 0,
    };
    const llm = makeMockLLM(state, 'primary');
    const executor = new SelfHealingExecutor(async () => llm, {
      retry: { maxAttempts: 1 },
      fallback: { chain: [], failuresBeforeFallback: 1 },
    });

    const result = await executor.invoke({ messages: [new HumanMessage('hi')] });
    expect(result.success).toBe(false);
    expect(result.attempts.length).toBeGreaterThanOrEqual(1);
  });

  it('does not retry on non-retryable (4xx) errors', async () => {
    const state: MockState = {
      responses: [{ ok: false, error: Object.assign(new Error('Bad Request'), { status: 400 }) }],
      callCount: 0,
    };
    const llm = makeMockLLM(state, 'primary');
    const executor = new SelfHealingExecutor(async () => llm, {
      retry: { maxAttempts: 3 },
    });

    const result = await executor.invoke({ messages: [new HumanMessage('hi')] });
    expect(result.success).toBe(false);
    expect(result.attempts.length).toBe(1);
  });

  it('respects perCallTimeoutMs', async () => {
    const slowLLM = {
      invoke: () => new Promise((r) => setTimeout(() => r({ content: 'too late' }), 200)),
    } as unknown as BaseChatModel;

    const executor = new SelfHealingExecutor(async () => slowLLM, {
      retry: { maxAttempts: 0 },
      perCallTimeoutMs: 50,
    });

    const result = await executor.invoke({ messages: [new HumanMessage('hi')] });
    expect(result.success).toBe(false);
    expect(result.attempts[0].error?.category).toBe('timeout');
  });
});

/* =========================== SchemaRepairLoop =========================== */

describe('SchemaRepairLoop', () => {
  it('returns parsed data on first attempt', async () => {
    const schema = z.object({ name: z.string() });
    const state: MockState = {
      responses: [{ ok: true, content: '{"name":"alice"}' }],
      callCount: 0,
    };
    const loop = new SchemaRepairLoop(async () => makeMockLLM(state, 'p'), 2);

    const { data, attempts, repaired } = await loop.invokeWithSchema(
      { messages: [new HumanMessage('give me a name')] },
      schema,
    );
    expect(data.name).toBe('alice');
    expect(attempts).toBe(1);
    expect(repaired).toBe(false);
  });

  it('repairs invalid JSON on second attempt', async () => {
    const schema = z.object({ age: z.number() });
    const state: MockState = {
      responses: [
        { ok: true, content: 'not json' }, // 第 1 次失败
        { ok: true, content: '{"age": 30}' }, // 第 2 次成功
      ],
      callCount: 0,
    };
    const loop = new SchemaRepairLoop(async () => makeMockLLM(state, 'p'), 2);

    const { data, attempts, repaired } = await loop.invokeWithSchema(
      { messages: [new HumanMessage('give me age')] },
      schema,
    );
    expect(data.age).toBe(30);
    expect(attempts).toBe(2);
    expect(repaired).toBe(true);
  });

  it('throws SchemaRepairFailedError after max attempts', async () => {
    const schema = z.object({ x: z.number() });
    const state: MockState = {
      responses: [
        { ok: true, content: 'bad' },
        { ok: true, content: 'still bad' },
      ],
      callCount: 0,
    };
    const loop = new SchemaRepairLoop(async () => makeMockLLM(state, 'p'), 1);

    await expect(
      loop.invokeWithSchema({ messages: [new HumanMessage('x')] }, schema),
    ).rejects.toBeInstanceOf(SchemaRepairFailedError);
  });
});

/* =========================== MoAOrchestrator =========================== */

describe('MoAOrchestrator', () => {
  const makeMoAConfig = (overrides: Partial<MoAConfig> = {}): MoAConfig => ({
    proposers: [
      { providerId: 'fast', role: 'fast', weight: 0.3 },
      { providerId: 'thorough', role: 'thorough', weight: 0.5 },
    ],
    aggregator: { providerId: 'judge' },
    trigger: { minQueryLength: 10 },
    ...overrides,
  });

  it('rejects config with fewer than 2 proposers', () => {
    expect(
      () =>
        new MoAOrchestrator(async () => null as any, {
          proposers: [{ providerId: 'a', role: 'balanced', weight: 1 }],
          aggregator: { providerId: 'j' },
        }),
    ).toThrow();
  });

  it('rejects config without aggregator', () => {
    expect(
      () =>
        new MoAOrchestrator(async () => null as any, {
          proposers: [
            { providerId: 'a', role: 'balanced', weight: 1 },
            { providerId: 'b', role: 'balanced', weight: 1 },
          ],
          aggregator: undefined as any,
        }),
    ).toThrow();
  });

  it('does not trigger when query is too short', () => {
    const moa = new MoAOrchestrator(async () => null as any, makeMoAConfig());
    const result = moa.shouldTrigger('hi', { taskType: 'business_insight' });
    expect(result.triggered).toBe(false);
    expect(result.reason).toContain('长度');
  });

  it('triggers when query meets conditions', () => {
    const moa = new MoAOrchestrator(async () => null as any, makeMoAConfig());
    const result = moa.shouldTrigger('帮我对比两个门店的销售情况', { taskType: 'business_insight' });
    expect(result.triggered).toBe(true);
  });

  it('respects force=true', () => {
    const moa = new MoAOrchestrator(async () => null as any, makeMoAConfig({ force: true }));
    const result = moa.shouldTrigger('hi');
    expect(result.triggered).toBe(true);
  });

  it('respects force=false', () => {
    const moa = new MoAOrchestrator(async () => null as any, makeMoAConfig({ force: false }));
    const result = moa.shouldTrigger('帮我看看销售', { taskType: 'business_insight' });
    expect(result.triggered).toBe(false);
  });

  it('matches taskTypes', () => {
    const moa = new MoAOrchestrator(async () => null as any, {
      ...makeMoAConfig({ trigger: undefined }),
      proposers: [
        { providerId: 'a', role: 'balanced', weight: 1 },
        { providerId: 'b', role: 'balanced', weight: 1 },
      ],
      trigger: { taskTypes: ['business_insight'] },
    });
    expect(moa.shouldTrigger('any', { taskType: 'business_insight' }).triggered).toBe(true);
    expect(moa.shouldTrigger('any', { taskType: 'coding' }).triggered).toBe(false);
  });

  it('runs end-to-end with all proposers succeeding', async () => {
    const aggregatorState: MockState = {
      responses: [
        {
          ok: true,
          content: JSON.stringify({
            finalOutput: '综合后的最终答案',
            confidence: 0.9,
            scores: [
              { providerId: 'fast', score: 7 },
              { providerId: 'thorough', score: 9 },
            ],
            reasoning: 'thorough 更全面',
          }),
        },
      ],
      callCount: 0,
    };
    const resolver: ModelResolver = async (id) => {
      if (id === 'judge') return makeMockLLM(aggregatorState, id);
      // 提议者
      const state: MockState = {
        responses: [{ ok: true, content: `${id} 的答案` }],
        callCount: 0,
      };
      return makeMockLLM(state, id);
    };

    const moa = new MoAOrchestrator(resolver, makeMoAConfig());
    const result = await moa.run({
      messages: [
        new SystemMessage('你是助手'),
        new HumanMessage('帮我对比两个门店的销售情况'),
      ],
      taskType: 'business_insight',
    });

    expect(result.triggered).toBe(true);
    expect(result.source).toBe('aggregator');
    expect(result.finalOutput).toBe('综合后的最终答案');
    expect(result.confidence).toBe(0.9);
    expect(result.proposals.length).toBe(2);
    expect(result.proposals.every((p) => p.success)).toBe(true);
    expect(result.verdictScores?.length).toBe(2);
  });

  it('falls back to single model when all proposers fail', async () => {
    const fallbackState: MockState = {
      responses: [{ ok: true, content: 'fallback 单模型答案' }],
      callCount: 0,
    };
    const resolver: ModelResolver = async (id) => {
      if (id === 'thorough') {
        const failState: MockState = {
          responses: [{ ok: false, error: new Error('5xx') }],
          callCount: 0,
        };
        return makeMockLLM(failState, id);
      }
      if (id === 'judge') return makeMockLLM({ responses: [{ ok: false, error: new Error('5xx') }], callCount: 0 }, id);
      return makeMockLLM(fallbackState, id);
    };

    const moa = new MoAOrchestrator(resolver, makeMoAConfig());
    const result = await moa.run({
      messages: [new HumanMessage('帮我对比两个门店的销售情况')],
      taskType: 'business_insight',
    });

    expect(result.source).toBe('single-model-fallback');
    expect(result.finalOutput).toBe('fallback 单模型答案');
  });

  it('aggregator with low confidence triggers fallback with reason', async () => {
    const aggregatorState: MockState = {
      responses: [
        {
          ok: true,
          content: JSON.stringify({
            finalOutput: '不确定的答案',
            confidence: 0.2, // 低于默认 0.4
            scores: [],
          }),
        },
      ],
      callCount: 0,
    };
    const resolver: ModelResolver = async (id) => {
      if (id === 'judge') return makeMockLLM(aggregatorState, id);
      const state: MockState = {
        responses: [{ ok: true, content: `${id} 提议` }],
        callCount: 0,
      };
      return makeMockLLM(state, id);
    };

    const moa = new MoAOrchestrator(resolver, makeMoAConfig());
    const result = await moa.run({
      messages: [new HumanMessage('帮我对比两个门店的销售情况')],
    });

    expect(result.source).toBe('single-model-fallback');
    // 触发原因包含 confidence_too_low
    expect(result.triggerReason).toContain('confidence_too_low');
  });

  it('aggregator with malformed JSON triggers fallback with verdict_json_missing', async () => {
    const aggregatorState: MockState = {
      responses: [{ ok: true, content: 'definitely not JSON' }],
      callCount: 0,
    };
    const resolver: ModelResolver = async (id) => {
      if (id === 'judge') return makeMockLLM(aggregatorState, id);
      const state: MockState = {
        responses: [{ ok: true, content: `${id} 提议` }],
        callCount: 0,
      };
      return makeMockLLM(state, id);
    };

    const moa = new MoAOrchestrator(resolver, makeMoAConfig());
    const result = await moa.run({
      messages: [new HumanMessage('帮我对比两个门店的销售情况')],
    });

    expect(result.source).toBe('single-model-fallback');
    expect(result.triggerReason).toContain('verdict_json_missing');
  });
});