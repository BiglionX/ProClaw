/**
 * PluginScreen - 通用插件页面
 * 根据路由参数渲染插件内容。所有插件路由映射到此组件，
 * 通过 route.params.pluginId 区分不同插件。
 *
 * 对应 PRD v11.0 第5.2节：动态加载前端组件
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDatabase } from '../services/DatabaseFactory';
import { getPlugin, parseManifest } from '../services/PluginRegistry';

const PluginScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { pluginId, pluginTitle } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<{ name: string; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pluginTitle) {
      navigation.setOptions({ title: pluginTitle });
    }
    loadPluginData();
  }, [pluginId]);

  const loadPluginData = async () => {
    try {
      const db = getDatabase();
      const installed = await getPlugin(db, pluginId);
      if (!installed) {
        setError('插件未安装');
        setLoading(false);
        return;
      }

      const manifest = parseManifest(installed.manifestJson);
      // 查询插件创建的表的行数
      const tableInfo = await queryPluginTables(db, pluginId);
      setTables(tableInfo);
    } catch (e: any) {
      setError(e?.message || '加载插件数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载插件数据...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.welcome}>欢迎使用 {pluginTitle || pluginId} 插件</Text>
        <Text style={styles.hint}>
          此插件已成功安装。以下为该插件创建的数据表概览：
        </Text>

        {tables.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>暂无数据表</Text>
          </View>
        ) : (
          tables.map((table, idx) => (
            <View key={idx} style={styles.tableCard}>
              <Text style={styles.tableName}>{table.name}</Text>
              <Text style={styles.tableCount}>{table.count} 条记录</Text>
            </View>
          ))
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>插件信息</Text>
          <Text style={styles.infoText}>插件ID: {pluginId}</Text>
          <Text style={styles.infoText}>
            数据已存储在身份数据库中，支持增量同步和冲突解决
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * 查询插件相关的数据表行数
 */
const queryPluginTables = async (
  db: any,
  pluginId: string
): Promise<{ name: string; count: number }[]> => {
  const tableMap: Record<string, string[]> = {
    plugin_catering: ['catering_menu_items', 'catering_orders'],
    plugin_beauty: ['beauty_appointments', 'beauty_members'],
    plugin_pet: ['pet_profiles', 'pet_services'],
  };

  const tables = tableMap[pluginId] || [];
  const result: { name: string; count: number }[] = [];

  for (const tableName of tables) {
    try {
      const row = await db.getFirstAsync(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );
      result.push({
        name: tableName,
        count: (row as any)?.count || 0,
      });
    } catch {
      result.push({ name: tableName, count: 0 });
    }
  }

  return result;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  welcome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tableName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  tableCount: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#f0f0ff',
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default PluginScreen;
