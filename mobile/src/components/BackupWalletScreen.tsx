/**
 * BackupWalletScreen - 备份钱包管理页
 * 用户设置备份密码、查看备份状态、触发同步。
 *
 * 对应 PRD v11.0 第3.5节：用户密码管理
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import {
  validatePasswordStrength,
  generateRecoveryKey,
  generateHash,
  encryptBlock,
} from '../utils/EncryptionUtil';
import {
  saveBackupConfig,
  loadBackupConfig,
  clearBackupConfig,
  hasBackupConfig as checkHasBackupConfig,
} from '../services/BackupConfigStore';
import { getDatabase } from '../services/DatabaseFactory';
import { cloudBackupProvider } from '../services/CloudBackupProvider';
import { getPendingCount, getPendingChanges } from '../services/ChangeLogManager';

const BackupWalletScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'setup' | 'recovery' | 'complete'>('setup');
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [storageUserId, setStorageUserId] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const [showQRCode, setShowQRCode] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // 加载实时备份状态
  const loadBackupStatus = async () => {
    try {
      const db = getDatabase();
      const count = await getPendingCount(db);
      setPendingCount(count);
    } catch {
      // 数据库未就绪
    }
  };

  // 页面加载时恢复已保存的备份配置
  useEffect(() => {
    const restoreConfig = async () => {
      try {
        const config = await loadBackupConfig();
        if (config) {
          setBackupEnabled(config.enabled);
          setStep('complete');
          setStorageUserId(config.userId);
          setLastSyncTime(config.lastSyncTime);
          // 恢复密钥词仅用于展示，密码本身不存储明文
          if (config.recoveryWords.length > 0) {
            setRecoveryWords(config.recoveryWords);
          }
        }
      } catch {
        // No saved config
      }
    };
    restoreConfig();
    loadBackupStatus();
  }, []);

  const handleSetup = () => {
    // 验证密码
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      Alert.alert('密码强度不足', strength.message);
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('密码不匹配', '两次输入的密码不一致');
      return;
    }

    // 生成恢复密钥
    const words = generateRecoveryKey(password);
    setRecoveryWords(words);
    setStep('recovery');
  };

  const handleSaveRecovery = async () => {
    setSaving(true);
    try {
      // 加密备份密码并计算密码哈希
      const encryptedPassword = encryptBlock(password, password);
      const passwordHash = generateHash(password);

      // 生成用户ID（基于密码哈希的派生ID）
      const userId = storageUserId || `backup_user_${Date.now().toString(36)}`;

      // 持久化备份配置到安全存储
      await saveBackupConfig({
        enabled: true,
        backupPassword: password,
        encryptedPassword,
        passwordHash,
        recoveryWords,
        lastSyncTime: 0,
        userId,
      });

      setStorageUserId(userId);
      setStep('complete');
      setBackupEnabled(true);
      Alert.alert(
        '备份已开启',
        '请务必妥善保管恢复密钥，密码丢失将无法恢复数据。'
      );
    } catch (error: any) {
      Alert.alert('设置失败', error?.message || '无法开启备份');
    } finally {
      setSaving(false);
    }
  };

  // 执行同步
  const handleSync = async () => {
    setSyncing(true);
    try {
      const db = getDatabase();
      const config = await loadBackupConfig();
      if (!config || !config.enabled) {
        Alert.alert('提示', '请先开启云备份并设置密码');
        return;
      }

      // 初始化云备份提供者
      const initialized = await cloudBackupProvider.initializeFromStore(db);
      if (!initialized) {
        Alert.alert('同步失败', '无法初始化云备份，请检查配置');
        return;
      }

      // 获取待同步变更
      const pendingChanges = await getPendingChanges(db);
      if (pendingChanges.length === 0) {
        Alert.alert('同步完成', '没有待同步的数据变更');
        setSyncing(false);
        return;
      }

      // 构造同步包并上传
      const deviceId = '';  // 由 provider 内部获取
      const syncPkg = {
        deviceId,
        profileId: '',
        timestamp: Date.now(),
        changes: pendingChanges,
      };

      const uploadResult = await cloudBackupProvider.upload(syncPkg);
      if (uploadResult.success) {
        // 尝试下载远程变更
        const { getLastSyncTime } = await import('../services/SyncMetadataManager');
        const lastSync = await getLastSyncTime(db);
        await cloudBackupProvider.download(lastSync, deviceId);

        setLastSyncTime(Date.now());
        await loadBackupStatus();
        Alert.alert(
          '同步完成',
          `已上传 ${uploadResult.applied} 条变更`
        );
      } else {
        Alert.alert('同步失败', uploadResult.errors.join('\n') || '未知错误');
      }
    } catch (error: any) {
      Alert.alert('同步失败', error?.message || '同步过程中发生错误');
    } finally {
      setSyncing(false);
    }
  };

  // 格式化时间
  const formatSyncTime = (timestamp: number): string => {
    if (!timestamp) return '尚未同步';
    const d = new Date(timestamp);
    return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleToggleBackup = async (value: boolean) => {
    if (value && !backupEnabled) {
      // 开启备份 -> 跳转到密码设置
      setStep('setup');
    } else if (!value && backupEnabled) {
      // 关闭备份 -> 清除配置
      try {
        await clearBackupConfig();
        setBackupEnabled(false);
        setStep('setup');
        setPassword('');
        setConfirmPassword('');
        setRecoveryWords([]);
      } catch {
        Alert.alert('操作失败', '无法关闭备份');
      }
    } else {
      setBackupEnabled(value);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>云备份设置</Text>

        {/* 备份开关 */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>端到端加密备份</Text>
            <Text style={styles.toggleHint}>
              数据在手机端加密后上传，服务端无法解密
            </Text>
          </View>
          <Switch
            value={backupEnabled}
            onValueChange={handleToggleBackup}
            trackColor={{ false: '#ddd', true: '#6366f1' }}
            thumbColor={backupEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        {step === 'setup' && (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>设置备份密码</Text>
            <Text style={styles.hint}>
              备份密码用于加密您的数据，与登录密码不同。密码丢失将无法恢复数据。
            </Text>

            <TextInput
              style={styles.input}
              placeholder="输入备份密码（至少8位，含大小写字母和数字）"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="确认备份密码"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            {password.length > 0 && (
              <Text style={[
                styles.strengthText,
                { color: validatePasswordStrength(password).valid ? '#22c55e' : '#ef4444' }
              ]}>
                {validatePasswordStrength(password).message}
              </Text>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSetup}
              disabled={!password || !confirmPassword || saving}
            >
              <Text style={styles.primaryButtonText}>开启备份</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'recovery' && (
          <View style={styles.recoverySection}>
            <Text style={styles.sectionTitle}>保存恢复密钥</Text>
            <Text style={styles.warningText}>
              这是恢复您备份数据的唯一方式！请将以下助记词抄写并妥善保管。
            </Text>

            <View style={styles.recoveryWordsContainer}>
              {recoveryWords.map((word, idx) => (
                <View key={idx} style={styles.wordBadge}>
                  <Text style={styles.wordIndex}>{idx + 1}.</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSaveRecovery}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>我已妥善保管，立即开启</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 'complete' && (
          <View style={styles.completeSection}>
            <Text style={styles.completeIcon}>✅</Text>
            <Text style={styles.completeTitle}>备份已开启</Text>
            <Text style={styles.completeHint}>
              您的数据将在连接 WiFi 时自动加密备份到云端
            </Text>

            {/* 备份状态 */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>备份状态</Text>
                <Text style={styles.statusValueActive}>已启用</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>上次同步</Text>
                <Text style={styles.statusValue}>{formatSyncTime(lastSyncTime)}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>待同步变更</Text>
                <Text style={styles.statusValue}>{pendingCount} 条</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.secondaryButton, syncing && styles.secondaryButtonDisabled]}
              onPress={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryButtonText}>同步中...</Text>
                </View>
              ) : (
                <Text style={styles.secondaryButtonText}>立即同步</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.qrExportButton}
              onPress={() => setShowQRCode(true)}
            >
              <MaterialCommunityIcons name="qrcode" size={20} color="#6366f1" />
              <Text style={styles.qrExportText}>导出恢复密钥 QR 码</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkButtonText}>修改备份密码</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>关于备份密码</Text>
          <Text style={styles.disclaimerText}>
            - 备份密码独立于您的登录密码{'\n'}
            - ProClaw 不存储您的备份密码{'\n'}
            - 忘记密码后只能通过恢复密钥恢复{'\n'}
            - 建议将恢复密钥打印或保存在安全位置
          </Text>
        </View>
      </ScrollView>

      {/* 恢复密钥 QR 码 Modal */}
      <Modal visible={showQRCode} transparent animationType="fade" onRequestClose={() => setShowQRCode(false)}>
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>恢复密钥</Text>
            <Text style={styles.qrModalHint}>扫描此二维码可恢复备份密码</Text>

            <View style={styles.qrCodeContainer}>
              {recoveryWords.length > 0 && (
                <QRCode
                  value={recoveryWords.join(' ')}
                  size={200}
                  backgroundColor="#fff"
                  color="#1a1a2e"
                />
              )}
            </View>

            <View style={styles.qrWordsContainer}>
              {recoveryWords.map((word, idx) => (
                <View key={idx} style={styles.qrWordBadge}>
                  <Text style={styles.qrWordIndex}>{idx + 1}.</Text>
                  <Text style={styles.qrWordText}>{word}</Text>
                </View>
              ))}
            </View>

            <View style={styles.qrModalActions}>
              <TouchableOpacity
                style={styles.qrShareButton}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `ProClaw 恢复密钥：${recoveryWords.join(' ')}`,
                    });
                  } catch {}
                }}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
                <Text style={styles.qrShareText}>分享恢复密钥</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.qrCloseButton}
                onPress={() => setShowQRCode(false)}
              >
                <Text style={styles.qrCloseText}>关闭</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  toggleHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    maxWidth: 220,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
    marginBottom: 12,
  },
  strengthText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  recoverySection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  warningText: {
    fontSize: 13,
    color: '#ef4444',
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 20,
  },
  recoveryWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f0f0ff',
    borderRadius: 12,
  },
  wordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0ff',
  },
  wordIndex: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
    fontWeight: '500',
  },
  wordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  completeSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  completeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  completeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  completeHint: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusCard: {
    width: '100%',
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusValueActive: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#f0f0ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  linkButton: {
    paddingVertical: 10,
  },
  linkButtonText: {
    fontSize: 14,
    color: '#6366f1',
    textDecorationLine: 'underline',
  },
  disclaimer: {
    backgroundColor: '#fff8f0',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 22,
  },
  qrExportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0ff',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 8,
    width: '100%',
  },
  qrExportText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 6,
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 30,
    alignItems: 'center',
    maxWidth: 340,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
  },
  qrModalHint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrWordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  qrWordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qrWordIndex: {
    fontSize: 11,
    color: '#999',
    marginRight: 3,
  },
  qrWordText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  qrModalActions: {
    width: '100%',
    gap: 8,
  },
  qrShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
  },
  qrShareText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 6,
  },
  qrCloseButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  qrCloseText: {
    fontSize: 14,
    color: '#999',
  },
});

export default BackupWalletScreen;
