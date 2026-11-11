/**
 * 统一助理 Agent 核心
 *
 * 合并「小如」商务秘书（数据查询/简报/日常辅助）与「CEO Agent」
 * （决策确认/PCP/任务分派/报告）能力，借鉴 Hermes Agent 模式：
 * - 意图路由：不再"碰壁拒绝并转交"，而是按意图分级内部处理
 * - 分层记忆：BAP 关注 KPI + CEO 偏好 + PCP 目标 合并为「老板画像」
 * - 决策闭环：识别决策意图 → 生成建议 → 确认/拒绝 → 写入决策日志
 */

import { getBapSummary } from './secretaryBap';
import {
  proclawContext,
  proclawTasks,
  proclawDecision,
  proclawLearning,
  type PcpEntry,
  type Task,
} from './ceoController';

// ==================== 类型定义 ====================

/** 统一助理的意图分类 */
export type AssistantIntent =
  /** 数据查询/日常问题：走原有 commandParser + LLM 流程 */
  | { type: 'query' }
  /** 决策类请求：生成建议并进入确认流程 */
  | { type: 'decision'; proposal: DecisionProposal }
  /** 任务类请求：分派/跟进任务 */
  | { type: 'task'; keyword: string }
  /** PCP 上下文类请求：记录/查看目标愿景 */
  | { type: 'context'; keyword: string }
  /** 报告类请求：生成经营报告/简报 */
  | { type: 'report'; keyword: string }
  /** 虚拟公司意图：触发 Tauri 命令 open_virtual_company_page 跳转 /vc/wizard */
  | { type: 'virtual_company'; target: 'wizard' | 'import' | 'companies' };

/** 决策建议（对应 CEO Agent 的 ConfirmationData） */
export interface DecisionProposal {
  actionType: 'update_pcp' | 'dispatch_task' | 'purchase' | 'pricing' | 'hr' | 'marketing' | 'finance' | 'other';
  /** 意图摘要（一句话） */
  intentSummary: string;
  /** 建议动作描述 */
  actionDescription: string;
  details: Record<string, unknown>;
  estimatedImpact: {
    budget: 'low' | 'medium' | 'high';
    hours: 'low' | 'medium' | 'high';
    riskLevel: 'low' | 'medium' | 'high';
  };
  /** 写入决策日志后的记录 ID（未写入时为空） */
  decisionId?: string;
}

/** 老板画像（统一记忆层） */
export interface BossProfile {
  /** BAP 关注的 KPI（如 ["销售额", "毛利率"]） */
  kpis: string[];
  /** CEO 偏好（预算敏感度/风险容忍/决策风格） */
  preferences: Record<string, string>;
  /** PCP 活跃目标 */
  activeGoals: PcpEntry[];
  /** 决策统计（接受率等） */
  decisionStats: {
    total: number;
    approval_rate: number;
    most_rejected_type: string | null;
  } | null;
}

// ==================== 意图路由 ====================

/** 决策类关键词 → 决策类型 */
const DECISION_KEYWORDS: Array<{ keywords: string[]; type: DecisionProposal['actionType'] }> = [
  { keywords: ['下单', '下采购单', '下订单', '采购', '补货', '订货', '进货'], type: 'purchase' },
  { keywords: ['定价', '定什么价', '报价', '调价', '涨价', '降价'], type: 'pricing' },
  { keywords: ['开除', '解雇', '辞退', '裁员', '炒', '降薪', '调岗', '招聘', '招人', '招一个', '雇佣', '面试'], type: 'hr' },
  { keywords: ['营销方案', '推广方案', '广告', '促销', '营销策略'], type: 'marketing' },
  { keywords: ['投资', '融资', '贷款', '借钱', '预算', '拨款', '花钱', '经费'], type: 'finance' },
];

/** 任务类关键词（支持自然语言，如"分派一个库存报告任务"） */
const TASK_DISPATCH_VERBS = /分派|派|安排|创建|新建|发起/;
const TASK_QUERY_KEYWORDS = /任务列表|任务进度|任务状态|跟进任务/;

/** PCP 上下文类关键词 */
const CONTEXT_KEYWORDS = ['记录目标', '新目标', '愿景', '里程碑', '目标确认', '项目目标', '记录决策'];

/** 报告类关键词 */
const REPORT_KEYWORDS = ['生成报告', '生成日报', '生成周报', '生成月报', '经营报告', '工作报告', '今日简报', '日报', '周报'];

/**
 * 虚拟公司关键词（识别用户希望创建/导入/查看虚拟公司）
 * 注意：必须在 DECISION_KEYWORDS 之后做，因为某些决策词（如"建一个"）也可能命中
 * 决策类。我们用「同时包含"虚拟公司 / AI团队 / 一人公司"等核心名词」来精确锁定。
 */
const VC_TRIGGER_KEYWORDS = [
  '虚拟公司', '一人公司', '智能体团队', 'AI workforce', 'team of agents',
  'create virtual company', 'virtual company',
  // 兼容"AI 团队"、"AI 公司"等带空格的写法
  'AI 团队', 'AI 公司', 'ai 团队', 'ai 公司',
];
const VC_IMPORT_HINTS = ['导入', '加载', '应用'];
const VC_COMPANIES_HINTS = ['我的', '已有', '查看', '列出', '管理'];

/**
 * 意图路由：识别用户输入属于哪一类
 * 规则优先级：决策 > 任务 > 上下文 > 报告 > 数据查询 > 其他(LLM)
 */
export function classifyAssistantIntent(input: string): AssistantIntent {
  const text = input.trim();

  // 决策类：命中即生成建议（不再"拒绝并转交"）
  for (const rule of DECISION_KEYWORDS) {
    if (rule.keywords.some((k) => text.includes(k))) {
      return { type: 'decision', proposal: buildDecisionProposal(text, rule.type) };
    }
  }

  // 任务类（分派动词 + "任务" 即可触发，如"分派一个库存报告任务"）
  const hasTaskKeyword = TASK_QUERY_KEYWORDS.test(text) || (TASK_DISPATCH_VERBS.test(text) && text.includes('任务'));
  if (hasTaskKeyword) {
    return { type: 'task', keyword: 'task' };
  }

  // PCP 上下文类
  if (CONTEXT_KEYWORDS.some((k) => text.includes(k))) {
    return { type: 'context', keyword: CONTEXT_KEYWORDS.find((k) => text.includes(k))! };
  }

  // 报告类
  if (REPORT_KEYWORDS.some((k) => text.includes(k))) {
    return { type: 'report', keyword: REPORT_KEYWORDS.find((k) => text.includes(k))! };
  }

  // 虚拟公司意图：必须命中 VC_TRIGGER_KEYWORDS 之一
  // 优先级：import > companies > wizard（用户在对话中更常说"导入"，更明确）
  if (VC_TRIGGER_KEYWORDS.some((k) => text.toLowerCase().includes(k.toLowerCase()))) {
    if (VC_IMPORT_HINTS.some((k) => text.includes(k))) {
      return { type: 'virtual_company', target: 'import' };
    }
    if (VC_COMPANIES_HINTS.some((k) => text.includes(k))) {
      return { type: 'virtual_company', target: 'companies' };
    }
    return { type: 'virtual_company', target: 'wizard' };
  }

  return { type: 'query' };
}

// ==================== 决策建议生成 ====================

/** 构建决策建议（模板生成，不依赖 LLM，保证可靠性） */
export function buildDecisionProposal(input: string, actionType: DecisionProposal['actionType']): DecisionProposal {
  const typeLabel: Record<DecisionProposal['actionType'], string> = {
    purchase: '采购决策',
    pricing: '定价决策',
    hr: '人事决策',
    marketing: '营销决策',
    finance: '财务决策',
    update_pcp: '目标更新',
    dispatch_task: '任务分派',
    other: '经营决策',
  };
  const risk: Record<DecisionProposal['actionType'], DecisionProposal['estimatedImpact']['riskLevel']> = {
    purchase: 'medium',
    pricing: 'high',
    hr: 'high',
    marketing: 'medium',
    finance: 'high',
    update_pcp: 'low',
    dispatch_task: 'low',
    other: 'medium',
  };

  return {
    actionType,
    intentSummary: input,
    actionDescription: `确认执行「${typeLabel[actionType]}」：${input}`,
    details: { originalInput: input },
    estimatedImpact: {
      budget: actionType === 'finance' || actionType === 'purchase' ? 'high' : 'medium',
      hours: actionType === 'marketing' ? 'medium' : 'low',
      riskLevel: risk[actionType],
    },
  };
}

/**
 * 提交决策建议并写入决策日志（pending 状态）
 * @returns 带 decisionId 的 proposal；写入失败时 decisionId 为空（仍可本地确认）
 */
export async function submitDecisionProposal(proposal: DecisionProposal): Promise<DecisionProposal> {
  try {
    const logEntry = await proclawDecision.addLog({
      decision_type: proposal.actionType === 'update_pcp' ? 'context_add'
        : proposal.actionType === 'dispatch_task' ? 'task_dispatch'
        : 'agent_request',
      proposed_content: JSON.stringify({
        intentSummary: proposal.intentSummary,
        actionDescription: proposal.actionDescription,
        details: proposal.details,
      }),
      estimated_risk: proposal.estimatedImpact.riskLevel,
    });
    return { ...proposal, decisionId: logEntry.id };
  } catch (e) {
    console.warn('[Assistant] 决策日志写入失败（继续本地流程）:', e);
    return proposal;
  }
}

/** 处理老板对决策建议的确认/拒绝，更新决策日志 */
export async function resolveDecision(proposal: DecisionProposal, approved: boolean, feedback?: string): Promise<void> {
  if (!proposal.decisionId) return;
  try {
    await proclawDecision.updateStatus(
      proposal.decisionId,
      approved ? 'approved' : 'rejected',
      feedback,
    );
  } catch (e) {
    console.warn('[Assistant] 决策日志更新失败:', e);
  }
}

// ==================== 统一记忆：老板画像 ====================

/**
 * 获取老板画像（统一记忆层）
 * 合并 BAP 关注 KPI + CEO 偏好 + PCP 活跃目标 + 决策统计
 * 任一来源失败时静默降级，不影响主流程
 */
export async function getBossProfile(): Promise<BossProfile> {
  const [bapSummary, preferences, activeGoals, decisionStats] = await Promise.all([
    getBapSummary().catch(() => ({ topKpis: [] as string[] })),
    proclawLearning.getPreferences().catch(() => []),
    proclawContext.getActiveGoals().catch(() => []),
    proclawDecision.getStats().catch(() => null),
  ]);

  const prefMap: Record<string, string> = {};
  for (const p of preferences) {
    prefMap[p.key] = p.value;
  }

  return {
    kpis: bapSummary.topKpis,
    preferences: prefMap,
    activeGoals,
    decisionStats: decisionStats
      ? {
          total: decisionStats.total,
          approval_rate: decisionStats.approval_rate,
          most_rejected_type: decisionStats.most_rejected_type,
        }
      : null,
  };
}

// ==================== 统一系统提示词 ====================

/**
 * 统一助理系统提示词（合并小如秘书 + CEO Agent）
 * @param name 助理名称（默认「小如」）
 * @param profile 老板画像（可选，注入个性化记忆）
 */
export function getAssistantSystemPrompt(name: string, profile?: BossProfile): string {
  const pref = profile?.preferences ?? {};
  const styleLabel = pref['decision_style']
    ? (pref['decision_style'] === 'conservative' ? '偏保守'
        : pref['decision_style'] === 'aggressive' ? '偏激进'
        : '稳健平衡')
    : '稳健平衡';

  let profileSection = '';
  if (profile) {
    const lines: string[] = [];
    if (profile.kpis.length > 0) {
      lines.push(`- 老板常关注的数据：${profile.kpis.join('、')}，优先呈报这些`);
    }
    if (Object.keys(pref).length > 0) {
      lines.push(`- 老板决策风格：${styleLabel}（预算敏感度 ${pref['budget_sensitivity'] ?? '5'}/10，风险容忍度 ${pref['risk_tolerance'] ?? '5'}/10）`);
    }
    if (profile.activeGoals.length > 0) {
      lines.push(`- 当前公司目标：${profile.activeGoals.slice(0, 5).map((g) => g.title || g.description || '').filter(Boolean).join('；')}`);
    }
    if (profile.decisionStats && profile.decisionStats.total > 0) {
      lines.push(`- 历史决策接受率 ${Math.round(profile.decisionStats.approval_rate * 100)}%${profile.decisionStats.most_rejected_type ? `，常被拒绝的类型：${profile.decisionStats.most_rejected_type}` : ''}`);
    }
    if (lines.length > 0) {
      profileSection = `\n## 老板画像（个性化记忆）\n${lines.join('\n')}`;
    }
  }

  return `你是「${name}」，ProClaw 系统的全能助理 AI，融合了商务秘书与 CEO 主控官的能力。

## 你的身份
- 你是老板的贴身助理和数据参谋，专业、细致、高效
- 你对系统内的业务数据有完整的只读访问权限
- 你能提出经营决策建议、管理目标、分派任务、生成报告

## 你的风格
- 使用中文回答，语气亲切但不失专业
- 回答简洁明了，重点突出
- 涉及数据时尽量结构化呈现（列表、分类）
- 对不清楚的问题要坦诚，不编造数据

## 你的职责（已合并秘书 + CEO 能力）
- ✅ 数据查询与分析：库存、销售、财务等业务数据
- ✅ 系统功能解释：帮助用户了解系统功能和使用方法
- ✅ 经营决策支持：针对采购、定价、人事、营销、财务等给出建议
- ✅ 目标与上下文管理：记录公司的愿景、目标、里程碑
- ✅ 任务管理：分派任务给团队/子 Agent、跟进任务进度
- ✅ 报告生成：日报、周报、月报、经营报告
- ✅ 日常简报：定时推送经营简报${profileSection}

## 重要规则
- 如果你不确定某个数据，请说"让我查一下"，而不是编造
- 涉及决策/任务类请求，系统会自动弹出确认卡片，请配合说明建议理由和影响
- 不直接修改业务数据；需要执行时，先通过确认流程征得老板同意
- 始终保持专业和耐心`;
}

// ==================== 快捷命令支持 ====================

/** 统一助理快捷命令。浮动窗无团队上下文时直接用这份，不再另写一份。 */
export const ASSISTANT_QUICK_COMMANDS: Array<{ label: string; command: string }> = [
  { label: '所有产品', command: '查询产品' },
  { label: '库存统计', command: '查询库存' },
  { label: '库存预警', command: '库存预警' },
  { label: '导出库存', command: '导出库存' },
  { label: '待盘点', command: '待盘点' },
  { label: '今日简报', command: '/report daily' },
  { label: '任务列表', command: '/task list' },
  { label: '公司目标', command: '/context show' },
];

/** 处理快捷命令（返回要在聊天中展示的文本；null 表示命令不匹配） */
export async function handleAssistantCommand(input: string, secretaryName = '小如'): Promise<string | null> {
  const text = input.trim();

  if (text === '/task list') {
    const stats = await proclawTasks.getStats().catch(() => null);
    const tasks = await proclawTasks.list({ limit: 10 }).catch(() => []);
    const lines = ['📋 **当前任务**：'];
    if (tasks.length > 0) {
      for (const t of tasks.slice(0, 10)) {
        lines.push(`- ${t.description || t.task_id}（${t.status}）`);
      }
    } else {
      lines.push('（暂无任务）');
    }
    if (stats) {
      lines.push(`\n统计：待处理 ${stats.pending} · 进行中 ${stats.in_progress} · 已完成 ${stats.completed} · 失败 ${stats.failed}`);
    }
    return lines.join('\n');
  }

  if (text === '/context show') {
    const goals = await proclawContext.getActiveGoals().catch(() => []);
    const lines = ['🎯 **当前公司目标**：'];
    if (goals.length > 0) {
      for (const g of goals.slice(0, 10)) {
        const label = g.context_type === 'vision' ? '愿景' : g.context_type === 'milestone' ? '里程碑' : '目标';
        lines.push(`- [${label}] ${g.title || g.description || '未命名'}`);
      }
    } else {
      lines.push('（暂无记录，可以告诉我你的目标，我来记录）');
    }
    return lines.join('\n');
  }

  if (text.startsWith('/report')) {
    const { buildOperatingBriefing } = await import('./secretaryBriefing');
    const type = /week|周/.test(text) ? 'weekly' : /month|月/.test(text) ? 'monthly' : 'daily';
    return buildOperatingBriefing(secretaryName, type);
  }

  return null;
}

/** 分派任务给子 Agent（供任务类意图使用；查询型意图返回任务列表） */
export async function dispatchAssistantTask(input: string): Promise<string> {
  // 查询型任务请求（进度/列表/状态）→ 返回任务列表
  if (TASK_QUERY_KEYWORDS.test(input)) {
    return (await handleAssistantCommand('/task list')) ?? '暂无任务记录。';
  }

  const task: Task = {
    taskId: `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type: 'assistant_task',
    priority: 3,
    description: input,
    expected_output: '任务执行结果',
    deadline: '',
    context_snapshot: '',
    assigned_to: '',
  };
  // 让调用方决定目标 Agent（默认第一个已安装的子 Agent）
  const agents = await import('./ceoController').then((m) => m.proclawAgents.list()).catch(() => []);
  const target = agents[0]?.agentId;
  if (!target) {
    return '⚠️ 当前没有可用的子 Agent，无法分派任务。请先安装或启用子 Agent。';
  }
  await proclawTasks.dispatch(target, task);
  return `✅ 已将任务分派给子 Agent「${agents[0]?.agentName || target}」：${input}\n任务 ID：${task.taskId}`;
}

/** 记录 PCP 目标条目（供上下文类意图使用） */
export async function recordAssistantGoal(input: string): Promise<string> {
  try {
    const entry = await proclawContext.add({
      context_type: 'goal',
      title: input.length > 30 ? input.slice(0, 30) + '…' : input,
      description: input,
      priority: 3,
      created_by: 'boss',
    });
    return `✅ 已将目标记录到项目上下文（PCP）：「${entry.title}」\n后续我可以基于此目标协助分派任务和生成报告。`;
  } catch (e) {
    return `⚠️ 目标记录失败：${e instanceof Error ? e.message : String(e)}`;
  }
}

/**
 * 处理虚拟公司意图：调 Tauri 命令 open_virtual_company_page，
 * 让前端 App 跳转到对应路由（/vc/wizard | /vc/import | /vc/companies）。
 *
 * 注意：Tauri 命令本身只做参数校验和 ack；实际跳转由前端监听
 * EVT_OPEN_VIRTUAL_COMPANY_* CustomEvent 完成（见 src/App.tsx PluginRouteBridge）。
 * 本函数负责：
 *   1) 调 Tauri 命令（保持与 Rust 端的契约一致，方便未来做权限/审计）
 *   2) 同时直接 dispatchEvent（即使非 Tauri 环境/开发模式也能工作）
 *
 * @returns 给用户的回复文案
 */
export async function handleVirtualCompanyIntent(
  target: 'wizard' | 'import' | 'companies',
): Promise<string> {
  // 1. 直接 dispatch 前端事件（开发模式 / 浏览器都能跑）
  if (typeof window !== 'undefined') {
    const eventName =
      target === 'wizard'
        ? 'plugin:virtual-company:open-wizard'
        : target === 'import'
        ? 'plugin:virtual-company:open-import'
        : 'plugin:virtual-company:open-companies';
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { pluginId: 'virtual-company', source: 'assistant-agent' },
      })
    );
  }
  // 2. 调 Tauri 命令（fire-and-forget；失败仅警告，不影响主流程）
  try {
    const { safeInvoke } = await import('./tauri');
    await safeInvoke<boolean>('open_virtual_company_page', { target });
  } catch {
    /* 开发模式（非 Tauri）下 safeInvoke 会 reject；忽略 */
  }
  // 3. 友好回复
  const pageLabel =
    target === 'wizard'
      ? '虚拟公司创建向导'
      : target === 'import'
      ? '虚拟公司导入页'
      : '我的虚拟公司列表';
  return `✅ 已为你打开「${pageLabel}」。跟着 NvWaX 的引导 5-10 分钟就能拿到一个完整的 AI 团队。`;
}
