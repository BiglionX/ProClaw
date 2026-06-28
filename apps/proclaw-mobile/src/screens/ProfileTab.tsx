/**
 * ProfileTab - 我的 Tab
 * 整合：身份卡片 + 数据看板 + 快捷操作 + 已装插件
 * 设置通过右上角齿轮图标进入独立 SettingsScreen
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Text,
  Avatar,
  ActivityIndicator,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { checkConnection, ConnectionMode } from '../services/ConnectionManager';
import { getProducts, getCustomers } from '../services/ApiService';
import { clearTokens } from '../services/AuthService';
import callConnectionService from '../services/callConnectionService';
import { showToast } from '../components/Toast';
import { useChatStore } from '../stores/ChatStore';
import { getInstalledPlugins, parseManifest, type InstalledPlugin } from '../services/PluginRegistry';
import { getDatabase } from '../services/DatabaseFactory';
import { useAppStore } from '../stores/AppStore';
import type { AppNavigation, RootStackParamList } from '../types/navigation';

// ============ 快捷操作配置 ============

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  glow: string;
  navigateTo: keyof RootStackParamList;
  params?: RootStackParamList[keyof RootStackParamList];
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: 'products', label: '商品目录', icon: 'package-variant-closed', color: '#00d2ff', glow: 'rgba(0,210,255,0.2)', navigateTo: 'Products' },
  { id: 'cliplus', label: 'ProClips', icon: 'video-plus', color: '#5b21b6', glow: 'rgba(99,102,241,0.2)', navigateTo: 'ProClipsHome' },
  { id: 'cloudstore', label: '云商城', icon: 'store', color: '#6366f1', glow: 'rgba(99,102,241,0.2)', navigateTo: 'CloudStore' },
  { id: 'sales', label: '创建销售单', icon: 'clipboard-text', color: '#00f5d4', glow: 'rgba(0,245,212,0.2)', navigateTo: 'SalesOrder' },
  { id: 'supply', label: '采购入库', icon: 'truck-delivery', color: '#ff6b9d', glow: 'rgba(255,107,157,0.2)', navigateTo: 'SupplyChain' },
  { id: 'calls', label: '通话记录', icon: 'phone-log', color: '#a78bfa', glow: 'rgba(167,139,250,0.2)', navigateTo: 'CallHistory' },
  { id: 'lansync', label: '局域网同步', icon: 'wifi', color: '#00d2ff', glow: 'rgba(0,210,255,0.2)', navigateTo: 'LanSync' },
];

// ============ 组件 ============

export default function ProfileTab() {
  const navigation = useNavigation<AppNavigation>();
  // theme removed for glassmorphism

  // 看板数据
  const [connectionStatus, setConnectionStatus] = useState<ConnectionMode>('checking');
  const [latency, setLatency] = useState(0);
  const [productCount, setProductCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 当前身份
  const currentProfile = useAppStore((s) => s.currentProfile);
  const profileName = currentProfile?.name || '移动端用户';
  const profileAvatar = currentProfile?.avatar || '我';

  // 设置数据
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
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
      // P0: 查询订单总数（PRD §5.2 数据看板要求）
      try {
        const db = getDatabase();
        const result = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM sales_orders') as { cnt: number } | undefined;
        setOrderCount(result?.cnt || 0);
      } catch { setOrderCount(0); }
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

  const handleUnpairDesktop = async () => {
    Alert.alert('取消桌面配对', '将断开与桌面端的连接，本地数据不受影响。', [
      { text: '取消', style: 'cancel' },
      {
        text: '确定', style: 'destructive',
        onPress: async () => {
          try {
            await clearTokens();
            callConnectionService.disconnect();
            setConnectionStatus('offline');
            showToast('success', '已取消桌面配对');
          } catch {
            showToast('error', '操作失败');
          }
        },
      },
    ]);
  };

  const getStatusCfg = (): { label: string; color: string; icon: string } => {
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
        <ActivityIndicator size="large" color="#00d2ff" />
      </View>
    );
  }

  const statusCfg = getStatusCfg();

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={{ flex: 1 }}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ============ 顶部身份卡片 ============ */}
      <View style={styles.glassIdentityCard}>
        <View style={styles.identityContent}>
          <View style={styles.glassAvatarWrap}>
            <Avatar.Text size={56} label={profileAvatar} style={{ backgroundColor: 'rgba(0,210,255,0.25)' }} />
          </View>
          <View style={styles.identityInfo}>
            <Text variant="titleMedium" style={styles.identityName}>{profileName}</Text>
            <View style={styles.identityBadgeRow}>
              <View style={[styles.glassStatusChip, { backgroundColor: statusCfg.color }]}>
                <MaterialCommunityIcons name={statusCfg.icon} size={12} color="#fff" style={{marginRight:4}} />
                <Text style={styles.statusChipText}>
                  {statusCfg.label}{latency > 0 ? ` ${latency}ms` : ''}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => navigation.navigate('IdentityManage')}
          >
            <MaterialCommunityIcons name="account-switch" size={16} color="#00d2ff" style={{marginRight:4}} />
            <Text style={styles.switchBtnText}>身份管理</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#00d2ff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ============ 数据概览 ============ */}
      <Text style={styles.sectionLabel}>数据概览</Text>
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.glassStatCard} onPress={() => navigation.navigate('Products')} activeOpacity={0.7}>
          <View style={styles.statContent}>
            <View style={[styles.glassStatIcon, { backgroundColor: 'rgba(0,210,255,0.15)' }]}>
              <MaterialCommunityIcons name="package-variant" size={22} color="#00d2ff" />
            </View>
            <Text variant="headlineSmall" style={styles.statValue}>{productCount}</Text>
            <Text style={styles.statLabel}>商品</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.glassStatCard} onPress={() => navigation.navigate('Contacts')} activeOpacity={0.7}>
          <View style={styles.statContent}>
            <View style={[styles.glassStatIcon, { backgroundColor: 'rgba(0,245,212,0.15)' }]}>
              <MaterialCommunityIcons name="account-group" size={22} color="#00f5d4" />
            </View>
            <Text variant="headlineSmall" style={styles.statValue}>{customerCount}</Text>
            <Text style={styles.statLabel}>联系人</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.glassStatCard} onPress={() => navigation.navigate('SalesOrder')} activeOpacity={0.7}>
          <View style={styles.statContent}>
            <View style={[styles.glassStatIcon, { backgroundColor: 'rgba(123,47,247,0.15)' }]}>
              <MaterialCommunityIcons name="receipt" size={22} color="#7b2ff7" />
            </View>
            <Text variant="headlineSmall" style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>订单</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ============ 快捷操作 ============ */}
      <Text style={styles.sectionLabel}>快捷操作</Text>
      <View style={styles.actionGrid}>
        {QUICK_ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.glassActionItem}
            onPress={() => (navigation.navigate as any)(action.navigateTo, action.params)}
            activeOpacity={0.7}
          >
            <View style={[styles.glassActionIcon, { backgroundColor: action.glow }]}>
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
          style={styles.glassActionItem}
          onPress={() => navigation.navigate('DataTransfer')}
          activeOpacity={0.7}
        >
          <View style={[styles.glassActionIcon, { backgroundColor: 'rgba(123,47,247,0.2)' }]}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={24} color="#7b2ff7" />
          </View>
          <Text style={styles.actionLabel}>跨身份数据传输</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.glassActionItem}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <View style={[styles.glassActionIcon, { backgroundColor: 'rgba(0,210,255,0.2)' }]}>
            <MaterialCommunityIcons name="cloud-sync-outline" size={24} color="#00d2ff" />
          </View>
          <Text style={styles.actionLabel}>数据同步</Text>
        </TouchableOpacity>
      </View>

      {/* ============ 已安装插件 ============ */}
      {installedPlugins.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>已装插件 ({installedPlugins.length})</Text>
          <View style={styles.glassPluginSection}>
            {installedPlugins.map((plugin, idx) => {
              const manifest = parseManifest(plugin.manifestJson);
              return (
                <React.Fragment key={plugin.id}>
                  {idx > 0 && <View style={styles.glassDivider} />}
                  <TouchableOpacity
                    style={styles.glassPluginItem}
                    onPress={() => navigation.navigate('PluginPage', {
                      pluginId: plugin.id,
                      pluginTitle: manifest?.name || plugin.name,
                    })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.glassPluginIcon}>
                      <MaterialCommunityIcons name="puzzle" size={20} color="#00d2ff" />
                    </View>
                    <View style={{flex:1}}>
                      <Text style={styles.glassPluginName}>{manifest?.name || plugin.name}</Text>
                      <Text style={styles.glassPluginVersion}>{`v${plugin.version}`}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </>
      )}

      {/* ============ 取消桌面配对 ============ */}
      <TouchableOpacity style={styles.glassLogoutBtn} onPress={handleUnpairDesktop} activeOpacity={0.7}>
        <MaterialCommunityIcons name="link-off" size={20} color="#ff6b9d" />
        <Text style={styles.logoutText}>取消桌面配对</Text>
      </TouchableOpacity>

      {/* ============ 底部版本 ============ */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>ProClaw Mobile v1.0.0</Text>
      </View>
    </ScrollView>
    </LinearGradient>
  );
}

// ============ 样式 ============

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0c29' },

  // 身份卡片
  glassIdentityCard: {
    margin: 16,
    marginBottom: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glassAvatarWrap: {
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(0,210,255,0.4)',
    padding: 2,
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
    color: 'rgba(255,255,255,0.95)',
  },
  identityBadgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    alignItems: 'center',
  },
  glassStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 26,
    paddingHorizontal: 10,
    justifyContent: 'center',
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
    borderRadius: 12,
    backgroundColor: 'rgba(0,210,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.25)',
  },
  switchBtnText: {
    fontSize: 13,
    color: '#00d2ff',
    fontWeight: '500',
  },

  // 数据概览
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    gap: 10,
  },
  glassStatCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  glassStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  // 快捷操作
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
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
  glassActionItem: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    minWidth: 100,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassActionIcon: {
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
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  // 插件列表
  glassPluginSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  glassDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  glassPluginItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  glassPluginIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,210,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  glassPluginName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  glassPluginVersion: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },

  // 退出
  footer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: 'rgba(255,107,157,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
  },
  glassLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: 'rgba(255,107,157,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
  },
  logoutText: {
    color: '#ff6b9d',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
});
