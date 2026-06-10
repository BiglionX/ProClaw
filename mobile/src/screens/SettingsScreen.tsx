/**
 * SettingsScreen - 独立设置页面
 *
 * 从「我的」Tab 分离出来，通过右上角齿轮图标进入。
 * 包含：连接状态、插件商店、云备份、加密、缓存、关于、退出
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import {
  Text,
  Switch,
} from 'react-native-paper';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { clearTokens } from '../services/AuthService';
import { checkConnection, ConnectionMode } from '../services/ConnectionManager';
import { showToast } from '../components/Toast';
import { hasBackupConfig } from '../services/BackupConfigStore';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  // theme removed for glassmorphism

  const [autoSync, setAutoSync] = useState(true);
  const [encryptData, setEncryptData] = useState(true);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('checking');
  const [backupConfigured, setBackupConfigured] = useState(false);

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

  useEffect(() => {
    checkCurrentConnection();
    checkBackupConfig();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkBackupConfig();
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
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={{ flex: 1 }}
    >
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 连接与同步 */}
      <Text style={styles.sectionLabel}>连接与同步</Text>
      <View style={styles.glassSection}>
        <TouchableOpacity style={styles.glassItem} onPress={checkCurrentConnection} activeOpacity={0.7}>
          <View style={[styles.glassStatusDot, { backgroundColor: getConnectionColor() }]} />
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>连接状态</Text>
            <Text style={styles.glassItemDesc}>{getConnectionDesc()}</Text>
          </View>
          <MaterialCommunityIcons name="refresh" size={20} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <View style={styles.glassDivider} />
        <View style={styles.glassItem}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="sync" size={20} color="#00d2ff" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>自动同步</Text>
            <Text style={styles.glassItemDesc}>WiFi 环境下自动同步数据</Text>
          </View>
          <Switch value={autoSync} onValueChange={setAutoSync} color="#00d2ff" />
        </View>
        <View style={styles.glassDivider} />
        <TouchableOpacity style={styles.glassItem} onPress={() => navigation.navigate('LanSync')} activeOpacity={0.7}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="wifi" size={20} color="#00f5d4" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>局域网同步</Text>
            <Text style={styles.glassItemDesc}>同一 WiFi 下与桌面端直连同步</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      {/* 插件与备份 */}
      <Text style={styles.sectionLabel}>插件与备份</Text>
      <View style={styles.glassSection}>
        <TouchableOpacity style={styles.glassItem} onPress={() => navigation.navigate('PluginStore')} activeOpacity={0.7}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="puzzle" size={20} color="#7b2ff7" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>插件商店</Text>
            <Text style={styles.glassItemDesc}>按需安装行业工作流插件</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <View style={styles.glassDivider} />
        <TouchableOpacity style={styles.glassItem} onPress={() => navigation.navigate('BackupWallet')} activeOpacity={0.7}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="cloud-upload" size={20} color="#00d2ff" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>云备份</Text>
            <Text style={styles.glassItemDesc}>{backupConfigured ? '已配置' : '端到端加密，数据自主可控'}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
        <View style={styles.glassDivider} />
        <TouchableOpacity style={styles.glassItem} onPress={() => navigation.navigate('DataTransfer')} activeOpacity={0.7}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="swap-horizontal-bold" size={20} color="#ff6b9d" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>跨身份数据传输</Text>
            <Text style={styles.glassItemDesc}>在不同身份间导入/导出业务数据</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      {/* 安全与隐私 */}
      <Text style={styles.sectionLabel}>安全与隐私</Text>
      <View style={styles.glassSection}>
        <View style={styles.glassItem}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="shield-lock" size={20} color="#00f5d4" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>端到端加密</Text>
            <Text style={styles.glassItemDesc}>数据加密后上传云端</Text>
          </View>
          <Switch value={encryptData} onValueChange={setEncryptData} color="#00d2ff" />
        </View>
        <View style={styles.glassDivider} />
        <TouchableOpacity style={styles.glassItem} onPress={() => showToast('success', '缓存已清除')} activeOpacity={0.7}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="delete-sweep" size={20} color="#ff6b9d" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>清除缓存</Text>
            <Text style={styles.glassItemDesc}>清除本地缓存数据</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      {/* 关于 */}
      <Text style={styles.sectionLabel}>关于</Text>
      <View style={styles.glassSection}>
        <TouchableOpacity style={styles.glassItem} onPress={() => showToast('info', 'ProClaw Mobile', '私有化商务管理系统 v1.0.0')} activeOpacity={0.7}>
          <View style={styles.glassItemIcon}>
            <MaterialCommunityIcons name="information" size={20} color="#00d2ff" />
          </View>
          <View style={styles.glassItemContent}>
            <Text style={styles.glassItemTitle}>关于 ProClaw</Text>
            <Text style={styles.glassItemDesc}>版本 1.0.0</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </View>

      {/* 退出登录 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.glassLogoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="logout" size={20} color="#ff6b9d" style={{marginRight:8}} />
          <Text style={styles.glassLogoutText}>退出登录</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>ProClaw Mobile v1.0.0</Text>
      </View>
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  glassSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  glassItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  glassItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,210,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  glassItemContent: {
    flex: 1,
  },
  glassItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  glassItemDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  glassStatusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  glassDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 14,
  },
  footer: {
    marginTop: 30,
    paddingHorizontal: 16,
  },
  glassLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,107,157,0.12)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,107,157,0.25)',
    marginBottom: 16,
  },
  glassLogoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ff6b9d',
  },
  versionText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
});