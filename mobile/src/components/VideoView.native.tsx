// VideoView - Native 平台：使用 react-native-webrtc 的 RTCView
import React from 'react';
import { View } from 'react-native';
import { RTCView } from 'react-native-webrtc';

interface VideoViewProps {
  stream: any; // MediaStream from react-native-webrtc
  mirror?: boolean;
  objectFit?: 'contain' | 'cover';
  style?: any;
}

const NativeVideoView: React.FC<VideoViewProps> = ({
  stream,
  mirror = false,
  objectFit = 'cover',
  style,
}) => {
  if (!stream) {
    return <View style={style} />;
  }

  return (
    <RTCView
      streamURL={stream.toURL()}
      style={style}
      objectFit={objectFit}
      mirror={mirror}
    />
  );
};

export default NativeVideoView;
