/**
 * assistantAgent（统一助理）单元测试
 * 覆盖：意图路由、决策建议生成、统一提示词、任务分派、快捷命令、决策提交
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockList: vi.fn(),
  mockGetStats: vi.fn(),
  mockAddLog: vi.fn(),
  mockUpdateStatus: vi.fn(),
  mockAddContext: vi.fn(),
  mockGetActiveGoals: vi.fn(),
  mockGetPreferences: vi.fn(),
  mockGetStatsDecision: vi.fn(),
  mockGetBapSummary: vi.fn(),
}));

vi.mock('./ceoController', () => ({
  proclawTasks: {
    dispatch: mocks.mockDispatch,
    list: vi.fn().mockResolvedValue([
      { task_id: 't1', description: '整理库存报告', status: 'completed' },
      { task_id: 't2', description: '优化采购流程', status: 'pending' },
    ]),
    getStats: mocks.mockGetStats,
  },
  proclawAgents: {
    list: mocks.mockList,
  },
  proclawDecision: {
    addLog: mocks.mockAddLog,
    updateStatus: mocks.mockUpdateStatus,
    getStats: mocks.mockGetStatsDecision,
  },
  proclawContext: {
    add: mocks.mockAddContext,
    getActiveGoals: mocks.mockGetActiveGoals,
  },
  proclawLearning: {
    getPreferences: mocks.mockGetPreferences,
  },
}));

vi.mock('./secretaryBap', () => ({
  getBapSummary: mocks.mockGetBapSummary,
}));

vi.mock('./inventoryService', () => ({
  getInventoryStats: vi.fn().mockResolvedValue({
    total_products: 4,
    low_stock_count: 1,
    zero_stock_count: 0,
    today_transactions: 2,
    total_value: 80,
    low_stock_products: [],
  }),
  getInventoryTransactions: vi.fn().mockResolvedValue([]),
  createInventoryTransaction: vi.fn(),
}));

vi.mock('./salesService', () => ({
  summarizeSalesForPeriod: vi.fn().mockResolvedValue({ count: 2, amount: 30 }),
  getSalesOrders: vi.fn().mockResolvedValue([]),
  labelToSalesPeriod: vi.fn(() => 'month'),
}));

const {
  mockDispatch,
  mockList,
  mockGetStats,
  mockAddLog,
  mockUpdateStatus,
  mockAddContext,
  mockGetActiveGoals,
  mockGetPreferences,
  mockGetStatsDecision,
  mockGetBapSummary,
} = mocks;

import {
  ASSISTANT_QUICK_COMMANDS,
  classifyAssistantIntent,
  buildDecisionProposal,
  getAssistantSystemPrompt,
  handleAssistantCommand,
  dispatchAssistantTask,
  recordAssistantGoal,
  submitDecisionProposal,
  resolveDecision,
  handleVirtualCompanyIntent,
} from './assistantAgent';
import { routeAssistantTurn } from './assistantRouter';
import { detectIntent } from './aiGuide';

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStats.mockResolvedValue({ total: 2, pending: 1, in_progress: 0, completed: 1, failed: 0, cancelled: 0 });
  mockList.mockResolvedValue([{ agentId: 'analyst', agentName: '经营分析 Agent' }]);
  mockAddLog.mockResolvedValue({ id: 'dec-123' });
  mockAddContext.mockResolvedValue({ id: 'ctx-1', title: '测试目标' });
  mockGetActiveGoals.mockResolvedValue([]);
  mockGetPreferences.mockResolvedValue([]);
  mockGetStatsDecision.mockResolvedValue(null);
  mockGetBapSummary.mockResolvedValue({ topKpis: [] });
});

describe('classifyAssistantIntent 意图路由', () => {
  it('采购类请求 → 决策(采购)', () => {
    const intent = classifyAssistantIntent('帮我下采购单');
    expect(intent.type).toBe('decision');
    if (intent.type === 'decision') {
      expect(intent.proposal.actionType).toBe('purchase');
    }
  });

  it('定价类请求 → 决策(定价)', () => {
    const intent = classifyAssistantIntent('这个产品怎么定价');
    expect(intent.type).toBe('decision');
    if (intent.type === 'decision') {
      expect(intent.proposal.actionType).toBe('pricing');
    }
  });

  it('人事类请求 → 决策(人事)', () => {
    const intent = classifyAssistantIntent('我想招一个运营');
    expect(intent.type).toBe('decision');
    if (intent.type === 'decision') {
      expect(intent.proposal.actionType).toBe('hr');
    }
  });

  it('财务类请求 → 决策(财务)', () => {
    const intent = classifyAssistantIntent('预算不够了想申请拨款');
    expect(intent.type).toBe('decision');
    if (intent.type === 'decision') {
      expect(intent.proposal.actionType).toBe('finance');
    }
  });

  it('任务分派请求 → 任务', () => {
    const intent = classifyAssistantIntent('给营销团队分派一个新任务');
    expect(intent.type).toBe('task');
  });

  it('自然语言任务分派（动词+任务间隔）→ 任务', () => {
    const intent = classifyAssistantIntent('给经营分析 Agent 分派一个库存报告任务');
    expect(intent.type).toBe('task');
  });

  it('任务列表/进度查询 → 任务', () => {
    expect(classifyAssistantIntent('任务进度').type).toBe('task');
    expect(classifyAssistantIntent('任务列表').type).toBe('task');
  });

  it('记录目标请求 → 上下文', () => {
    const intent = classifyAssistantIntent('记录目标：下季度销售额翻倍');
    expect(intent.type).toBe('context');
  });

  it('生成报告请求 → 报告', () => {
    const intent = classifyAssistantIntent('生成一份本周经营报告');
    expect(intent.type).toBe('report');
  });

  it('数据查询请求 → 查询（不走决策流程）', () => {
    const intent = classifyAssistantIntent('查询本周库存情况');
    expect(intent.type).toBe('query');
  });

  it('纯闲聊 → 查询（走 LLM）', () => {
    const intent = classifyAssistantIntent('你好，今天天气不错');
    expect(intent.type).toBe('query');
  });

  // ====== 虚拟公司意图识别 ======
  it('「帮我创建一个虚拟公司」→ virtual_company / wizard', () => {
    const intent = classifyAssistantIntent('帮我创建一个虚拟公司');
    expect(intent.type).toBe('virtual_company');
    if (intent.type === 'virtual_company') {
      expect(intent.target).toBe('wizard');
    }
  });

  it('「想搭建一个 AI 团队」→ virtual_company / wizard', () => {
    const intent = classifyAssistantIntent('想搭建一个 AI 团队');
    expect(intent.type).toBe('virtual_company');
    if (intent.type === 'virtual_company') {
      expect(intent.target).toBe('wizard');
    }
  });

  it('「想开一家咖啡店的 AI 公司」→ virtual_company / wizard', () => {
    const intent = classifyAssistantIntent('想开一家咖啡店的 AI 公司');
    expect(intent.type).toBe('virtual_company');
    if (intent.type === 'virtual_company') {
      expect(intent.target).toBe('wizard');
    }
  });

  it('「帮我导入 NvWaX 虚拟公司」→ virtual_company / import', () => {
    const intent = classifyAssistantIntent('帮我导入虚拟公司');
    expect(intent.type).toBe('virtual_company');
    if (intent.type === 'virtual_company') {
      expect(intent.target).toBe('import');
    }
  });

  it('「查看我的虚拟公司」→ virtual_company / companies', () => {
    const intent = classifyAssistantIntent('查看我的虚拟公司');
    expect(intent.type).toBe('virtual_company');
    if (intent.type === 'virtual_company') {
      expect(intent.target).toBe('companies');
    }
  });

  it('「我想招一个运营」不应误识别为虚拟公司（决策词优先）', () => {
    const intent = classifyAssistantIntent('我想招一个运营');
    expect(intent.type).toBe('decision');
  });
});

describe('buildDecisionProposal 决策建议生成', () => {
  it('生成结构化建议且带风险等级', () => {
    const proposal = buildDecisionProposal('帮我下采购单', 'purchase');
    expect(proposal.intentSummary).toBe('帮我下采购单');
    expect(proposal.actionDescription).toContain('采购决策');
    expect(['low', 'medium', 'high']).toContain(proposal.estimatedImpact.riskLevel);
  });

  it('财务决策预算影响应为高', () => {
    const proposal = buildDecisionProposal('申请贷款', 'finance');
    expect(proposal.estimatedImpact.budget).toBe('high');
  });
});

describe('getAssistantSystemPrompt 统一提示词', () => {
  it('应包含秘书与 CEO 双重能力说明', () => {
    const prompt = getAssistantSystemPrompt('小如');
    expect(prompt).toContain('全能助理');
    expect(prompt).toContain('经营决策支持');
    expect(prompt).toContain('任务管理');
    expect(prompt).toContain('报告生成');
    expect(prompt).not.toContain('礼貌引导至 CEO Agent');
  });

  it('注入老板画像（记忆层）', () => {
    const prompt = getAssistantSystemPrompt('小如', {
      kpis: ['销售额', '毛利率'],
      preferences: { budget_sensitivity: '7', risk_tolerance: '3', decision_style: 'conservative' },
      activeGoals: [],
      decisionStats: null,
    });
    expect(prompt).toContain('老板常关注的数据：销售额、毛利率');
    expect(prompt).toContain('老板决策风格：偏保守');
  });
});

describe('handleAssistantCommand 快捷命令', () => {
  it('/task list 应返回任务列表和统计', async () => {
    const result = await handleAssistantCommand('/task list');
    expect(result).toContain('整理库存报告');
    expect(result).toContain('优化采购流程');
    expect(result).toContain('待处理 1');
    expect(mockGetStats).toHaveBeenCalled();
  });

  it('/context show 应返回当前目标', async () => {
    mockGetActiveGoals.mockResolvedValueOnce([
      { id: 'g1', context_type: 'goal', title: 'Q4 销售额翻倍' },
    ]);
    const result = await handleAssistantCommand('/context show');
    expect(result).toContain('Q4 销售额翻倍');
    expect(mockGetActiveGoals).toHaveBeenCalled();
  });

  it('不匹配的命令返回 null', async () => {
    const result = await handleAssistantCommand('随便聊聊');
    expect(result).toBeNull();
  });

  it('/report daily 返回库存统计，不再是占位句', async () => {
    const result = await handleAssistantCommand('/report daily');
    expect(result).toContain('总产品数');
    expect(result).not.toContain('正在生成');
  });

  it('快捷按钮包含导出库存和待盘点', () => {
    expect(ASSISTANT_QUICK_COMMANDS.map(item => item.label)).toEqual([
      '所有产品',
      '库存统计',
      '库存预警',
      '导出库存',
      '待盘点',
      '今日简报',
      '任务列表',
      '公司目标',
    ]);
  });
});

describe('routeAssistantTurn 路由优先级', () => {
  it('进货带数量走入库，不走采购决策', async () => {
    const routed = await routeAssistantTurn('进货 iPhone 10个');
    expect(routed?.kind).toBe('message');
    if (routed?.kind === 'message') {
      expect(routed.content).toContain('未找到');
    }
  });

  it('下采购单仍是决策', async () => {
    const routed = await routeAssistantTurn('帮我下采购单');
    expect(routed?.kind).toBe('decision');
    if (routed?.kind === 'decision') {
      expect(routed.proposal.actionType).toBe('purchase');
    }
  });

  it('创建虚拟公司会打开向导', async () => {
    const routed = await routeAssistantTurn('创建虚拟公司');
    expect(routed?.kind).toBe('message');
    if (routed?.kind === 'message') {
      expect(routed.content).toContain('虚拟公司创建向导');
    }
  });

  it('导出和库存同分时引导层选数据操作', () => {
    expect(detectIntent('导入库存').intent).toBe('data_operation');
  });
});

describe('dispatchAssistantTask 任务分派', () => {
  it('分派型请求应调用 proclawTasks.dispatch 并返回成功信息', async () => {
    mockDispatch.mockResolvedValueOnce({ id: 'task-1' });
    const result = await dispatchAssistantTask('给经营分析 Agent 分派一个库存报告任务');
    expect(mockList).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith('analyst', expect.objectContaining({
      type: 'assistant_task',
      description: '给经营分析 Agent 分派一个库存报告任务',
    }));
    expect(result).toContain('已将任务分派给子 Agent「经营分析 Agent」');
  });

  it('自然语言分派（动词与任务间隔）也应触发分派', async () => {
    mockDispatch.mockResolvedValueOnce({ id: 'task-2' });
    const result = await dispatchAssistantTask('安排一个本周销售分析任务');
    expect(mockDispatch).toHaveBeenCalledWith('analyst', expect.objectContaining({
      type: 'assistant_task',
      description: '安排一个本周销售分析任务',
    }));
    expect(result).toContain('已将任务分派');
  });

  it('进度查询型请求应返回任务列表而非分派', async () => {
    const result = await dispatchAssistantTask('任务进度');
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(result).toContain('整理库存报告');
    expect(result).toContain('优化采购流程');
  });

  it('无可用 Agent 时应友好提示', async () => {
    mockList.mockResolvedValueOnce([]);
    const result = await dispatchAssistantTask('分派任务：整理库存');
    expect(mockDispatch).not.toHaveBeenCalled();
    expect(result).toContain('当前没有可用的子 Agent');
  });
});

describe('recordAssistantGoal 目标记录', () => {
  it('应将目标写入 PCP 并返回成功信息', async () => {
    const result = await recordAssistantGoal('下季度拓展 3 个新客户');
    expect(mockAddContext).toHaveBeenCalledWith(expect.objectContaining({
      context_type: 'goal',
      title: '下季度拓展 3 个新客户',
      description: '下季度拓展 3 个新客户',
      created_by: 'boss',
    }));
    expect(result).toContain('已将目标记录到项目上下文');
  });
});

describe('模拟对话场景：库存分析 → 任务分派 → 进度查询 → 记录目标', () => {
  it('应完整跑通统一助理对话流程', async () => {
    // 第 1 轮：数据查询
    const intent1 = classifyAssistantIntent('帮我看下库存周转情况');
    expect(intent1.type).toBe('query');

    // 第 2 轮：自然语言任务分派
    mockDispatch.mockResolvedValueOnce({ id: 'task-100' });
    const intent2 = classifyAssistantIntent('给经营分析 Agent 分派一个库存报告任务');
    expect(intent2.type).toBe('task');

    const reply2 = await dispatchAssistantTask('给经营分析 Agent 分派一个库存报告任务');
    expect(mockDispatch).toHaveBeenCalledWith('analyst', expect.objectContaining({
      type: 'assistant_task',
      description: '给经营分析 Agent 分派一个库存报告任务',
    }));
    expect(reply2).toContain('已将任务分派给子 Agent「经营分析 Agent」');

    // 第 3 轮：任务进度查询
    const intent3 = classifyAssistantIntent('任务进度怎么样了');
    expect(intent3.type).toBe('task');

    const reply3 = await dispatchAssistantTask('任务进度怎么样了');
    expect(mockDispatch).toHaveBeenCalledTimes(1); // 查询不应再次分派
    expect(reply3).toContain('整理库存报告');
    expect(reply3).toContain('优化采购流程');

    // 第 4 轮：记录目标
    const intent4 = classifyAssistantIntent('记录目标：下季度库存周转提升20%');
    expect(intent4.type).toBe('context');

    const reply4 = await recordAssistantGoal('下季度库存周转提升20%');
    expect(mockAddContext).toHaveBeenCalledWith(expect.objectContaining({
      context_type: 'goal',
      title: '下季度库存周转提升20%',
    }));
    expect(reply4).toContain('已将目标记录到项目上下文');
  });
});

describe('submitDecisionProposal / resolveDecision 决策闭环', () => {
  it('submit 应将决策写入日志并返回 decisionId', async () => {
    const proposal = buildDecisionProposal('帮我下采购单', 'purchase');
    const result = await submitDecisionProposal(proposal);
    expect(mockAddLog).toHaveBeenCalled();
    expect(result.decisionId).toBe('dec-123');
  });

  it('resolve 确认应调用 updateStatus 为 approved', async () => {
    const proposal = buildDecisionProposal('帮我下采购单', 'purchase');
    proposal.decisionId = 'dec-456';
    await resolveDecision(proposal, true);
    expect(mockUpdateStatus).toHaveBeenCalledWith('dec-456', 'approved', undefined);
  });

  it('resolve 拒绝应调用 updateStatus 并附带原因', async () => {
    const proposal = buildDecisionProposal('帮我下采购单', 'purchase');
    proposal.decisionId = 'dec-789';
    await resolveDecision(proposal, false, '预算不足');
    expect(mockUpdateStatus).toHaveBeenCalledWith('dec-789', 'rejected', '预算不足');
  });

  it('resolve 无 decisionId 时应静默跳过', async () => {
    const proposal = buildDecisionProposal('帮我下采购单', 'purchase');
    await resolveDecision(proposal, true);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });
});

describe('handleVirtualCompanyIntent 虚拟公司意图处理', () => {
  it('wizard 意图应 dispatch plugin:virtual-company:open-wizard 事件', async () => {
    const listener = vi.fn();
    window.addEventListener('plugin:virtual-company:open-wizard', listener);

    const reply = await handleVirtualCompanyIntent('wizard');

    expect(listener).toHaveBeenCalledTimes(1);
    const evt = listener.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({ pluginId: 'virtual-company', source: 'assistant-agent' });
    expect(reply).toContain('虚拟公司创建向导');
    window.removeEventListener('plugin:virtual-company:open-wizard', listener);
  });

  it('import 意图应 dispatch plugin:virtual-company:open-import 事件', async () => {
    const listener = vi.fn();
    window.addEventListener('plugin:virtual-company:open-import', listener);
    await handleVirtualCompanyIntent('import');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('plugin:virtual-company:open-import', listener);
  });

  it('companies 意图应 dispatch plugin:virtual-company:open-companies 事件', async () => {
    const listener = vi.fn();
    window.addEventListener('plugin:virtual-company:open-companies', listener);
    await handleVirtualCompanyIntent('companies');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('plugin:virtual-company:open-companies', listener);
  });
});
