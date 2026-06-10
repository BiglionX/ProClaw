// 通话界面
// v4.1: 音视频通话 - 包含 RTCView 视频渲染

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
} from 'react-native';
import { Text, Avatar, Surface, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import VideoView from '../components/VideoView';
import { useCallStore } from '../stores/CallStore';
import callManager from '../services/CallManager';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../types/navigation';

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const CallScreen: React.FC = () => {
  const navigation = useNavigation<AppNavigation>();
  const { colors } = useTheme();

  const status = useCallStore((s) => s.status);
  const callType = useCallStore((s) => s.callType);
  const direction = useCallStore((s) => s.direction);
  const remoteUserName = useCallStore((s) => s.remoteUserName);
  const durationSeconds = useCallStore((s) => s.durationSeconds);
  const isMuted = useCallStore((s) => s.isMuted);
  const isCameraOff = useCallStore((s) => s.isCameraOff);
  const isSpeakerOn = useCallStore((s) => s.isSpeakerOn);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // stream version 用于触发 RTCView 重新渲染
  const [streamVer, setStreamVer] = useState(0);

  const isVideo = callType === 'video';
  const isRinging = status === 'ringing';
  const isConnected = status === 'connected';
  const isOutgoing = direction === 'outgoing';

  // 注册流变化回调
  useEffect(() => {
    callManager.onStreamChange = () => {
      setStreamVer((v) => v + 1);
    };
    return () => {
      callManager.onStreamChange = null;
    };
  }, []);

  // 隐藏/显示控制栏
  const toggleControls = useCallback(() => {
    if (isConnected) {
      setShowControls((prev) => !prev);
    }
  }, [isConnected]);

  // 自动隐藏控制栏
  useEffect(() => {
    if (isConnected && showControls) {
      controlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [isConnected, showControls, streamVer]);

  // 振铃动画
  useEffect(() => {
    if (isRinging) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      anim.start();
      return () => anim.stop();
    }
  }, [isRinging, pulseAnim]);

  const userInitial = (remoteUserName || '未知用户').charAt(0).toUpperCase();

  // 状态文字
  const statusText = isRinging
    ? (isOutgoing ? '正在呼叫...' : '来电中...')
    : isConnected
    ? formatDuration(durationSeconds)
    : '通话结束';

  const localStream = callManager.localStream;
  const remoteStream = callManager.remoteStream;

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={1}
      onPress={toggleControls}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* 远程视频全屏背景 */}
      {isVideo && isConnected && remoteStream && (
        <VideoView
          stream={remoteStream}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      )}

      {/* 用户信息区（无视频或振铃时显示） */}
      {(!isVideo || !isConnected || !remoteStream) && (
        <View style={styles.userInfo}>
          <Animated.View
            style={[
              styles.avatarRing,
              isRinging && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Avatar.Text
              size={100}
              label={userInitial}
              style={{ backgroundColor: colors.primary }}
            />
          </Animated.View>

          <Text variant="headlineSmall" style={styles.userName}>
            {remoteUserName || '未知用户'}
          </Text>
          <Text variant="bodyLarge" style={styles.statusText}>
            {statusText}
          </Text>
        </View>
      )}

      {/* 音频通话或视频通话无远程流时显示头像+时长 */}
      {isConnected && (!isVideo || !remoteStream) && (
        <View style={styles.audioInfo}>
          <Text variant="headlineSmall" style={styles.userName}>
            {remoteUserName || '未知用户'}
          </Text>
          <Text variant="bodyLarge" style={styles.statusText}>
            {statusText}
          </Text>
        </View>
      )}

      {/* 本地视频小窗口 (PIP) */}
      {isVideo && isConnected && localStream && !isCameraOff && (
        <Surface style={styles.localVideoContainer}>
          <VideoView
            stream={localStream}
            style={styles.localVideoStream}
            objectFit="cover"
            mirror={true}
          />
        </Surface>
      )}

      {isVideo && isConnected && isCameraOff && (
        <Surface style={styles.localVideoContainer}>
          <View style={styles.cameraOffPlaceholder}>
            <MaterialCommunityIcons name="camera-off" size={24} color="rgba(255,255,255,0.4)" />
          </View>
        </Surface>
      )}

      {/* 控制栏 */}
      {showControls && (
        <Animated.View style={styles.controls}>
          {/* 静音 */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => callManager.toggleMute()}
          >
            <View style={[styles.controlCircle, isMuted && styles.controlActive]}>
              <MaterialCommunityIcons
                name={isMuted ? 'microphone-off' : 'microphone'}
                size={24}
                color={isMuted ? '#fff' : '#333'}
              />
            </View>
            <Text style={styles.controlLabel}>
              {isMuted ? '已静音' : '静音'}
            </Text>
          </TouchableOpacity>

          {/* 摄像头（仅视频通话） */}
          {isVideo && (
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => callManager.toggleCamera()}
            >
              <View style={[styles.controlCircle, isCameraOff && styles.controlActive]}>
                <MaterialCommunityIcons
                  name={isCameraOff ? 'camera-off' : 'camera'}
                  size={24}
                  color={isCameraOff ? '#fff' : '#333'}
                />
              </View>
              <Text style={styles.controlLabel}>
                {isCameraOff ? '已关闭' : '摄像头'}
              </Text>
            </TouchableOpacity>
          )}

          {/* 扬声器 */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => callManager.toggleSpeaker()}
          >
            <View style={[styles.controlCircle, isSpeakerOn && styles.controlActive]}>
              <MaterialCommunityIcons
                name={isSpeakerOn ? 'volume-high' : 'volume-low'}
                size={24}
                color={isSpeakerOn ? '#fff' : '#333'}
              />
            </View>
            <Text style={styles.controlLabel}>扬声器</Text>
          </TouchableOpacity>

          {/* 挂断 */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => {
              callManager.hangup();
              navigation.goBack();
            }}
          >
            <View style={[styles.controlCircle, styles.hangupBtn]}>
              <MaterialCommunityIcons name="phone-hangup" size={28} color="#fff" />
            </View>
            <Text style={styles.controlLabel}>挂断</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 40,
  },
  remoteVideo: {
    ...StyleSheet.absoluteFill,
  },
  userInfo: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  audioInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  avatarRing: {
    borderRadius: 55,
    borderWidth: 3,
    borderColor: 'rgba(99,102,241,0.5)',
    padding: 4,
    marginBottom: 24,
  },
  userName: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 8,
  },
  statusText: {
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 120,
    height: 170,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    backgroundColor: '#2a2a3e',
  },
  localVideoStream: {
    width: '100%',
    height: '100%',
  },
  cameraOffPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 24,
    flexWrap: 'wrap',
  },
  controlBtn: {
    alignItems: 'center',
  },
  controlCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  controlActive: {
    backgroundColor: '#6366f1',
  },
  hangupBtn: {
    backgroundColor: '#ef4444',
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  controlLabel: {
    color: '#fff',
    fontSize: 11,
  },
});

export default CallScreen;