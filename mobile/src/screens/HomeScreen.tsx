import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Card, Text, Chip, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { checkConnection, ConnectionMode } from '../services/ConnectionManager';
import { getProducts, getCustomers } from '../services/ApiService';
import { isDemoMode } from '../services/AuthService';

const DEMO_PRODUCT_COUNT = 42;
const DEMO_CONTACT_COUNT = 10;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [connectionStatus, setConnectionStatus] = useState<ConnectionMode>('checking');
  const [latency, setLatency] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [demo, setDemo] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const demoMode = await isDemoMode();
      setDemo(demoMode);

      if (demoMode) {
        // 演示模式：直接用模拟数据
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
      try {
        const allProducts = await getProducts();
        setProductCount(allProducts.length);
      } catch { setProductCount(0); }
      try {
        const allCustomers = await getCustomers();
        setCustomerCount(allCustomers.length);
      } catch { setCustomerCount(0); }
    } catch (error) {
      setConnectionStatus('offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(async () => {
      try {
        const conn = await checkConnection();
        setConnectionStatus(conn.mode);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStatusConfig = (): { label: string; color: string; icon: string } => {
    if (demo) return { label: '演示', color: '#8b5cf6', icon: 'play-circle' };
    switch (connectionStatus) {
      case 'direct': return { label: '直连', color: '#10b981', icon: 'lan-connect' };
      case 'cloud_relay': return { label: '云中继', color: '#f59e0b', icon: 'cloud-sync' };
      case 'offline': return { label: '离线', color: '#ef4444', icon: 'wifi-off' };
      default: return { label: '检测中', color: '#999', icon: 'help-circle' };
    }
  };

  const statusCfg = getStatusConfig();

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* 状态栏 */}
      <Card style={styles.statusCard}>
        <Card.Content style={styles.statusRow}>
          <View style={styles.statusInfo}>
            <Text variant="titleMedium" style={styles.statusTitle}>ProClaw</Text>
            <Text variant="bodySmall" style={styles.statusSubtitle}>商务通 · 移动端</Text>
          </View>
          <Chip
            icon={() => <MaterialCommunityIcons name={statusCfg.icon} size={16} color="#fff" />}
            style={[styles.chip, { backgroundColor: statusCfg.color }]}
            textStyle={styles.chipText}
          >
            {statusCfg.label}
            {latency > 0 ? ` ${latency}ms` : ''}
          </Chip>
        </Card.Content>
      </Card>

      {/* 统计卡片 */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard} onPress={() => navigation.navigate('ProductsTab')}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.statIcon, { backgroundColor: '#e0e7ff' }]}>
              <MaterialCommunityIcons name="package-variant" size={24} color={colors.primary} />
            </View>
            <Text variant="headlineMedium" style={styles.statValue}>{productCount}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>商品总数</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard} onPress={() => navigation.navigate('SupplyChainTab', { screen: 'Contacts' })}>
          <Card.Content style={styles.statContent}>
            <View style={[styles.statIcon, { backgroundColor: '#d1fae5' }]}>
              <MaterialCommunityIcons name="account-group" size={24} color="#10b981" />
            </View>
            <Text variant="headlineMedium" style={styles.statValue}>{customerCount}</Text>
            <Text variant="bodySmall" style={styles.statLabel}>联系人</Text>
          </Card.Content>
        </Card>
      </View>

      {/* 快捷操作 */}
      <Text variant="titleMedium" style={styles.sectionTitle}>快捷操作</Text>
      <View style={styles.actionsGrid}>
        <Card
          style={styles.actionCard}
          onPress={() => navigation.navigate('SupplyChainTab', { screen: 'SalesOrder' })}
        >
          <Card.Content style={styles.actionContent}>
            <MaterialCommunityIcons name="clipboard-text" size={28} color="#10b981" />
            <Text variant="bodyMedium" style={styles.actionText}>创建销售单</Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.actionCard}
          onPress={() => navigation.navigate('ProductsTab')}
        >
          <Card.Content style={styles.actionContent}>
            <MaterialCommunityIcons name="package-variant-closed" size={28} color={colors.primary} />
            <Text variant="bodyMedium" style={styles.actionText}>商品目录</Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.actionCard}
          onPress={() => navigation.navigate('SupplyChainTab', { screen: 'Contacts' })}
        >
          <Card.Content style={styles.actionContent}>
            <MaterialCommunityIcons name="account-group" size={28} color="#f59e0b" />
            <Text variant="bodyMedium" style={styles.actionText}>联系人</Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.actionCard}
          onPress={() => navigation.navigate('ProfileTab')}
        >
          <Card.Content style={styles.actionContent}>
            <MaterialCommunityIcons name="cog" size={28} color="#8b5cf6" />
            <Text variant="bodyMedium" style={styles.actionText}>系统设置</Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  statusCard: {
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {},
  statusTitle: {
    fontWeight: '700',
    fontSize: 20,
  },
  statusSubtitle: {
    color: '#999',
    marginTop: 2,
  },
  chip: {
    borderRadius: 20,
    height: 32,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    color: '#999',
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '47%',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  actionText: {
    fontWeight: '500',
    color: '#333',
  },
});

export default HomeScreen;
