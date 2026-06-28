// BUILTIN_AI_TEAMS - 内置 AI 经营团队预置数据
// v21: 解决 AI Team = 0 的问题
//      提供 3 个开箱即用的经营团队，让用户进入即看到 AI Team 内容
//
// 设计原则：
// - 每个 Team 对应一个完整业务场景
// - 每个 Team 包含 2-3 个 Agent 角色，覆盖决策/执行/分析
// - Team 头像用团队专属 Agent ID（AgentAvatar.tsx 中定义）

// ============ 类型定义 ============

export interface BuiltinAiTeam {
  id: string;
  name: string;
  description: string;
  members: string[];           // Agent ID 列表
  agentId: string;             // 团队头像对应的 Agent ID（用于 AgentAvatar 渲染）
  category: 'leadership' | 'sales' | 'analytics';
}

// ============ 预置团队数据 ============

export const BUILTIN_AI_TEAMS: BuiltinAiTeam[] = [
  {
    id: 'team-leadership',
    name: 'AI 经营决策团队',
    description: 'CEO Agent + 财务 Agent，战略决策与财务分析双核驱动',
    members: ['ceo', 'finance'],
    agentId: 'team-leadership',
    category: 'leadership',
  },
  {
    id: 'team-sales',
    name: 'AI 销售执行团队',
    description: '客服 Agent + 客户关系 Agent，客户全生命周期管理',
    members: ['customer-service', 'crm'],
    agentId: 'team-sales',
    category: 'sales',
  },
  {
    id: 'team-analytics',
    name: 'AI 数据分析团队',
    description: '任务 Agent + 财务 Agent，运营报表 + 预算执行追踪',
    members: ['task', 'finance'],
    agentId: 'team-analytics',
    category: 'analytics',
  },
];

// 供其他模块使用的辅助类型
export type AiTeamCategory = BuiltinAiTeam['category'];
