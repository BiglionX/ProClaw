import { ipcInvoke as invoke } from './tauri';
import { isTauri } from './tauri';
import {
  getDefaultAgentAvatar as getDefaultAgentAvatarSvg,
  getDefaultAgentAvatarKey,
  getAgentAvatarPreset,
  type AgentAvatarPreset,
} from '../types/agentAvatarLibrary';

// ==================== 常量 ====================

/** AI Team 群聊 ID 前缀：ai-team-group-{teamId} */
export const AI_TEAM_GROUP_ID_PREFIX = 'ai-team-group-';

/** 向后兼容：首个群组 ID（deprecated） */
export const AI_TEAM_GROUP_ID = 'ai-team-group-mock-builtin-team';

/** 单个 Agent 成员信息 */
export interface AITeamMember {
  name: string;
  avatar: string;
  role: string;
}

/** AI Team 群组配置 */
export interface AITeamGroupConfig {
  id: string;
  teamId: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  members: Record<string, AITeamMember>;
}

/** 群组 ID 构建器 */
export function buildGroupId(teamId: string): string {
  return `${AI_TEAM_GROUP_ID_PREFIX}${teamId}`;
}

/** 从群组 ID 提取团队 ID */
export function parseTeamId(groupId: string): string {
  return groupId.startsWith(AI_TEAM_GROUP_ID_PREFIX) ? groupId.slice(AI_TEAM_GROUP_ID_PREFIX.length) : groupId;
}

/** 判断是否为 AI Team 群聊 ID */
export function isAITeamGroupId(id: string): boolean {
  return id.startsWith(AI_TEAM_GROUP_ID_PREFIX);
}

/** 动态群组配置注册表（由 syncAITeamGroups 填充） */
export const AI_TEAM_GROUPS: Record<string, AITeamGroupConfig> = {};

/** 向后兼容：所有 AI Team 成员（摊平，由 syncAITeamGroups 填充） */
export const AI_TEAM_MEMBERS: Record<string, AITeamMember> = {};

/** 获取群组配置 */
export function getAITeamGroupConfig(id: string): AITeamGroupConfig | undefined {
  return AI_TEAM_GROUPS[id];
}

/** 默认群组颜色调色板 */
const GROUP_COLORS = ['#ff6d00', '#ff3b30', '#2196f3', '#4caf50', '#9c27b0', '#00bcd4', '#ff9800', '#607d8b'];

/**
 * 默认 Agent 头像（emoji 兜底版）
 * 保留旧的关键词→emoji 映射作为最终降级方案
 */
function getAgentEmojiAvatar(agentId: string, role: string): string {
  const keywords: [string[], string][] = [
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
  const lower = (agentId + role).toLowerCase();
  for (const [keys, emoji] of keywords) {
    if (keys.some(k => lower.includes(k))) return emoji;
  }
  return '🤖';
}

/**
 * Agent 头像信息：同时返回 SVG URL（优先）和 emoji 兜底
 */
export interface AgentAvatarInfo {
  /** 头像库 key（未设置时为 agentId 哈希默认） */
  key: string;
  /** 头像 URL（指向 /agents/team/avatars/agent_XX.svg） */
  src: string;
  /** 头像 emoji 兜底（用于 <Avatar>{fallback}</Avatar> 的子节点） */
  fallback: string;
  /** 头像定义（如需要显示标签可读） */
  preset: AgentAvatarPreset | null;
}

/**
 * 根据 agentId 获取头像信息（不读 override）
 * 顺序：AGENT_AVATAR_PRESETS 哈希分配 → emoji 兜底
 */
export function getAgentAvatarInfo(agentId: string, role: string = ''): AgentAvatarInfo {
  const key = getDefaultAgentAvatarKey(agentId);
  const preset = getAgentAvatarPreset(key);
  const fallback = getAgentEmojiAvatar(agentId, role);
  return {
    key,
    src: preset?.src || getDefaultAgentAvatarSvg(agentId),
    fallback,
    preset,
  };
}

/**
 * 旧的 getDefaultAgentAvatar：返回 emoji（保持向后兼容）
 * 新代码建议用 getAgentAvatarInfo 拿到 src + fallback 组合
 */
function getDefaultAgentAvatar(agentId: string, role: string): string {
  return getAgentEmojiAvatar(agentId, role);
}

/**
 * 获取 Agent 默认头像 URL（SVG 形式）
 * 用于联系人列表、ChatPage header 等显示
 */
export function getAgentAvatarUrl(agentId: string): string {
  return getDefaultAgentAvatarSvg(agentId);
}

/**
 * 从实际 AI 团队列表同步群组配置
 * 应在 TeamsPage 加载团队后调用
 */
export function syncAITeamGroups(teams: { id: string; name: string; description?: string; category?: string; members?: { agent_id: string; role: string; responsibilities?: string }[] }[]): void {
  // 清空旧数据
  for (const key of Object.keys(AI_TEAM_GROUPS)) delete AI_TEAM_GROUPS[key];
  for (const key of Object.keys(AI_TEAM_MEMBERS)) delete AI_TEAM_MEMBERS[key];

  // 清空旧的群组 mock contacts（保留非群组的联系人）
  for (let i = MOCK_CONTACTS.length - 1; i >= 0; i--) {
    if (MOCK_CONTACTS[i].contact_type === 'group') MOCK_CONTACTS.splice(i, 1);
  }

  teams.forEach((team, idx) => {
    const groupId = buildGroupId(team.id);
    const color = GROUP_COLORS[idx % GROUP_COLORS.length];

    // 构建成员映射（CEO Agent 始终作为主控官加入）
    const members: Record<string, AITeamMember> = {
      'ceo-agent': { name: 'CEO Agent', avatar: '🧠', role: '主控官' },
    };

    if (team.members) {
      team.members.forEach(m => {
        members[m.agent_id] = {
          name: m.role,
          avatar: getDefaultAgentAvatar(m.agent_id, m.role),
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

    // 在 mock contacts 中创建群组联系人
    const memberCount = Object.keys(members).length;
    MOCK_CONTACTS.unshift({
      id: groupId,
      name: `${icon} ${team.name}`,
      phone: '',
      contact_type: 'group',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: `🎉 AI Team 工作群已创建 · ${memberCount}人 · CEO Agent 协调中`,
      last_message_time: Date.now(),
      last_is_read: false,
      last_from: 'system',
      last_from_name: '📢 系统',
      unread_count: 1,
    });

    // 创建种子消息
    if (!MOCK_MESSAGES[groupId]) {
      MOCK_MESSAGES[groupId] = [
        {
          id: `ai-init-${team.id}`,
          from_user: 'system',
          from_user_name: '📢 系统',
          to_user: groupId,
          content: `🎉 「${team.name}」AI Team 工作群已创建。CEO Agent 将在此协调 ${memberCount - 1} 个 AI Agent 的工作，您（Boss 👑）可以随时视察和发号施令。`,
          content_type: 'system_event',
          is_read: false,
          created_at: Date.now(),
        },
        {
          id: `ai-init2-${team.id}`,
          from_user: 'ceo-agent',
          from_user_name: 'CEO Agent',
          to_user: groupId,
          content: `各位 Agent 注意，Boss 已加入「${team.name}」工作群。我是 CEO Agent（主控官），会根据 Boss 的战略目标进行任务分派。团队成员：${team.members?.map(m => m.role).join('、') || '待配置'}。`,
          content_type: 'text',
          is_read: false,
          created_at: Date.now() + 1000,
        },
      ];
    }
  });
}

// ==================== Agent 主动问候语 ====================

/** 单个 Agent 首次进入会话时的主动问候语 */
const AGENT_GREETINGS: Record<string, { content: string; name: string }> = {
  'ceo-agent': {
    name: 'CEO Agent',
    content: '老板，有啥吩咐？我会根据您的战略目标协调所有 Agent。',
  },
  'finance-agent': {
    name: '财务 Agent',
    content: '老板，有啥吩咐？账目核对、流水分析都可以找我。',
  },
  'crm-agent': {
    name: 'CRM Agent',
    content: '老板，有啥吩咐？客户跟进、服务问题都可以找我。',
  },
  'inventory-agent': {
    name: '库存 Agent',
    content: '老板，有啥吩咐？库存查询、预警补货都可以找我。',
  },
  'sales-agent': {
    name: '销售 Agent',
    content: '老板，有啥吩咐？订单处理、客户沟通都可以找我。',
  },
  'purchase-agent': {
    name: '采购 Agent',
    content: '老板，有啥吩咐？采购建议、供应商评估都可以找我。',
  },
  'content-agent': {
    name: '内容 Agent',
    content: '老板，有啥吩咐？文案撰写、内容分发都可以找我。',
  },
  'image-agent': {
    name: 'AI智能找图',
    content: '老板，有啥吩咐？找图配图、视觉设计随时交给我。',
  },
  'social-agent': {
    name: '社媒 Agent',
    content: '老板，有啥吩咐？账号运营、传播分析都可以找我。',
  },
  'hr-agent': {
    name: '人事 Agent',
    content: '老板，有啥吩咐？人事事务、员工管理都可以找我。',
  },
  'business-agent': {
    name: '业务 Agent',
    content: '老板，有啥吩咐？经营分析、报表生成都可以找我。',
  },
};

/**
 * 获取 Agent 联系人的主动问候语
 * @param contactId 联系人 ID（可能是 agent id 或 ai-team-group-* 群组 id）
 * @returns { fromUser, fromUserName, content } 或 null（非 Agent）
 */
export function getAgentGreeting(contactId: string): { fromUser: string; fromUserName: string; content: string } | null {
  if (!contactId) return null;

  // 1. AI Team 群聊：CEO Agent 代表全体问候
  if (isAITeamGroupId(contactId)) {
    return {
      fromUser: 'ceo-agent',
      fromUserName: 'CEO Agent',
      content: '老板，有啥吩咐？AI Team 全体待命！',
    };
  }

  // 2. 已知 Agent 联系人：使用该 Agent 的专属问候语
  if (AGENT_GREETINGS[contactId]) {
    const g = AGENT_GREETINGS[contactId];
    return { fromUser: contactId, fromUserName: g.name, content: g.content };
  }

  // 3. 尝试根据 agent_id 模糊匹配（以 agent- 开头或 agent_id 含 ceo/finance 等关键词）
  const lower = contactId.toLowerCase();
  if (lower.startsWith('builtin-') || lower.startsWith('agent-')) {
    // 提取角色名（builtin-finance-advisor → finance）
    const stripped = lower.replace(/^(builtin-|agent-)/, '');
    if (AGENT_GREETINGS[stripped]) {
      const g = AGENT_GREETINGS[stripped];
      return { fromUser: contactId, fromUserName: g.name, content: g.content };
    }
    // 关键词匹配
    if (lower.includes('ceo')) return { fromUser: contactId, fromUserName: 'CEO Agent', content: AGENT_GREETINGS['ceo-agent'].content };
    if (lower.includes('finance')) return { fromUser: contactId, fromUserName: '财务 Agent', content: AGENT_GREETINGS['finance-agent'].content };
    if (lower.includes('sales')) return { fromUser: contactId, fromUserName: '销售 Agent', content: AGENT_GREETINGS['sales-agent'].content };
    if (lower.includes('inventory')) return { fromUser: contactId, fromUserName: '库存 Agent', content: AGENT_GREETINGS['inventory-agent'].content };
    if (lower.includes('purchase')) return { fromUser: contactId, fromUserName: '采购 Agent', content: AGENT_GREETINGS['purchase-agent'].content };
    if (lower.includes('content')) return { fromUser: contactId, fromUserName: '内容 Agent', content: AGENT_GREETINGS['content-agent'].content };
    if (lower.includes('image')) return { fromUser: contactId, fromUserName: 'AI智能找图', content: AGENT_GREETINGS['image-agent'].content };
    if (lower.includes('social')) return { fromUser: contactId, fromUserName: '社媒 Agent', content: AGENT_GREETINGS['social-agent'].content };
    if (lower.includes('cs') || lower.includes('customer')) return { fromUser: contactId, fromUserName: 'CRM Agent', content: AGENT_GREETINGS['crm-agent'].content };
    if (lower.includes('hr') || lower.includes('human')) return { fromUser: contactId, fromUserName: '人事 Agent', content: AGENT_GREETINGS['hr-agent'].content };
  }

  return null;
}

// ==================== 类型定义 ====================

export interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  contact_type: 'internal' | 'external' | 'team' | 'group';
  external_type?: 'customer' | 'supplier' | 'both';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_time?: number;
  last_is_read?: boolean;
  last_from?: string;
  last_from_name?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  from_user: string;
  from_user_name?: string;
  to_user: string;
  content: string;
  content_type: 'text' | 'image' | 'file' | 'order_card' | 'system_event' | 'task_dispatch' | 'task_update';
  is_read: boolean;
  created_at: number;
}

export interface AddContactInput {
  name: string;
  phone?: string;
  email?: string;
  external_type?: 'customer' | 'supplier' | 'both';
}

// ==================== Mock 数据（浏览器模式） ====================

const MOCK_CONTACTS: Contact[] = [
  // group 类型的联系人由 syncAITeamGroups 动态插入
  {
    id: 'ceo-agent', name: '🧠 CEO Agent', phone: '',
    contact_type: 'team', is_active: true,
    created_at: '2026-01-01', updated_at: '2026-05-29',
    last_message: '您好，我是 CEO Agent，有什么可以帮您？', last_message_time: Date.now() - 600000,
    last_is_read: false, last_from: 'ceo-agent', unread_count: 1,
  },
  {
    id: '1', name: '张三 (客户)', phone: '13800138001', email: 'zhangsan@email.com',
    contact_type: 'external', external_type: 'customer', is_active: true,
    created_at: '2026-01-15', updated_at: '2026-05-20',
    last_message: '老板，这批发货什么时候到？', last_message_time: Date.now() - 3600000,
    last_is_read: false, last_from: '1', unread_count: 2,
  },
  {
    id: '2', name: '李四 (供应商)', phone: '13900139002', email: 'lisi@supplier.com',
    contact_type: 'external', external_type: 'supplier', is_active: true,
    created_at: '2026-02-10', updated_at: '2026-05-18',
    last_message: '好的，明天安排发货', last_message_time: Date.now() - 86400000,
    last_is_read: true, last_from: 'self', unread_count: 0,
  },
  {
    id: '3', name: '王五 (客户)', phone: '13700137003', email: 'wangwu@email.com',
    contact_type: 'external', external_type: 'customer', is_active: true,
    created_at: '2026-03-01', updated_at: '2026-05-15',
    last_message: '收到货了，质量不错', last_message_time: Date.now() - 172800000,
    last_is_read: true, last_from: '3', unread_count: 0,
  },
  {
    id: '4', name: '小刘 (销售员)', phone: '13600136004', email: 'xiaoliu@proclaw.com',
    contact_type: 'team', external_type: undefined, is_active: true,
    created_at: '2026-01-01', updated_at: '2026-05-22',
    last_message: '今天新签了一个大客户', last_message_time: Date.now() - 7200000,
    last_is_read: false, last_from: '4', unread_count: 3,
  },
  {
    id: '5', name: '赵六 (同行调货)', phone: '13500135005', email: 'zhaoliu@email.com',
    contact_type: 'external', external_type: 'customer', is_active: true,
    created_at: '2026-04-01', updated_at: '2026-05-10',
    last_message: '老王，你那边还有XX型号库存吗？', last_message_time: Date.now() - 259200000,
    last_is_read: true, last_from: '5', unread_count: 0,
  },
  {
    id: '6', name: '钱七 (供应商)', phone: '13400134006', email: 'qianqi@factory.com',
    contact_type: 'external', external_type: 'supplier', is_active: false,
    created_at: '2026-01-20', updated_at: '2026-05-01',
  },
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  // 群聊消息由 syncAITeamGroups 动态创建种子消息
  '1': [
    { id: 'm1', from_user: '1', to_user: 'self', content: '老板你好，我要下单50箱矿泉水', content_type: 'text', is_read: true, created_at: Date.now() - 7200000 },
    { id: 'm2', from_user: 'self', to_user: '1', content: '好的，你的订单收到了，下午发货', content_type: 'text', is_read: true, created_at: Date.now() - 7100000 },
    { id: 'm3', from_user: '1', to_user: 'self', content: '太好了，谢谢老板', content_type: 'text', is_read: true, created_at: Date.now() - 7000000 },
    { id: 'm4', from_user: '1', to_user: 'self', content: '老板，这批发货什么时候到？', content_type: 'text', is_read: false, created_at: Date.now() - 3600000 },
    { id: 'm5', from_user: '1', to_user: 'self', content: '我这边客户催得紧', content_type: 'text', is_read: false, created_at: Date.now() - 3500000 },
  ],
  '2': [
    { id: 'm6', from_user: 'self', to_user: '2', content: '李总，我需要补一批包装袋', content_type: 'text', is_read: true, created_at: Date.now() - 172800000 },
    { id: 'm7', from_user: '2', to_user: 'self', content: 'OK，要多少？', content_type: 'text', is_read: true, created_at: Date.now() - 170000000 },
    { id: 'm8', from_user: 'self', to_user: '2', content: '先来5000个吧', content_type: 'text', is_read: true, created_at: Date.now() - 168000000 },
    { id: 'm9', from_user: '2', to_user: 'self', content: '好的，明天安排发货', content_type: 'text', is_read: true, created_at: Date.now() - 86400000 },
  ],
  '3': [
    { id: 'm10', from_user: '3', to_user: 'self', content: '老板，上次那批货收到了', content_type: 'text', is_read: true, created_at: Date.now() - 259200000 },
    { id: 'm11', from_user: 'self', to_user: '3', content: '好的，有什么问题随时联系', content_type: 'text', is_read: true, created_at: Date.now() - 258000000 },
    { id: 'm12', from_user: '3', to_user: 'self', content: '收到货了，质量不错', content_type: 'text', is_read: true, created_at: Date.now() - 172800000 },
  ],
  '4': [
    { id: 'm13', from_user: '4', to_user: 'self', content: '老板，今天有个新客户想谈长期合作', content_type: 'text', is_read: false, created_at: Date.now() - 10800000 },
    { id: 'm14', from_user: 'self', to_user: '4', content: '好的，你把客户信息发我看看', content_type: 'text', is_read: true, created_at: Date.now() - 10000000 },
    { id: 'm15', from_user: '4', to_user: 'self', content: '已经发你邮箱了', content_type: 'text', is_read: false, created_at: Date.now() - 9600000 },
    { id: 'm16', from_user: '4', to_user: 'self', content: '今天新签了一个大客户', content_type: 'text', is_read: false, created_at: Date.now() - 7200000 },
  ],
  '5': [
    { id: 'm17', from_user: '5', to_user: 'self', content: '老王，你那边还有XX型号库存吗？', content_type: 'text', is_read: true, created_at: Date.now() - 259200000 },
    { id: 'm18', from_user: 'self', to_user: '5', content: '有的，你要多少？', content_type: 'text', is_read: true, created_at: Date.now() - 258000000 },
  ],
};

// ==================== API 方法 ====================

/**
 * 从 AI_TEAM_GROUPS 提取所有群聊联系人
 * 用于在 Tauri 模式下注入 AI Team 群聊到联系人列表
 */
function extractAITeamGroupContacts(): Contact[] {
  const groups: Contact[] = [];
  for (const groupId in AI_TEAM_GROUPS) {
    const group = AI_TEAM_GROUPS[groupId];
    const memberCount = Object.keys(group.members).length;
    groups.push({
      id: groupId,
      name: `${group.icon} ${group.name}`,
      phone: '',
      contact_type: 'group',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_message: `👥 ${memberCount + 1}人 · CEO Agent 协调中`,
      last_message_time: Date.now(),
      last_is_read: false,
      last_from: 'system',
      last_from_name: '📢 系统',
      unread_count: 0,
    });
  }
  return groups;
}

/** 获取所有联系人 */
export async function getContacts(options?: { search?: string; current_user_id?: string }): Promise<Contact[]> {
  if (!isTauri()) {
    let contacts = [...MOCK_CONTACTS, ...extractAITeamGroupContacts()];
    if (options?.search) {
      const s = options.search.toLowerCase();
      contacts = contacts.filter(c => c.name.toLowerCase().includes(s) || c.phone?.includes(s));
    }
    return contacts;
  }
  const res: any = await invoke('get_contacts', { options: options || null });
  const dbContacts: Contact[] = res?.data || [];
  // Tauri 模式下也注入 AI Team 群聊联系人（QQ 群组风格）
  const groupContacts = extractAITeamGroupContacts();
  return [...groupContacts, ...dbContacts];
}

/** 获取最近联系人（带消息预览） */
export async function getRecentContacts(currentUserId: string): Promise<Contact[]> {
  if (!isTauri()) {
    return MOCK_CONTACTS.filter(c => c.last_message).sort((a, b) => (b.last_message_time || 0) - (a.last_message_time || 0));
  }
  const res: any = await invoke('get_recent_contacts', { params: { user_id: currentUserId } });
  return res?.data || [];
}

/** 获取消息 */
export async function getMessages(fromUser: string, toUser: string, limit = 50): Promise<Message[]> {
  if (!isTauri()) {
    // 群聊：toUser 或 fromUser 任一匹配 ai-team-group- 前缀即返回该群聊消息
    if (toUser.startsWith(AI_TEAM_GROUP_ID_PREFIX) || fromUser.startsWith(AI_TEAM_GROUP_ID_PREFIX)) {
      const groupId = toUser.startsWith(AI_TEAM_GROUP_ID_PREFIX) ? toUser : fromUser;
      return [...(MOCK_MESSAGES[groupId] || [])];
    }
    return [...(MOCK_MESSAGES[toUser] || MOCK_MESSAGES[fromUser] || [])];
  }
  const res: any = await invoke('get_messages', { params: { from_user: fromUser, to_user: toUser, limit } });
  return res?.data || [];
}

/** 向 AI Team 群聊发送系统事件消息 */
export function pushAITeamSystemEvent(content: string, groupId: string, fromUser = 'system', fromUserName = '📢 系统'): void {
  const newMsg: Message = {
    id: `ai-sys-${Date.now()}`,
    from_user: fromUser,
    from_user_name: fromUserName,
    to_user: groupId,
    content,
    content_type: 'system_event',
    is_read: false,
    created_at: Date.now(),
  };
  if (!MOCK_MESSAGES[groupId]) MOCK_MESSAGES[groupId] = [];
  MOCK_MESSAGES[groupId].push(newMsg);
  const aiTeam = MOCK_CONTACTS.find(c => c.id === groupId);
  if (aiTeam) {
    aiTeam.last_message = `📢 ${content}`;
    aiTeam.last_message_time = Date.now();
    aiTeam.last_from = fromUser;
    aiTeam.last_from_name = fromUserName;
    aiTeam.unread_count = (aiTeam.unread_count || 0) + 1;
  }
}

/** 向 AI Team 群聊推送任务分派/更新事件 */
export function pushAITeamTaskEvent(
  fromUser: string,
  fromUserName: string,
  taskData: Record<string, unknown>,
  eventType: 'task_dispatch' | 'task_update',
  groupId: string,
): void {
  const newMsg: Message = {
    id: `ai-task-${Date.now()}`,
    from_user: fromUser,
    from_user_name: fromUserName,
    to_user: groupId,
    content: JSON.stringify(taskData),
    content_type: eventType,
    is_read: false,
    created_at: Date.now(),
  };
  if (!MOCK_MESSAGES[groupId]) MOCK_MESSAGES[groupId] = [];
  MOCK_MESSAGES[groupId].push(newMsg);
  const aiTeam = MOCK_CONTACTS.find(c => c.id === groupId);
  if (aiTeam) {
    const actionCn = eventType === 'task_dispatch' ? '任务分派' : '任务更新';
    const desc = (taskData.description as string) || (taskData.taskId as string) || '未知任务';
    aiTeam.last_message = `📋 [${actionCn}] ${fromUserName}: ${desc}`;
    aiTeam.last_message_time = Date.now();
    aiTeam.last_from = fromUser;
    aiTeam.last_from_name = fromUserName;
    aiTeam.unread_count = (aiTeam.unread_count || 0) + 1;
  }
}

/** 发送消息 */
export async function sendMessage(fromUser: string, toUser: string, content: string, contentType = 'text'): Promise<Message> {
  if (!isTauri()) {
    const newMsg: Message = {
      id: `mock-${Date.now()}`,
      from_user: fromUser,
      to_user: toUser,
      content,
      content_type: contentType as any,
      is_read: false,
      created_at: Date.now(),
    };
    if (!MOCK_MESSAGES[toUser]) MOCK_MESSAGES[toUser] = [];
    MOCK_MESSAGES[toUser].push(newMsg);
    return newMsg;
  }
  return await invoke('send_message', {
    message: { from_user: fromUser, to_user: toUser, content, content_type: contentType }
  });
}

/** 标记消息已读 */
export async function markMessageRead(messageId: string): Promise<void> {
  if (!isTauri()) return;
  await invoke('mark_message_read', { params: { message_id: messageId } });
}

/** 标记整个对话已读 */
export async function markConversationRead(fromUser: string, toUser: string): Promise<void> {
  if (!isTauri()) return;
  await invoke('mark_conversation_read', { params: { from_user: fromUser, to_user: toUser } });
}

/** 添加联系人 */
export async function addContact(input: AddContactInput): Promise<Contact> {
  if (!isTauri()) {
    const newContact: Contact = {
      id: `mock-${Date.now()}`,
      name: input.name,
      phone: input.phone,
      email: input.email,
      contact_type: 'external',
      external_type: input.external_type || 'customer',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOCK_CONTACTS.push(newContact);
    return newContact;
  }
  return await invoke('add_contact', { contact: input });
}

/** 获取未读消息数 */
export async function getUnreadCount(userId: string): Promise<number> {
  if (!isTauri()) {
    return MOCK_CONTACTS.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }
  const res: any = await invoke('get_unread_count', { params: { user_id: userId } });
  return res?.count || 0;
}
