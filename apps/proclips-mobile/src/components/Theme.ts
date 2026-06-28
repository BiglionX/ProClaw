/**
 * ProClips 主题
 *
 * 深色背景 + 青蓝/品红/紫渐变（商家）/ 琥珀/玫红/紫（达人）
 * 对应原型 ui-prototype/index.html 的 :root 主题变量
 */

import { MD3DarkTheme, type MD3Theme } from 'react-native-paper';
import type { ProClipsRole } from '../types/navigation';

// ============ 基础色板（对应原型 CSS 变量） ============
export const colors = {
  // 品牌色
  cyan: '#00d2ff',
  magenta: '#ff6b9d',
  purple: '#a855f7',
  amber: '#ffb547',
  rose: '#f43f5e',
  yellow: '#fbbf24',

  // 背景
  bgDeep: '#0f0f1e', // 主背景
  bgCard: '#1a1a2e', // 卡片
  bgCard2: '#22223a', // 卡片次
  bgElev: '#262640', // 凸起
  bgBlack: '#05050c',

  // 文本
  txt1: '#ffffff',
  txt2: '#b8b8d4',
  txt3: '#6e6e8f',

  // 线条
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.14)',

  // 状态
  success: '#22c55e',
  warning: '#fbbf24',
  danger: '#fb923c',
  error: '#ff3b5c',
} as const;

// ============ 渐变色组 ============
export const gradients = {
  // 商家主渐变：青蓝 → 品红 → 紫
  main: ['#00d2ff', '#ff6b9d', '#a855f7'],
  warm: ['#ff6b9d', '#ffb547'],
  cool: ['#00d2ff', '#a855f7'],
  // 达人主渐变：琥珀 → 玫红 → 紫
  creator: ['#fbbf24', '#f43f5e', '#a855f7'],
  creatorWarm: ['#f43f5e', '#ffb547'],
} as const;

// ============ 角色主题 ============
export interface RoleTheme {
  c1: string;
  c2: string;
  c3: string;
  icon: string;
  label: string;
  grad: readonly string[];
}

export const roleThemes: Record<ProClipsRole, RoleTheme> = {
  merchant: {
    c1: colors.cyan,
    c2: colors.magenta,
    c3: colors.purple,
    icon: '🏪',
    label: '商家模式',
    grad: gradients.main,
  },
  creator: {
    c1: colors.yellow,
    c2: colors.rose,
    c3: colors.purple,
    icon: '🎬',
    label: '达人模式',
    grad: gradients.creator,
  },
};

// ============ 圆角 ============
export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
} as const;

// ============ 阴影 ============
export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 8,
  },
  glow: (color: string = colors.magenta) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 6,
  }),
} as const;

// ============ react-native-paper 主题（深色基底） ============
export const theme: MD3Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.cyan,
    secondary: colors.magenta,
    tertiary: colors.purple,
    background: colors.bgDeep,
    surface: colors.bgCard,
    surfaceVariant: colors.bgCard2,
    error: colors.error,
    onPrimary: '#000',
    onSecondary: '#fff',
    onBackground: colors.txt1,
    onSurface: colors.txt1,
    onSurfaceVariant: colors.txt2,
    outline: colors.line,
    outlineVariant: colors.lineStrong,
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: colors.bgCard,
      level2: colors.bgCard2,
      level3: colors.bgElev,
    },
  },
};

// ============ 平台主色（第三方平台接入用） ============
export const platformColors: Record<string, string> = {
  douyin: '#000000',
  kuaishou: '#FF6600',
  xiaohongshu: '#FF2E4D',
  wechat_video: '#07C160',
  bilibili: '#23ADE5',
  weibo: '#E6162D',
};

export const platformLabels: Record<string, string> = {
  douyin: '抖音',
  kuaishou: '快手',
  xiaohongshu: '小红书',
  wechat_video: '视频号',
  bilibili: 'B 站',
  weibo: '微博',
};
