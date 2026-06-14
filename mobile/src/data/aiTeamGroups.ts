/**
 * AI Team 群组配置（移动端版）
 *
 * 对应桌面端 `src/lib/contactService.ts` 中的 AI_TEAM_GROUPS 注册表。
 * 数据格式 100% 复刻桌面端：
 * - AI_TEAM_GROUP_ID_PREFIX 常量值一致
 * - AITeamGroupConfig / AITeamMember 接口字段名一致
 * - syncAITeamGroups(teams) 函数签名一致
 *
 * 移动端实现差异：
 * - 桌面端额外把 AI_TEAM_GROUPS 推到 mock contacts 表（不需要）
 * - 桌面端使用 Rust invoke 同步；移动端直接接收内存中的 builtinAiTeams
 */

import { BUILTIN_AI_TEAMS } from './builtinAiTeams';

// ==================== 常量（与桌面端一致）====================

/** AI Team 群聊 ID 前缀：ai-team-group-{teamId} */
export const AI_TEAM_GROUP_ID_PREFIX = 'ai-team-group-';

/** 单个 Agent 成员信息（与桌面端字段一致） */
export interface AITeamMember {
  name: string;
  /** 头像 emoji 兜底（用于 <Avatar>{fallback}</Avatar> 的子节点） */
  avatar: string;
  role: string;
}

/** AI Team 群组配置（与桌面端字段一致） */
export interface AITeamGroupConfig {
  id: string;
  teamId: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  members: Record<string, AITeamMember>;
}

// ==================== 工具函数 ====================

/** 群组 ID 构建器 */
export function buildGroupId(teamId: string): string {
  return `${AI_TEAM_GROUP_ID_PREFIX}${teamId}`;
}

/** 从群组 ID 提取团队 ID */
export function parseTeamId(groupId: string): string {
  return groupId.startsWith(AI_TEAM_GROUP_ID_PREFIX)
    ? groupId.slice(AI_TEAM_GROUP_ID_PREFIX.length)
    : groupId;
}

/** 判断是否为 AI Team 群聊 ID */
export function isAITeamGroupId(id: string): boolean {
  return id.startsWith(AI_TEAM_GROUP_ID_PREFIX);
}

// ==================== 注册表 ====================

/** 群组配置注册表（由 syncAITeamGroups 填充） */
export const AI_TEAM_GROUPS: Record<string, AITeamGroupConfig> = {};

/** 所有 AI Team 成员（摊平，由 syncAITeamGroups 填充） */
export const AI_TEAM_MEMBERS: Record<string, AITeamMember> = {};

/** 获取群组配置 */
export function getAITeamGroupConfig(id: string): AITeamGroupConfig | undefined {
  return AI_TEAM_GROUPS[id];
}

// ==================== 同步函数 ====================

/** 默认群组颜色调色板（与桌面端一致） */
const GROUP_COLORS = [
  '#ff6d00', '#ff3b30', '#2196f3', '#4caf50',
  '#9c27b0', '#00bcd4', '#ff9800', '#607d8b',
];

/**
 * Agent 头像 emoji 兜底表（与桌面端一致）
 */
const AGENT_EMOJI_KEYWORDS: [string[], string][] = [
  [['ceo'], '🧠'],
  [['finance', '财务', 'financial'], '💰'],
  [['crm', '客户', 'customer', '客服'], '🤝'],
  [['inventory', '库存', 'stock'], '📦'],
  [['purchase', '采购', 'buy'], '🛒'],
  [['sales', '销售', 'sell'], '💼'],
  [['business', '业务', 'analyst'], '📈'],
  [['social', '社媒', '运营'], '📢'],
  [['content', '内容', '文案', '写作'], '✍️'],
  [['conversion', '转化'], '📊'],
  [['seo', '搜索'], '🔍'],
  [['site', '网站', 'analytics'], '🌐'],
  [['doc', '文档', 'document'], '📄'],
  [['task', '任务'], '📋'],
  [['hr', '人事', 'human'], '👥'],
  [['image', '图片', '找图'], '🖼️'],
];

function getAgentEmojiAvatar(agentId: string, role: string): string {
  const lower = (agentId + role).toLowerCase();
  for (const [keys, emoji] of AGENT_EMOJI_KEYWORDS) {
    if (keys.some((k) => lower.includes(k))) return emoji;
  }
  return '🤖';
}

/**
 * 从实际 AI 团队列表同步群组配置
 *
 * @param teams 团队列表（每个 team 含 id / name / description / members / category）
 */
export function syncAITeamGroups(
  teams: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
    members?: Array<{ agent_id: string; role: string; responsibilities?: string }>;
  }>,
): void {
  // 清空旧数据
  for (const key of Object.keys(AI_TEAM_GROUPS)) delete AI_TEAM_GROUPS[key];
  for (const key of Object.keys(AI_TEAM_MEMBERS)) delete AI_TEAM_MEMBERS[key];

  teams.forEach((team, idx) => {
    const groupId = buildGroupId(team.id);
    const color = GROUP_COLORS[idx % GROUP_COLORS.length];

    // 构建成员映射（CEO Agent 始终作为主控官加入）
    const members: Record<string, AITeamMember> = {
      'ceo-agent': { name: 'CEO Agent', avatar: '🧠', role: '主控官' },
    };

    if (team.members) {
      team.members.forEach((m) => {
        members[m.agent_id] = {
          name: m.role,
          avatar: getAgentEmojiAvatar(m.agent_id, m.role),
          role: m.responsibilities || m.role,
        };
      });
    }

    const nameEmoji = team.name.match(/[\p{Emoji}]/u);
    const icon = nameEmoji ? nameEmoji[0] : '🤖';

    AI_TEAM_GROUPS[groupId] = {
      id: groupId,
      teamId: team.id,
      name: team.name,
      icon,
      description: team.description || team.category || `${team.name}的工作群`,
      color,
      members,
    };

    Object.assign(AI_TEAM_MEMBERS, members);
  });
}

/**
 * 默认同步：把 BUILTIN_AI_TEAMS 转换为 syncAITeamGroups 输入格式
 * 内部默认带头调用，避免业务方重复写转换代码
 */
export function syncBuiltinTeams(): void {
  syncAITeamGroups(
    BUILTIN_AI_TEAMS.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      category: team.category,
      // members 是 string[]，转换为 syncAITeamGroups 期望的 agent_id/role 格式
      members: team.members.map((agentId) => ({
        agent_id: agentId,
        role: agentId, // 用 agentId 作为 role 标签（与桌面端 demo 数据行为一致）
        responsibilities: agentId,
      })),
    })),
  );
}