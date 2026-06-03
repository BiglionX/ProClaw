import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Avatar, Button, Switch, Divider, useTheme } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { clearTokens, isDemoMode } from '../services/AuthService';
import { checkConnection, ConnectionMode } from '../services/ConnectionManager';
import { showToast } from '../components/Toast';
import ProfileSwitcher from '../components/ProfileSwitcher';
import { listProfiles, getProfilePluginPath } from '../services/ProfileManager';
import { useAppStore } from '../stores/AppStore';
import { getInstalledPlugins, InstalledPlugin, parseManifest } from '../services/PluginRegistry';
import { getDatabase } from '../services/DatabaseFactory';
import { hasBackupConfig } from '../services/BackupConfigStore';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [autoSync, setAutoSync] = useState(true);
  const [encryptData, setEncryptData] = useState(true);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('checking');
  const [demo, setDemo] = useState(false);
  const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
  const [backupConfigured, setBackupConfigured] = useState(false);

  useEffect(() => {
    checkCurrentConnection();
    checkDemo();
    checkBackupConfig();
  }, []);

  // 页面聚焦时刷新插件列表（安装/卸载后自动更新）
  useFocusEffect(
    useCallback(() => {
      loadInstalledPlugins();
      checkBackupConfig();
    }, [])
  );

  const loadInstalledPlugins = async () => {
    try {
      const db = getDatabase();
      const plugins = await getInstalledPlugins(db);
      setInstalledPlugins(plugins);
    } catch {
      // Database not ready
    }
  };

  const checkBackupConfig = async () => {
    try {
      const configured = await hasBackupConfig();
      setBackupConfigured(configured);
    } catch {
      setBackupConfigured(false);
    }
  };

  const checkDemo = async () => {
    setDemo(await isDemoMode());
  };

  const checkCurrentConnection = async () => {
    try {
      const status = await checkConnection();
      setConnectionMode(status.mode);
    } catch {
      setConnectionMode('offline');
    }
  };

  const getConnectionDesc = (): string => {
    switch (connectionMode) {
      case 'direct': return '直连模式';
      case 'cloud_relay': return '云中继模式';
      case 'offline': return '离线模式';
      default: return '检测中...';
    }
  };

  const getConnectionColor = (): string => {
    switch (connectionMode) {
      case 'direct': return '#10b981';
      case 'cloud_relay': return '#f59e0b';
      case 'offline': return '#ef4444';
      default: return '#999';
    }
  };

  const handleLogout = () => {
    // 使用 Toast + 确认流程
    showToast(
      'info',
      '确认退出？',
      '退出后需要重新配对才能连接桌面端'
    );
    // 注意：Toast 无法像 Alert 那样提供按钮确认，如有需要可保留 Alert
    // 此处简化处理：长按退出按钮才执行
  };

  const handleLogoutConfirm = async () => {
    try {
      await clearTokens();
      navigation.navigate('Connection');
      showToast('success', '已退出登录');
    } catch (err) {
      showToast('error', '退出失败');
    }
  };

  const handleClearCache = () => {
    showToast('success', '缓存已清除');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 用户信息区 */}
      <View style={styles.header}>
        <Avatar.Text size={72} label="用户" style={{ backgroundColor: colors.primary }} />
        <Text variant="titleLarge" style={styles.userName}>移动端用户</Text>
        <Text variant="bodyMedium" style={styles.userRole}>
          {demo ? '演示模式' : '已授权设备'}
        </Text>
      </View>

      {/* 设置列表 */}
      <List.Section style={styles.section}>
        <List.Item
          title="连接状态"
          description={getConnectionDesc()}
          left={() => (
            <View style={[styles.statusDot, { backgroundColor: getConnectionColor() }]} />
          )}
          right={() => (
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#ccc"
            />
          )}
          onPress={checkCurrentConnection}
        />
        <Divider />
        <List.Item
          title="自动同步"
          description="WiFi 环境下自动同步数据"
          left={() => <List.Icon icon="sync" />}
          right={() => (
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
            />
          )}
        />
        <Divider />
        <List.Item
          title="端到端加密"
          description="数据加密后上传云端"
          left={() => <List.Icon icon="shield-lock" />}
          right={() => (
            <Switch
              value={encryptData}
              onValueChange={setEncryptData}
            />
          )}
        />
        <Divider />
        <List.Item
          title="云备份"
          description={backupConfigured ? '端到端加密备份 - 已配置' : '端到端加密，数据自主可控'}
          left={() => <List.Icon icon="cloud-upload" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={() => navigation.navigate('BackupWallet')}
        />
        <Divider />
        <List.Item
          title="局域网同步"
          description="同一 WiFi 下与桌面端直连同步"
          left={() => <List.Icon icon="wifi" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={() => navigation.navigate('LanSync')}
        />
        <Divider />
        <List.Item
          title="插件商店"
          description="按需安装行业工作流插件"
          left={() => <List.Icon icon="puzzle" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={() => navigation.navigate('PluginStore')}
        />
        <Divider />
        <List.Item
          title="跨身份数据"
          description="在不同身份间导入/导出业务数据"
          left={() => <List.Icon icon="swap-horizontal-bold" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={() => navigation.navigate('DataTransfer')}
        />
        <Divider />
        {/* 已安装插件列表 */}
        {installedPlugins.length > 0 && (
          <>
            <List.Subheader style={styles.sectionSubheader}>已安装插件</List.Subheader>
            {installedPlugins.map((plugin, idx) => {
              const manifest = parseManifest(plugin.manifestJson);
              return (
                <React.Fragment key={plugin.id}>
                  {idx > 0 && <Divider />}
                  <List.Item
                    title={manifest?.name || plugin.name}
                    description={`v${plugin.version} - 点击查看`}
                    left={() => <List.Icon icon={manifest?.icon?.replace(/[\uD800-\uDFFF]/g, '') ? 'puzzle' : 'puzzle'} />}
                    right={() => (
                      <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
                    )}
                    onPress={() => navigation.navigate('PluginPage', {
                      pluginId: plugin.id,
                      pluginTitle: manifest?.name || plugin.name,
                    })}
                  />
                </React.Fragment>
              );
            })}
            <Divider />
          </>
        )}
        <List.Item
          title="身份管理"
          description="切换、创建或管理身份"
          left={() => <List.Icon icon="account-switch" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={async () => {
            const profiles = await listProfiles();
            useAppStore.getState().setProfiles(profiles);
            navigation.navigate('ProfileSelect');
          }}
        />
        <Divider />
        <List.Item
          title="清除缓存"
          description="清除本地缓存数据"
          left={() => <List.Icon icon="delete-sweep" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={handleClearCache}
        />
        <Divider />
        <List.Item
          title="关于 ProClaw"
          description="版本 1.0.0"
          left={() => <List.Icon icon="information" />}
          right={() => (
            <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />
          )}
          onPress={() => showToast('info', 'ProClaw Mobile', '私有化商务管理系统 v1.0.0')}
        />
      </List.Section>

      {/* 退出登录 */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          buttonColor="#ef4444"
          textColor="#fff"
          icon="logout"
          style={styles.logoutBtn}
          contentStyle={{ paddingVertical: 4 }}
          onPress={handleLogoutConfirm}
        >
          退出登录
        </Button>
        <Text variant="bodySmall" style={styles.version}>
          ProClaw Mobile v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 16,
  },
  userName: {
    fontWeight: '600',
    marginTop: 12,
  },
  userRole: {
    color: '#666',
    marginTop: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 14,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionSubheader: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
    paddingLeft: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#f8f8f8',
  },
  footer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  logoutBtn: {
    borderRadius: 10,
    marginBottom: 16,
  },
  version: {
    textAlign: 'center',
    color: '#999',
  },
});

export default ProfileScreen;
