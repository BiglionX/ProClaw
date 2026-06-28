/**
 * TeamAvatar - 30 个 Agent 团队头像渲染组件（移动端版）
 *
 * 根据 agentAvatarLibrary.ts 中的 key 渲染对应的拟人化头像。
 * 通过 key 推导风格（business/tech/friendly/energetic）和配色（紫罗兰/紫/琥珀/翡翠/蓝/红/粉/天蓝）。
 *
 * 设计语言（与现有 AgentAvatar.tsx 一致）：
 * - 渐变圆形背景（每 Key 独立色系）
 * - 中央几何图形（领带/几何块/笑脸/短发代表 4 种风格）
 * - 外圈发光装饰
 *
 * 与 AgentAvatar.tsx 的区别：
 * - AgentAvatar：按 agentId 查找（secretary/ceo/finance...），用于已知 Agent
 * - TeamAvatar：按 key（agent_01..agent_30）查找，用于头像库选择器
 */

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
import {
  AGENT_AVATAR_PRESETS,
  getAvatarStyle,
  type AvatarStyle,
} from '../types/agentAvatarLibrary';

// ============ 配色系统（8 种背景色循环）============

interface PaletteEntry {
  bgGradient: [string, string];
  glowColor: string;
}

const PALETTES: PaletteEntry[] = [
  // 0: 紫罗兰
  { bgGradient: ['#a78bfa', '#7c3aed'], glowColor: 'rgba(167,139,250,0.4)' },
  // 1: 紫色
  { bgGradient: ['#c084fc', '#9333ea'], glowColor: 'rgba(192,132,252,0.4)' },
  // 2: 琥珀
  { bgGradient: ['#fbbf24', '#d97706'], glowColor: 'rgba(251,191,36,0.4)' },
  // 3: 翡翠
  { bgGradient: ['#34d399', '#059669'], glowColor: 'rgba(52,211,153,0.4)' },
  // 4: 蓝色
  { bgGradient: ['#60a5fa', '#2563eb'], glowColor: 'rgba(96,165,250,0.4)' },
  // 5: 红色
  { bgGradient: ['#f87171', '#dc2626'], glowColor: 'rgba(248,113,113,0.4)' },
  // 6: 粉色
  { bgGradient: ['#f472b6', '#db2777'], glowColor: 'rgba(244,114,182,0.4)' },
  // 7: 天蓝
  { bgGradient: ['#38bdf8', '#0284c7'], glowColor: 'rgba(56,189,248,0.4)' },
];

/** 通过 key 索引取调色板 */
function getPaletteByKey(key: string): PaletteEntry {
  const idx = AGENT_AVATAR_PRESETS.findIndex((p) => p.key === key);
  if (idx < 0) return PALETTES[0];
  return PALETTES[idx % 8];
}

// ============ 4 种风格图形（SVG 坐标 100x100，圆心 50,50）============

interface GlyphProps {
  color: string;
}

/** 商务 - 西装领带 + 王冠 */
function BusinessGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 西装 V 字领 */}
      <Path d="M30 30 L42 45 L50 38 L58 45 L70 30 Z" fill={color} />
      {/* 衬衫领口 */}
      <Path d="M44 32 L50 42 L56 32 Z" fill="#fff" opacity="0.95" />
      {/* 领带 */}
      <Path d="M48 42 L52 42 L53 50 L50 56 L47 50 Z" fill="#dc2626" />
      <Path d="M47 50 L53 50 L52 70 L50 73 L48 70 Z" fill="#dc2626" />
      {/* 领带结 */}
      <Rect x="46" y="40" width="8" height="3" fill="#991b1b" />
    </G>
  );
}

/** 科技 - 极简几何（菱形 + 圆点） */
function TechGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 中心菱形 */}
      <Path
        d="M50 25 L70 50 L50 75 L30 50 Z"
        fill={color}
        opacity="0.9"
      />
      {/* 内圈菱形 */}
      <Path
        d="M50 35 L62 50 L50 65 L38 50 Z"
        fill="rgba(255,255,255,0.25)"
      />
      {/* 中心圆点 */}
      <Circle cx="50" cy="50" r="6" fill="#fff" />
      {/* 四角装饰圆点 */}
      <Circle cx="50" cy="25" r="3" fill={color} />
      <Circle cx="50" cy="75" r="3" fill={color} />
      <Circle cx="25" cy="50" r="3" fill={color} />
      <Circle cx="75" cy="50" r="3" fill={color} />
    </G>
  );
}

/** 亲和 - 圆脸微笑 */
function FriendlyGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 圆脸 */}
      <Circle cx="50" cy="52" r="22" fill="#fff" opacity="0.95" />
      {/* 头发 */}
      <Path
        d="M28 50 Q28 30 50 30 Q72 30 72 50 Q72 42 65 38 Q50 32 35 38 Q28 42 28 50 Z"
        fill={color}
      />
      {/* 左眼 */}
      <Circle cx="42" cy="50" r="2" fill="#1f2937" />
      {/* 右眼 */}
      <Circle cx="58" cy="50" r="2" fill="#1f2937" />
      {/* 微笑 */}
      <Path
        d="M42 58 Q50 64 58 58"
        stroke="#1f2937"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* 脸颊红晕 */}
      <Circle cx="36" cy="58" r="3" fill="#fca5a5" opacity="0.6" />
      <Circle cx="64" cy="58" r="3" fill="#fca5a5" opacity="0.6" />
    </G>
  );
}

/** 活力 - 短发 + 闪电 */
function EnergeticGlyph({ color }: GlyphProps) {
  return (
    <G>
      {/* 短发底色 */}
      <Path
        d="M28 40 Q28 25 50 25 Q72 25 72 40 L72 50 Q60 42 50 42 Q40 42 28 50 Z"
        fill={color}
      />
      {/* 闪电 */}
      <Path
        d="M55 35 L42 55 L50 55 L45 70 L58 50 L50 50 Z"
        fill="#fbbf24"
        stroke="#fff"
        strokeWidth="1"
      />
      {/* 脸轮廓 */}
      <Circle cx="50" cy="55" r="18" fill="#fff" opacity="0.95" />
      {/* 左眼 */}
      <Circle cx="44" cy="55" r="2" fill="#1f2937" />
      {/* 右眼 */}
      <Circle cx="56" cy="55" r="2" fill="#1f2937" />
      {/* 张嘴笑 */}
      <Path
        d="M44 62 Q50 67 56 62"
        stroke="#1f2937"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

function renderGlyph(style: AvatarStyle, color: string): React.ReactNode {
  switch (style) {
    case 'business':
      return <BusinessGlyph color={color} />;
    case 'tech':
      return <TechGlyph color={color} />;
    case 'friendly':
      return <FriendlyGlyph color={color} />;
    case 'energetic':
      return <EnergeticGlyph color={color} />;
    default:
      return <BusinessGlyph color={color} />;
  }
}

// ============ 主组件 ============

export interface TeamAvatarProps {
  /** 头像 key（agent_01..agent_30） */
  presetKey: string;
  /** 直径（像素），默认 44 */
  size?: number;
  /** 是否显示发光阴影，默认 true */
  withGlow?: boolean;
  /** 自定义边框颜色（如选中态），传 undefined 表示无边框 */
  borderColor?: string;
  /** 边框宽度（像素），默认 2 */
  borderWidth?: number;
}

/**
 * 通过 presetKey 渲染 Agent 团队头像
 */
export const TeamAvatar: React.FC<TeamAvatarProps> = ({
  presetKey,
  size = 44,
  withGlow = true,
  borderColor,
  borderWidth = 2,
}) => {
  const palette = getPaletteByKey(presetKey);
  const style = getAvatarStyle(presetKey);

  return (
    <View
      style={[
        styles.wrapper,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          shadowColor: withGlow ? palette.bgGradient[1] : 'transparent',
          shadowOpacity: withGlow ? 0.5 : 0,
          shadowRadius: size / 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: withGlow ? 3 : 0,
          borderWidth: borderColor ? borderWidth : 0,
          borderColor: borderColor || 'transparent',
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`bg-${presetKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={palette.bgGradient[0]} />
            <Stop offset="100%" stopColor={palette.bgGradient[1]} />
          </LinearGradient>
          <RadialGradient id={`glow-${presetKey}`} cx="50%" cy="50%" r="50%">
            <Stop offset="60%" stopColor="rgba(255,255,255,0.18)" />
            <Stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </RadialGradient>
        </Defs>

        {/* 圆形渐变背景 */}
        <Circle cx="50" cy="50" r="50" fill={`url(#bg-${presetKey})`} />

        {/* 高光叠加 */}
        <Circle cx="50" cy="50" r="50" fill={`url(#glow-${presetKey})`} />

        {/* 中央图形 */}
        {renderGlyph(style, '#fff')}
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

export default TeamAvatar;