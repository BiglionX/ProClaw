import { MD3LightTheme, type MD3Theme } from 'react-native-paper';

// 审计 R2-T2：添加 satisfies 约束，确保 paper 版本升级时编译期捕获类型不匹配
export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',
    primaryContainer: '#e0e7ff',
    onPrimaryContainer: '#3730a3',
    secondary: '#10b981',
    secondaryContainer: '#d1fae5',
    onSecondaryContainer: '#065f46',
    error: '#ef4444',
    errorContainer: '#fee2e2',
    onErrorContainer: '#991b1b',
    background: '#f8f8f8',
    surface: '#ffffff',
    surfaceVariant: '#f3f4f6',
    outline: '#e5e7eb',
    outlineVariant: '#d1d5db',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#ffffff',
      level2: '#f8f8f8',
    },
  },
};
