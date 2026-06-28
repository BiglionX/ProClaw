/**
 * ProfileSwitcher - 身份切换组件
 * 在应用顶部显示当前身份，点击可切换身份。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppStore } from '../stores/AppStore';

interface ProfileSwitcherProps {
  onPress: () => void;
}

const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ onPress }) => {
  const currentProfile = useAppStore((s) => s.currentProfile);
  const isSwitching = useAppStore((s) => s.isSwitchingProfile);

  if (!currentProfile) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={isSwitching}
      activeOpacity={0.7}
    >
      <Text style={styles.avatar}>{currentProfile.avatar || '👤'}</Text>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {currentProfile.name}
        </Text>
        {isSwitching && <Text style={styles.switchingText}>切换中...</Text>}
      </View>
      <Text style={styles.arrow}>▼</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  avatar: {
    fontSize: 18,
    marginRight: 6,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    maxWidth: 80,
  },
  switchingText: {
    fontSize: 11,
    color: '#6366f1',
  },
  arrow: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
  },
});

export default ProfileSwitcher;
