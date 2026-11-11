/**
 * Storybook 全局预览配置
 *
 * - 全局装饰器:挂上 HermesApiMock + Mui Theme Provider
 * - 全局背景:浅灰,让 MUI 卡片有对比
 * - 全局参数:viewport 默认桌面宽度
 */

import type { Preview } from '@storybook/react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { HermesApiMockProvider } from '../src/components/hermes/stories/HermesApiMockProvider';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#f5f5f5' },
        { name: 'white', value: '#ffffff' },
        { name: 'dark', value: '#1e1e1e' },
      ],
    },
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1280px', height: '800px' } },
      },
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <HermesApiMockProvider>
          <Story />
        </HermesApiMockProvider>
      </ThemeProvider>
    ),
  ],
};

export default preview;