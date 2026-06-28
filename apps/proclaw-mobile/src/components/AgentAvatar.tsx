// AgentAvatar - AI Agent 拟人化头像组件
// v21: 用 react-native-svg 为每个 Agent 生成独特的拟人化头像
//      解决之前用字母占位的"草率感"，让 Agent 视觉上更有质感
//
// 设计语言：
// - 渐变圆形背景（每 Agent 独立色系）
// - 中央几何图形（领带/耳机/金币/复选框/心形等代表角色）
// - 外圈发光装饰

import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Path,
  Rect,
  G,
  RadialGradient,
} from 'react-native-svg';
import { Image } from 'react-native';

// ============ 角色头像配置 ============

interface AgentVisual {
  // 背景渐变 (浅色端 → 深色端)
  bgGradient: [string, string];
  // 中央图形 fill 颜色
  glyphColor: string;
  // 中央图形类型 + 渲染函数（SVG 坐标 100x100，圆心 50,50）
  glyph: 'secretary' | 'ceo' | 'service' | 'finance' | 'task' | 'crm' | 'leadership' | 'sales' | 'analytics' | 'default';
  // 外圈光环颜色
  glowColor: string;
}

// 每个 Agent 一个独特配色
const VISUAL_BY_ID: Record<string, AgentVisual> = {
  secretary: {
    bgGradient: ['#a78bfa', '#7c3aed'],
    glyphColor: '#fff',
    glyph: 'secretary',
    glowColor: 'rgba(167,139,250,0.4)',
  },
  ceo: {
    bgGradient: ['#3b82f6', '#1e40af'],
    glyphColor: '#fbbf24',
    glyph: 'ceo',
    glowColor: 'rgba(59,130,246,0.4)',
  },
  'customer-service': {
    bgGradient: ['#f472b6', '#be185d'],
    glyphColor: '#fff',
    glyph: 'service',
    glowColor: 'rgba(244,114,182,0.4)',
  },
  finance: {
    bgGradient: ['#fbbf24', '#b45309'],
    glyphColor: '#fff',
    glyph: 'finance',
    glowColor: 'rgba(251,191,36,0.4)',
  },
  task: {
    bgGradient: ['#34d399', '#047857'],
    glyphColor: '#fff',
    glyph: 'task',
    glowColor: 'rgba(52,211,153,0.4)',
  },
  crm: {
    bgGradient: ['#a78bfa', '#6d28d9'],
    glyphColor: '#fff',
    glyph: 'crm',
    glowColor: 'rgba(167,139,250,0.4)',
  },
  // AI Team 头像（预置团队）
  'team-leadership': {
    bgGradient: ['#f59e0b', '#7c2d12'],
    glyphColor: '#fff',
    glyph: 'leadership',
    glowColor: 'rgba(245,158,11,0.4)',
  },
  'team-sales': {
    bgGradient: ['#ec4899', '#831843'],
    glyphColor: '#fff',
    glyph: 'sales',
    glowColor: 'rgba(236,72,153,0.4)',
  },
  'team-analytics': {
    bgGradient: ['#06b6d4', '#0e7490'],
    glyphColor: '#fff',
    glyph: 'analytics',
    glowColor: 'rgba(6,182,212,0.4)',
  },
};

const DEFAULT_VISUAL: AgentVisual = {
  bgGradient: ['#6366f1', '#3730a3'],
  glyphColor: '#fff',
  glyph: 'default',
  glowColor: 'rgba(99,102,241,0.4)',
};

// ============ 头像图形渲染函数 ============

interface GlyphProps {
  color: string;
}

/** 秘书 - 笔记本 + 心形 */
function SecretaryGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 笔记本 */}
      <Rect x="28" y="35" width="44" height="35" rx="3" fill={color} />
      {/* 笔记本装订线 */}
      <Rect x="48" y="35" width="4" height="35" fill="rgba(0,0,0,0.2)" />
      {/* 文字行 */}
      <Rect x="33" y="42" width="10" height="2" fill="rgba(0,0,0,0.3)" />
      <Rect x="33" y="48" width="14" height="2" fill="rgba(0,0,0,0.3)" />
      <Rect x="33" y="54" width="8" height="2" fill="rgba(0,0,0,0.3)" />
      {/* 心形装饰 */}
      <Path
        d="M50 60 C45 55 40 60 50 72 C60 60 55 55 50 60 Z"
        fill="#ec4899"
      />
    </G>
  );
}

/** CEO - 领带 + 西装领 */
function CeoGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 西装领 V 字 */}
      <Path
        d="M30 30 L42 45 L50 38 L58 45 L70 30 Z"
        fill={color}
      />
      {/* 衬衫领口 */}
      <Path
        d="M44 32 L50 42 L56 32 Z"
        fill="#fff"
        opacity="0.95"
      />
      {/* 领带 */}
      <Path
        d="M48 42 L52 42 L53 50 L50 56 L47 50 Z"
        fill="#dc2626"
      />
      <Path
        d="M47 50 L53 50 L52 70 L50 73 L48 70 Z"
        fill="#dc2626"
      />
      {/* 领带结 */}
      <Rect x="46" y="40" width="8" height="3" fill="#991b1b" />
      {/* 王冠装饰（小如/CEO 区别） */}
      <Path
        d="M42 25 L46 18 L50 25 L54 18 L58 25 Z"
        fill="#fbbf24"
      />
    </G>
  );
}

/** 客服 - 戴耳机微笑 */
function ServiceGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 耳机弧 */}
      <Path
        d="M22 50 Q22 28 50 28 Q78 28 78 50"
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      {/* 左耳罩 */}
      <Rect x="15" y="48" width="14" height="18" rx="4" fill={color} />
      {/* 右耳罩 */}
      <Rect x="71" y="48" width="14" height="18" rx="4" fill={color} />
      {/* 麦克风臂 */}
      <Path
        d="M71 64 Q60 75 50 70"
        stroke={color}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* 麦克风头 */}
      <Circle cx="50" cy="72" r="3.5" fill={color} />
      {/* 中央笑脸 */}
      <Circle cx="50" cy="52" r="14" fill="#fff" opacity="0.95" />
      <Circle cx="44" cy="50" r="1.5" fill="#1f2937" />
      <Circle cx="56" cy="50" r="1.5" fill="#1f2937" />
      <Path
        d="M44 56 Q50 60 56 56"
        stroke="#1f2937"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

/** 财务 - 金币 ¥ */
function FinanceGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 大金币外圈 */}
      <Circle cx="50" cy="50" r="28" fill={color} />
      {/* 内圈高亮 */}
      <Circle cx="50" cy="50" r="24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
      {/* ¥ 符号第一横 */}
      <Rect x="38" y="35" width="24" height="3" fill="#fff" />
      {/* ¥ 符号斜线（两根） */}
      <Path
        d="M42 41 L46 51 L46 65 L54 65 L54 51 L58 41"
        stroke="#fff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* ¥ 符号第二横 */}
      <Rect x="38" y="52" width="24" height="3" fill="#fff" />
      {/* 周围闪光 */}
      <Circle cx="22" cy="32" r="1.5" fill="#fff" opacity="0.8" />
      <Circle cx="78" cy="32" r="1.5" fill="#fff" opacity="0.8" />
      <Circle cx="22" cy="68" r="1.5" fill="#fff" opacity="0.8" />
      <Circle cx="78" cy="68" r="1.5" fill="#fff" opacity="0.8" />
    </G>
  );
}

/** 任务 - 复选框 + 列表线 */
function TaskGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 看板背景 */}
      <Rect x="22" y="28" width="56" height="44" rx="4" fill={color} />
      {/* 看板标题栏 */}
      <Rect x="22" y="28" width="56" height="10" rx="4" fill="rgba(0,0,0,0.15)" />
      {/* 任务行 1 - 已完成 */}
      <Rect x="28" y="42" width="6" height="6" rx="1" fill="#10b981" />
      <Path d="M29 45 L31 47 L33 43" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <Rect x="37" y="43" width="36" height="3" rx="1" fill="#fff" opacity="0.9" />
      {/* 任务行 2 - 进行中 */}
      <Rect x="28" y="52" width="6" height="6" rx="1" fill="#fbbf24" />
      <Rect x="37" y="53" width="30" height="3" rx="1" fill="#fff" opacity="0.9" />
      {/* 任务行 3 */}
      <Rect x="28" y="62" width="6" height="6" rx="1" fill="rgba(255,255,255,0.4)" />
      <Rect x="37" y="63" width="26" height="3" rx="1" fill="#fff" opacity="0.7" />
    </G>
  );
}

/** CRM - 心形 + 握手 */
function CrmGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 心形 */}
      <Path
        d="M50 68
           C50 68 28 54 28 40
           C28 32 34 28 40 28
           C45 28 49 32 50 36
           C51 32 55 28 60 28
           C66 28 72 32 72 40
           C72 54 50 68 50 68 Z"
        fill={color}
      />
      {/* 心形中央高光 */}
      <Path
        d="M36 32 Q40 30 44 32"
        stroke="#fff"
        strokeWidth="1.5"
        fill="none"
        opacity="0.6"
      />
    </G>
  );
}

/** 领导团队 - 多个人头 */
function LeadershipGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 中间主人物 */}
      <Circle cx="50" cy="42" r="12" fill={color} />
      <Path
        d="M30 75 Q30 58 50 58 Q70 58 70 75 Z"
        fill={color}
      />
      {/* 王冠 */}
      <Path
        d="M38 30 L42 22 L46 28 L50 20 L54 28 L58 22 L62 30 Z"
        fill="#fbbf24"
      />
      {/* 左右小人物 */}
      <Circle cx="28" cy="48" r="8" fill={color} opacity="0.7" />
      <Path
        d="M16 75 Q16 65 28 65 Q40 65 40 75 Z"
        fill={color}
        opacity="0.7"
      />
      <Circle cx="72" cy="48" r="8" fill={color} opacity="0.7" />
      <Path
        d="M60 75 Q60 65 72 65 Q84 65 84 75 Z"
        fill={color}
        opacity="0.7"
      />
    </G>
  );
}

/** 销售团队 - 上升箭头 + 钱币 */
function SalesGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 上升箭头 */}
      <Path
        d="M28 68 L48 48 L58 58 L72 36"
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 箭头头部 */}
      <Path
        d="M64 32 L74 32 L74 42"
        stroke={color}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 底部基线 */}
      <Rect x="22" y="72" width="56" height="3" rx="1" fill={color} opacity="0.5" />
      {/* 小金币装饰 */}
      <Circle cx="76" cy="68" r="6" fill={color} opacity="0.4" />
      <Rect x="73" y="65" width="6" height="1.5" fill="#fff" />
      <Rect x="73" y="68" width="6" height="1.5" fill="#fff" />
      <Rect x="73" y="71" width="6" height="1.5" fill="#fff" />
    </G>
  );
}

/** 分析团队 - 柱状图 */
function AnalyticsGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 坐标轴 */}
      <Rect x="22" y="70" width="56" height="2" fill={color} opacity="0.7" />
      <Rect x="22" y="30" width="2" height="42" fill={color} opacity="0.7" />
      {/* 柱 1 (矮) */}
      <Rect x="30" y="56" width="8" height="14" rx="1" fill={color} opacity="0.6" />
      {/* 柱 2 (中) */}
      <Rect x="42" y="46" width="8" height="24" rx="1" fill={color} opacity="0.75" />
      {/* 柱 3 (高) */}
      <Rect x="54" y="38" width="8" height="32" rx="1" fill={color} />
      {/* 柱 4 (最高) */}
      <Rect x="66" y="32" width="8" height="38" rx="1" fill={color} />
      {/* 趋势线 */}
      <Path
        d="M34 52 L46 42 L58 34 L70 28"
        stroke="#fbbf24"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.9"
      />
    </G>
  );
}

/** 默认 - 机器人 */
function DefaultGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 头部 */}
      <Rect x="28" y="30" width="44" height="40" rx="8" fill={color} />
      {/* 天线 */}
      <Rect x="48" y="22" width="4" height="10" fill={color} />
      <Circle cx="50" cy="20" r="3" fill={color} />
      {/* 眼睛 */}
      <Circle cx="40" cy="48" r="3" fill="#1f2937" />
      <Circle cx="60" cy="48" r="3" fill="#1f2937" />
      {/* 嘴巴 */}
      <Rect x="42" y="58" width="16" height="3" rx="1" fill="#1f2937" />
    </G>
  );
}

function renderGlyph(type: AgentVisual['glyph'], color: string): React.ReactNode {
  switch (type) {
    case 'secretary': return <SecretaryGlyph color={color} />;
    case 'ceo': return <CeoGlyph color={color} />;
    case 'service': return <ServiceGlyph color={color} />;
    case 'finance': return <FinanceGlyph color={color} />;
    case 'task': return <TaskGlyph color={color} />;
    case 'crm': return <CrmGlyph color={color} />;
    case 'leadership': return <LeadershipGlyph color={color} />;
    case 'sales': return <SalesGlyph color={color} />;
    case 'analytics': return <AnalyticsGlyph color={color} />;
    default: return <DefaultGlyph color={color} />;
  }
}

// ============ 头像主组件 ============

export interface AgentAvatarProps {
  agentId: string;
  size?: number;
  /** 是否显示秘书小如的图片（v15 之前的默认头像） */
  useSecretaryImage?: boolean;
}

export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agentId,
  size = 44,
  useSecretaryImage = true,
}) => {
  // 优先用真实图片（小如）
  if (useSecretaryImage && agentId === 'secretary') {
    return (
      <View style={[styles.wrapper, { width: size, height: size }]}>
        <Image
          source={require('../../assets/avatars/secretary/default.png')}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const visual = VISUAL_BY_ID[agentId] || DEFAULT_VISUAL;

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: visual.bgGradient[1],
          shadowOpacity: 0.5,
          shadowRadius: size / 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`bg-${agentId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={visual.bgGradient[0]} />
            <Stop offset="100%" stopColor={visual.bgGradient[1]} />
          </LinearGradient>
          <RadialGradient id={`glow-${agentId}`} cx="50%" cy="50%" r="50%">
            <Stop offset="60%" stopColor="rgba(255,255,255,0.15)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
        </Defs>

        {/* 圆形渐变背景 */}
        <Circle cx="50" cy="50" r="50" fill={`url(#bg-${agentId})`} />

        {/* 高光叠加 */}
        <Circle cx="50" cy="50" r="50" fill={`url(#glow-${agentId})`} />

        {/* 中央图形 */}
        {renderGlyph(visual.glyph, visual.glyphColor)}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

export default AgentAvatar;
