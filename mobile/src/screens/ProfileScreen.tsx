/**
 * ProfileScreen - 个人中心独立页面
 * 整合：身份卡片 + 数据看板 + 快捷操作 + 已装插件
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Divider,
  useTheme,
  ActivityIndicator,
  List,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { checkConnection, ConnectionMode } from '../services/ConnectionManager';
import { getProducts, getCustomers } from '../services/ApiService';
import { isDemoMode } from '../services/AuthService';
import { getInstalledPlugins, parseManifest, type InstalledPlugin } from '../services/PluginRegistry';
import { getDatabase } from '../services/DatabaseFactory';
import { useAppStore } from '../stores/AppStore';

const DEMO_PRODUCT_COUNT = 42;
const DEMO_CONTACT_COUNT = 10;

// ============ 快捷操作配置 ============

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  navigateTo: string;
  params?: any;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'products', label: '商品目录', icon: 'package-variant-closed', color: '#6366f1', bg: '#e0e7ff', navigateTo: 'Products' },
  { id: 'sales', label: '创建销售单', icon: 'clipboard-text', color: '#10b981', bg: '#d1fae5', navigateTo: 'SalesOrder' },
  { id: 'supply', label: '采购入库', icon: 'truck-delivery', color: '#f59e0b', bg: '#fef3c7', navigateTo: 'SupplyChain' },
  { id: 'calls', label: '通话记录', icon: 'phone-classic', color: '#ef4444', bg: '#fee2e2', navigateTo: 'CallHistory' },
  { id: 'lansync', label: '局域网同步', icon: 'wifi', color: '#06b6d4', bg: '#cffafe', navigateTo: 'LanSync' },
  { id: 'backup', label: '云备份', icon: 'cloud-upload', color: '#8b5cf6', bg: '#ede9fe', navigateTo: 'BackupWallet' },
];

// ============ 组件 ============

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  // 看板数据
  const [connectionStatus, setConnectionStatus] = useState<ConnectionMode>('checking');
  const [latency, setLatency] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  // 当前身份
  const currentProfile = useAppStore((s) => s.currentProfile);
  const profileName = currentProfile?.name || '移动端用户';
  const profileAvatar = currentProfile?.avatar || '我';

  // 设置数据
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const demoMode = await isDemoMode();
      setDemo(demoMode);
      if (demoMode) {
        setConnectionStatus('checking');
        setProductCount(DEMO_PRODUCT_COUNT);
        setCustomerCount(DEMO_CONTACT_COUNT);
        setLoading(false);
        return;
      }
      const [connStatus] = await Promise.all([
        checkConnection(),
        getProducts({ limit: 1 }).catch(() => []),
        getCustomers({ limit: 1 }).catch(() => []),
      ]);
      setConnectionStatus(connStatus.mode);
      setLatency(connStatus.latency || 0);
      try { const allProducts = await getProducts(); setProductCount(allProducts.length); }
      catch { setProductCount(0); }
      try { const allCustomers = await getCustomers(); setCustomerCount(allCustomers.length); }
      catch { setCustomerCount(0); }
    } catch { setConnectionStatus('offline'); }
    finally { setLoading(false); }
  }, []);

  const loadPlugins = async () => {
    try {
      const db = getDatabase();
      const plugins = await getInstalledPlugins(db);
      setInstalledPlugins(plugins);
    } catch { /* db not ready */ }
  };

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  useFocusEffect(useCallback(() => { loadPlugins(); }, []));

  const getStatusCfg = (): { label: string; color: string; icon: string } => {
    if (demo) return { label: '演示', color: '#8b5cf6', icon: 'play-circle' };
    switch (connectionStatus) {
      case 'direct': return { label: '直连', color: '#10b981', icon: 'lan-connect' };
      case 'cloud_relay': return { label: '云中继', color: '#f59e0b', icon: 'cloud-sync' };
      case 'offline': return { label: '离线', color: '#ef4444', icon: 'wifi-off' };
      default: return { label: '检测中', color: '#999', icon: 'help-circle' };
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const statusCfg = getStatusCfg();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ============ 顶部身份卡片 ============ */}
      <Card style={styles.identityCard}>
        <Card.Content style={styles.identityContent}>
          <Avatar.Text size={56} label={profileAvatar} style={{ backgroundColor: colors.primary }} />
          <View style={styles.identityInfo}>
            <Text variant="titleMedium" style={styles.identityName}>{profileName}</Text>
            <View style={styles.identityBadgeRow}>
              <Chip
                icon={() => <MaterialCommunityIcons name={statusCfg.icon} size={14} color="#fff" />}
                style={[styles.statusChip, { backgroundColor: statusCfg.color }]}
                textStyle={styles.statusChipText}
              >
                {statusCfg.label}{latency > 0 ? ` ${latency}ms` : ''}
              </Chip>
            </View>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => navigation.navigate('IdentityManage')}
          >
            <MaterialCommunityIcons name="account-switch" size={16} color="#6366f1" style={{marginRight:4}} />
            <Text style={styles.switchBtnText}>身份管理</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#6366f1" />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* ============ 数据概览 ============ */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard} onPress={() => navigation.navigate('Products')}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.statIcon, { backgroundColor: '#e0e7ff' }]}>
              <MaterialCommunityIcons name="package-variant" size={22} color={colors.primary} />
            </View>
            <Text variant="headlineSmall" style={styles.statValue}>{productCount}</Text>
            <Text style={styles.statLabel}>商品</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard} onPress={() => navigation.navigate('Contacts')}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
              <MaterialCommunityIcons name="account-group" size={22} color="#10b981" />
            </View>
            <Text variant="headlineSmall" style={styles.statValue}>{customerCount}</Text>
            <Text style={styles.statLabel}>联系人</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statCard} onPress={() => navigation.navigate('SalesOrder')}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.statIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="receipt" size={22} color="#f59e0b" />
            </View>
            <Text variant="headlineSmall" style={styles.statValue}>{installedPlugins.length}</Text>
            <Text style={styles.statLabel}>插件</Text>
          </Card.Content>
        </Card>
      </View>

      {/* ============ 快捷操作 ============ */}
      <Text style={styles.sectionLabel}>快捷操作</Text>
      <View style={styles.actionGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionItem}
            onPress={() => navigation.navigate(action.navigateTo, action.params)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
              <MaterialCommunityIcons name={action.icon} size={24} color={action.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={1}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ============ 数据管理 ============ */}
      <Text style={styles.sectionLabel}>数据管理</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('DataTransfer')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#f3e8ff' }]}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#8b5cf6" />
          </View>
          <Text style={styles.actionLabel}>跨身份数据传输</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('LanSync')}
          activeOpacity={0.7}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
            <MaterialCommunityIcons name="sync" size={24} color="#f97316" />
          </View>
          <Text style={styles.actionLabel}>数据同步</Text>
        </TouchableOpacity>
      </View>

      {/* ============ 已安装插件 ============ */}
      {installedPlugins.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>已装插件 ({installedPlugins.length})</Text>
          <List.Section style={styles.settingsSection}>
            {installedPlugins.map((plugin, idx) => {
              const manifest = parseManifest(plugin.manifestJson);
              return (
                <React.Fragment key={plugin.id}>
                  {idx > 0 && <Divider />}
                  <List.Item
                    title={manifest?.name || plugin.name}
                    description={`v${plugin.version}`}
                    left={() => <List.Icon icon="puzzle" />}
                    right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
                    onPress={() => navigation.navigate('PluginPage', {
                      pluginId: plugin.id,
                      pluginTitle: manifest?.name || plugin.name,
                    })}
                  />
                </React.Fragment>
              );
            })}
          </List.Section>
        </>
      )}

      {/* ============ 退出登录 ============ */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>ProClaw Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

// ============ 样式 ============

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // 身份卡片
  identityCard: {
    margin: 16,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  identityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  identityInfo: {
    flex: 1,
    marginLeft: 16,
  },
  identityName: {
    fontWeight: '700',
  },
  identityBadgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  statusChip: {
    borderRadius: 16,
    height: 26,
  },
  statusChipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  switchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchBtnText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },

  // 数据概览
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },

  // 快捷操作
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    gap: 8,
  },
  actionItem: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
    textAlign: 'center',
  },

  // 设置
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
  },

  // 退出
  footer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  logoutBtn: {
    borderRadius: 10,
    marginBottom: 16,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
  },
});
