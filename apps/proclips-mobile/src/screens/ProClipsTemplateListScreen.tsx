/**
 * ProClipsTemplateListScreen - 模板列表
 *
 * 对应原型 page-templates：导航栏 + 横向筛选 chip + 2 列模板网格
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppScreenProps } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { TEMPLATES, type ProClipsTemplate } from '../services/ProClipsService';

// 筛选项：全部 + 4 个行业
const FILTERS = ['全部', '餐饮', '零售', '美业', '服务'];

const ProClipsTemplateListScreen: React.FC<AppScreenProps<'ProClipsTemplateList'>> = ({ navigation }) => {
  const [curFilter, setCurFilter] = useState('全部');

  // 筛选逻辑：按 industry 过滤，"全部"显示所有，无结果时回退显示全部
  const filtered =
    curFilter === '全部' ? TEMPLATES : TEMPLATES.filter((t) => t.industry === curFilter);
  const list: ProClipsTemplate[] = filtered.length ? filtered : TEMPLATES;

  // 将列表按 2 列拆成行，奇数行补占位以保持两列对齐
  const rows: (ProClipsTemplate | null)[][] = [];
  for (let i = 0; i < list.length; i += 2) {
    const row: (ProClipsTemplate | null)[] = list.slice(i, i + 2);
    if (row.length === 1) row.push(null);
    rows.push(row);
  }

  const onTap = (t: ProClipsTemplate) => {
    navigation.navigate('ProClipsTemplateDetail', { templateId: t.id, title: t.title });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backChar}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>选择模板</Text>
        <View style={styles.iconBtn} />
      </View>

      {/* 筛选栏：横向滚动 chip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map((f) => {
          const active = f === curFilter;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setCurFilter(f)}
              activeOpacity={0.85}
              style={styles.filterChipWrap}
            >
              {active ? (
                <LinearGradient
                  colors={[...gradients.main]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.filterChipActive}
                >
                  <Text style={[styles.filterText, styles.filterTextActive]}>{f}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.filterChip, styles.filterChipInactive]}>
                  <Text style={styles.filterText}>{f}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 模板网格：2 列卡片 */}
      <ScrollView style={styles.container} contentContainerStyle={styles.gridContent} showsVerticalScrollIndicator={false}>
        {rows.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((t, ci) =>
              t ? (
                <TouchableOpacity
                  key={t.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => onTap(t)}
                >
                  <View style={[styles.cover, { backgroundColor: t.coverColor || colors.magenta }]}>
                    {t.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t.badge}</Text>
                      </View>
                    ) : null}
                    <LinearGradient
                      colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.coverGrad}
                    />
                    <Text style={styles.coverTitle} numberOfLines={1}>
                      {t.title}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{t.scenes.length} 分镜</Text>
                    <Text style={styles.metaText}>{t.duration}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View key={`spacer-${ri}-${ci}`} style={styles.cardSpacer} />
              )
            )}
          </View>
        ))}
        {list.length === 0 ? (
          <Text style={styles.emptyHint}>该分类暂无模板，已为你展示全部</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  // 导航栏
  navBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.bgDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backChar: { fontSize: 30, color: colors.txt1, fontWeight: '300', marginTop: -6 },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.txt1 },
  // 筛选栏
  filterBar: { flexGrow: 0, backgroundColor: colors.bgDeep },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChipWrap: { borderRadius: 20 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipInactive: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: { fontSize: 13, color: colors.txt2, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  // 网格
  container: { flex: 1 },
  gridContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden' as any,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardSpacer: { flex: 1 },
  cover: { aspectRatio: 3 / 4, justifyContent: 'flex-end', padding: 10 },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  coverGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  coverTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  metaText: { fontSize: 11, color: colors.txt2 },
  emptyHint: { color: colors.txt3, fontSize: 13, textAlign: 'center', paddingVertical: 24 },
});

export default ProClipsTemplateListScreen;
