// 来电弹窗组件
// v4.1: 音视频通话 - 来电通知
// v16: 懒加载 callManager/WebRTC，避免在 App 启动时同步加载 react-native-webrtc
//      (如果 WebRTC 原生模块未注册或权限配置错误，同步 import 会导致 App 闪退)

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Animated,
  Vibration,
  TouchableOpacity,
} from 'react-native';
import { Text, Avatar, IconButton, Surface, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCallStore } from '../stores/CallStore';
import { logger } from '../utils/logger';

type CallManager = {
  rejectIncoming(): void;
  acceptIncoming(): void;
};

let cachedCallManager: CallManager | null = null;

/**
 * 按需懒加载 callManager（在用户接听/拒绝时才加载）。
 * 第一次 require 失败会缓存 null，避免每次都重新尝试。
 */
const getCallManager = (): CallManager | null => {
  if (cachedCallManager) return cachedCallManager;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../services/CallManager');
    cachedCallManager = (mod.default || mod) as CallManager;
    return cachedCallManager;
  } catch (e) {
    logger.warn('[IncomingCallModal] Failed to load CallManager:', e);
    return null;
  }
};

const IncomingCallModal: React.FC = () => {
  const { colors } = useTheme();
  const incomingCall = useCallStore((s) => s.incomingCall);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const visible = incomingCall !== null;

  // 来电振动
  useEffect(() => {
    if (visible) {
      Vibration.vibrate([500, 300, 500, 300, 500]);
    } else {
      Vibration.cancel();
    }
  }, [visible]);

  // 脉冲动画
  useEffect(() => {
    if (visible) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [visible, pulseAnim]);

  if (!incomingCall) return null;

  const isVideoCall = incomingCall.callType === 'video';
  const callerInitial = incomingCall.callerName.charAt(0).toUpperCase();

  // 懒加载包装：用户点击时才尝试加载 callManager
  const handleCallAction = (action: 'accept' | 'reject') => {
    const cm = getCallManager();
    if (!cm) {
      logger.warn('[IncomingCallModal] CallManager unavailable, ignoring action:', action);
      return;
    }
    if (action === 'accept') {
      cm.acceptIncoming();
    } else {
      cm.rejectIncoming();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
          <Surface style={styles.surface}>
            {/* 头像区域 */}
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
                <Avatar.Text
                  size={90}
                  label={callerInitial}
                  style={{ backgroundColor: colors.primary }}
                />
              </Animated.View>
            </View>

            {/* 信息 */}
            <Text variant="titleLarge" style={styles.callerName}>
              {incomingCall.callerName}
            </Text>
            <View style={styles.callTypeRow}>
              <MaterialCommunityIcons
                name={isVideoCall ? 'video' : 'phone'}
                size={20}
                color={colors.primary}
              />
              <Text variant="bodyMedium" style={styles.callTypeText}>
                {isVideoCall ? '视频通话邀请' : '语音通话邀请'}
              </Text>
            </View>

            {/* 操作按钮 */}
            <View style={styles.actions}>
              {/* 拒绝 */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCallAction('reject')}
                activeOpacity={0.7}
              >
                <View style={[styles.btnCircle, styles.rejectBtn]}>
                  <MaterialCommunityIcons name="phone-hangup" size={32} color="#fff" />
                </View>
                <Text style={styles.btnLabel}>拒绝</Text>
              </TouchableOpacity>

              {/* 接听 */}
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleCallAction('accept')}
                activeOpacity={0.7}
              >
                <View style={[styles.btnCircle, styles.acceptBtn]}>
                  <MaterialCommunityIcons name="phone" size={32} color="#fff" />
                </View>
                <Text style={styles.btnLabel}>接听</Text>
              </TouchableOpacity>
            </View>

            {/* 关闭按钮 */}
            <IconButton
              icon="close"
              size={22}
              onPress={() => handleCallAction('reject')}
              style={styles.closeBtn}
              iconColor="#999"
            />
          </Surface>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
  },
  surface: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#fff',
    elevation: 10,
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
  },
  avatarContainer: {
    marginBottom: 20,
  },
  avatarRing: {
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#6366f1',
    padding: 4,
  },
  callerName: {
    fontWeight: '700',
    marginBottom: 8,
    fontSize: 22,
  },
  callTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  callTypeText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 60,
  },
  actionBtn: {
    alignItems: 'center',
  },
  btnCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 4,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
  },
  acceptBtn: {
    backgroundColor: '#10b981',
  },
  btnLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  closeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

export default IncomingCallModal;
