/**
 * FloatingSecretaryButton - 浮动小如秘书头像按钮
 *
 * 悬浮于主页面右下角，点击跳转到小如聊天窗。
 * 光晕色随角色联动（商家品红 / 达人玫红），显示未读消息数。
 * Phase 5 补全呼吸动画。
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigation } from '../types/navigation';
import { colors, roleThemes } from './Theme';
import { useProClipsStore } from '../stores/ProClipsStore';

export default function FloatingSecretaryButton() {
  const navigation = useNavigation<AppNavigation<'Main'>>();
  const role = useProClipsStore((s) => s.role);
  const unreadCount = useProClipsStore((s) => s.notifications.filter((n) => !n.read).length);
  const glow = roleThemes[role].c2;

  const handlePress = () => {
    navigation.navigate('ProClipsXiaoruChat');
  };

  // 动态光晕样式（根据角色色）
  const avatarContainerStyle = Platform.select({
    web: {
      ...styles.avatarContainer,
      boxShadow: `0 0 12px ${glow}99, 0 0 24px ${glow}66, 0 0 48px ${glow}33`,
    },
    default: {
      ...styles.avatarContainer,
      shadowColor: glow,
    },
  }) as object;

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={avatarContainerStyle}>
        <Image
          source={require('../../assets/avatars/secretary/default.png')}
          style={styles.avatar}
          resizeMode="contain"
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 96, // 高于 Tab Bar + 间距
    right: 16,
    zIndex: 999,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
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
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});
