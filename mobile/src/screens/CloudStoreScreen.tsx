/**
 * CloudStoreScreen - 云商城页面
 * 演示模式下展示演示云商城预览，非演示模式下引导开通云商城
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { isDemoMode } from '../services/AuthService';
import { showToast } from '../components/Toast';

interface StoreStats {
  products: number;
  orders: number;
  views: number;
}

const DEMO_STORE_URL = 'https://proclaw.cc/demo';
const DEMO_STORE_SUBDOMAIN = 'demo';

export default function CloudStoreScreen() {
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [stats, setStats] = useState<StoreStats>({ products: 20, orders: 9, views: 128 });

  useEffect(() => {
    checkDemoMode();
  }, []);

  const checkDemoMode = async () => {
    try {
      const isDemo = await isDemoMode();
      setDemo(isDemo);
      if (isDemo) {
        // 演示模式下使用预设统计数据
        setStats({ products: 20, orders: 9, views: 128 });
      }
    } catch (e) {
      console.error('[CloudStore] checkDemoMode error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewStore = () => {
    Linking.openURL(DEMO_STORE_URL).catch(() => {
      showToast('error', '无法打开商城链接');
    });
  };

  const handleOpenDashboard = () => {
    // 引导用户使用桌面端管理云商城
    Alert.alert(
      '云商城管理',
      '云商城完整管理功能请在桌面端使用 ProClaw Plus/Light 操作。',
      [{ text: '我知道了' }]
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 云商城状态卡片 */}
        <View style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons name="store" size={40} color="#6366f1" />
          </View>
          <Text variant="headlineSmall" style={styles.storeName}>
            {demo ? `proclaw.cc/demo` : '未开通云商城'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: demo ? '#10b981' : '#f59e0b' }]}>
            <Text style={styles.statusBadgeText}>
              {demo ? '已开通' : '未开通'}
            </Text>
          </View>
        </View>

        {/* 统计数据 */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.products}</Text>
            <Text style={styles.statLabel}>商品数</Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.orders}</Text>
            <Text style={styles.statLabel}>订单数</Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="headlineMedium" style={styles.statValue}>{stats.views}</Text>
            <Text style={styles.statLabel}>浏览量</Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePreviewStore}>
            <MaterialCommunityIcons name="eye" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>预览商城</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenDashboard}>
            <MaterialCommunityIcons name="cog" size={22} color="#6366f1" />
            <Text style={styles.secondaryBtnText}>管理商城</Text>
          </TouchableOpacity>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="information" size={20} color="#6366f1" />
          <Text style={styles.tipText}>
            {demo
              ? '演示云商城已预置 20 个 iPhone 电池商品，可点击「预览商城」查看效果。完整管理功能请在桌面端操作。'
              : '开通云商城后，您可以通过子域名或自定义域名访问您的在线商城。支持商品管理、订单处理等完整电商功能。'}
          </Text>
        </View>

        {/* 功能介绍 */}
        <View style={styles.features}>
          <Text variant="titleMedium" style={styles.featuresTitle}>云商城功能</Text>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="package-variant-closed" size={20} color="#10b981" />
            <Text style={styles.featureText}>商品管理 - 上架、编辑、分类商品</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="receipt" size={20} color="#10b981" />
            <Text style={styles.featureText}>订单处理 - 接收、管理订单</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="chart-line" size={20} color="#10b981" />
            <Text style={styles.featureText}>数据统计 - 销售分析、流量监控</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="palette" size={20} color="#10b981" />
            <Text style={styles.featureText}>主题定制 - 自定义商城外观</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  storeName: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    fontWeight: '700',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  secondaryBtnText: {
    color: '#6366f1',
    fontWeight: '600',
    fontSize: 15,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  features: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#555',
  },
});
