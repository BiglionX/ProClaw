/**
 * Storybook Fixtures
 *
 * 提供丰富的演示数据,覆盖各组件的常见 / 边界场景。
 * 直接 import 使用,无需依赖 HermesApi 实例。
 */

import type {
  Skill,
  SkillStatus,
  SkillSource,
  ScoredSkill,
  EvolutionLogEntry,
  ExecutionTrace,
  MoAProposal,
  MoAResult,
} from '../../../lib/hermes';

/* =========================== Skills =========================== */

/** 完整预设技能(8 个,来自 presetSkills.ts) */
const presetSkillNames: Array<Pick<Skill, 'id' | 'name' | 'description' | 'triggerPhrases' | 'tags' | 'toolTemplates' | 'systemPromptAddition'>> = [
  {
    id: 'sk_preset_inventory_alert',
    name: '查询低库存商品',
    description: '当用户询问"哪些商品快卖完了"时,返回当前库存低于安全线的的商品清单。',
    triggerPhrases: ['库存不足', '快卖完了', '哪些商品要补货'],
    tags: ['inventory', 'stock', '库存', '补货'],
    toolTemplates: [
      { toolName: 'inventory_query_low_stock', inputSchema: {}, exampleInvocation: '{"threshold":10}', order: 1 },
    ],
    systemPromptAddition: '回答时按"商品名称 / 当前库存 / 安全库存 / 建议补货量"四列展示。',
  },
  {
    id: 'sk_preset_sales_summary',
    name: '销售数据汇总',
    description: '按时间维度汇总销售数据。',
    triggerPhrases: ['销售汇总', '销售数据', '营业额'],
    tags: ['sales', 'revenue', '销售', '营收'],
    toolTemplates: [
      { toolName: 'sales_summary', inputSchema: {}, exampleInvocation: '{"period":"week"}', order: 1 },
    ],
    systemPromptAddition: '同时给出总销售额、订单数、客单价。',
  },
  {
    id: 'sk_preset_crm_followup',
    name: '查找需跟进的客户',
    description: '返回待跟进的客户清单。',
    triggerPhrases: ['客户跟进', '哪些客户没联系', '跟进提醒'],
    tags: ['crm', 'followup', '客户'],
    toolTemplates: [
      { toolName: 'crm_query_followup', inputSchema: {}, exampleInvocation: '{"criteria":"no_contact"}', order: 1 },
    ],
    systemPromptAddition: '按"客户名 / 最后联系时间"展示。',
  },
  {
    id: 'sk_preset_replenish_suggest',
    name: '生成补货建议单',
    description: '基于销售预测生成需要采购的商品清单。',
    triggerPhrases: ['补货建议', '采购清单', '要进哪些货'],
    tags: ['inventory', 'purchase', '采购'],
    toolTemplates: [
      { toolName: 'inventory_optimizer_suggest', inputSchema: {}, exampleInvocation: '{}', order: 1 },
    ],
    systemPromptAddition: '展示建议清单,明确询问用户是否生成采购单。',
  },
  {
    id: 'sk_preset_finance_reconcile',
    name: '财务对账',
    description: '查询账户余额、最近交易。',
    triggerPhrases: ['账户余额', '对账', '收支明细'],
    tags: ['finance', '对账'],
    toolTemplates: [
      { toolName: 'finance_account_balance', inputSchema: {}, exampleInvocation: '{}', order: 1 },
    ],
    systemPromptAddition: '',
  },
  {
    id: 'sk_preset_beauty_reschedule',
    name: '美业预约改期',
    description: '美业预约改期流程。',
    triggerPhrases: ['改预约', '改时间', '改期'],
    tags: ['booking', 'beauty', '改期'],
    toolTemplates: [
      { toolName: 'booking_query', inputSchema: {}, exampleInvocation: '{}', order: 1 },
      { toolName: 'booking_update', inputSchema: {}, exampleInvocation: '{}', order: 2 },
    ],
    systemPromptAddition: '严格执行三步:确认原预约 / 给候选时段 / 用户确认后改。',
  },
  {
    id: 'sk_preset_social_coupon',
    name: '社群发券',
    description: '在微信群发优惠券。',
    triggerPhrases: ['发优惠券', '社群发券', '发券'],
    tags: ['marketing', 'coupon', '社群'],
    toolTemplates: [
      { toolName: 'coupon_template_list', inputSchema: {}, exampleInvocation: '{}', order: 1 },
      { toolName: 'coupon_create', inputSchema: {}, exampleInvocation: '{}', order: 2 },
    ],
    systemPromptAddition: '必须三步:选券模板 / 用户确认 / 才发布。',
  },
  {
    id: 'sk_preset_export_data',
    name: '导出业务数据',
    description: '导出销售/库存/客户数据。',
    triggerPhrases: ['导出', '下载数据', '导出 Excel'],
    tags: ['export', '导出'],
    toolTemplates: [
      { toolName: 'export_create_job', inputSchema: {}, exampleInvocation: '{}', order: 1 },
    ],
    systemPromptAddition: '',
  },
];

function makeSkill(
  data: typeof presetSkillNames[number],
  overrides: Partial<Skill> = {},
): Skill {
  const now = new Date().toISOString();
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    triggerPhrases: data.triggerPhrases,
    toolTemplates: data.toolTemplates,
    systemPromptAddition: data.systemPromptAddition,
    source: 'preset',
    status: 'active',
    version: 1,
    usageCount: 0,
    successCount: 0,
    failureCount: 0,
    createdAt: now,
    updatedAt: now,
    tags: data.tags,
    ...overrides,
  };
}

export const FIXTURE_SKILLS: Skill[] = presetSkillNames.map((p) => makeSkill(p));

/* =========================== Pending Review =========================== */

export const FIXTURE_PENDING_SKILLS: Skill[] = [
  makeSkill(
    {
      id: 'sk_pending_membership_renewal',
      name: '会员到期提醒',
      description: '检测即将到期的会员卡,自动生成续费话术。',
      triggerPhrases: ['会员到期', '续费提醒', '哪些要续费'],
      tags: ['membership', 'renewal', '会员'],
      toolTemplates: [
        { toolName: 'membership_query_expiring', inputSchema: {}, exampleInvocation: '{"days": 30}', order: 1 },
      ],
      systemPromptAddition: '展示时按到期时间升序,前 5 个最紧迫的会员。',
    },
    {
      id: 'sk_pending_membership_renewal',
      source: 'learned',
      status: 'pending_review',
      version: 1,
    },
  ),
  makeSkill(
    {
      id: 'sk_pending_supplier_price',
      name: '供应商价格对比',
      description: '对比同商品在不同供应商的报价,生成最优采购建议。',
      triggerPhrases: ['哪家便宜', '供应商对比', '采购价比'],
      tags: ['purchase', 'supplier', '对比'],
      toolTemplates: [
        { toolName: 'supplier_compare_prices', inputSchema: {}, exampleInvocation: '{}', order: 1 },
      ],
      systemPromptAddition: '至少对比 3 家供应商,标注差异 > 10% 的商品。',
    },
    {
      id: 'sk_pending_supplier_price',
      source: 'learned',
      status: 'pending_review',
      version: 1,
    },
  ),
];

/* =========================== AI-learned skills (mixed status) =========================== */

export const FIXTURE_LEARNED_SKILLS: Skill[] = [
  makeSkill(
    {
      id: 'sk_learned_holiday_greeting',
      name: '节日祝福模板',
      description: '根据节日生成针对性祝福话术,可发到客户群。',
      triggerPhrases: ['节日祝福', '节日文案'],
      tags: ['marketing', 'holiday'],
      toolTemplates: [],
      systemPromptAddition: '',
    },
    {
      id: 'sk_learned_holiday_greeting',
      source: 'learned',
      status: 'active',
      version: 2,
      parentVersion: 1,
      usageCount: 24,
      successCount: 21,
      failureCount: 3,
    },
  ),
  makeSkill(
    {
      id: 'sk_learned_lost_customer',
      name: '流失客户召回',
      description: '识别 90 天未购买的客户,生成召回话术。',
      triggerPhrases: ['流失客户', '召回', '沉睡客户'],
      tags: ['crm', 'churn'],
      toolTemplates: [],
      systemPromptAddition: '',
    },
    {
      id: 'sk_learned_lost_customer',
      source: 'learned',
      status: 'active',
      version: 3,
      parentVersion: 2,
      usageCount: 50,
      successCount: 35,
      failureCount: 15,
    },
  ),
  makeSkill(
    {
      id: 'sk_learned_vip_discount',
      name: 'VIP 客户折扣',
      description: '基于消费金额自动匹配折扣策略。',
      triggerPhrases: ['VIP 折扣', '高级客户优惠'],
      tags: ['vip', 'discount'],
      toolTemplates: [],
      systemPromptAddition: '',
    },
    {
      id: 'sk_learned_vip_discount',
      source: 'optimized',
      status: 'pending_review',
      version: 4,
      parentVersion: 3,
      usageCount: 80,
      successCount: 65,
      failureCount: 15,
    },
  ),
];

/* =========================== Scored Skills (检索结果) =========================== */

export const FIXTURE_SCORED_SKILLS: ScoredSkill[] = FIXTURE_SKILLS.slice(0, 3).map(
  (s, i) => ({
    skill: s,
    bm25Score: -2.5 + i * 0.3,
    compositeScore: Number((0.85 - i * 0.15).toFixed(2)),
  }),
);

/* =========================== Evolution Log =========================== */

export const FIXTURE_EVOLUTION_LOG: EvolutionLogEntry[] = [
  {
    id: 12,
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    traceQuery: '帮我把客户的预约改到下周三',
    agentName: 'BeautyAgent',
    action: 'create',
    skillId: 'sk_learned_reschedule_v2',
    reasoning: '原技能没考虑"下周三"这种相对日期',
    signals: {
      outcome: 'failure',
      confidence: 0.85,
      toolSuccessRate: 0,
      llmOutputLooksConfident: false,
      durationPlausible: true,
      failureReason: 'LLM 把"下周三"理解成了固定的 2026-07-08',
    },
  },
  {
    id: 11,
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    traceQuery: '看看本月销售最好的商品',
    agentName: 'SalesAgent',
    action: 'optimize',
    skillId: 'sk_learned_holiday_greeting',
    reasoning: '成功率 87%,但用户反馈"推荐商品不准",加入品类过滤',
    signals: {
      outcome: 'success',
      confidence: 0.6,
      toolSuccessRate: 1,
      llmOutputLooksConfident: true,
      durationPlausible: true,
    },
  },
  {
    id: 10,
    timestamp: new Date(Date.now() - 10 * 60_000).toISOString(),
    traceQuery: '给老客户发一张生日优惠',
    agentName: 'CRMAgent',
    action: 'merge',
    skillId: 'sk_learned_holiday_greeting',
    sourceSkillIds: ['sk_learned_holiday_greeting_v1', 'sk_learned_birthday_v1'],
    reasoning: '两个技能都涉及"节日场景客户营销",合并为通用节日祝福',
    signals: {
      outcome: 'success',
      confidence: 0.5,
      toolSuccessRate: 1,
      llmOutputLooksConfident: true,
      durationPlausible: true,
    },
  },
  {
    id: 9,
    timestamp: new Date(Date.now() - 30 * 60_000).toISOString(),
    traceQuery: '查询本月财务报表',
    agentName: 'FinanceAgent',
    action: 'noop',
    reasoning: '已有技能覆盖,不需要新建',
  },
  {
    id: 8,
    timestamp: new Date(Date.now() - 60 * 60_000).toISOString(),
    traceQuery: '我想知道哪些客户最近没买东西',
    agentName: 'CRMAgent',
    action: 'skip',
    reasoning: '去重:24h 内已处理过类似 trace',
  },
  {
    id: 7,
    timestamp: new Date(Date.now() - 2 * 3600_000).toISOString(),
    traceQuery: '导出最近一个月的销售明细',
    agentName: 'ExportAgent',
    action: 'create',
    skillId: 'sk_learned_export_csv',
    reasoning: '发现新的导出场景:CSV 格式',
    error: undefined,
  },
  {
    id: 6,
    timestamp: new Date(Date.now() - 3 * 3600_000).toISOString(),
    traceQuery: '给客人发个优惠券',
    agentName: 'CouponAgent',
    action: 'create',
    skillId: 'sk_learned_one_coupon',
    reasoning: '原技能是批量发券,需优化为单客发券',
  },
  {
    id: 5,
    timestamp: new Date(Date.now() - 5 * 3600_000).toISOString(),
    traceQuery: '未匹配到任何技能',
    agentName: 'UnknownAgent',
    action: 'noop',
    reasoning: 'query 包含敏感词,跳过反思',
    error: 'LLM 返回包含 safety violation',
  },
];

/* =========================== MoA Result =========================== */

export const FIXTURE_MOA_PROPOSALS: MoAProposal[] = [
  {
    proposer: { providerId: 'fast', role: 'fast', weight: 0.3 },
    output: '建议本月发 5 张优惠券,目标复购。',
    success: true,
    durationMs: 380,
  },
  {
    proposer: { providerId: 'thorough', role: 'thorough', weight: 0.5 },
    output: '基于近 3 个月数据,生日月客户复购率 +18%,建议聚焦生日营销。',
    success: true,
    durationMs: 920,
  },
  {
    proposer: { providerId: 'creative', role: 'creative', weight: 0.2 },
    output: '可以试试"老带新裂变券",把复购率提升和新客拉新合并。',
    success: true,
    durationMs: 1100,
  },
];

export const FIXTURE_MOA_RESULT: MoAResult = {
  triggered: true,
  triggerReason: 'query 包含"分析"关键词',
  finalOutput:
    '综合 fast(简洁) + thorough(深度) + creative(创意) 三方观点,推荐聚焦在第三季度客户复购率提升,优先推送生日/节日优惠活动。',
  source: 'aggregator',
  confidence: 0.87,
  proposals: FIXTURE_MOA_PROPOSALS,
  verdictScores: [
    { providerId: 'fast', score: 6 },
    { providerId: 'thorough', score: 9 },
    { providerId: 'creative', score: 8 },
  ],
  totalDurationMs: 1200,
};

/* =========================== 全量 fixtures =========================== */

export interface HermesStoryFixtures {
  /** 完整预设技能(8 个) */
  presetSkills: Skill[];
  /** AI 学习的技能(混合 status) */
  learnedSkills: Skill[];
  /** 待审核技能 */
  pendingSkills: Skill[];
  /** 检索结果 */
  scoredSkills: ScoredSkill[];
  /** 进化日志 */
  evolutionLog: EvolutionLogEntry[];
  /** MoA 结果 */
  moaResult: MoAResult;
}

export const defaultFixtures: HermesStoryFixtures = {
  presetSkills: FIXTURE_SKILLS,
  learnedSkills: FIXTURE_LEARNED_SKILLS,
  pendingSkills: FIXTURE_PENDING_SKILLS,
  scoredSkills: FIXTURE_SCORED_SKILLS,
  evolutionLog: FIXTURE_EVOLUTION_LOG,
  moaResult: FIXTURE_MOA_RESULT,
};