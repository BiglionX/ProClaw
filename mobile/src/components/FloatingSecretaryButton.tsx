/**
 * FloatingSecretaryButton - 浮动小如秘书头像按钮
 *
 * 仿桌面端 FloatingAgentChat 的 Fab，悬浮于主页面右下角。
 * 点击直接跳转到与小如的聊天窗。
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface Props {
  /** 未读消息数（预留） */
  unreadCount?: number;
}

export default function FloatingSecretaryButton({ unreadCount = 0 }: Props) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    navigation.navigate('ChatDetail', {
      targetId: 'secretary',
      targetName: '小如',
      targetType: 'agent',
      targetIcon: 'robot-happy',
    });
  };

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.avatarContainer}>
        <Image
          source={require('../../assets/avatars/secretary/default.png')}
          style={styles.avatar}
          resizeMode="contain"
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <View style={styles.badgeInner}>
              <React.Fragment>
                {/* 预留：未读计数 */}
              </React.Fragment>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80, // 高于 Tab Bar (60px) + 间距
    right: 16,
    zIndex: 999,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    // 三层叠加光晕（遵循 AI头像三层叠加光晕规范）
    ...Platform.select({
      web: {
        boxShadow:
          '0 0 12px rgba(99,102,241,0.5), 0 0 24px rgba(99,102,241,0.3), 0 0 48px rgba(99,102,241,0.15)',
      },
      default: {
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeInner: {
    minWidth: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
