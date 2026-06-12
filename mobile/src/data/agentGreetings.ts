// agentGreetings - 内置 AI Agent 首次进入对话窗的主动问候语
// v21: 解决"Agent 对话窗需要先主动发消息"的问题
//
// 设计原则：
// - 每个 Agent 有符合自己"角色性格"的问候语
// - 一律以"老板"称呼用户（符合中国商务场景）
// - 用 "^-^" 表情符号增加亲和力
// - 用户明确指定小如用 "老板，有啥交代？^-^"

export const AGENT_GREETINGS: Record<string, string> = {
  secretary: '老板，有啥交代？^-^',
  ceo: '老板，今日经营决策要点已准备好，请过目^-^',
  'customer-service': '老板，今日有 3 个客户咨询待处理，请指示^-^',
  finance: '老板，今日财务报表已生成，预算执行率 87%^-^',
  task: '老板，今日有 5 项新任务等待分配^-^',
  crm: '老板，今日有 2 位高意向客户需跟进^-^',
};

// 兜底：未知 agentId 时的统一问候
export const DEFAULT_AGENT_GREETING = '老板，有啥交代？^-^';

/**
 * 获取指定 Agent 的问候语
 * @param agentId Agent ID（与 ContactsTab BUILTIN_AGENTS / AgentRuntimeBridge 对齐）
 */
export function getAgentGreeting(agentId: string): string {
  return AGENT_GREETINGS[agentId] || DEFAULT_AGENT_GREETING;
}
