/**
 * BrowseScreen - 达人「素材库」Tab
 *
 * 对应原型 page-browse：
 *   导航栏（标题 + 搜索）+ AI 选品入口 + 行业筛选 + 排序 + 9:12 卡片网格
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { AppNavigation } from '../types/navigation';
import { colors, gradients, radius } from '../components/Theme';
import { useProClipsStore } from '../stores/ProClipsStore';
import type { MaterialItem } from '../services/ProClipsService';

// 行业筛选选项（含「全部」）
const INDUSTRY_FILTERS = ['全部', '餐饮', '零售', '美业', '服务'] as const;
type IndustryFilter = (typeof INDUSTRY_FILTERS)[number];

// 排序选项
const SORT_OPTIONS = [
  { key: 'hot', label: '热度' },
  { key: 'commission', label: '佣金' },
  { key: 'plays', label: '播放' },
] as const;
type SortKey = (typeof SORT_OPTIONS)[number]['key'];

export default function BrowseScreen() {
  const navigation = useNavigation<AppNavigation<'Main'>>();
  const materials = useProClipsStore((s) => s.materials);

  const [industry, setIndustry] = useState<IndustryFilter>('全部');
  const [sortBy, setSortBy] = useState<SortKey>('hot');

  // 筛选 + 排序
  const filteredMaterials = useMemo(() => {
    const list =
      industry === '全部'
        ? [...materials]
        : materials.filter((m) => m.industry === industry);
    list.sort((a, b) => {
      if (sortBy === 'hot') return b.hot - a.hot;
      if (sortBy === 'plays') return b.plays - a.plays;
      // commission：按字面数值近似排序（mock 字符串如 "15%+¥10"、"¥20/单"、"25%"、"阶梯10-20%"）
      // 用 "提取首位数字" 近似比较
      const aN = parseInt(a.commission.replace(/[^\d]/g, '').slice(0, 2) || '0', 10);
      const bN = parseInt(b.commission.replace(/[^\d]/g, '').slice(0, 2) || '0', 10);
      return bN - aN;
    });
    return list;
  }, [materials, industry, sortBy]);

  const renderItem = ({ item }: { item: MaterialItem }) => (
    <TouchableOpacity
      style={styles.matCard}
      activeOpacity={0.95}
      onPress={() => navigation.navigate('ProClipsMaterialDetail', { materialId: item.id })}
    >
      <View style={[styles.matCover, { backgroundColor: item.coverColor }]}>
        <View style={styles.commissionBadge}>
          <Text style={styles.commissionText}>{item.commission}</Text>
        </View>
        <View style={styles.hotWrap}>
          <Text style={styles.hotText}>🔥 {formatCount(item.hot)}</Text>
        </View>
        <View style={styles.durPill}>
          <Text style={styles.durText}>⏱ {item.duration}</Text>
        </View>
        <View style={styles.playOverlay}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      </View>
      <View style={styles.matInfo}>
        <Text style={styles.matTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.matMerchant} numberOfLines={1}>
          {item.merchantLogo} {item.merchant} · {item.industry}
        </Text>
        <View style={styles.matBottom}>
          <Text style={styles.matPrice}>{item.price}</Text>
          <View style={styles.matIncRow}>
            {item.incentiveTypes.map((t) => (
              <View key={t} style={styles.matIncTag}>
                <Text style={styles.matIncTagText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        {/* 顶部标题 + 搜索 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>素材库</Text>
            <Text style={styles.subtitle}>
              {filteredMaterials.length} 个可推广素材
            </Text>
          </View>
          <TouchableOpacity
            style={styles.searchBtn}
            activeOpacity={0.8}
            onPress={() => {
              /* mock 搜索 */
            }}
          >
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* AI 选品入口 */}
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => navigation.navigate('ProClipsAIVideo')}
        >
          <LinearGradient
            colors={[colors.amber, colors.magenta]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.aiEntry}
          >
            <Text style={styles.aiIcon}>🤖</Text>
            <Text style={styles.aiText}>AI 智能选品 →</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* 行业筛选栏 */}
        <View style={styles.filterRow}>
          {INDUSTRY_FILTERS.map((tag) => {
            const active = industry === tag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => setIndustry(tag)}
                activeOpacity={0.8}
                style={styles.filterChipWrap}
              >
                {active ? (
                  <LinearGradient
                    colors={[...gradients.creator]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.filterChipActive}
                  >
                    <Text style={[styles.filterText, styles.filterTextActive]}>{tag}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.filterChip, styles.filterChipInactive]}>
                    <Text style={styles.filterText}>{tag}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 排序栏 */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>排序：</Text>
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                activeOpacity={0.8}
                onPress={() => setSortBy(opt.key)}
              >
                <Text style={[styles.sortText, active && styles.sortTextActive]}>
                  {opt.label}
                  {active ? ' ↓' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 素材网格 */}
        {filteredMaterials.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>该行业暂无可推广素材</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMaterials}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listBody}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ---- 工具 ----
const formatCount = (n: number) =>
  n >= 10000 ? `${(n / 10000).toFixed(1)}w` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.txt1 },
  subtitle: { fontSize: 12, color: colors.txt3, marginTop: 4 },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: { fontSize: 16 },
  // AI 选品
  aiEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 23,
    marginBottom: 14,
    shadowColor: colors.magenta,
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  aiIcon: { fontSize: 16 },
  aiText: { fontSize: 14.5, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  // 筛选
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 12 },
  filterChipWrap: { borderRadius: 20 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  filterChipInactive: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterChipActive: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.txt2 },
  filterTextActive: { color: '#fff', fontWeight: '700' },
  // 排序
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 12,
  },
  sortLabel: { fontSize: 11, color: colors.txt3, fontWeight: '500' },
  sortText: { fontSize: 12, color: colors.txt3, fontWeight: '500' },
  sortTextActive: { color: colors.rose, fontWeight: '700' },
  // 空态
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 13, color: colors.txt3 },
  // 列表
  listBody: { paddingBottom: 100 },
  row: { gap: 12, marginBottom: 12 },
  matCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  matCover: {
    aspectRatio: 9 / 12,
    justifyContent: 'space-between',
    padding: 8,
    alignItems: 'center',
  },
  commissionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  commissionText: { fontSize: 10, fontWeight: '700', color: colors.yellow },
  hotWrap: { position: 'absolute', top: 8, right: 8 },
  hotText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  durPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durText: { color: '#fff', fontSize: 9, fontWeight: '600' },
  playOverlay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { color: '#fff', fontSize: 14, marginLeft: 3 },
  matInfo: { padding: 10 },
  matTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.txt1,
    lineHeight: 17,
    minHeight: 34,
  },
  matMerchant: { fontSize: 10.5, color: colors.txt2, marginTop: 5 },
  matBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 6,
  },
  matPrice: { fontSize: 11, fontWeight: '700', color: colors.rose },
  matIncRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  matIncTag: {
    backgroundColor: 'rgba(0,210,255,0.12)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  matIncTagText: { color: colors.cyan, fontSize: 9, fontWeight: '700' },
});
