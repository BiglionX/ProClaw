/**
 * Hermes Skills - 预设技能集
 *
 * 覆盖 ProClaw 25+ Bundle 中最高频的 8 个业务场景。
 * 这些 Skill 在首次启动时由 SkillStore.upsertMany 导入,
 * agentName 字段保留以备 P0-B 的"按 Agent 过滤"使用。
 *
 * 命名规则:sk_preset_<场景>_<动作>
 *
 * 重要:Tool 名称必须与 src/lib/agents/*Agent.ts 中 Tool.name 完全一致。
 *      P0-A 阶段部分 Tool 尚不存在,这里用语义化命名 + 占位 exampleInvocation,
 *      真实 Tool 接入由后续 P0-B 阶段补齐(或在使用时按 name 反查)。
 */

import type { SkillUpsertInput } from './types';

export const PRESET_SKILLS: SkillUpsertInput[] = [
  /* ============== 1. 库存预警 ============== */
  {
    id: 'sk_preset_inventory_alert',
    name: '查询低库存商品',
    description:
      '当用户询问"哪些商品快卖完了 / 需要补货 / 库存不足"时使用,返回当前库存低于安全线的商品清单。',
    triggerPhrases: [
      '库存不足', '快卖完了', '哪些商品要补货', '缺货', '低库存',
      '安全库存', '补货提醒', '哪些快没了', '库存告警',
    ],
    toolTemplates: [
      {
        toolName: 'inventory_query_low_stock',
        inputSchema: { type: 'object', properties: { threshold: { type: 'number' } } },
        exampleInvocation: '{"threshold": 10}',
        whenToUse: '查询低库存商品',
        order: 1,
      },
      {
        toolName: 'product_list',
        inputSchema: { type: 'object', properties: { categoryId: { type: 'string' }, lowStockOnly: { type: 'boolean' } } },
        exampleInvocation: '{"lowStockOnly": true}',
        whenToUse: '列出所有低库存产品',
        order: 2,
      },
    ],
    systemPromptAddition:
      '回答时按"商品名称 / 当前库存 / 安全库存 / 建议补货量"四列展示,并提示最紧迫的 3 个 SKU。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['inventory', 'stock', 'replenishment', '库存', '补货'],
  },

  /* ============== 2. 销售汇总 ============== */
  {
    id: 'sk_preset_sales_summary',
    name: '销售数据汇总',
    description: '当用户询问"今天/本周/本月销售怎么样 / 营业额 / 销量"时使用,按时间维度汇总销售数据。',
    triggerPhrases: [
      '销售汇总', '销售数据', '营业额', '今天卖了多少', '本周销量',
      '本月业绩', '销售报表', '营收', '上周卖了什么',
    ],
    toolTemplates: [
      {
        toolName: 'sales_summary',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string', enum: ['today', 'week', 'month', 'custom'] },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
        },
        exampleInvocation: '{"period": "week"}',
        whenToUse: '汇总销售数据',
        order: 1,
      },
      {
        toolName: 'sales_top_products',
        inputSchema: { type: 'object', properties: { period: { type: 'string' }, limit: { type: 'number' } } },
        exampleInvocation: '{"period": "month", "limit": 10}',
        whenToUse: '同时给出销量 Top N',
        order: 2,
      },
    ],
    systemPromptAddition:
      '回答时同时给出:总销售额、订单数、客单价、与上期对比的增减幅;如有 Top N 商品列表,一并展示。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['sales', 'revenue', 'report', '销售', '营收'],
  },

  /* ============== 3. 客户跟进 ============== */
  {
    id: 'sk_preset_crm_followup',
    name: '查找需跟进的客户',
    description:
      '当用户询问"哪些客户很久没联系 / 即将过生日 / 有未读消息 / 跟进提醒"时使用,返回待跟进的客户清单。',
    triggerPhrases: [
      '客户跟进', '哪些客户没联系', '跟进提醒', '客户回访',
      '哪些要回访', '最近谁没来', '过生日的客户', '沉睡客户',
    ],
    toolTemplates: [
      {
        toolName: 'crm_query_followup',
        inputSchema: {
          type: 'object',
          properties: {
            criteria: { type: 'string', enum: ['no_contact', 'birthday', 'inactive', 'unread'] },
            days: { type: 'number' },
          },
        },
        exampleInvocation: '{"criteria": "no_contact", "days": 30}',
        whenToUse: '查询待跟进客户',
        order: 1,
      },
      {
        toolName: 'crm_send_message',
        inputSchema: { type: 'object', properties: { contactId: { type: 'string' }, template: { type: 'string' } } },
        exampleInvocation: '{"contactId": "c_xxx", "template": "birthday_greeting"}',
        whenToUse: '需要给客户发消息时',
        order: 2,
      },
    ],
    systemPromptAddition:
      '按"客户名 / 最后联系时间 / 建议话术"展示;用户同意后自动用 crm_send_message 工具发送,不要直接生成虚构的发送结果。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['crm', 'followup', 'customer', '客户', '跟进'],
  },

  /* ============== 4. 补货建议 ============== */
  {
    id: 'sk_preset_replenish_suggest',
    name: '生成补货建议单',
    description:
      '基于销售预测 + 当前库存 + 安全库存,生成需要采购的商品清单,适合"帮我看看要进哪些货"。',
    triggerPhrases: [
      '补货建议', '采购清单', '要进哪些货', '需要采购',
      '帮我下单', '建议补货', '自动补货',
    ],
    toolTemplates: [
      {
        toolName: 'inventory_optimizer_suggest',
        inputSchema: { type: 'object', properties: { horizonDays: { type: 'number' } } },
        exampleInvocation: '{"horizonDays": 14}',
        whenToUse: '生成补货建议',
        order: 1,
      },
      {
        toolName: 'purchase_order_create',
        inputSchema: { type: 'object', properties: { items: { type: 'array' }, supplierId: { type: 'string' } } },
        exampleInvocation: '{"items": [{"productId":"p_1","qty":50}]}',
        whenToUse: '用户确认后创建采购单',
        order: 2,
      },
    ],
    systemPromptAddition:
      '先展示建议清单(商品/建议量/预估金额),明确询问用户是否生成采购单,在用户确认前不要调用 purchase_order_create。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['inventory', 'purchase', 'replenishment', '采购', '补货'],
  },

  /* ============== 5. 财务对账 ============== */
  {
    id: 'sk_preset_finance_reconcile',
    name: '财务对账与账户余额',
    description:
      '查询账户余额、最近交易、未对账条目,适合"账户余额 / 对账 / 这个月花了多少 / 收支明细"。',
    triggerPhrases: [
      '账户余额', '对账', '收支明细', '花了多少', '收支',
      '交易记录', '本月账单', '账目', '发票',
    ],
    toolTemplates: [
      {
        toolName: 'finance_account_balance',
        inputSchema: { type: 'object', properties: { accountId: { type: 'string' } } },
        exampleInvocation: '{}',
        whenToUse: '查询账户余额',
        order: 1,
      },
      {
        toolName: 'finance_transaction_list',
        inputSchema: {
          type: 'object',
          properties: {
            period: { type: 'string' },
            unreconciledOnly: { type: 'boolean' },
          },
        },
        exampleInvocation: '{"period": "month"}',
        whenToUse: '列出交易',
        order: 2,
      },
    ],
    systemPromptAddition:
      '展示余额时同时给出"对比上月变动"与"未对账条目数",让商户一眼看到风险。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['finance', 'reconcile', 'accounting', '财务', '对账'],
  },

  /* ============== 6. 预约改期(美业) ============== */
  {
    id: 'sk_preset_beauty_reschedule',
    name: '美业预约改期',
    description:
      '美业/宠物/餐饮等行业通用的"改预约"流程:查询原预约 → 检查冲突 → 提议新时段 → 用户确认后改。',
    triggerPhrases: [
      '改预约', '改时间', '改期', '预约改期', '取消预约',
      '重新预约', '换时间', '改天',
    ],
    toolTemplates: [
      {
        toolName: 'booking_query',
        inputSchema: { type: 'object', properties: { bookingId: { type: 'string' }, contactId: { type: 'string' } } },
        exampleInvocation: '{"bookingId": "b_xxx"}',
        whenToUse: '查询要改期的预约',
        order: 1,
      },
      {
        toolName: 'booking_check_availability',
        inputSchema: {
          type: 'object',
          properties: { serviceId: { type: 'string' }, datetime: { type: 'string' } },
        },
        exampleInvocation: '{"serviceId": "s_xxx", "datetime": "2026-07-08T14:00:00"}',
        whenToUse: '检查新时段是否冲突',
        order: 2,
      },
      {
        toolName: 'booking_update',
        inputSchema: {
          type: 'object',
          properties: { bookingId: { type: 'string' }, newDatetime: { type: 'string' } },
        },
        exampleInvocation: '{"bookingId":"b_xxx","newDatetime":"2026-07-08T14:00:00"}',
        whenToUse: '用户确认后改期',
        order: 3,
      },
    ],
    systemPromptAddition:
      '严格执行三步:先确认原预约、再给 3 个可选时段、最后用户确认才调用 booking_update。任何一步没确认前都不要直接修改。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['booking', 'beauty', 'pet', 'catering', '改期', '预约'],
  },

  /* ============== 7. 社群发券 ============== */
  {
    id: 'sk_preset_social_coupon',
    name: '社群优惠券发放',
    description:
      '在微信群/社群发优惠券:选模板 → 配置规则 → 预览 → 用户确认后推送。',
    triggerPhrases: [
      '发优惠券', '社群发券', '发券', '推送优惠', '群发优惠',
      '优惠活动', '生成优惠券', '社群营销',
    ],
    toolTemplates: [
      {
        toolName: 'coupon_template_list',
        inputSchema: { type: 'object', properties: { status: { type: 'string' } } },
        exampleInvocation: '{"status": "active"}',
        whenToUse: '查询可用券模板',
        order: 1,
      },
      {
        toolName: 'coupon_create',
        inputSchema: {
          type: 'object',
          properties: {
            templateId: { type: 'string' },
            rules: { type: 'object' },
            channel: { type: 'string' },
          },
        },
        exampleInvocation: '{"templateId":"ct_1","rules":{"discount":20,"minSpend":100},"channel":"wechat_group"}',
        whenToUse: '生成优惠券批次',
        order: 2,
      },
      {
        toolName: 'social_publish_coupon',
        inputSchema: { type: 'object', properties: { batchId: { type: 'string' }, groupIds: { type: 'array' } } },
        exampleInvocation: '{"batchId":"cb_1","groupIds":["g_1","g_2"]}',
        whenToUse: '推到指定群',
        order: 3,
      },
    ],
    systemPromptAddition:
      '必须三步:1) 选券模板;2) 用户确认规则与目标群;3) 才发布。未确认前只展示预览,不要调用 social_publish_coupon。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['marketing', 'coupon', 'social', '社群', '营销'],
  },

  /* ============== 8. 数据导出 ============== */
  {
    id: 'sk_preset_export_data',
    name: '导出业务数据',
    description:
      '把销售/库存/客户/财务数据导出为 CSV / Excel,适合"导出销售明细 / 给我 Excel"。',
    triggerPhrases: [
      '导出', '下载数据', '导出 Excel', '导出 CSV', '给我表格',
      '报表导出', '导出销售', '导出客户', '导出库存',
    ],
    toolTemplates: [
      {
        toolName: 'export_create_job',
        inputSchema: {
          type: 'object',
          properties: {
            dataType: { type: 'string', enum: ['sales', 'inventory', 'customers', 'finance'] },
            period: { type: 'string' },
            format: { type: 'string', enum: ['csv', 'xlsx'] },
          },
        },
        exampleInvocation: '{"dataType":"sales","period":"2026-06","format":"xlsx"}',
        whenToUse: '创建导出任务',
        order: 1,
      },
      {
        toolName: 'export_get_link',
        inputSchema: { type: 'object', properties: { jobId: { type: 'string' } } },
        exampleInvocation: '{"jobId":"ej_1"}',
        whenToUse: '获取下载链接',
        order: 2,
      },
    ],
    systemPromptAddition:
      '导出任务为异步,告知用户大概等待时间;提示成功后给下载链接(由 export_get_link 返回),不要自己捏造 URL。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['export', 'report', 'download', '导出', '报表'],
  },

  /* ============== 9. 虚拟公司 · NvWaX 官方 ============== */
  //
  // CEO Agent 识别到用户希望「创建虚拟公司 / AI 团队 / 一人公司」意图时,
  // 自动加载本 Skill。toolTemplates 中的 open_virtual_company_page 是一个
  // 真实的 Tauri 命令:ProClaw 内嵌 NvWaX 虚拟公司插件,跳转 /vc/wizard 路由
  // 让用户在本地完成 NvWaX 模板浏览 → 导入 → 团队运行的完整闭环。
  //
  // 配套文档:docs/integration/NVWAX_INTEGRATION.md
  {
    id: 'sk_preset_open_virtual_company_wizard',
    name: '创建虚拟公司（NvWaX）',
    description:
      '当用户表示要"创建/搭建/开一家公司的 AI 团队 / 虚拟公司 / 一人公司"时使用。' +
      '调用 open_virtual_company_page 打开虚拟公司向导页面,用户可浏览 NvWaX 模板、' +
      '在 NvWaX 云端完成对话式创建、回到 ProClaw 一键导入本地运行。',
    triggerPhrases: [
      '创建虚拟公司', '搭建虚拟公司', '开个AI团队', '建一个AI团队',
      '一人公司', 'AI公司', '我的AI公司', '虚拟公司', 'AI团队',
      '创业团队', '开个公司', '建个团队', '智能体团队', 'AI团队搭建',
      '想开一个', '想建一个团队', '帮忙创建一个', '建一个虚拟公司',
      'team of agents', 'AI workforce', 'create virtual company',
    ],
    toolTemplates: [
      {
        toolName: 'open_virtual_company_page',
        inputSchema: {
          type: 'object',
          properties: {
            target: {
              type: 'string',
              enum: ['wizard', 'import', 'companies'],
              description:
                '目标页面:wizard 创建向导(默认) | import 导入团队 | companies 我的团队',
            },
          },
        },
        exampleInvocation: '{"target":"wizard"}',
        whenToUse: '用户希望开始创建或管理虚拟公司',
        order: 1,
      },
    ],
    systemPromptAddition:
      '识别到用户要创建虚拟公司/AI 团队时,调用 open_virtual_company_page tool(Tauri 命令) ' +
      '并把 target 设为 wizard。**不要尝试直接帮用户在对话里设计团队结构**——' +
      '那需要 NvWaX 的对话式 AI,本地无法完成。告诉用户:「已为你打开虚拟公司创建向导,跟着 NvWaX 的引导 5-10 分钟就能拿到一个完整的 AI 团队」。',
    source: 'preset',
    status: 'active',
    version: 1,
    tags: ['virtual-company', 'NvWaX', 'ai-team', 'one-person-company', '虚拟公司', 'AI团队', '官方'],
  },
];

/** 导入预设技能的便捷方法 */
export function getPresetSkillIds(): string[] {
  return PRESET_SKILLS.map((s) => s.id!).filter(Boolean);
}