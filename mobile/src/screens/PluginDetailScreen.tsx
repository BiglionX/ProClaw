/**
 * PluginDetailScreen - 插件详情页
 * 展示插件完整信息，提供安装/卸载/更新操作。
 * 安装完成后提示推荐 AI Team（PRD 5.4）。
 *
 * 对应 PRD v11.0 第5.2节、第5.3节、第5.4节
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { FlowHubPluginInfo } from '../services/PluginDownloader';
import { downloadAndInstall, fetchPluginDetail } from '../services/PluginDownloader';
import { registerPlugin, unregisterPlugin, registerPluginRoutes, unregisterPluginRoutes, getPlugin, isPluginInstalled } from '../services/PluginRegistry';
import { runPluginMigration, rollbackPluginMigration } from '../services/PluginMigration';
import { getDatabase } from '../services/DatabaseFactory';
import { getProfilePluginPath } from '../services/ProfileManager';

type OperationStatus = 'idle' | 'installing' | 'uninstalling' | 'updating';

const PluginDetailScreen: React.FC<{ route: any; navigation: any }> = ({ route, navigation }) => {
  const { pluginInfo: initialInfo, isInstalled: initiallyInstalled } = route.params;
  const [pluginInfo, setPluginInfo] = useState<FlowHubPluginInfo>(initialInfo);
  const [isInstalled, setIsInstalled] = useState(initiallyInstalled);
  const [operationStatus, setOperationStatus] = useState<OperationStatus>('idle');
  const [operationProgress, setOperationProgress] = useState('');
  const [showAgentRecommend, setShowAgentRecommend] = useState(false);

  // 刷新安装状态
  const refreshInstalledStatus = useCallback(async () => {
    try {
      const db = getDatabase();
      const installed = await isPluginInstalled(db, pluginInfo.id);
      setIsInstalled(installed);

      if (installed) {
        const installedPlugin = await getPlugin(db, pluginInfo.id);
        if (installedPlugin) {
          setPluginInfo(prev => ({ ...prev, version: installedPlugin.version }));
        }
      }
    } catch {
      // Database not ready
    }
  }, [pluginInfo.id]);

  useEffect(() => {
    // 进入页面时刷新状态
    refreshInstalledStatus();
  }, [refreshInstalledStatus]);

  /**
   * 安装插件完整流程：
   * 1. 下载插件 ZIP 到文件系统
   * 2. 执行 up.sql 数据库迁移
   * 3. 注册到 plugin_registry
   * 4. 检查 recommendedAgents 提示
   */
  const handleInstall = async () => {
    setOperationStatus('installing');
    setOperationProgress('正在下载插件...');

    try {
      const db = getDatabase();
      const pluginPath = getProfilePluginPath(''); // 获取基础路径

      // 1. 下载插件
      const downloadResult = await downloadAndInstall(pluginInfo, `${pluginPath}/${pluginInfo.id}`);
      if (!downloadResult) {
        throw new Error('插件下载失败');
      }

      // 2. 执行数据库迁移（使用模拟的 up.sql）
      setOperationProgress('正在执行数据库迁移...');
      const upSql = getMockUpSql(pluginInfo.id);
      const migrationResult = await runPluginMigration(db, pluginInfo.id, upSql);
      if (migrationResult.status === 'failed') {
        throw new Error(`数据库迁移失败: ${migrationResult.error}`);
      }

      // 3. 注册路由
      const pluginRoutes = [
        { path: `/${pluginInfo.id}`, component: 'PluginView', title: pluginInfo.name },
      ];
      registerPluginRoutes(pluginInfo.id, pluginRoutes);

      // 4. 注册插件到数据库
      setOperationProgress('正在注册插件...');
      await registerPlugin(db, {
        id: pluginInfo.id,
        name: pluginInfo.name,
        version: pluginInfo.version,
        description: pluginInfo.description,
        author: pluginInfo.author,
        icon: pluginInfo.icon,
        permissions: pluginInfo.permissions || [],
        minAppVersion: pluginInfo.minAppVersion,
        recommendedAgents: pluginInfo.recommendedAgents,
        upSql,
        downSql: getMockDownSql(pluginInfo.id),
        entryPoint: `plugins/${pluginInfo.id}/index.js`,
        routes: [
          { path: `/${pluginInfo.id}`, component: 'PluginView', title: pluginInfo.name },
        ],
      });

      setIsInstalled(true);
      setOperationStatus('idle');
      setOperationProgress('');

      // 5. 检查推荐 AI Team
      if (pluginInfo.recommendedAgents && pluginInfo.recommendedAgents.length > 0) {
        setShowAgentRecommend(true);
        Alert.alert(
          '安装完成',
          `${pluginInfo.name} 已成功安装！`,
          [{ text: '好的' }]
        );
      } else {
        Alert.alert('安装完成', `${pluginInfo.name} 已成功安装！`);
      }
    } catch (error: any) {
      setOperationStatus('idle');
      setOperationProgress('');
      Alert.alert('安装失败', error?.message || '插件安装过程中出现错误');
    }
  };

  /**
   * 卸载插件完整流程：
   * 1. 执行 down.sql 回滚数据库迁移
   * 2. 从 plugin_registry 注销
   */
  const handleUninstall = () => {
    Alert.alert(
      '确认卸载',
      `卸载 "${pluginInfo.name}" 将删除相关数据表，此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '卸载',
          style: 'destructive',
          onPress: async () => {
            setOperationStatus('uninstalling');
            setOperationProgress('正在回滚数据库...');

            try {
              const db = getDatabase();

              // 1. 回滚数据库迁移
              const downSql = getMockDownSql(pluginInfo.id);
              await rollbackPluginMigration(db, pluginInfo.id, downSql);

              // 2. 注销路由
              unregisterPluginRoutes(pluginInfo.id);

              // 3. 注销插件
              setOperationProgress('正在注销插件...');
              await unregisterPlugin(db, pluginInfo.id);

              setIsInstalled(false);
              setOperationStatus('idle');
              setOperationProgress('');
              setShowAgentRecommend(false);
              Alert.alert('卸载完成', `${pluginInfo.name} 已成功卸载`);
            } catch (error: any) {
              setOperationStatus('idle');
              setOperationProgress('');
              Alert.alert('卸载失败', error?.message || '插件卸载过程中出现错误');
            }
          },
        },
      ]
    );
  };

  /**
   * 更新插件
   */
  const handleUpdate = async () => {
    // 先卸载再安装（简化实现）
    setOperationStatus('updating');
    setOperationProgress('正在更新插件...');

    try {
      const db = getDatabase();

      // 回滚旧版本
      const downSql = getMockDownSql(pluginInfo.id);
      await rollbackPluginMigration(db, pluginInfo.id, downSql);

      // 重新注册路由
      registerPluginRoutes(pluginInfo.id, [
        { path: `/${pluginInfo.id}`, component: 'PluginView', title: pluginInfo.name },
      ]);

      // 重新安装
      const upSql = getMockUpSql(pluginInfo.id);
      await runPluginMigration(db, pluginInfo.id, upSql);

      await registerPlugin(db, {
        id: pluginInfo.id,
        name: pluginInfo.name,
        version: pluginInfo.version,
        description: pluginInfo.description,
        author: pluginInfo.author,
        icon: pluginInfo.icon,
        permissions: pluginInfo.permissions || [],
        minAppVersion: pluginInfo.minAppVersion,
        recommendedAgents: pluginInfo.recommendedAgents,
        upSql,
        downSql,
        entryPoint: `plugins/${pluginInfo.id}/index.js`,
        routes: [
          { path: `/${pluginInfo.id}`, component: 'PluginView', title: pluginInfo.name },
        ],
      });

      setOperationStatus('idle');
      setOperationProgress('');
      Alert.alert('更新完成', `${pluginInfo.name} 已更新至 v${pluginInfo.version}`);
    } catch (error: any) {
      setOperationStatus('idle');
      setOperationProgress('');
      Alert.alert('更新失败', error?.message || '插件更新过程中出现错误');
    }
  };

  const isOperating = operationStatus !== 'idle';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 插件头部信息 */}
        <View style={styles.header}>
          <Text style={styles.pluginIcon}>{pluginInfo.icon || '📦'}</Text>
          <Text style={styles.pluginName}>{pluginInfo.name}</Text>
          <Text style={styles.pluginVersion}>v{pluginInfo.version}</Text>
          <Text style={styles.pluginAuthor}>作者: {pluginInfo.author}</Text>
        </View>

        {/* 评分和下载统计 */}
        <View style={styles.statsRow}>
          {pluginInfo.rating && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>★ {pluginInfo.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>评分</Text>
            </View>
          )}
          {pluginInfo.downloads && (
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{pluginInfo.downloads.toLocaleString()}</Text>
              <Text style={styles.statLabel}>下载</Text>
            </View>
          )}
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{pluginInfo.size ? `${(pluginInfo.size / 1024).toFixed(0)} KB` : '未知'}</Text>
            <Text style={styles.statLabel}>大小</Text>
          </View>
        </View>

        {/* 插件描述 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>简介</Text>
          <Text style={styles.description}>{pluginInfo.description}</Text>
        </View>

        {/* 权限列表 */}
        {pluginInfo.permissions && pluginInfo.permissions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>所需权限</Text>
            {pluginInfo.permissions.map((perm, idx) => (
              <View key={idx} style={styles.permissionItem}>
                <Text style={styles.permissionIcon}>•</Text>
                <Text style={styles.permissionText}>{perm}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 推荐的 AI Team */}
        {pluginInfo.recommendedAgents && pluginInfo.recommendedAgents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>推荐 AI 团队</Text>
            {pluginInfo.recommendedAgents.map((agent, idx) => (
              <View key={idx} style={styles.agentItem}>
                <Text style={styles.agentIcon}>🤖</Text>
                <Text style={styles.agentName}>{agent}</Text>
              </View>
            ))}
            {showAgentRecommend && (
              <View style={styles.recommendBanner}>
                <Text style={styles.recommendText}>
                  该插件有推荐的 AI 团队，您可以在「Agent」页面查看和管理
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.actionSection}>
          {isOperating ? (
            <View style={styles.operatingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.operatingText}>{operationProgress}</Text>
            </View>
          ) : isInstalled ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleUpdate}
              >
                <Text style={styles.updateButtonText}>更新</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uninstallButton}
                onPress={handleUninstall}
              >
                <Text style={styles.uninstallButtonText}>卸载</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.installButton}
              onPress={handleInstall}
            >
              <Text style={styles.installButtonText}>安装</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * 模拟插件 up.sql 迁移脚本
 */
const getMockUpSql = (pluginId: string): string => {
  const tables: Record<string, string> = {
    plugin_catering: `-- @version 1
CREATE TABLE IF NOT EXISTS catering_menu_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL,
  description TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS catering_orders (
  id TEXT PRIMARY KEY,
  table_no TEXT,
  items TEXT NOT NULL,
  total_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'preparing', 'served', 'paid', 'cancelled')),
  notes TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
  created_at INTEGER NOT NULL
);`,
    plugin_beauty: `-- @version 1
CREATE TABLE IF NOT EXISTS beauty_appointments (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT,
  service_item TEXT NOT NULL,
  appointment_time INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS beauty_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  membership_level TEXT DEFAULT 'regular',
  balance REAL DEFAULT 0,
  total_spent REAL DEFAULT 0,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
  created_at INTEGER NOT NULL
);`,
    plugin_pet: `-- @version 1
CREATE TABLE IF NOT EXISTS pet_profiles (
  id TEXT PRIMARY KEY,
  owner_name TEXT NOT NULL,
  owner_phone TEXT,
  pet_name TEXT NOT NULL,
  pet_type TEXT,
  pet_breed TEXT,
  pet_birthday INTEGER,
  notes TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS pet_services (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  service_price REAL DEFAULT 0,
  service_date INTEGER NOT NULL,
  notes TEXT,
  last_modified INTEGER NOT NULL,
  sync_status TEXT DEFAULT 'clean' CHECK(sync_status IN ('clean', 'pending', 'conflict')),
  created_at INTEGER NOT NULL
);`,
  };
  return tables[pluginId] || `-- @version 1\n-- No tables defined for ${pluginId}`;
};

/**
 * 模拟插件 down.sql 回滚脚本
 */
const getMockDownSql = (pluginId: string): string => {
  const tables: Record<string, string> = {
    plugin_catering: `-- @version 1
DROP TABLE IF EXISTS catering_menu_items;
DROP TABLE IF EXISTS catering_orders;`,
    plugin_beauty: `-- @version 1
DROP TABLE IF EXISTS beauty_appointments;
DROP TABLE IF EXISTS beauty_members;`,
    plugin_pet: `-- @version 1
DROP TABLE IF EXISTS pet_profiles;
DROP TABLE IF EXISTS pet_services;`,
  };
  return tables[pluginId] || `-- @version 1\n-- No tables to drop for ${pluginId}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  pluginIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  pluginName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  pluginVersion: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginBottom: 4,
  },
  pluginAuthor: {
    fontSize: 13,
    color: '#999',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  permissionIcon: {
    fontSize: 16,
    color: '#6366f1',
    marginRight: 8,
  },
  permissionText: {
    fontSize: 14,
    color: '#555',
  },
  agentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  agentIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  agentName: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  recommendBanner: {
    marginTop: 12,
    backgroundColor: '#f0f0ff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#6366f1',
  },
  recommendText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  actionSection: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  installButton: {
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  installButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uninstallButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  uninstallButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  operatingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  operatingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});

export default PluginDetailScreen;
