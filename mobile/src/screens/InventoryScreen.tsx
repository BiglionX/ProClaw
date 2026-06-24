// 库存概览页面
// P2 项 2：聚合 product_spu + product_sku + inventory_transactions 三表
// 复用 ProductsScreen 的视觉风格（玻璃拟态 + 状态 chip）

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'react-native-linear-gradient';
import {
  Text,
  Card,
  Chip,
  useTheme,
  ActivityIndicator,
  Searchbar,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getInventoryOverview,
  getInventoryStats,
  InventoryItem,
  InventoryStats,
  StockStatus,
} from '../services/InventoryService';
import { getDatabase } from '../services/DatabaseFactory';
import { showToast } from '../components/Toast';
import { getErrorMessage } from '../utils/errorUtils';

type FilterKey = 'all' | StockStatus;

interface StatCard {
  key: keyof InventoryStats;
  label: string;
  icon: string;
  color: string;
  format: (v: number) => string;
}

const STAT_CARDS: StatCard[] = [
  {
    key: 'totalSkus',
    label: '在库 SKU',
    icon: 'package-variant',
    color: '#6366f1',
    format: (v) => String(v),
  },
  {
    key: 'outOfStockCount',
    label: '缺货',
    icon: 'package-variant-closed',
    color: '#ef4444',
    format: (v) => String(v),
  },
  {
    key: 'lowStockCount',
    label: '低库存',
    icon: 'alert-circle',
    color: '#f59e0b',
    format: (v) => String(v),
  },
  {
    key: 'recentTransactions',
    label: '7 日交易',
    icon: 'swap-horizontal-bold',
    color: '#10b981',
    format: (v) => String(v),
  },
];

const STATUS_META: Record<StockStatus, { label: string; color: string; bg: string }> = {
  out:    { label: '缺货',   color: '#991b1b', bg: '#fee2e2' },
  low:    { label: '低库存', color: '#92400e', bg: '#fef3c7' },
  normal: { label: '正常',   color: '#065f46', bg: '#d1fae5' },
  over:   { label: '接近满仓', color: '#1e40af', bg: '#dbeafe' },
};

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all',    label: '全部' },
  { key: 'out',    label: '缺货' },
  { key: 'low',    label: '低库存' },
  { key: 'normal', label: '正常' },
  { key: 'over',   label: '接近满仓' },
];

const InventoryScreen: React.FC = () => {
  const { colors } = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalSkus: 0, outOfStockCount: 0, lowStockCount: 0,
    recentTransactions: 0, totalStockValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const db = getDatabase();
      const [list, st] = await Promise.all([
        getInventoryOverview(db),
        getInventoryStats(db),
      ]);
      setItems(list);
      setStats(st);
    } catch (err) {
      showToast('error', '加载库存失败', getErrorMessage(err));
      setItems([]);
      setStats({
        totalSkus: 0, outOfStockCount: 0, lowStockCount: 0,
        recentTransactions: 0, totalStockValue: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredItems = items.filter((i) => {
    if (filter !== 'all' && i.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.productName.toLowerCase().includes(q) ||
        i.skuCode.toLowerCase().includes(q) ||
        (i.specText?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const meta = STATUS_META[item.status];
    return (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemContent}>
          <View style={[styles.itemIcon, { backgroundColor: meta.bg }]}>
            <MaterialCommunityIcons name="package-variant" size={24} color={meta.color} />
          </View>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" style={styles.itemName} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text variant="bodySmall" style={styles.itemMeta}>
              {item.skuCode}{item.specText ? ` · ${item.specText}` : ''}
            </Text>
            <View style={styles.itemFooter}>
              <Text variant="titleMedium" style={[styles.stockNum, { color: meta.color }]}>
                {item.currentStock}
              </Text>
              <Text variant="bodySmall" style={styles.stockUnit}>
                {' / '}{item.minStock > 0 ? `最低 ${item.minStock}` : '无下限'}
              </Text>
              <View style={[styles.statusChip, { backgroundColor: meta.bg }]}>
                <Text style={[styles.statusChipText, { color: meta.color }]}>
                  {meta.label}
                </Text>
              </View>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.root}>
      {/* 顶部：渐变背景 + 4 个统计卡 */}
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.header}>
        <View style={styles.headerRow}>
          <MaterialCommunityIcons name="warehouse" size={26} color="#00d2ff" />
          <Text style={styles.headerTitle}>库存概览</Text>
        </View>
        <View style={styles.statsRow}>
          {STAT_CARDS.map((s) => (
            <View key={s.key} style={styles.statCard}>
              <MaterialCommunityIcons name={s.icon} size={20} color={s.color} />
              <Text style={styles.statValue}>{s.format(stats[s.key] as number)}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.valueRow}>
          <MaterialCommunityIcons name="cash-multiple" size={16} color="#00f5d4" />
          <Text style={styles.valueLabel}>总库存价值</Text>
          <Text style={styles.valueNum}>
            ¥{stats.totalStockValue.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
          </Text>
        </View>
      </LinearGradient>

      {/* 搜索栏 */}
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="搜索商品或 SKU"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ fontSize: 14 }}
        />
      </View>

      {/* 筛选器 */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            selected={filter === f.key}
            onPress={() => setFilter(f.key)}
            style={styles.filterChip}
            selectedColor="#6366f1"
            showSelectedOverlay
            compact
          >
            {f.label}
          </Chip>
        ))}
      </View>

      {/* 列表 */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(i) => i.skuId}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="warehouse" size={56} color="#ddd" />
              <Text variant="bodyLarge" style={styles.emptyText}>暂无符合条件的库存</Text>
              <Text variant="bodySmall" style={styles.emptyHint}>
                {filter === 'all' ? '请确认商品已在桌面端录入' : '切换筛选条件查看其他库存'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f7' },
  header: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 18 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  headerTitle: {
    color: '#fff', fontSize: 18, fontWeight: '700', marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  statValue: {
    color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 212, 0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  valueLabel: {
    color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 6, marginRight: 6,
  },
  valueNum: {
    color: '#00f5d4', fontSize: 14, fontWeight: '700',
  },
  searchWrap: { paddingHorizontal: 12, paddingTop: 10, backgroundColor: '#fff' },
  searchBar: { backgroundColor: '#f5f5f7' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
    flexWrap: 'wrap', gap: 6,
  },
  filterChip: { borderRadius: 14 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 12, paddingBottom: 24 },
  itemCard: {
    marginBottom: 8, borderRadius: 12, backgroundColor: '#fff',
  },
  itemContent: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  itemInfo: { flex: 1 },
  itemName: { fontWeight: '600', marginBottom: 2 },
  itemMeta: { color: '#888', marginBottom: 4 },
  itemFooter: { flexDirection: 'row', alignItems: 'center' },
  stockNum: { fontSize: 18, fontWeight: '700' },
  stockUnit: { color: '#999', marginLeft: 2, flex: 1 },
  statusChip: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#999', marginTop: 16, fontWeight: '500' },
  emptyHint: { color: '#bbb', marginTop: 6 },
});

export default InventoryScreen;
