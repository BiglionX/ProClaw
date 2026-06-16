/**
 * NvwaX 市场 Mock 后端（任务 #6：Agent 市场后端 mock）
 *
 * 在本地开发/演示环境模拟 nvwa.proclaw.cc 第三方 API
 * 通过环境变量 VITE_USE_NVWA_MOCK=1 启用
 */

import type {
  AgentSummary,
  AgentDetail,
  AgentListResponse,
  AiTeamDetail,
  AiTeamListResponse,
  Category,
  Industry,
  SearchResult,
  UsageStats,
  TokenBalance,
  SearchParams,
  ListParams,
  ExportItem,
  ExportResult,
} from '../types/nvwax';

// ==================== Mock 数据集 ====================

const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-marketing', name: '营销', count: 12, icon: 'campaign' },
  { id: 'cat-sales', name: '销售', count: 8, icon: 'shopping_cart' },
  { id: 'cat-finance', name: '财务', count: 6, icon: 'account_balance' },
  { id: 'cat-productivity', name: '效率', count: 15, icon: 'flash_on' },
  { id: 'cat-management', name: '管理', count: 9, icon: 'settings' },
  { id: 'cat-customer', name: '客户', count: 7, icon: 'people' },
];

const MOCK_INDUSTRIES: Industry[] = [
  { id: 'ind-retail', name: '零售', agentCount: 12 },
  { id: 'ind-catering', name: '餐饮', agentCount: 8 },
  { id: 'ind-beauty', name: '美容', agentCount: 6 },
  { id: 'ind-education', name: '教育', agentCount: 5 },
  { id: 'ind-medical', name: '医疗', agentCount: 4 },
  { id: 'ind-manufacturing', name: '制造', agentCount: 7 },
];

const MOCK_AGENTS: AgentSummary[] = [
  {
    id: 'ma-mock-001',
    name: '智能客服 Agent',
    description: '基于 LLM 的多轮对话客服，自动回答客户常见问题。',
    avatar: '🤖',
    category: 'cat-customer',
    categoryName: '客户',
    tags: ['客服', '对话', 'LLM'],
    price: 0,
    downloads: 5420,
    rating: 4.6,
    ratingCount: 312,
    author: 'ProClaw 官方',
    isOfficial: true,
    isFeatured: true,
    publishedAt: '2026-01-15',
    version: '1.2.0',
  },
  {
    id: 'ma-mock-002',
    name: '库存预警 Agent',
    description: '实时监控库存水位，自动生成补货建议。',
    avatar: '📦',
    category: 'cat-management',
    categoryName: '管理',
    tags: ['库存', '预警', '供应链'],
    price: 0,
    downloads: 3210,
    rating: 4.4,
    ratingCount: 198,
    author: 'ProClaw 官方',
    isOfficial: true,
    publishedAt: '2026-02-08',
    version: '1.0.5',
  },
  {
    id: 'ma-mock-003',
    name: '智能财税 Agent',
    description: '自动识别发票、生成记账凭证、报税提醒。',
    avatar: '💰',
    category: 'cat-finance',
    categoryName: '财务',
    tags: ['财务', '发票', 'OCR'],
    price: 29.9,
    downloads: 1870,
    rating: 4.7,
    ratingCount: 156,
    author: '第三方·云账本',
    isOfficial: false,
    publishedAt: '2026-03-12',
    version: '0.9.0',
  },
  {
    id: 'ma-mock-004',
    name: '内容生成 Agent',
    description: '一键生成小红书/抖音/公众号文案，支持 SEO 优化。',
    avatar: '✨',
    category: 'cat-marketing',
    categoryName: '营销',
    tags: ['内容', '文案', 'SEO'],
    price: 0,
    downloads: 8930,
    rating: 4.8,
    ratingCount: 567,
    author: 'ProClaw 官方',
    isOfficial: true,
    isFeatured: true,
    publishedAt: '2026-01-20',
    version: '2.1.0',
  },
  {
    id: 'ma-mock-005',
    name: '销售漏斗分析 Agent',
    description: '实时分析销售漏斗，识别转化瓶颈。',
    avatar: '📊',
    category: 'cat-sales',
    categoryName: '销售',
    tags: ['销售', '分析', '漏斗'],
    price: 19.9,
    downloads: 2340,
    rating: 4.3,
    ratingCount: 145,
    author: '第三方·数据狐',
    isOfficial: false,
    publishedAt: '2026-04-01',
    version: '1.0.0',
  },
  {
    id: 'ma-mock-006',
    name: '会议纪要 Agent',
    description: '自动录制会议，生成结构化纪要 + 待办事项。',
    avatar: '📝',
    category: 'cat-productivity',
    categoryName: '效率',
    tags: ['会议', '纪要', '语音转文字'],
    price: 9.9,
    downloads: 4120,
    rating: 4.5,
    ratingCount: 287,
    author: 'ProClaw 官方',
    isOfficial: true,
    publishedAt: '2026-02-25',
    version: '1.5.0',
  },
];

const MOCK_AGENT_DETAILS: Record<string, AgentDetail> = Object.fromEntries(
  MOCK_AGENTS.map(a => [
    a.id,
    {
      ...a,
      description: `${a.description}\n\n本 Agent 由 ProClaw Mock 后端提供，用于本地开发演示。`,
      longDescription: a.description,
      capabilities: a.tags,
      permissions: ['read_user', 'send_message', 'show_notification'],
      screenshots: [],
      installCount: a.downloads,
      size: '2.4 MB',
      requirements: { minAppVersion: '1.0.0' },
      changelog: '## 1.2.0\n- 性能优化\n- 修复已知问题',
      reviews: [],
    },
  ])
);

const MOCK_AI_TEAMS: AiTeamListResponse = {
  teams: [
    {
      id: 'team-mock-001',
      name: 'AI 经营团队',
      description: 'CEO + 财务 + 供应链 全方位经营决策',
      avatar: '👔',
      memberCount: 5,
      industry: '通用',
      price: 0,
      downloads: 2340,
      rating: 4.7,
      isFeatured: true,
    },
    {
      id: 'team-mock-002',
      name: '国内社媒运营 Team',
      description: '抖音/小红书/视频号 多平台内容运营',
      avatar: '📱',
      memberCount: 4,
      industry: '社媒',
      price: 0,
      downloads: 1890,
      rating: 4.5,
      isFeatured: true,
    },
    {
      id: 'team-mock-003',
      name: '欧美社媒运营 Team',
      description: 'Facebook/Instagram/Twitter 海外内容运营',
      avatar: '🌍',
      memberCount: 4,
      industry: '社媒',
      price: 0,
      downloads: 1120,
      rating: 4.4,
      isFeatured: false,
    },
  ],
  total: 3,
  page: 1,
  pageSize: 20,
};

// ==================== 工具函数 ====================

function delay<T>(value: T, ms = 200 + Math.random() * 600): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function filterAgents(agents: AgentSummary[], params: SearchParams): AgentSummary[] {
  let result = agents;
  if (params.q) {
    const q = params.q.toLowerCase();
    result = result.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some(t => t.toLowerCase().includes(q))
    );
  }
  if (params.category && params.category !== 'all') {
    result = result.filter(a => a.category === params.category);
  }
  if (params.tags && params.tags.length > 0) {
    result = result.filter(a => params.tags!.every(t => a.tags.includes(t)));
  }
  return result;
}

// ==================== Mock 服务 ====================

export const nvwaMockServer = {
  /** 搜索 Agent */
  async searchAgents(params: SearchParams = {}): Promise<AgentListResponse> {
    const filtered = filterAgents(MOCK_AGENTS, params);
    const page = params.page || 1;
    const pageSize = params.limit || 20;
    const items = paginate(filtered, page, pageSize);

    return delay({
      data: items,
      total: filtered.length,
      page,
      page_size: pageSize,
    });
  },

  /** 获取 Agent 详情 */
  async getAgentDetail(id: string): Promise<AgentDetail> {
    const detail = MOCK_AGENT_DETAILS[id];
    if (!detail) {
      throw new Error(`Agent ${id} 不存在`);
    }
    return delay(detail);
  },

  /** 获取分类列表 */
  async getCategories(): Promise<Category[]> {
    return delay(MOCK_CATEGORIES);
  },

  /** 获取行业列表 */
  async getIndustries(): Promise<Industry[]> {
    return delay(MOCK_INDUSTRIES);
  },

  /** 搜索 AI Team */
  async searchAiTeams(params: ListParams = {}): Promise<AiTeamListResponse> {
    let teams = MOCK_AI_TEAMS.teams;
    if (params.q) {
      const q = params.q.toLowerCase();
      teams = teams.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    if (params.industry) {
      teams = teams.filter(t => t.industry === params.industry);
    }
    return delay({
      teams: paginate(teams, params.page || 1, params.limit || 20),
      total: teams.length,
      page: params.page || 1,
      pageSize: params.limit || 20,
    });
  },

  /** 获取 AI Team 详情 */
  async getAiTeamDetail(id: string): Promise<AiTeamDetail> {
    const team = MOCK_AI_TEAMS.teams.find(t => t.id === id);
    if (!team) {
      throw new Error(`AI Team ${id} 不存在`);
    }
    return delay({
      ...team,
      members: Array.from({ length: team.memberCount }, (_, i) => ({
        id: `${id}-member-${i}`,
        name: `成员 ${i + 1}`,
        role: ['负责人', '运营', '内容', '数据', '客服'][i] || '助理',
        avatar: ['👤', '👨', '👩', '🧑', '👨‍💼'][i] || '👤',
      })),
      longDescription: team.description,
      capabilities: [],
      installCount: team.downloads,
    });
  },

  /** 获取 Token 余额 */
  async getTokenBalance(): Promise<TokenBalance> {
    return delay({
      balance: 9850,
      used: 150,
      total: 10000,
      expiresAt: '2026-12-31',
      isUnlimited: false,
    });
  },

  /** 获取使用统计 */
  async getUsageStats(): Promise<UsageStats> {
    return delay({
      totalCalls: 150,
      totalTokens: 12450,
      agentBreakdown: MOCK_AGENTS.slice(0, 3).map(a => ({
        agentId: a.id,
        agentName: a.name,
        callCount: Math.floor(Math.random() * 50) + 10,
        tokenCount: Math.floor(Math.random() * 3000) + 500,
      })),
      dailyStats: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 86400000).toISOString().split('T')[0],
        callCount: Math.floor(Math.random() * 30) + 5,
        tokenCount: Math.floor(Math.random() * 2000) + 200,
      })),
    });
  },

  /** 全局搜索 */
  async search(params: SearchParams = {}): Promise<SearchResult> {
    const agentResults = filterAgents(MOCK_AGENTS, params);
    return delay({
      agents: agentResults.slice(0, 5),
      teams: MOCK_AI_TEAMS.teams.slice(0, 3),
      totalCount: agentResults.length + MOCK_AI_TEAMS.teams.length,
    });
  },

  /** 导出对话/数据 */
  async exportData(items: ExportItem[]): Promise<ExportResult> {
    return delay({
      url: `https://mock-nvwa.proclaw.cc/exports/${Date.now()}.zip`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      size: items.length * 1024,
    });
  },
};

/** 是否启用 mock */
export function isNvwaMockEnabled(): boolean {
  if (typeof import.meta === 'undefined') return false;
  return import.meta.env?.VITE_USE_NVWA_MOCK === '1' ||
         import.meta.env?.VITE_USE_NVWA_MOCK === 'true';
}

export default nvwaMockServer;
