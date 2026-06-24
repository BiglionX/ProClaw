// VideoView - Native (LiveKit / @livekit/react-native-webrtc RTCView)

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RTCView } from '@livekit/react-native-webrtc';

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
});

export default VideoView;