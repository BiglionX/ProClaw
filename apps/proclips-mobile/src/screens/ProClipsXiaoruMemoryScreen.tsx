/**
 * ProClipsXiaoruMemoryScreen - 小如的记忆库
 *
 * 对应原型 page-xiaoru-memory：
 *   导航栏（返回 + 小如的记忆库 + 云同步按钮 ☁️）
 *   + 概览卡（已记住 N 条信息 + 覆盖 4 个维度 + 上次更新：刚刚 · 自动同步）
 *   + 4 组记忆分组（偏好/业务/IP/历史）
 *     - 每组：图标+标题+条数 + 记忆卡片列表
 *     - 记忆卡片：图标 + key/val + 忘记按钮
 *   + 忘记按钮：Alert 确认 → 从 state 移除该条
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppScreenProps } from '../types/navigation';
import { colors, radius } from '../components/Theme';
import { MEMORY_GROUPS, type MemoryGroup, type MemoryGroupItem } from '../services/ProClipsService';

const ProClipsXiaoruMemoryScreen: React.FC<AppScreenProps<'ProClipsXiaoruMemory'>> = ({ navigation }) => {
  // 已忘记的条目 id（groupKey + index），用 Set 存储
  const [forgotten, setForgotten] = useState<Set<string>>(new Set());

  const totalAll = useMemo(
    () => MEMORY_GROUPS.reduce((s, g) => s + g.items.length, 0),
    []
  );
  const totalLeft = totalAll - forgotten.size;

  const handleForget = (group: MemoryGroup, idx: number, item: MemoryGroupItem) => {
    const id = `${group.key}-${idx}`;
    Alert.alert(
      '忘记这条记忆？',
      `${item.k}：${item.v}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '忘记',
          style: 'destructive',
          onPress: () => {
            setForgotten((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          },
        },
      ]
    );
  };

  const handleSync = () => {
    Alert.alert('已同步', '记忆已同步到云端（mock）', [{ text: '好的' }]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>小如的记忆库</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleSync}>
          <Text style={styles.navSync}>☁️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* 概览卡 */}
        <View style={styles.overview}>
          <Text style={styles.ovNum}>已记住 {totalLeft} 条信息</Text>
          <Text style={styles.ovSub}>
            覆盖 {MEMORY_GROUPS.length} 个维度：{MEMORY_GROUPS.map((g) => g.title).join(' / ')}
          </Text>
          <Text style={styles.ovUpdate}>上次更新：刚刚 · 自动同步</Text>
        </View>

        {/* 4 组记忆分组 */}
        {MEMORY_GROUPS.map((g) => {
          const leftItems = g.items
            .map((it, idx) => ({ it, idx }))
            .filter(({ idx }) => !forgotten.has(`${g.key}-${idx}`));
          return (
            <View key={g.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{g.icon} {g.title}</Text>
                <View style={styles.groupCount}>
                  <Text style={styles.groupCountText}>{leftItems.length} 条</Text>
                </View>
              </View>
              {leftItems.length === 0 ? (
                <View style={styles.emptyGroup}>
                  <Text style={styles.emptyText}>本组记忆已全部忘记</Text>
                </View>
              ) : (
                leftItems.map(({ it, idx }) => (
                  <MemoryCard
                    key={`${g.key}-${idx}`}
                    icon={g.icon}
                    item={it}
                    onForget={() => handleForget(g, idx, it)}
                  />
                ))
              )}
            </View>
          );
        })}

        <Text style={styles.footTip}>💡 小如会自动从对话中提取并更新记忆</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProClipsXiaoruMemoryScreen;

// ============ 记忆卡片 ============
function MemoryCard({
  icon, item, onForget,
}: {
  icon: string;
  item: MemoryGroupItem;
  onForget: () => void;
}) {
  return (
    <View style={styles.memCard}>
      <View style={styles.memIco}>
        <Text style={styles.memIcoText}>{icon}</Text>
      </View>
      <View style={styles.memInfo}>
        <Text style={styles.memKey}>{item.k}</Text>
        <Text style={styles.memVal}>{item.v}</Text>
      </View>
      <TouchableOpacity style={styles.memForget} activeOpacity={0.7} onPress={onForget}>
        <Text style={styles.memForgetText}>忘记</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  // 导航
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  navArrow: { fontSize: 28, color: colors.txt1, fontWeight: '300', marginTop: -4 },
  navTitle: { fontSize: 15, fontWeight: '700', color: colors.txt1 },
  navSync: { fontSize: 18 },
  // 概览
  overview: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 16,
  },
  ovNum: { fontSize: 16, fontWeight: '800', color: colors.txt1, marginBottom: 6 },
  ovSub: { fontSize: 11, color: colors.txt3, lineHeight: 17, marginBottom: 8 },
  ovUpdate: { fontSize: 10, color: colors.cyan, fontWeight: '600' },
  // 分组
  group: { marginBottom: 16 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  groupTitle: { fontSize: 13, fontWeight: '700', color: colors.txt1 },
  groupCount: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  groupCountText: { fontSize: 10, color: colors.txt3 },
  // 记忆卡片
  memCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.line, padding: 10, marginBottom: 6,
  },
  memIco: {
    width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  memIcoText: { fontSize: 15 },
  memInfo: { flex: 1, gap: 2 },
  memKey: { fontSize: 10, color: colors.txt3 },
  memVal: { fontSize: 12, color: colors.txt1, fontWeight: '600', lineHeight: 17 },
  memForget: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    backgroundColor: 'rgba(244,63,94,0.12)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)',
  },
  memForgetText: { fontSize: 10, color: colors.rose, fontWeight: '600' },
  // 空组
  emptyGroup: {
    padding: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line,
  },
  emptyText: { fontSize: 11, color: colors.txt3 },
  // 底部提示
  footTip: { fontSize: 11, color: colors.txt3, textAlign: 'center', marginTop: 8 },
});
