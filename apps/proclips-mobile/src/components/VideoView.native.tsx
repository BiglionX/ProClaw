// VideoView - Native (LiveKit / @livekit/react-native-webrtc RTCView)
//
// v21 闪退修复：RTCView 是 requireNativeComponent 注册的原生组件。
// 顶层 `import { RTCView } from '@livekit/react-native-webrtc'` 会在
// App.tsx → CallScreen → VideoView 同步 import 链中执行，若原生侧未注册
// RTCView 模块，requireNativeComponent 会抛错并直接闪退。
//
// 现在用 try/catch 包裹 require，失败时 RTCView 为 null，渲染时回退到
// 占位 View。通话视频画面不可用，但 App 能正常启动。

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { logger } from '../utils/logger';

let RTCView: any = null;
try {
  // require 在 try 块内同步执行，便于捕获异常
  const mod = require('@livekit/react-native-webrtc');
  RTCView = mod.RTCView || mod.default?.RTCView || null;
  if (!RTCView) {
    logger.warn('[VideoView] RTCView not found in @livekit/react-native-webrtc');
  }
} catch (e) {
  RTCView = null;
  logger.warn('[VideoView] load @livekit/react-native-webrtc failed, video render disabled:', e);
}

export interface VideoViewProps {
  stream?: any;
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  style?: any;
}

const VideoView: React.FC<VideoViewProps> = ({
  stream,
  mirror = false,
  objectFit = 'cover',
  style,
}) => {
  if (!stream) {
    return <View style={[styles.container, style]} />;
  }

  // 原生 RTCView 不可用时渲染占位（带提示）
  if (!RTCView) {
    return (
      <View style={[styles.container, styles.fallback, style]}>
        <Text style={styles.fallbackText}>视频画面不可用</Text>
      </View>
    );
  }

  return (
    <RTCView
      streamURL={stream.toURL()}
      style={[styles.container, style]}
      objectFit={objectFit}
      mirror={mirror}
      zOrder={0}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#999',
    fontSize: 12,
  },
});

export default VideoView;
