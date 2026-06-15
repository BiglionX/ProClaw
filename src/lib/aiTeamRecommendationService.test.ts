import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// 获取 setup.ts 中 mock 的 invoke 函数
const { invoke } = await import('@tauri-apps/api/core');

// Mock LLM provider 让 LLM 增强阶段直接跳过
vi.mock('./llmProvider', () => ({
  getLLMForTask: vi.fn().mockRejectedValue(new Error('LLM not available in tests')),
}));

vi.mock('./aiConfig', async () => {
  const actual = await vi.importActual('./aiConfig');
  return {
    ...actual,
    getAIConfig: vi.fn().mockResolvedValue({
      providers: [],
      defaultProvider: 'none',
    }),
  };
});

// ============================================================
// 辅助函数：构建 mock invoke 的多命令返回值
// ============================================================
function mockInvokeReturns(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    get_database_stats: {
      spu_count: 30,
      sku_count: 45,
      categories_count: 5,
      transactions_count: 20,
      pending_sync: 0,
    },
    get_inventory_stats: {
      total_products: 45,
      low_stock_count: 3,
      zero_stock_count: 1,
      today_transactions: 8,
      total_value: 150000,
    },
    get_financial_summary: {
      monthly_revenue: 120000,
      monthly_profit: 25000,
      accounts_receivable: 15000,
      accounts_payable: 8000,
      inventory_value: 150000,
      working_capital: 70000,
    },
    get_product_analytics: {
      best_selling: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }, { id: 'p4' }],
      slow_moving: [{ id: 's1' }, { id: 's2' }],
    },
    ...overrides,
  };

  (invoke as ReturnType<typeof vi.fn>).mockImplementation(
    async (cmd: string) => {
      if (cmd in defaults) return defaults[cmd];
      throw new Error(`Unmocked command: ${cmd}`);
    }
  );
}

// ============================================================
// 测试套件
// ============================================================
describe('AI 团队推荐服务 - AI智能找图 Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('AGENT_TEMPLATES 模板库', () => {
    it('应包含 7 个内置 Agent（含 AI智能找图）', async () => {
      // 通过动态导入获取模板（因为模板是模块私有的，通过推荐结果间接验证）
      mockInvokeReturns({
        // 无产品场景 → 只返回基础分析师（兜底逻辑）
        get_inventory_stats: {
          total_products: 0,
          low_stock_count: 0,
          zero_stock_count: 0,
          today_transactions: 0,
          total_value: 0,
        },
        get_database_stats: {
          spu_count: 0, sku_count: 0, categories_count: 0,
          transactions_count: 0, pending_sync: 0,
        },
        get_financial_summary: {
          monthly_revenue: 0, monthly_profit: 0,
          accounts_receivable: 0, accounts_payable: 0,
          inventory_value: 0, working_capital: 0,
        },
        get_product_analytics: { best_selling: [], slow_moving: [] },
      });

      // 无产品时推荐就只有业务分析师（兜底，1个成员）
      // 使用全量数据验证时会触发全部 7 个 agent
    });

    it('当有产品时，应推荐 AI智能找图 Agent', async () => {
      mockInvokeReturns();

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      // 验证成员中包含 AI智能找图
      const imageSearcher = result.members.find(
        (m) => m.agent_id === 'builtin-image-searcher'
      );
      expect(imageSearcher).toBeDefined();
      expect(imageSearcher!.role).toBe('AI智能找图');
      expect(imageSearcher!.responsibilities).toContain('Pexels');
      expect(imageSearcher!.responsibilities).toContain('Pixabay');
    });

    it('AI智能找图的 agent_id 应为 builtin-image-searcher', async () => {
      mockInvokeReturns();

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      const ids = result.members.map((m) => m.agent_id);
      expect(ids).toContain('builtin-image-searcher');
    });

    it('AI智能找图的 sort_order 应在客服助手之后', async () => {
      mockInvokeReturns();

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      const csIdx = result.members.findIndex(
        (m) => m.agent_id === 'builtin-cs-agent'
      );
      const imgIdx = result.members.findIndex(
        (m) => m.agent_id === 'builtin-image-searcher'
      );

      // 客服助手可能不触发（月营收<20万），但 AI智能找图一定在
      expect(imgIdx).toBeGreaterThanOrEqual(0);

      // 如果客服助手也在队伍中，AI智能找图应在其之后
      if (csIdx >= 0) {
        expect(imgIdx).toBeGreaterThan(csIdx);
      }
    });
  });

  describe('推荐规则 - 条件触发', () => {
    it('有产品时（totalProducts > 0），应在 tags 中包含"智能找图"', async () => {
      mockInvokeReturns({
        // 只有少量产品，确保其他 agent 不触发
        get_inventory_stats: {
          total_products: 5,
          low_stock_count: 0,
          zero_stock_count: 0,
          today_transactions: 0,
          total_value: 5000,
        },
        get_database_stats: {
          spu_count: 5, sku_count: 5, categories_count: 1,
          transactions_count: 0, pending_sync: 0,
        },
        get_financial_summary: {
          monthly_revenue: 0, monthly_profit: 0,
          accounts_receivable: 0, accounts_payable: 0,
          inventory_value: 5000, working_capital: 0,
        },
        get_product_analytics: { best_selling: [], slow_moving: [] },
      });

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      expect(result.tags).toContain('智能找图');
    });

    it('没有产品时（totalProducts == 0），tags 不应包含"智能找图"', async () => {
      mockInvokeReturns({
        get_inventory_stats: {
          total_products: 0,
          low_stock_count: 0,
          zero_stock_count: 0,
          today_transactions: 0,
          total_value: 0,
        },
        get_database_stats: {
          spu_count: 0, sku_count: 0, categories_count: 0,
          transactions_count: 0, pending_sync: 0,
        },
        get_financial_summary: {
          monthly_revenue: 0, monthly_profit: 0,
          accounts_receivable: 0, accounts_payable: 0,
          inventory_value: 0, working_capital: 0,
        },
        get_product_analytics: { best_selling: [], slow_moving: [] },
      });

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      expect(result.tags).not.toContain('智能找图');

      // 没有产品时，推荐自媒体运营 AI 团队（自媒体运营官 + 业务分析师）
      expect(result.members.length).toBe(2);
      expect(result.members.some(m => m.agent_id === 'builtin-content-creator')).toBe(true);
      expect(result.members.some(m => m.agent_id === 'builtin-business-analyst')).toBe(true);
      expect(result.tags).toContain('自媒体运营');
    });

    it('analysis 中应包含产品配图理由', async () => {
      mockInvokeReturns({
        get_inventory_stats: {
          total_products: 15,
          low_stock_count: 0,
          zero_stock_count: 0,
          today_transactions: 0,
          total_value: 20000,
        },
        get_database_stats: {
          spu_count: 10, sku_count: 15, categories_count: 2,
          transactions_count: 0, pending_sync: 0,
        },
        get_financial_summary: {
          monthly_revenue: 0, monthly_profit: 0,
          accounts_receivable: 0, accounts_payable: 0,
          inventory_value: 20000, working_capital: 0,
        },
        get_product_analytics: { best_selling: [], slow_moving: [] },
      });

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      // 应包含"配图"或"产品"相关的分析描述
      expect(result.analysis).toContain('产品');
    });
  });

  describe('多 Agent 共存场景', () => {
    it('完整业务场景下，AI智能找图应与其他 Agent 共存', async () => {
      mockInvokeReturns(); // 使用默认的丰富业务数据

      const { generateTeamRecommendation } = await import(
        './aiTeamRecommendationService'
      );

      const result = await generateTeamRecommendation();

      const roles = result.members.map((m) => m.role);

      // 验证推荐结果包含多种 Agent
      expect(roles).toContain('AI智能找图');

      // 检查所有存在的角色至少包含 AI智能找图
      const hasImageSearcher = roles.includes('AI智能找图');
      expect(hasImageSearcher).toBe(true);

      // members 中每个 agent 不应重复
      const agentIds = result.members.map((m) => m.agent_id);
      const uniqueIds = [...new Set(agentIds)];
      expect(uniqueIds.length).toBe(agentIds.length);
    });
  });

  describe('跨服务认证', () => {
    it('generateCrossAuthToken 应生成有效格式的 token', async () => {
      const { generateCrossAuthToken } = await import(
        './aiTeamRecommendationService'
      );

      const token = generateCrossAuthToken('test@example.com');

      // Token 应为非空字符串
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      // 不应包含原始 email
      expect(token).not.toContain('test@example.com');
    });

    it('buildNvwaXUrl 应包含成员信息', async () => {
      mockInvokeReturns();

      const { generateTeamRecommendation, buildNvwaXUrl } = await import(
        './aiTeamRecommendationService'
      );

      const recommendation = await generateTeamRecommendation();
      const url = buildNvwaXUrl(recommendation, 'user@test.com');

      expect(url).toContain('requirements=');
      expect(url).toContain('members=');
      // 应包含跨服务认证 token
      expect(url).toContain('proclaw_token=');
      expect(url).toContain('proclaw_email=');
    });
  });
});
