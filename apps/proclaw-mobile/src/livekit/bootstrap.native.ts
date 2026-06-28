/**
 * LiveKit Phase 0: register WebRTC globals before any Room usage.
 *
 * v21 闪退修复：registerGlobals 是顶层副作用调用，发生在 JS bundle 加载阶段、
 * React 渲染之前，ErrorBoundary 无法捕获。若 @livekit/react-native 原生模块
 * 未正确链接或与 RN 0.85 新架构不兼容，会直接导致 App 启动闪退。
 *
 * 现在用 try/catch 包裹，失败时只警告不崩溃，并暴露 isLiveKitNativeAvailable
 * 标志供上层判断。LiveKit/通话功能可能不可用，但 App 能正常启动。
 */
import { logger } from '../utils/logger';

let livekitReady = false;

try {
  // require 而非 import：让模块解析在 try 块内同步完成，便于捕获异常
  const { registerGlobals } = require('@livekit/react-native');
  registerGlobals({ autoConfigureAudioSession: true });
  livekitReady = true;
  logger.log('[livekit/bootstrap] registerGlobals ok');
} catch (e) {
  livekitReady = false;
  logger.warn('[livekit/bootstrap] registerGlobals failed, call features disabled:', e);
}

export const LIVEKIT_BOOTSTRAPPED = true;
export const isLiveKitNativeAvailable = (): boolean => livekitReady;
