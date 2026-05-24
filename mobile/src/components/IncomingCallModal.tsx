// 来电弹窗组件
// v4.1: 音视频通话 - 来电通知

import React, { useEffect, useRef } from 'react';
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
import callManager from '../services/CallManager';

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
                onPress={() => callManager.rejectIncoming()}
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
                onPress={() => callManager.acceptIncoming()}
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
              onPress={() => callManager.rejectIncoming()}
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
