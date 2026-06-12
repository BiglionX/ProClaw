// VideoView - Native 平台 (iOS/Android)
// v20: 完全移除 react-native-webrtc 依赖，VideoView 改为占位组件。
//      通话功能暂时不可用，渲染时显示"通话功能暂不可用"提示。

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { logger } from '../utils/logger';

export interface VideoViewProps {
  stream?: any;
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  style?: any;
}

const VideoView: React.FC<VideoViewProps> = ({ style }) => {
  logger.warn('[VideoView.native] Render placeholder - WebRTC removed in v20');

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inner}>
        <Text style={styles.icon}>📹</Text>
        <Text style={styles.text}>通话功能暂不可用</Text>
        <Text style={styles.subtext}>（v20 暂未集成 WebRTC）</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtext: {
    color: '#999',
    fontSize: 12,
    marginTop: 4,
  },
});

export default VideoView;
