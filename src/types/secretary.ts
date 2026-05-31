/** 秘书 Agent 完整配置 */
export interface SecretaryConfig {
  /** 显示名称，默认 '小 Pro' */
  name: string;
  /** 头像 key，默认 'default' */
  avatarKey: string;
  /** 语音配置（预留） */
  voice?: SecretaryVoiceConfig;
  /** 老板关注配置 */
  bap?: BossAttentionProfile;
}

/** 老板关注配置（BAP）——秘书专属上下文 */
export interface BossAttentionProfile {
  /** 关注指标及优先级 */
  kpiPreferences: Array<{ kpi: string; priority: number; confidence: number }>;
  /** 时间惯例 */
  timeRoutines: Array<{ type: 'daily_brief' | 'weekly_report' | 'monthly_compare'; time: string; enabled: boolean }>;
  /** 预警阈值 */
  alertThresholds: Record<string, number>;
  /** 重点关注领域 */
  focusAreas: { products: string[]; categories: string[]; suppliers: string[]; customers: string[] };
  /** 报告格式偏好 */
  reportPreference: { chartFirst: boolean; includeComparison: boolean; detailLevel: 'summary' | 'detailed' };
  /** 最近查询统计（用于被动学习） */
  recentQueryStats: Array<{ module: string; count: number; lastQueryAt: number }>;
}

/** BAP 数据库记录类型 */
export interface BapRecord {
  id: string;
  profile_type: 'kpi_preference' | 'time_routine' | 'alert_threshold' | 'focus_area' | 'custom_rule';
  key: string;
  value: unknown;
  confidence: number;
  source: 'observed' | 'explicit' | 'inferred';
  last_matched_at: number | null;
  created_at: number;
  updated_at: number;
}

/** 语音通话配置（预留，vNext） */
export interface SecretaryVoiceConfig {
  enabled: boolean;
  voiceId: string;
  speed: number;
  wakeWordEnabled: boolean;
}

/** 预设头像定义 */
export interface AvatarPreset {
  key: string;
  label: string;
  description: string;
  src: string;
}

/** localStorage key 常量 */
export const SECRETARY_STORAGE_KEYS = {
  NAME: 'proclaw-secretary-name',
  AVATAR: 'proclaw-secretary-avatar',
  VOICE_CONFIG: 'proclaw-secretary-voice-config',
} as const;

/** 默认名称 */
export const DEFAULT_SECRETARY_NAME = '小 Pro';

/** 默认头像 key */
export const DEFAULT_AVATAR_KEY = 'default';

/** 预设头像列表 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { key: 'default', label: '默认', description: 'ProClaw 品牌默认秘书形象', src: '/agents/secretary/avatars/default.png' },
  { key: 'avatar_01', label: '知性', description: '知性风格·女性眼镜微笑', src: '/agents/secretary/avatars/avatar_01.png' },
  { key: 'avatar_02', label: '干练', description: '干练风格·女性马尾', src: '/agents/secretary/avatars/avatar_02.png' },
  { key: 'avatar_03', label: '亲和', description: '亲和风格·女性圆脸温暖', src: '/agents/secretary/avatars/avatar_03.png' },
  { key: 'avatar_04', label: '专业', description: '专业风格·女性职场自信', src: '/agents/secretary/avatars/avatar_04.png' },
  { key: 'avatar_05', label: '活力', description: '活力风格·女性年轻朝气', src: '/agents/secretary/avatars/avatar_05.png' },
  { key: 'avatar_06', label: '吉祥物', description: 'ProClaw 猫头鹰吉祥物', src: '/agents/secretary/avatars/avatar_06.png' },
];
