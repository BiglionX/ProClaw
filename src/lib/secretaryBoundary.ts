/**
 * 秘书碰壁话术模块 (Boundary Handling)
 * 
 * 当老板向秘书提出越界的决策类请求时，秘书应：
 * 1. 礼貌拒绝
 * 2. 提供替代方案
 * 3. 引导至正确入口（CEO Agent 或对应子 Agent）
 */

// ==================== 碰壁规则定义 ====================

interface BoundaryRule {
  /** 匹配关键词（命中任一即触发） */
  keywords: string[];
  /** 碰壁回应模板 */
  response: string;
  /** 匹配优先级（数字越小优先级越高） */
  priority: number;
}

const BOUNDARY_RULES: BoundaryRule[] = [
  {
    keywords: ['下单', '下采购单', '下订单', '采购', '补货', '订货', '进货'],
    priority: 1,
    response: '老板，下单需要决策权限，我无法直接操作。不过我可以帮您整理好补货清单和库存数据，您确认后我转交给 CEO Agent 分派采购任务。需要我先拉取库存数据吗？',
  },
  {
    keywords: ['定价', '定什么价', '价格', '报价', '调价', '涨价', '降价'],
    priority: 2,
    response: '定价涉及市场策略，需要 CEO Agent 的决策判断。我可以提供同类产品的市场价参考和成本分析，帮您做判断参考。需要我查一下吗？',
  },
  {
    keywords: ['开除', '解雇', '辞退', '裁员', '炒', '降薪', '调岗'],
    priority: 3,
    response: '人事决策不在我的能力范围内，我不能参与。不过我可以帮您调取相关人员的绩效数据和工作记录供您参考。需要我查一下吗？',
  },
  {
    keywords: ['招聘', '招人', '雇佣', '面试'],
    priority: 4,
    response: '招聘决策需要 CEO Agent 统筹团队规划。我可以帮您查看当前团队的人员配置和工作负载情况，为决策提供数据参考。',
  },
  {
    keywords: ['营销方案', '推广方案', '广告', '促销活动', '营销策略'],
    priority: 5,
    response: '我不做主观判断哦～不过我可以帮您拉取同类活动的历史数据，看看之前的效果如何，给您提供数据参考。',
  },
  {
    keywords: ['投资', '融资', '贷款', '借钱'],
    priority: 6,
    response: '财务战略类决策需要 CEO Agent 和财务团队综合评估。我可以帮您整理当前的财务状况和现金流数据，方便您做判断。',
  },
  {
    keywords: ['预算', '花钱', '拨款', '经费'],
    priority: 7,
    response: '预算审批需要 CEO Agent 走审批流程。我可以帮您查看当前的预算执行情况和可用余额，供您参考。',
  },
  {
    keywords: ['你觉得', '你认为', '好不好', '行不行', '可不可以', '应不应该'],
    priority: 8,
    response: '我不做主观判断哦～不过我可以帮您整理相关数据和分析报告，让您基于数据做出判断。需要我查什么数据？',
  },
];

// ==================== 碰壁检测 ====================

/**
 * 检测用户输入是否触及边界
 * @param input 用户输入文本
 * @returns 如果命中规则，返回碰壁响应；否则返回 null
 */
export function checkBoundary(input: string): string | null {
  const matchedRules: BoundaryRule[] = [];

  for (const rule of BOUNDARY_RULES) {
    const hit = rule.keywords.some((keyword) => input.includes(keyword));
    if (hit) {
      matchedRules.push(rule);
    }
  }

  if (matchedRules.length === 0) {
    return null;
  }

  // 按优先级排序，返回最高优先级的回应
  matchedRules.sort((a, b) => a.priority - b.priority);
  return matchedRules[0].response;
}

/**
 * 判断是否是纯数据查询类请求（不触发碰壁）
 */
export function isDataQuery(input: string): boolean {
  const dataQueryKeywords = [
    '查询', '查看', '统计', '显示', '列出', '多少', '排行', '趋势',
    '对比', '占比', '分析', '报告', '汇总', '明细', '列表',
    '库存', '销售', '采购', '财务', '产品', '客户', '供应商',
    '订单', '营收', '毛利', '利润', '成本', '退货', '退款',
  ];
  return dataQueryKeywords.some((keyword) => input.includes(keyword));
}

/**
 * 获取碰壁话术统计信息
 */
export function getBoundaryRuleCount(): number {
  return BOUNDARY_RULES.length;
}

/**
 * 获取全部碰壁规则（用于调试和展示）
 */
export function getBoundaryRules(): Array<{ keywords: string[]; response: string }> {
  return BOUNDARY_RULES.map(({ keywords, response }) => ({ keywords, response }));
}
