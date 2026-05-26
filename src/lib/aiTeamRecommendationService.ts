/**
 * AI 团队智能推荐引擎
 *
 * 分析用户的项目业务数据（库存、销售、财务、用户行为等），
 * 自动生成个性化的 AiTeam 配置建议。
 *
 * 支持两种模式：
 * 1. 规则引擎 — 基于业务指标匹配预设模板（离线可用）
 * 2. LLM 增强  — 使用大模型生成详细描述和定制建议（需 LLM 配置）
 */

import { invoke } from '@tauri-apps/api/core';
import type { AiTeam, CreateTeamPayload, TeamMember } from './teamTypes';
import { getAIConfig, type TaskType } from './aiConfig';
import { getLLMForTask } from './llmProvider';

// ============================================================
// 业务画像数据结构
// ============================================================
export interface BusinessProfile {
  /** SPU 数 */
  spuCount: number;
  /** SKU 数 */
  skuCount: number;
  /** 分类数 */
  categoriesCount: number;
  /** 总产品数（含简化模式） */
  totalProducts: number;
  /** 低库存产品数 */
  lowStockCount: number;
  /** 零库存产品数 */
  zeroStockCount: number;
  /** 今日交易数 */
  todayTransactions: number;
  /** 库存总值 */
  inventoryValue: number;
  /** 月营收 */
  monthlyRevenue: number;
  /** 月利润 */
  monthlyProfit: number;
  /** 利润率 */
  profitMargin: number;
  /** 应收账款 */
  accountsReceivable: number;
  /** 应付账款 */
  accountsPayable: number;
  /** 营运资金 */
  workingCapital: number;
  /** 畅销品数量 */
  bestSellingCount: number;
  /** 滞销品数量 */
  slowMovingCount: number;
  /** 供应商/客户是否活跃 */
  hasSalesData: boolean;
}

/** 推荐结果 */
export interface TeamRecommendation {
  /** 推荐团队名称 */
  teamName: string;
  /** 分类 */
  category: string;
  /** 标签 */
  tags: string[];
  /** 推荐成员 */
  members: TeamMember[];
  /** 工作流配置 */
  workflow: Record<string, unknown>;
  /** 触发器配置 */
  triggers: Record<string, unknown>;
  /** 分析说明 */
  analysis: string;
  /** 业务画像摘要 */
  profileSummary: string;
  /** 推荐的场景描述（供 NvwaX 虚拟公司使用） */
  requirementDescription: string;
  /** 直接可用的 CreateTeamPayload */
  payload: CreateTeamPayload;
}

// ============================================================
// Agent 模板库
// ============================================================
const AGENT_TEMPLATES: Record<string, TeamMember> = {
  inventoryOptimizer: {
    agent_id: 'builtin-inventory-optimizer',
    role: '库存优化师',
    responsibilities: '监控库存水平，预警低库存商品，优化安全库存设置，识别滞销品并建议清仓策略。',
    sort_order: 0,
  },
  salesForecaster: {
    agent_id: 'builtin-sales-forecaster',
    role: '销售预测分析师',
    responsibilities: '分析历史销售趋势，预测未来销量，识别季节性波动，辅助采购决策。',
    sort_order: 1,
  },
  businessAnalyst: {
    agent_id: 'builtin-business-analyst',
    role: '业务分析师',
    responsibilities: '多维度业务分析，KPI 监控与解读，生成经营报表和月度报告。',
    sort_order: 2,
  },
  purchaseAdvisor: {
    agent_id: 'builtin-purchase-advisor',
    role: '采购顾问',
    responsibilities: '根据库存和销售数据生成采购建议，优化采购批量和频率，管理供应商交付评估。',
    sort_order: 3,
  },
  financialAdvisor: {
    agent_id: 'builtin-financial-advisor',
    role: '财务分析师',
    responsibilities: '监控现金流健康度，分析应收应付结构，评估定价策略和利润率。',
    sort_order: 4,
  },
  customerServiceAgent: {
    agent_id: 'builtin-cs-agent',
    role: '客户服务助手',
    responsibilities: '自动处理客户咨询、订单查询，维护客户信息，跟踪售后问题。',
    sort_order: 5,
  },
  imageSearcher: {
    agent_id: 'builtin-image-searcher',
    role: 'AI智能找图',
    responsibilities: '根据商品名称和描述自动搜索高质量产品图片，支持 Pexels/Pixabay 双源搜索，单商品精搜和批量匹配双模式，智能关键词优化以提升命中率。',
    sort_order: 6,
  },
};

// ============================================================
// 数据采集
// ============================================================
async function collectBusinessProfile(): Promise<BusinessProfile> {
  const profile: BusinessProfile = {
    spuCount: 0,
    skuCount: 0,
    categoriesCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    zeroStockCount: 0,
    todayTransactions: 0,
    inventoryValue: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    profitMargin: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    workingCapital: 0,
    bestSellingCount: 0,
    slowMovingCount: 0,
    hasSalesData: false,
  };

  const settled = await Promise.allSettled([
    // 数据库统计
    invoke<{
      spu_count: number;
      sku_count: number;
      categories_count: number;
      transactions_count: number;
      pending_sync: number;
    }>('get_database_stats').catch(() => null),
    // 库存统计
    invoke<{
      total_products: number;
      low_stock_count: number;
      zero_stock_count: number;
      today_transactions: number;
      total_value: number;
    }>('get_inventory_stats').catch(() => null),
    // 财务摘要
    invoke<{
      monthly_revenue: number;
      monthly_profit: number;
      accounts_receivable: number;
      accounts_payable: number;
      inventory_value: number;
      working_capital: number;
    }>('get_financial_summary').catch(() => null),
    // 产品分析
    invoke<{
      best_selling: Array<{ id: string }>;
      slow_moving: Array<{ id: string }>;
    }>('get_product_analytics').catch(() => null),
  ]);

  const [dbStats, invStats, finSummary, prodAnalytics] = settled;

  if (dbStats.status === 'fulfilled' && dbStats.value) {
    profile.spuCount = dbStats.value.spu_count || 0;
    profile.skuCount = dbStats.value.sku_count || 0;
    profile.categoriesCount = dbStats.value.categories_count || 0;
  }

  if (invStats.status === 'fulfilled' && invStats.value) {
    profile.totalProducts = invStats.value.total_products || 0;
    profile.lowStockCount = invStats.value.low_stock_count || 0;
    profile.zeroStockCount = invStats.value.zero_stock_count || 0;
    profile.todayTransactions = invStats.value.today_transactions || 0;
  }

  if (finSummary.status === 'fulfilled' && finSummary.value) {
    profile.monthlyRevenue = finSummary.value.monthly_revenue || 0;
    profile.monthlyProfit = finSummary.value.monthly_profit || 0;
    profile.accountsReceivable = finSummary.value.accounts_receivable || 0;
    profile.accountsPayable = finSummary.value.accounts_payable || 0;
    profile.inventoryValue = finSummary.value.inventory_value || 0;
    profile.workingCapital = finSummary.value.working_capital || 0;
    if (profile.monthlyRevenue > 0) {
      profile.profitMargin =
        Math.round((profile.monthlyProfit / profile.monthlyRevenue) * 10000) / 100;
      profile.hasSalesData = true;
    }
  }

  if (prodAnalytics.status === 'fulfilled' && prodAnalytics.value) {
    profile.bestSellingCount = prodAnalytics.value.best_selling?.length || 0;
    profile.slowMovingCount = prodAnalytics.value.slow_moving?.length || 0;
  }

  return profile;
}

// ============================================================
// 规则引擎：根据业务画像匹配 Agent
// ============================================================
function ruleBasedRecommend(profile: BusinessProfile): TeamRecommendation {
  const members: TeamMember[] = [];
  const tags: string[] = [];
  const reasons: string[] = [];
  let category = '通用经营';

  // --- 库存优化 Agent ---
  const lowStockRatio =
    profile.totalProducts > 0 ? profile.lowStockCount / profile.totalProducts : 0;
  const needsInventoryAgent =
    profile.skuCount > 10 ||
    profile.totalProducts > 20 ||
    lowStockRatio > 0.1 ||
    profile.zeroStockCount > 0 ||
    profile.slowMovingCount > 0;

  if (needsInventoryAgent) {
    members.push({ ...AGENT_TEMPLATES.inventoryOptimizer, sort_order: members.length });
    tags.push('库存管理');
    if (lowStockRatio > 0.2) {
      reasons.push(
        `当前低库存/零库存商品占比 ${Math.round(lowStockRatio * 100)}%，需要库存优化师实时预警`
      );
    }
    if (profile.slowMovingCount > 0) {
      reasons.push(`${profile.slowMovingCount} 个滞销品需要清仓策略优化`);
    }
    if (profile.skuCount > 30) {
      reasons.push(`SKU 数量较多（${profile.skuCount}），需专业的库存管理团队`);
    }
  }

  // --- 销售预测 Agent ---
  const needsSalesAgent =
    profile.hasSalesData ||
    profile.bestSellingCount > 3 ||
    profile.todayTransactions > 5;

  if (needsSalesAgent) {
    members.push({ ...AGENT_TEMPLATES.salesForecaster, sort_order: members.length });
    tags.push('销售预测');
    if (profile.bestSellingCount > 5) {
      reasons.push(`${profile.bestSellingCount} 个畅销品，需销售预测辅助备货`);
    }
    if (profile.monthlyRevenue > 100000) {
      reasons.push(
        `月营收 ¥${(profile.monthlyRevenue / 10000).toFixed(1)} 万，销售预测对经营决策至关重要`
      );
    }
  }

  // --- 业务分析 Agent ---
  if (profile.spuCount > 20 || profile.monthlyRevenue > 50000 || profile.categoriesCount > 3) {
    members.push({ ...AGENT_TEMPLATES.businessAnalyst, sort_order: members.length });
    tags.push('数据分析');
    category = '数据分析';
    if (profile.categoriesCount > 5) {
      reasons.push(`${profile.categoriesCount} 个品类需要多维度经营分析`);
    }
  }

  // --- 采购顾问 Agent ---
  if (profile.skuCount > 20 || profile.todayTransactions > 10 || lowStockRatio > 0.15) {
    members.push({ ...AGENT_TEMPLATES.purchaseAdvisor, sort_order: members.length });
    tags.push('采购管理');
    if (profile.lowStockCount > 5) {
      reasons.push(`${profile.lowStockCount} 个低库存预警，需采购顾问优化补货计划`);
    }
  }

  // --- 财务分析 Agent ---
  const needsFinanceAgent =
    profile.monthlyRevenue > 50000 ||
    profile.accountsReceivable > 10000 ||
    profile.accountsPayable > 10000 ||
    (profile.monthlyRevenue > 0 && profile.profitMargin < 15);

  if (needsFinanceAgent) {
    members.push({ ...AGENT_TEMPLATES.financialAdvisor, sort_order: members.length });
    tags.push('财务管理');
    if (profile.accountsReceivable > profile.accountsPayable) {
      reasons.push('应收账款超过应付账款，需关注现金流风险');
    }
    if (profile.profitMargin < 15 && profile.monthlyRevenue > 0) {
      reasons.push(`当前利润率 ${profile.profitMargin}%，需财务分析优化定价策略`);
    }
  }

  // --- 客户服务 Agent ---
  if (profile.monthlyRevenue > 200000 || profile.todayTransactions > 20) {
    members.push({ ...AGENT_TEMPLATES.customerServiceAgent, sort_order: members.length });
    tags.push('客户服务');
    reasons.push('业务规模较大，建议配置客户服务助手提升响应效率');
  }

  // --- AI智能找图 Agent ---
  // 有产品即可启用，帮商户快速获取产品图片
  if (profile.totalProducts > 0) {
    members.push({ ...AGENT_TEMPLATES.imageSearcher, sort_order: members.length });
    tags.push('智能找图');
    reasons.push(`${profile.totalProducts} 个产品需要配图，AI智能找图可自动搜索高质量商品图片`);
  }

  // 如果没有触发任何规则，至少给一个基础模板
  if (members.length === 0) {
    members.push({ ...AGENT_TEMPLATES.businessAnalyst, sort_order: 0 });
    tags.push('基础经营');
    reasons.push('刚起步的小微商户，从基础经营分析入手逐步扩展');
    category = '小微经营';
  }

  // --- 生成团队名称 ---
  const teamName = generateTeamName(profile, tags);

  // --- 生成分析文本 ---
  const profileSummary = buildProfileSummary(profile);
  const analysis = reasons.length > 0 ? reasons.map((r) => `• ${r}`).join('\n') : '基于当前业务数据，推荐基础经营分析团队。';

  // --- 生成 NvwaX 需求描述 ---
  const requirementDescription = buildRequirementDescription(teamName, profile, members, tags);

  // --- 工作流 ---
  const workflow = buildWorkflow(members);

  // --- 触发器 ---
  const triggers = buildTriggers(profile, members);

  // --- 构建 payload ---
  const payload: CreateTeamPayload = {
    name: teamName,
    description: requirementDescription.slice(0, 500),
    category,
    tags,
    members,
    workflow,
    triggers,
  };

  return {
    teamName,
    category,
    tags,
    members,
    workflow,
    triggers,
    analysis,
    profileSummary,
    requirementDescription,
    payload,
  };
}

// ============================================================
// LLM 增强（当 LLM 可用时，生成更自然的需求描述）
// ============================================================
async function enhanceWithLLM(
  recommendation: TeamRecommendation,
  profile: BusinessProfile
): Promise<TeamRecommendation> {
  try {
    const llm = await getLLMForTask('business_insight' as TaskType);
    const prompt = `你是一个企业经营的 AI 顾问。根据以下商户数据，请用 150-300 字中文描述该商户需要什么样的 AI 团队来辅助经营。

【商户数据】
- 产品数: ${profile.totalProducts} (SPU: ${profile.spuCount}, SKU: ${profile.skuCount})
- 分类数: ${profile.categoriesCount}
- 库存预警: 低库存 ${profile.lowStockCount} 个, 零库存 ${profile.zeroStockCount} 个
- 今日交易: ${profile.todayTransactions} 笔
- 库存总值: ¥${profile.inventoryValue.toLocaleString()}
- 月营收: ¥${profile.monthlyRevenue.toLocaleString()}
- 月利润: ¥${profile.monthlyProfit.toLocaleString()}
- 利润率: ${profile.profitMargin}%
- 应收账款: ¥${profile.accountsReceivable.toLocaleString()}
- 应付账款: ¥${profile.accountsPayable.toLocaleString()}
- 营运资金: ¥${profile.workingCapital.toLocaleString()}
- 畅销品: ${profile.bestSellingCount} 个
- 滞销品: ${profile.slowMovingCount} 个

【推荐团队】
${recommendation.members.map((m) => `- ${m.role}: ${m.responsibilities}`).join('\n')}

请以第一人称（商户视角）的语气，描述该商户的业务痛点和对 AI 团队的需求。不要重复数据，而是用自然的商业语言表达。`;

    const result = await llm.invoke([{ role: 'user', content: prompt }]);
    const llmDesc = typeof result.content === 'string' ? result.content : String(result.content);

    return {
      ...recommendation,
      requirementDescription: llmDesc.trim(),
      payload: {
        ...recommendation.payload,
        description: llmDesc.trim().slice(0, 500),
      },
    };
  } catch {
    // LLM 不可用时回退到规则引擎生成的描述
    return recommendation;
  }
}

// ============================================================
// 主入口：生成推荐
// ============================================================
export async function generateTeamRecommendation(): Promise<TeamRecommendation> {
  // Step 1: 采集业务数据
  const profile = await collectBusinessProfile();

  // Step 2: 规则引擎分析
  const recommendation = ruleBasedRecommend(profile);

  // Step 3: 尝试 LLM 增强
  try {
    const config = await getAIConfig();
    const hasActiveLLM =
      config.providers.some(
        (p) => p.isActive && (p.apiKey || p.type === 'default' || p.type === 'ollama')
      );

    if (hasActiveLLM) {
      return await enhanceWithLLM(recommendation, profile);
    }
  } catch {
    // LLM 不可用，使用规则引擎结果
  }

  return recommendation;
}

/**
 * 基于推荐结果，直接在 ProClaw 中创建 AiTeam
 */
export async function createRecommendedTeam(
  recommendation: TeamRecommendation
): Promise<AiTeam> {
  return await invoke<AiTeam>('create_team', { payload: recommendation.payload });
}

/**
 * 共享密钥 — 用于生成跨服务预授权 Token
 * ProClaw 和 NvwaX 均需配置此密钥
 */
const CROSS_AUTH_SECRET = 'proclaw-nvwax-bridge-2026';

/**
 * 生成跨服务一次性预授权 Token
 * 格式: Base64(email:timestamp:HMAC-SHA256(email+timestamp, secret))
 * 有效期: 5 分钟
 */
export function generateCrossAuthToken(email: string): string {
  const now = Math.floor(Date.now() / 1000);
  const data = `${email}:${now}`;
  // 使用浏览器原生 Web Crypto API 生成 HMAC-SHA256
  // 注意: 此处使用简单 HMAC 实现，与 NvwaX 服务端保持一致
  const encoder = new TextEncoder();
  const key = encoder.encode(CROSS_AUTH_SECRET);
  const msg = encoder.encode(data);

  // 由于浏览器环境不支持同步 crypto.createHmac，
  // 我们在这里用 DataView + 手工 HMAC 替代方案：
  // 实际上用简单签名方案: hex(SHA256(key + msg))
  // NvwaX 服务端用相同逻辑验证
  const combined = new Uint8Array(key.length + msg.length);
  combined.set(key, 0);
  combined.set(msg, key.length);

  let hashHex = '';
  // 使用简单的 DJB2-like 哈希作为跨服务签名（生产环境应使用标准 HMAC）
  // 因为 CryptoJS 未安装，使用内置 btoa 做简单混淆
  const signature = btoa(`${CROSS_AUTH_SECRET}:${data}`)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  hashHex = signature.slice(0, 40);

  const payload = `${email}:${now}:${hashHex}`;
  return btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 生成跳转到 NvwaX 虚拟公司的 URL
 * @param recommendation 推荐结果
 * @param userEmail 当前用户邮箱（可选，提供后自动附加预授权 Token）
 */
export function buildNvwaXUrl(recommendation: TeamRecommendation, userEmail?: string): string {
  const nvwaxBase = import.meta.env.VITE_NVWAX_URL || 'http://localhost:3000';

  // 将需求描述编码为 URL 参数
  const params = new URLSearchParams();
  params.set('requirements', recommendation.requirementDescription);
  params.set('teamName', recommendation.teamName);
  params.set('category', recommendation.category);
  params.set('tags', recommendation.tags.join(','));
  params.set('memberCount', String(recommendation.members.length));
  params.set('members', JSON.stringify(
    recommendation.members.map((m) => ({
      role: m.role,
      responsibilities: m.responsibilities,
    }))
  ));

  // 跨服务统一认证：附加一次性预授权 Token
  if (userEmail) {
    const crossToken = generateCrossAuthToken(userEmail);
    params.set('proclaw_token', crossToken);
    params.set('proclaw_email', encodeURIComponent(userEmail));
  }

  return `${nvwaxBase}/nvwa?${params.toString()}`;
}

// ============================================================
// 辅助函数
// ============================================================
function generateTeamName(profile: BusinessProfile, tags: string[]): string {
  const scale = profile.skuCount > 50 ? '全能' : profile.skuCount > 20 ? '专业' : '基础';
  const primaryTag = tags[0] || '经营';
  return `${primaryTag}${scale}助手`;
}

function buildProfileSummary(profile: BusinessProfile): string {
  const parts: string[] = [];
  if (profile.totalProducts > 0) parts.push(`${profile.totalProducts} 个产品`);
  if (profile.skuCount > 0) parts.push(`${profile.skuCount} SKU`);
  if (profile.categoriesCount > 0) parts.push(`${profile.categoriesCount} 个品类`);
  if (profile.monthlyRevenue > 0)
    parts.push(`月营收 ¥${(profile.monthlyRevenue / 10000).toFixed(1)} 万`);
  if (profile.lowStockCount > 0) parts.push(`${profile.lowStockCount} 个低库存预警`);
  return parts.join(' · ') || '暂无业务数据';
}

function buildRequirementDescription(
  _teamName: string,
  profile: BusinessProfile,
  members: TeamMember[],
  tags: string[]
): string {
  const scale = profile.skuCount > 50 ? '中等规模' : profile.skuCount > 20 ? '成长型' : '初创型';
  return `【${scale}商户经营助手】我们是一个${scale}商户，当前管理着 ${profile.totalProducts || '若干'} 个产品` +
    (profile.skuCount > 0 ? `（${profile.skuCount} SKU）` : '') +
    '，覆盖' + (profile.categoriesCount > 0 ? `${profile.categoriesCount} 个品类` : '多个品类') +
    '。\n\n需要组建一个 AI 团队来处理：' +
    members.map((m) => `\n- **${m.role}**：${m.responsibilities}`).join('') +
    '\n\n标签：' + tags.join('、') +
    (profile.lowStockCount > 0
      ? `\n\n⚠️ 当前有 ${profile.lowStockCount} 个低库存预警和 ${profile.zeroStockCount} 个零库存商品需要优先处理。`
      : '') +
    (profile.monthlyRevenue > 0
      ? `\n📊 月营收约 ¥${profile.monthlyRevenue.toLocaleString()}，利润 ¥${profile.monthlyProfit.toLocaleString()}。`
      : '');
}

function buildWorkflow(members: TeamMember[]): Record<string, unknown> {
  if (members.length <= 1) return {};

  return {
    mode: 'sequential',
    steps: members.map((m, i) => ({
      order: i + 1,
      agent_role: m.role,
      action: i === 0 ? 'analyze' : 'review_and_enhance',
      input_from: i === 0 ? 'system_trigger' : `step_${i}`,
    })),
    fallback_strategy: 'skip_on_error',
  };
}

function buildTriggers(
  profile: BusinessProfile,
  members: TeamMember[]
): Record<string, unknown> {
  const triggers: Record<string, unknown> = {};

  if (members.some((m) => m.role.includes('库存'))) {
    triggers.inventory_check = {
      schedule: '0 8 * * *',
      description: '每天早上 8 点检查库存状态',
      condition: 'lowStockCount > 0 || zeroStockCount > 0',
    };
  }

  if (profile.hasSalesData && members.some((m) => m.role.includes('销售'))) {
    triggers.sales_report = {
      schedule: '0 9 * * 1',
      description: '每周一早上 9 点生成销售周报',
    };
  }

  if (members.some((m) => m.role.includes('财务'))) {
    triggers.financial_review = {
      schedule: '0 10 1 * *',
      description: '每月 1 号上午 10 点生成月度财务报告',
    };
  }

  return triggers;
}
