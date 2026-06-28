/**
 * Agent 团队头像库元数据（移动端版）
 *
 * 与桌面端 `src/types/agentAvatarLibrary.ts` **100% 字段兼容**：
 * - AgentAvatarPreset 接口一致
 * - AGENT_AVATAR_PRESETS 30 个 key 一致（agent_01..agent_30）
 * - getAgentAvatarPreset / getDefaultAgentAvatarKey / getDefaultAgentAvatar 函数签名一致
 *
 * 设计上 30 个头像覆盖 4 套风格 × 8 种背景色变体：
 * - 风格 1：商务西装
 * - 风格 2：科技感（极简几何）
 * - 风格 3：亲和微笑（圆脸）
 * - 风格 4：活力短发
 *
 * 移动端 src 字段保留桌面端路径以便跨端数据互通，但渲染由 TeamAvatar.tsx 独立完成
 * （避免在 RN 中引入 30 个 SVG 静态资源带来的 bundle 膨胀）。
 *
 * 使用方：AgentProfileScreen、ContactsTab、TeamMembersDialog 通过 key 查询头像定义。
 */

/**
 * 风格类型 - 由 TeamAvatar 渲染时使用
 * key 索引规则：(idx % 4) → 风格
 *   0: business（商务西装）
 *   1: tech（科技极简）
 *   2: friendly（亲和微笑）
 *   3: energetic（活力短发）
 */
export type AvatarStyle = 'business' | 'tech' | 'friendly' | 'energetic';

/** 头像预设接口（与桌面端一致） */
export interface AgentAvatarPreset {
  /** 头像 key，存到 agent_profile_overrides.avatar_key 字段 */
  key: string;
  /** 中文标签，用于选择器 UI */
  label: string;
  /** 风格描述，鼠标悬停展示 */
  description: string;
  /** 桌面端使用，指向 public/agents/team/avatars/agent_XX.svg；移动端保留兼容 */
  src: string;
  /** 分类标签，用于搜索/筛选 */
  tags: string[];
}

/** 30 个 Agent 头像预设（key/label/description/tags 与桌面端完全一致） */
export const AGENT_AVATAR_PRESETS: AgentAvatarPreset[] = [
  { key: 'agent_01', label: '紫罗兰商务', description: '知性商务·紫色背景', src: '/agents/team/avatars/agent_01.svg', tags: ['商务', '紫色'] },
  { key: 'agent_02', label: '紫色科技', description: '极简科技·紫色渐变', src: '/agents/team/avatars/agent_02.svg', tags: ['科技', '紫色'] },
  { key: 'agent_03', label: '琥珀亲和', description: '圆脸微笑·琥珀色背景', src: '/agents/team/avatars/agent_03.svg', tags: ['亲和', '琥珀'] },
  { key: 'agent_04', label: '翡翠活力', description: '活力短发·翡翠色背景', src: '/agents/team/avatars/agent_04.svg', tags: ['活力', '翡翠'] },
  { key: 'agent_05', label: '蓝色商务', description: '西装领带·蓝色背景', src: '/agents/team/avatars/agent_05.svg', tags: ['商务', '蓝色'] },
  { key: 'agent_06', label: '红色科技', description: '极简科技·红色渐变', src: '/agents/team/avatars/agent_06.svg', tags: ['科技', '红色'] },
  { key: 'agent_07', label: '粉色亲和', description: '圆脸微笑·粉色背景', src: '/agents/team/avatars/agent_07.svg', tags: ['亲和', '粉色'] },
  { key: 'agent_08', label: '天蓝活力', description: '活力短发·天蓝色背景', src: '/agents/team/avatars/agent_08.svg', tags: ['活力', '天蓝'] },
  { key: 'agent_09', label: '琥珀商务', description: '西装领带·琥珀色背景', src: '/agents/team/avatars/agent_09.svg', tags: ['商务', '琥珀'] },
  { key: 'agent_10', label: '紫罗兰科技', description: '极简科技·紫罗兰渐变', src: '/agents/team/avatars/agent_10.svg', tags: ['科技', '紫罗兰'] },
  { key: 'agent_11', label: '蓝色亲和', description: '圆脸微笑·蓝色背景', src: '/agents/team/avatars/agent_11.svg', tags: ['亲和', '蓝色'] },
  { key: 'agent_12', label: '粉色活力', description: '活力短发·粉色背景', src: '/agents/team/avatars/agent_12.svg', tags: ['活力', '粉色'] },
  { key: 'agent_13', label: '天蓝商务', description: '西装领带·天蓝色背景', src: '/agents/team/avatars/agent_13.svg', tags: ['商务', '天蓝'] },
  { key: 'agent_14', label: '翡翠科技', description: '极简科技·翡翠色渐变', src: '/agents/team/avatars/agent_14.svg', tags: ['科技', '翡翠'] },
  { key: 'agent_15', label: '红色亲和', description: '圆脸微笑·红色背景', src: '/agents/team/avatars/agent_15.svg', tags: ['亲和', '红色'] },
  { key: 'agent_16', label: '紫色活力', description: '活力短发·紫色背景', src: '/agents/team/avatars/agent_16.svg', tags: ['活力', '紫色'] },
  { key: 'agent_17', label: '深肤商务', description: '西装领带·深肤色', src: '/agents/team/avatars/agent_17.svg', tags: ['商务', '深肤'] },
  { key: 'agent_18', label: '琥珀科技', description: '极简科技·琥珀色渐变', src: '/agents/team/avatars/agent_18.svg', tags: ['科技', '琥珀'] },
  { key: 'agent_19', label: '翡翠亲和', description: '圆脸微笑·翡翠色背景', src: '/agents/team/avatars/agent_19.svg', tags: ['亲和', '翡翠'] },
  { key: 'agent_20', label: '蓝色活力', description: '活力短发·蓝色背景', src: '/agents/team/avatars/agent_20.svg', tags: ['活力', '蓝色'] },
  { key: 'agent_21', label: '红色商务', description: '西装领带·红色背景', src: '/agents/team/avatars/agent_21.svg', tags: ['商务', '红色'] },
  { key: 'agent_22', label: '粉色科技', description: '极简科技·粉色渐变', src: '/agents/team/avatars/agent_22.svg', tags: ['科技', '粉色'] },
  { key: 'agent_23', label: '天蓝亲和', description: '圆脸微笑·天蓝色背景', src: '/agents/team/avatars/agent_23.svg', tags: ['亲和', '天蓝'] },
  { key: 'agent_24', label: '紫罗兰活力', description: '活力短发·紫罗兰色', src: '/agents/team/avatars/agent_24.svg', tags: ['活力', '紫罗兰'] },
  { key: 'agent_25', label: '紫色商务', description: '西装领带·紫色背景', src: '/agents/team/avatars/agent_25.svg', tags: ['商务', '紫色'] },
  { key: 'agent_26', label: '蓝色科技', description: '极简科技·蓝色渐变', src: '/agents/team/avatars/agent_26.svg', tags: ['科技', '蓝色'] },
  { key: 'agent_27', label: '粉色亲和', description: '圆脸微笑·粉色背景', src: '/agents/team/avatars/agent_27.svg', tags: ['亲和', '粉色'] },
  { key: 'agent_28', label: '翡翠活力', description: '活力短发·翡翠色背景', src: '/agents/team/avatars/agent_28.svg', tags: ['活力', '翡翠'] },
  { key: 'agent_29', label: '天蓝商务', description: '西装领带·天蓝色背景', src: '/agents/team/avatars/agent_29.svg', tags: ['商务', '天蓝'] },
  { key: 'agent_30', label: '红色科技', description: '极简科技·红色渐变', src: '/agents/team/avatars/agent_30.svg', tags: ['科技', '红色'] },
];

/** 索引表：key -> preset 引用（O(1) 查询） */
const PRESET_INDEX: Record<string, AgentAvatarPreset> = AGENT_AVATAR_PRESETS.reduce(
  (acc, preset) => {
    acc[preset.key] = preset;
    return acc;
  },
  {} as Record<string, AgentAvatarPreset>,
);

/**
 * 通过 key 查询头像定义
 */
export function getAgentAvatarPreset(key: string | null | undefined): AgentAvatarPreset | null {
  if (!key) return null;
  return PRESET_INDEX[key] || null;
}

/**
 * 稳定的字符串哈希（djb2 变体）
 * 用于按 agentId 选一个默认头像。
 *
 * 使用 `>>> 0` 把 int32 转 uint32，保证 `Math.abs` 在 INT_MIN 上的负值溢出问题。
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // djb2: hash * 33 + c
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  // 转 uint32，避免 Math.abs(INT_MIN) 仍是负数的问题
  return hash >>> 0;
}

/**
 * 按 agentId 稳定地选一个默认头像 key
 */
export function getDefaultAgentAvatarKey(agentId: string): string {
  if (!agentId) return AGENT_AVATAR_PRESETS[0].key;
  const idx = hashString(agentId) % AGENT_AVATAR_PRESETS.length;
  return AGENT_AVATAR_PRESETS[idx].key;
}

/**
 * 获取 agent 默认头像的 URL（用于未设置 override 的场景）
 *
 * 移动端返回桌面端风格的 src 路径，便于跨端数据互通；
 * 渲染端（TeamAvatar.tsx）按 key 生成 SVG，不依赖该 URL。
 */
export function getDefaultAgentAvatar(agentId: string): string {
  const key = getDefaultAgentAvatarKey(agentId);
  return PRESET_INDEX[key]?.src || AGENT_AVATAR_PRESETS[0].src;
}

/**
 * 根据 key 推导风格类型（移动端渲染用）
 * 规则：idx % 4 → 风格循环
 *   0: business
 *   1: tech
 *   2: friendly
 *   3: energetic
 */
export function getAvatarStyle(key: string): AvatarStyle {
  const idx = AGENT_AVATAR_PRESETS.findIndex((p) => p.key === key);
  if (idx < 0) return 'business';
  const styles: AvatarStyle[] = ['business', 'tech', 'friendly', 'energetic'];
  return styles[idx % 4];
}