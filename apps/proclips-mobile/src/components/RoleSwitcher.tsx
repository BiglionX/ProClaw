/**
 * RoleSwitcher - 双角色切换器
 *
 * 对应原型 .role-switcher：商家/达人双选项 + 滑块。
 * 点击触发 3 秒魔幻变身动画（通过 store 的 setTransforming 控制 overlay）。
 *
 * 使用：放在「我的」Tab 底部，商家和达人共用一个组件。
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, gradients, roleThemes } from './Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { ProClipsRole } from '../types/navigation';

interface Props {
  /** 当前角色（默认从 store 读取） */
  currentRole?: ProClipsRole;
}

export default function RoleSwitcher({ currentRole }: Props) {
  const role = useProClipsStore((s) => s.role);
  const transforming = useProClipsStore((s) => s.transforming);
  const setRole = useProClipsStore((s) => s.setRole);
  const startTransform = useProClipsStore((s) => s.startTransform);
  const endTransform = useProClipsStore((s) => s.endTransform);

  const activeRole = currentRole ?? role;

  const handleSwitch = (target: ProClipsRole) => {
    if (target === activeRole) return;
    if (transforming) return;
    // 启动变身动画：记录 from/to，标记 transforming=true
    startTransform(activeRole, target);
    // 1.0s 后切换底层 role（光环爆发遮挡瞬间）
    setTimeout(() => {
      setRole(target);
    }, 1000);
    // 3.0s 后结束变身（overlay 自身淡出后清理）
    setTimeout(() => {
      endTransform();
    }, 3000);
  };

  const isCreator = activeRole === 'creator';

  return (
    <View style={styles.roleSwitcher}>
      {/* 滑块 */}
      <View
        style={[
          styles.rsSlider,
          isCreator && styles.rsSliderCreator,
        ]}
      >
        <LinearGradient
          colors={isCreator ? [...gradients.creator] : [...gradients.main]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.rsSliderGrad}
        />
      </View>

      {/* 商家选项 */}
      <TouchableOpacity
        style={styles.rsOption}
        activeOpacity={0.85}
        disabled={transforming}
        onPress={() => handleSwitch('merchant')}
      >
        <Text style={styles.rsIcon}>🏪</Text>
        <Text style={[styles.rsText, !isCreator && styles.rsTextActive]}>商家</Text>
      </TouchableOpacity>

      {/* 达人选项 */}
      <TouchableOpacity
        style={styles.rsOption}
        activeOpacity={0.85}
        disabled={transforming}
        onPress={() => handleSwitch('creator')}
      >
        <Text style={styles.rsIcon}>🌟</Text>
        <Text style={[styles.rsText, isCreator && styles.rsTextActive]}>达人</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  roleSwitcher: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderColor: colors.line, borderWidth: 1,
    borderRadius: 24, padding: 4, marginBottom: 14, position: 'relative',
  },
  rsSlider: {
    position: 'absolute', top: 4, bottom: 4, left: 4,
    width: '50%', marginLeft: '-2%',
    borderRadius: 20, overflow: 'hidden',
    shadowColor: colors.magenta, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 4,
  },
  rsSliderCreator: {
    marginLeft: '50%',
    shadowColor: colors.rose,
  },
  rsSliderGrad: { width: '100%', height: '100%' },
  rsOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, zIndex: 1,
  },
  rsIcon: { fontSize: 14 },
  rsText: { fontSize: 13, fontWeight: '600', color: colors.txt3 },
  rsTextActive: { color: '#fff', fontWeight: '700' },
});
