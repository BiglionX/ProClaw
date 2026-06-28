/**
 * CloudStoreScreen - 云商城页面（需桌面端开通后通过 API 同步）
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

interface StoreStats {
  products: number;
  orders: number;
  views: number;
}

export default function CloudStoreScreen() {
  const [loading, setLoading] = useState(true);
  const [stats] = useState<StoreStats>({ products: 0, orders: 0, views: 0 });

  useEffect(() => {
    setLoading(false);
  }, []);

  const handleOpenDashboard = () => {
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
        <View style={styles.statusCard}>
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons name="store" size={40} color="#6366f1" />
          </View>
          <Text variant="headlineSmall" style={styles.storeName}>
            未开通云商城
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: '#f59e0b' }]}>
            <Text style={styles.statusBadgeText}>未开通</Text>
          </View>
        </View>

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

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleOpenDashboard}>
            <MaterialCommunityIcons name="cog" size={22} color="#6366f1" />
            <Text style={styles.secondaryBtnText}>管理商城</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="information" size={20} color="#6366f1" />
          <Text style={styles.tipText}>
            开通云商城后，您可以通过子域名或自定义域名访问您的在线商城。请在桌面端完成开通与配置。
          </Text>
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
});
