/**
 * SettingsScreen - 独立设置页面
 *
 * 从「我的」Tab 分离出来，通过右上角齿轮图标进入。
 * 包含：连接状态、插件商店、云备份、加密、缓存、关于、退出
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import {
  Text,
  List,
  Switch,
  Divider,
  useTheme,
  Button,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { clearTokens } from '../services/AuthService';
import { checkConnection, ConnectionMode } from '../services/ConnectionManager';
import { showToast } from '../components/Toast';
import { hasBackupConfig } from '../services/BackupConfigStore';
import { hasSupabaseConfig } from '../services/SupabaseConfigStore';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [autoSync, setAutoSync] = useState(true);
  const [encryptData, setEncryptData] = useState(true);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('checking');
  const [backupConfigured, setBackupConfigured] = useState(false);
  const [supabaseConfigured, setSupabaseConfigured] = useState(false);

  const checkCurrentConnection = async () => {
    try {
      const status = await checkConnection();
      setConnectionMode(status.mode);
    } catch {
      setConnectionMode('offline');
    }
  };

  const checkBackupConfig = async () => {
    try {
      setBackupConfigured(await hasBackupConfig());
    } catch {
      setBackupConfigured(false);
    }
  };

  const checkSupabaseConfig = async () => {
    try {
      setSupabaseConfigured(await hasSupabaseConfig());
    } catch {
      setSupabaseConfigured(false);
    }
  };

  useEffect(() => {
    checkCurrentConnection();
    checkBackupConfig();
    checkSupabaseConfig();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkBackupConfig();
      checkSupabaseConfig();
    }, [])
  );

  const getConnectionDesc = (): string => {
    switch (connectionMode) {
      case 'direct': return '直连模式';
      case 'cloud_relay': return '云中继';
      case 'offline': return '离线';
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

  const handleLogout = async () => {
    try {
      await clearTokens();
      navigation.navigate('Connection');
      showToast('success', '已退出');
    } catch {
      showToast('error', '退出失败');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 连接与同步 */}
      <Text style={styles.sectionLabel}>连接与同步</Text>
      <List.Section style={styles.section}>
        <List.Item
          title="连接状态"
          description={getConnectionDesc()}
          left={() => (
            <View style={[styles.statusDot, { backgroundColor: getConnectionColor() }]} />
          )}
          onPress={checkCurrentConnection}
        />
        <Divider />
        <List.Item
          title="自动同步"
          description="WiFi 环境下自动同步数据"
          left={() => <List.Icon icon="sync" />}
          right={() => <Switch value={autoSync} onValueChange={setAutoSync} />}
        />
        <Divider />
        <List.Item
          title="局域网同步"
          description="同一 WiFi 下与桌面端直连同步"
          left={() => <List.Icon icon="wifi" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => navigation.navigate('LanSync')}
        />
      </List.Section>

      {/* 插件与备份 */}
      <Text style={styles.sectionLabel}>插件与备份</Text>
      <List.Section style={styles.section}>
        <List.Item
          title="插件商店"
          description="按需安装行业工作流插件"
          left={() => <List.Icon icon="puzzle" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => navigation.navigate('PluginStore')}
        />
        <Divider />
        <List.Item
          title="云端同步 (Supabase)"
          description={supabaseConfigured ? '已配置' : '可选 - 多设备数据同步'}
          left={() => <List.Icon icon="cloud-sync" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => navigation.navigate('SupabaseConfig')}
        />
        <Divider />
        <List.Item
          title="云备份"
          description={backupConfigured ? '已配置' : '端到端加密，数据自主可控'}
          left={() => <List.Icon icon="cloud-upload" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => navigation.navigate('BackupWallet')}
        />
        <Divider />
        <List.Item
          title="跨身份数据传输"
          description="在不同身份间导入/导出业务数据"
          left={() => <List.Icon icon="swap-horizontal-bold" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => navigation.navigate('DataTransfer')}
        />
      </List.Section>

      {/* AI 大模型 */}
      <Text style={styles.sectionLabel}>AI 大模型</Text>
      <List.Section style={styles.section}>
        <List.Item
          title="AI 配置"
          description="管理 DeepSeek / OpenAI / Anthropic / Ollama API 密钥"
          left={() => <List.Icon icon="robot" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => navigation.navigate('AISettings')}
        />
      </List.Section>

      {/* 安全与隐私 */}
      <Text style={styles.sectionLabel}>安全与隐私</Text>
      <List.Section style={styles.section}>
        <List.Item
          title="端到端加密"
          description="数据加密后上传云端"
          left={() => <List.Icon icon="shield-lock" />}
          right={() => <Switch value={encryptData} onValueChange={setEncryptData} />}
        />
        <Divider />
        <List.Item
          title="清除缓存"
          description="清除本地缓存数据"
          left={() => <List.Icon icon="delete-sweep" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
          onPress={() => showToast('success', '缓存已清除')}
        />
      </List.Section>

      {/* 关于 */}
      <Text style={styles.sectionLabel}>关于</Text>
      <List.Section style={styles.section}>
        <List.Item
          title="关于 ProClaw"
          description="版本 1.0.0"
          left={() => <List.Icon icon="information" />}
          right={() => <MaterialCommunityIcons name="chevron-right" size={22} color="#ccc" />}
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
          onPress={handleLogout}
        >
          退出登录
        </Button>
        <Text style={styles.versionText}>ProClaw Mobile v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    margin: 14,
  },
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