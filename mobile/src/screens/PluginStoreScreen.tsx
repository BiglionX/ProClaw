/**
 * PluginStoreScreen - 插件商店浏览页面
 * 从 FlowHub 获取插件列表，支持搜索、分类筛选、已安装标识。
 *
 * 对应 PRD v11.0 第5.2节
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchAvailablePlugins, FlowHubPluginInfo } from '../services/PluginDownloader';
import { getInstalledPlugins, InstalledPlugin } from '../services/PluginRegistry';
import { getDatabase } from '../services/DatabaseFactory';
import { logger } from '../utils/logger';
import type { AppScreenProps } from '../types/navigation';

type CategoryTab = 'all' | 'catering' | 'beauty' | 'pet';

const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'catering', label: '餐饮' },
  { key: 'beauty', label: '美容' },
  { key: 'pet', label: '宠物' },
];

const CATEGORY_MAP: Record<string, string> = {
  plugin_catering: 'catering',
  plugin_beauty: 'beauty',
  plugin_pet: 'pet',
};

const PluginStoreScreen: React.FC<AppScreenProps<'PluginStore'>> = ({ navigation }) => {
  const [plugins, setPlugins] = useState<FlowHubPluginInfo[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all');

  const loadPlugins = useCallback(async () => {
    try {
      const [available, installed] = await Promise.all([
        fetchAvailablePlugins(),
        getInstalledPlugins(getDatabase()).catch(() => [] as InstalledPlugin[]),
      ]);
      setPlugins(available);
      setInstalledIds(new Set(installed.map(p => p.id)));
    } catch (error) {
      logger.warn('[PluginStore] Failed to load plugins:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // 首次加载
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // 审计 R2-P2：将 loading ref 替代 loading state 在 deps 中，避免回调频繁重建
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  // 每当页面获得焦点时刷新已安装状态（从插件详情页返回后自动更新）
  useFocusEffect(
    useCallback(() => {
      if (!loadingRef.current) {
        // 仅刷新已安装状态，不重新获取插件列表
        getInstalledPlugins(getDatabase()).catch(() => [] as InstalledPlugin[]).then(installed => {
          setInstalledIds(new Set(installed.map(p => p.id)));
        });
      }
    }, []) // 使用 ref 访问最新 loading 值，无需重建回调
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPlugins();
  }, [loadPlugins]);

  // 筛选插件
  const filteredPlugins = plugins.filter(plugin => {
    // 分类筛选
    if (activeCategory !== 'all') {
      const pluginCategory = CATEGORY_MAP[plugin.id] || 'all';
      if (pluginCategory !== activeCategory) return false;
    }
    // 搜索筛选
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(q) ||
        plugin.description.toLowerCase().includes(q) ||
        plugin.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderPluginItem = ({ item }: { item: FlowHubPluginInfo }) => {
    const isInstalled = installedIds.has(item.id);

    return (
      <TouchableOpacity
        style={styles.pluginCard}
        onPress={() => navigation.navigate('PluginDetail', { pluginInfo: item, isInstalled })}
        activeOpacity={0.7}
      >
        <Text style={styles.pluginIcon}>{item.icon || '📦'}</Text>
        <View style={styles.pluginInfo}>
          <View style={styles.pluginNameRow}>
            <Text style={styles.pluginName} numberOfLines={1}>{item.name}</Text>
            {isInstalled && (
              <View style={styles.installedBadge}>
                <Text style={styles.installedBadgeText}>已安装</Text>
              </View>
            )}
          </View>
          <Text style={styles.pluginDesc} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.pluginMeta}>
            <Text style={styles.pluginVersion}>v{item.version}</Text>
            {item.rating && (
              <>
                <Text style={styles.metaSeparator}>|</Text>
                <Text style={styles.pluginRating}>★ {item.rating.toFixed(1)}</Text>
              </>
            )}
            {item.downloads && (
              <>
                <Text style={styles.metaSeparator}>|</Text>
                <Text style={styles.pluginDownloads}>{item.downloads} 下载</Text>
              </>
            )}
          </View>
        </View>
        <Text style={styles.arrowIcon}>→</Text>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔍</Text>
      <Text style={styles.emptyText}>
        {searchQuery ? '未找到匹配的插件' : '暂无可用的插件'}
      </Text>
      <Text style={styles.emptyHint}>
        {searchQuery ? '请尝试其他关键词' : '请检查网络连接后刷新'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>插件商店</Text>
        <Text style={styles.subtitle}>按需安装行业工作流插件</Text>
      </View>

      {/* 搜索栏 */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索插件..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.searchIcon}>🔍</Text>
        )}
      </View>

      {/* 分类 Tab */}
      <View style={styles.categoryRow}>
        {CATEGORY_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.categoryTab,
              activeCategory === tab.key && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(tab.key)}
          >
            <Text
              style={[
                styles.categoryTabText,
                activeCategory === tab.key && styles.categoryTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 插件列表 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载插件列表...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPlugins}
          keyExtractor={item => item.id}
          renderItem={renderPluginItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6366f1"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  searchIcon: {
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  clearButtonText: {
    fontSize: 16,
    color: '#999',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryTabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryTabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  pluginCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pluginIcon: {
    fontSize: 36,
    marginRight: 14,
  },
  pluginInfo: {
    flex: 1,
  },
  pluginNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pluginName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    flexShrink: 1,
  },
  installedBadge: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  installedBadgeText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '500',
  },
  pluginDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    lineHeight: 18,
  },
  pluginMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  pluginVersion: {
    fontSize: 12,
    color: '#999',
  },
  pluginRating: {
    fontSize: 12,
    color: '#f59e0b',
  },
  pluginDownloads: {
    fontSize: 12,
    color: '#999',
  },
  metaSeparator: {
    fontSize: 12,
    color: '#ddd',
  },
  arrowIcon: {
    fontSize: 18,
    color: '#ccc',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
});

export default PluginStoreScreen;
