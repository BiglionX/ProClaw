/**
 * 手机模拟器框架组件
 * 纯 CSS/MUI 实现的 iPhone 风格手机外框，用于预览 H5 商城页面
 */

import { Box, Typography } from '@mui/material';
import {
  SignalCellularAlt as SignalIcon,
  Wifi as WifiIcon,
  BatteryFull as BatteryIcon,
} from '@mui/icons-material';
import type { ReactNode } from 'react';

interface PhoneSimulatorProps {
  children: ReactNode;
  /** 缩放比例 (0.5 ~ 1.0) */
  scale?: number;
  /** 地址栏显示的 URL */
  url?: string;
}

/**
 * 是否为 WebView2 环境（Tauri 桌面端）
 * WebView2 对 CSS zoom 支持良好，transform 缩放会导致中文字体模糊
 */
const isWebView2 = typeof (globalThis as { chrome?: { webview?: unknown } }).chrome !== 'undefined'
  && typeof navigator !== 'undefined'
  && /WebView2/i.test(navigator.userAgent);

export default function PhoneSimulator({
  children,
  scale = 1,
  url,
}: PhoneSimulatorProps) {
  // Tauri/WebView2 用 zoom（避免字体模糊），浏览器用 transform
  const useZoom = isWebView2 && scale < 1;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      {/* 地址栏 */}
      {url && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            bgcolor: 'grey.100',
            borderRadius: 2,
            maxWidth: 360,
            width: '100%',
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'success.main',
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: 'monospace',
              fontSize: 11,
            }}
          >
            {url}
          </Typography>
        </Box>
      )}

      {/* 手机外框容器 - 缩放策略：
          - 浏览器：transform: scale (兼容性最佳)
          - WebView2：CSS zoom (避免中文字体模糊) */}
      <Box
        sx={{
          // zoom 是 WebView2 推荐方式，但非标准 CSS（Safari 不支持）
          // 使用 CSS 变量同时设置缩放，保持布局
          ...(useZoom
            ? { zoom: scale, width: 375, height: 812 }
            : {
                transform: `scale(${scale})`,
                transformOrigin: 'top center',
                width: 375,
                height: 812,
              }),
          flexShrink: 0,
        }}
      >
        {/* 手机外壳 */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '44px',
            border: '8px solid #1a1a1a',
            bgcolor: '#000',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25), inset 0 0 0 2px #333',
          }}
        >
          {/* 刘海 (Dynamic Island 风格) */}
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 126,
              height: 36,
              bgcolor: '#000',
              borderRadius: '20px',
              zIndex: 100,
            }}
          />

          {/* 状态栏 */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 54,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              px: 3,
              pb: 0.5,
              zIndex: 99,
            }}
          >
            {/* 左侧：时间 */}
            <Typography
              variant="caption"
              sx={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              9:41
            </Typography>

            {/* 右侧：信号 + WiFi + 电池 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <SignalIcon sx={{ fontSize: 14, color: '#fff' }} />
              <WifiIcon sx={{ fontSize: 16, color: '#fff' }} />
              <BatteryIcon sx={{ fontSize: 18, color: '#fff' }} />
            </Box>
          </Box>

          {/* 屏幕内容区 */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: '#fff',
              overflowY: 'auto',
              overflowX: 'hidden',
              // 隐藏滚动条
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            {children}
          </Box>

          {/* Home Indicator */}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 134,
              height: 5,
              bgcolor: 'rgba(0,0,0,0.2)',
              borderRadius: '3px',
              zIndex: 100,
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
