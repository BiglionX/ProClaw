import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  routeAssistantTurn: vi.fn(),
  submitDecisionProposal: vi.fn(async (proposal: unknown) => proposal),
  getAssistantSystemPrompt: vi.fn(() => 'system'),
  getBossProfile: vi.fn(async () => undefined),
  getLLMForTask: vi.fn(),
  isDemoAccount: vi.fn(() => false),
  getTokenBalance: vi.fn(() => 1000),
  deductTokens: vi.fn(() => 900),
  estimateTokens: vi.fn(() => 8),
}));

vi.mock('./assistantRouter', () => ({
  routeAssistantTurn: mocks.routeAssistantTurn,
}));

vi.mock('./assistantAgent', () => ({
  submitDecisionProposal: mocks.submitDecisionProposal,
  getAssistantSystemPrompt: mocks.getAssistantSystemPrompt,
  getBossProfile: mocks.getBossProfile,
}));

vi.mock('./llmProvider', () => ({
  getLLMForTask: mocks.getLLMForTask,
}));

vi.mock('./aiTeamTokenService', () => ({
  isDemoAccount: mocks.isDemoAccount,
  getTokenBalance: mocks.getTokenBalance,
  deductTokens: mocks.deductTokens,
}));

vi.mock('./aiTools', () => ({
  estimateTokens: mocks.estimateTokens,
}));

import { replyToCeoChat } from './ceoChatReply';

describe('replyToCeoChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isDemoAccount.mockReturnValue(false);
    mocks.getTokenBalance.mockReturnValue(1000);
    mocks.submitDecisionProposal.mockImplementation(async (proposal: unknown) => proposal);
  });

  it('命中快捷命令时直接回复，不调用大模型', async () => {
    mocks.routeAssistantTurn.mockResolvedValue({
      kind: 'message',
      content: '**当前任务**：\n- 整理库存',
    });

    const text = await replyToCeoChat('/task list');

    expect(text).toContain('当前任务');
    expect(text).toContain('整理库存');
    expect(text).not.toContain('**');
    expect(mocks.getLLMForTask).not.toHaveBeenCalled();
  });

  it('决策意图写入日志并给出中文建议', async () => {
    mocks.routeAssistantTurn.mockResolvedValue({
      kind: 'decision',
      proposal: { intentSummary: '上调售价', actionDescription: '建议上调 5%' },
    });

    const text = await replyToCeoChat('把价格提高');

    expect(mocks.submitDecisionProposal).toHaveBeenCalled();
    expect(text).toContain('上调售价');
    expect(text).toContain('建议上调 5%');
    expect(mocks.getLLMForTask).not.toHaveBeenCalled();
  });

  it('普通对话走大模型并带回回复', async () => {
    mocks.routeAssistantTurn.mockResolvedValue(null);
    const invoke = vi.fn().mockResolvedValue({ content: '收到，老板。先看库存再定。' });
    mocks.getLLMForTask.mockResolvedValue({ invoke });

    const text = await replyToCeoChat('今天先看哪块业务', {
      history: [{ role: 'assistant', content: '老板，有啥吩咐？' }],
    });

    expect(text).toBe('收到，老板。先看库存再定。');
    expect(invoke).toHaveBeenCalledOnce();
    const sent = invoke.mock.calls[0][0] as Array<{ content: string }>;
    expect(sent.some((msg) => msg.content === '老板，有啥吩咐？')).toBe(true);
    expect(sent.at(-1)?.content).toBe('今天先看哪块业务');
  });

  it('大模型不可用时仍返回中文说明', async () => {
    mocks.routeAssistantTurn.mockResolvedValue(null);
    mocks.getLLMForTask.mockRejectedValue(new Error('no provider'));

    const text = await replyToCeoChat('随便聊聊');

    expect(text).toContain('大模型');
    expect(text).toContain('任务列表');
  });

  it('演示 Token 用完时不调用大模型', async () => {
    mocks.routeAssistantTurn.mockResolvedValue(null);
    mocks.isDemoAccount.mockReturnValue(true);
    mocks.getTokenBalance.mockReturnValue(0);

    const text = await replyToCeoChat('你好');

    expect(text).toContain('Token');
    expect(mocks.getLLMForTask).not.toHaveBeenCalled();
  });

  it('用户取消时抛出，不写入回复', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(replyToCeoChat('停', { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(mocks.routeAssistantTurn).not.toHaveBeenCalled();
  });
});
