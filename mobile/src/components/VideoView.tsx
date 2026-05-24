// VideoView - 跨平台视频流渲染组件
// Metro 平台解析:
//   - Native (iOS/Android): 自动使用 VideoView.native.tsx (RTCView)
//   - Web: 使用本文件 (HTML <video> 元素)
//
// react-native-webrtc 的 RTCView 依赖 requireNativeComponent，
// Web 平台不存在，因此 Web 端使用 DOM 原生 <video> 渲染 MediaStream。

import React, { useRef, useEffect } from 'react';
import { View } from 'react-native';

interface VideoViewProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stream: any; // Accept both DOM MediaStream and react-native-webrtc MediaStream
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  style?: any;
}

const WebVideoView: React.FC<VideoViewProps> = ({
  stream,
  mirror = false,
  objectFit = 'cover',
  style,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
    return () => {
      if (el) {
        el.srcObject = null;
      }
    };
  }, [stream]);

  if (!stream) {
    return <View style={style} />;
  }

  // 展开 style 中 Web 不支持的 RN 专用属性（避免 warning）
  const { elevation, shadowColor, shadowOffset, shadowOpacity, shadowRadius, ...restStyle } =
    typeof style === 'object' && style ? style : {};

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={mirror}
      style={{
        width: '100%',
        height: '100%',
        objectFit,
        transform: mirror ? 'scaleX(-1)' : undefined,
        ...restStyle,
      }}
    />
  );
};

export default WebVideoView;
