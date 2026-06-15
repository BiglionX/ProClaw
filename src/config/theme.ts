import { createTheme } from '@mui/material/styles';

// ============================================================
// ProClaw Design Token System (PRD v11.0)
// ============================================================

// 扩展 MUI TypographyVariants 接口，添加 Stat 字体变体
declare module '@mui/material/styles' {
  interface TypographyVariants {
    statLarge: React.CSSProperties;
    statMedium: React.CSSProperties;
    statSmall: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    statLarge?: React.CSSProperties;
    statMedium?: React.CSSProperties;
    statSmall?: React.CSSProperties;
  }
}

// 品牌色
const proclaw = {
  primary: '#FF3B30',
  aiGlow: '#FF6B6B',
  deep: '#1A1A2E',
  surface: '#F8F9FC',
  accentPurple: '#6366F1',
  accentGreen: '#10B981',
  accentGold: '#F59E0B',
};

// 渐变
const gradients = {
  ai: 'linear-gradient(135deg, #FF3B30 0%, #6366F1 100%)',
  card: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(248,249,252,0.95) 100%)',
};

// 圆角
const borderRadius = {
  compact: 4,
  standard: 8,
  card: 12,
  panel: 16,
  largePanel: 24,
};

const proClawTheme = createTheme({
  palette: {
    primary: {
      main: proclaw.primary,
      light: '#FF6B6B',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: proclaw.accentPurple,
      light: '#818CF8',
      dark: '#4F46E5',
    },
    background: {
      default: proclaw.surface,
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#6B7280',
    },
    divider: 'rgba(0,0,0,0.08)',
    success: {
      main: proclaw.accentGreen,
      light: '#D1FAE5',
      dark: '#059669',
    },
    warning: {
      main: proclaw.accentGold,
      light: '#FEF3C7',
      dark: '#D97706',
    },
    error: {
      main: proclaw.primary,
      light: '#FEE2E2',
      dark: '#DC2626',
    },
    info: {
      main: proclaw.accentPurple,
      light: '#E0E7FF',
      dark: '#4338CA',
    },
  },

  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Noto Sans SC"',
      '"PingFang SC"',
      '"Microsoft YaHei"',
      'sans-serif',
    ].join(','),
    h4: {
      fontSize: '1.5rem',
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h6: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    // ============================================================
    // 数字展示专用样式（PRD v11.0 §3.3 Stat 字体系统）
    // 使用：<Typography variant="statLarge">128.5</Typography>
    // ============================================================
    statLarge: {
      fontSize: '2rem',         // 32px
      fontWeight: 800,
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      fontFeatureSettings: '"tnum"', // 等宽数字
    },
    statMedium: {
      fontSize: '1.5rem',       // 24px
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.01em',
      fontFeatureSettings: '"tnum"',
    },
    statSmall: {
      fontSize: '1.125rem',     // 18px
      fontWeight: 600,
      lineHeight: 1.3,
      fontFeatureSettings: '"tnum"',
    },
  },

  shape: {
    borderRadius: borderRadius.standard,
  },

  components: {
    // ---- Card ----
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: borderRadius.card,
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          },
        },
      },
    },
    // ---- Button ----
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.standard,
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:active': {
            transform: 'scale(0.96)',
          },
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(255,59,48,0.3)',
          },
        },
        outlined: {
          borderColor: 'rgba(0,0,0,0.15)',
          '&:hover': {
            borderColor: proclaw.primary,
            backgroundColor: 'rgba(255,59,48,0.04)',
          },
        },
      },
    },
    // ---- Paper ----
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        },
      },
    },
    // ---- Chip ----
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.compact,
          fontWeight: 500,
        },
        outlined: {
          borderColor: 'rgba(0,0,0,0.12)',
        },
      },
    },
    // ---- Tab ----
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '0.875rem',
          minHeight: 48,
        },
      },
    },
    // ---- Avatar ----
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    // ---- Drawer ----
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(255,255,255,0.08)',
        },
      },
    },
    // ---- Skeleton ----
    MuiSkeleton: {
      styleOverrides: {
        root: {
          borderRadius: borderRadius.compact,
        },
      },
    },
  },
});

// ============================================================
// CSS Custom Properties (用于在 theme 外使用)
// ============================================================
export const designTokens = {
  colors: proclaw,
  gradients,
  borderRadius,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  // 数字字体（PRD v11.0 §3.3 Stat 字号系统）
  stat: {
    large: { fontSize: '2rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' },
    medium: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.01em' },
    small: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 },
  },
};

export default proClawTheme;
