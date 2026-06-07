/**
 * SupabaseConfigScreen - 云端同步配置引导页
 *
 * 对应 PRD v11.0 + 审计 vR7 改进：
 * - 明确告知用户云端同步是可选功能
 * - 未配置 Supabase 时本地功能完全可用
 * - 提供 URL + API Key 输入、连接测试、保存/重置
 * - 配置存储在设备安全区 (expo-secure-store)
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Linking,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  useTheme,
  Button,
  Card,
  Chip,
  Divider,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import {
  saveSupabaseConfig,
  loadSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  type SupabaseConnectionConfig,
} from '../services/SupabaseConfigStore';
import { showToast } from '../components/Toast';

export default function SupabaseConfigScreen() {
  const { colors } = useTheme();
  const [config, setConfig] = useState<SupabaseConnectionConfig | null>(null);
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await loadSupabaseConfig();
      setConfig(cfg);
      if (cfg) {
        setUrl(cfg.url);
        setApiKey(cfg.apiKey);
      }
    } catch {
      // config not ready
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useFocusEffect(useCallback(() => { loadConfig(); }, [loadConfig]));

  const handleTestConnection = async () => {
    if (!url.trim() || !apiKey.trim()) {
      showToast('error', '请先填写 Supabase URL 和 API Key');
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const result = await testSupabaseConnection(url.trim(), apiKey.trim());
      setTestResult(result);
      if (result.success) {
        showToast('success', `连接成功 (${result.latencyMs}ms)`);
      } else {
        showToast('error', result.message);
      }
    } catch {
      setTestResult({ success: false, message: '连接测试异常，请重试' });
      showToast('error', '连接测试异常');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim() || !apiKey.trim()) {
      showToast('error', '请填写完整的 Supabase 连接信息');
      return;
    }

    setSaving(true);
    try {
      await saveSupabaseConfig(url.trim(), apiKey.trim());
      showToast('success', '云端同步配置已保存');
      await loadConfig();
    } catch {
      showToast('error', '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await clearSupabaseConfig();
      setUrl('');
      setApiKey('');
      setConfig(null);
      setTestResult(null);
      showToast('info', '云端同步配置已重置，本地数据不受影响');
    } catch {
      showToast('error', '重置失败');
    }
  };

  const isConfigured = config?.configured ?? false;
  const lastTestResult = config?.lastTestResult;
  const hasChanges =
    url.trim() !== (config?.url || '') ||
    apiKey.trim() !== (config?.apiKey || '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ===== 重要提示：可选功能说明 ===== */}
      <Card style={styles.infoBanner}>
        <Card.Content style={styles.infoBannerContent}>
          <MaterialCommunityIcons
            name="information-outline"
            size={28}
            color={colors.primary}
          />
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>
              云端同步为可选功能
            </Text>
            <Text style={styles.infoBannerDesc}>
              不配置 Supabase 不会影响 ProClaw 的任何本地功能。{'\n'}
              您可以在任何时候启用或关闭云端同步，配置变更不会影响已有的本地数据。
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* ===== 当前状态卡片 ===== */}
      <Text style={styles.sectionLabel}>当前状态</Text>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <Text variant="bodySmall" style={styles.statusLabel}>
                云端同步
              </Text>
              <Chip
                compact
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: isConfigured ? '#d1fae5' : '#fee2e2',
                  },
                ]}
                textStyle={{
                  color: isConfigured ? '#10b981' : '#ef4444',
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {isConfigured ? '已配置' : '未启用'}
              </Chip>
            </View>

            {lastTestResult && (
              <View style={styles.statusItem}>
                <Text variant="bodySmall" style={styles.statusLabel}>
                  连接测试
                </Text>
                <Chip
                  compact
                  style={[
                    styles.statusChip,
                    {
                      backgroundColor:
                        lastTestResult === 'success' ? '#d1fae5' : '#fee2e2',
                    },
                  ]}
                  textStyle={{
                    color:
                      lastTestResult === 'success' ? '#10b981' : '#ef4444',
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {lastTestResult === 'success' ? '通过' : '未通过'}
                </Chip>
              </View>
            )}
          </View>

          <Text variant="bodySmall" style={styles.note}>
            ✅ 本地数据始终存储在设备上，不受云端配置影响
          </Text>
        </Card.Content>
      </Card>

      {/* ===== Supabase 连接配置 ===== */}
      <Text style={styles.sectionLabel}>Supabase 连接配置</Text>
      <Card style={styles.card}>
        <Card.Content>
          {/* 获取指引 */}
          <View style={styles.guideBox}>
            <MaterialCommunityIcons
              name="lightbulb-outline"
              size={20}
              color="#f59e0b"
            />
            <Text style={styles.guideText}>
              前往{' '}
              <Text
                style={styles.linkText}
                onPress={() =>
                  Linking.openURL('https://supabase.com/dashboard')
                }
              >
                Supabase 控制台
              </Text>
              {' '}创建项目后，在「项目设置 → API」中获取 URL 和 anon key。
              免费方案已满足个人/小团队同步需求。
            </Text>
          </View>

          {/* URL 输入 */}
          <Text style={styles.inputLabel}>项目 URL</Text>
          <TextInput
            style={[styles.input, { borderColor: '#ddd', color: '#333' }]}
            placeholder="https://your-project.supabase.co"
            placeholderTextColor="#aaa"
            value={url}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={(v) => {
              setUrl(v);
              setTestResult(null);
            }}
          />
          <Text style={styles.inputHint}>
            格式: https://[项目ID].supabase.co
          </Text>

          <Divider style={styles.divider} />

          {/* API Key 输入 */}
          <Text style={styles.inputLabel}>API Key (anon key)</Text>
          <TextInput
            style={[styles.input, { borderColor: '#ddd', color: '#333' }]}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            placeholderTextColor="#aaa"
            value={apiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            onChangeText={(v) => {
              setApiKey(v);
              setTestResult(null);
            }}
          />
          <Text style={styles.inputHint}>
            以 eyJ 开头，在 Supabase 项目设置 → API 中复制
          </Text>

          {/* 测试结果 */}
          {testResult && (
            <View
              style={[
                styles.testResultBox,
                {
                  backgroundColor: testResult.success ? '#d1fae5' : '#fee2e2',
                  borderColor: testResult.success ? '#10b981' : '#ef4444',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={testResult.success ? 'check-circle' : 'close-circle'}
                size={18}
                color={testResult.success ? '#10b981' : '#ef4444'}
              />
              <Text
                style={[
                  styles.testResultText,
                  { color: testResult.success ? '#10b981' : '#ef4444' },
                ]}
              >
                {testResult.message}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* ===== 多端同步工作流说明 ===== */}
      <Text style={styles.sectionLabel}>多端同步如何工作</Text>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.flowStep}>
            <View style={styles.flowNum}>
              <Text style={styles.flowNumText}>1</Text>
            </View>
            <View style={styles.flowContent}>
              <Text style={styles.flowTitle}>配置云端连接</Text>
              <Text style={styles.flowDesc}>
                在此页面填入 Supabase 项目 URL 和 API Key
              </Text>
            </View>
          </View>
          <View style={styles.flowStep}>
            <View style={styles.flowNum}>
              <Text style={styles.flowNumText}>2</Text>
            </View>
            <View style={styles.flowContent}>
              <Text style={styles.flowTitle}>设置备份密码</Text>
              <Text style={styles.flowDesc}>
                前往「云备份」页面，创建用于端到端加密的备份密码
              </Text>
            </View>
          </View>
          <View style={styles.flowStep}>
            <View style={styles.flowNum}>
              <Text style={styles.flowNumText}>3</Text>
            </View>
            <View style={styles.flowContent}>
              <Text style={styles.flowTitle}>自动同步</Text>
              <Text style={styles.flowDesc}>
                数据将端到端加密后自动上传至您的 Supabase 项目，在其他设备上使用相同密码即可恢复
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* ===== 安全与隐私说明 ===== */}
      <Text style={styles.sectionLabel}>安全与隐私</Text>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.privacyItem}>
            <MaterialCommunityIcons
              name="shield-lock"
              size={18}
              color="#10b981"
            />
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>端到端加密</Text>
              <Text style={styles.privacyDesc}>
                所有同步数据使用 AES-256-GCM 加密，密钥仅存储在您的设备安全区中。即使是 Supabase 也无法解密您的数据。
              </Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.privacyItem}>
            <MaterialCommunityIcons
              name="database"
              size={18}
              color="#6366f1"
            />
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>数据自主可控</Text>
              <Text style={styles.privacyDesc}>
                数据存储在您自己的 Supabase 项目中，您拥有完整的控制权。可随时通过 Supabase 控制台管理或删除数据。
              </Text>
            </View>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.privacyItem}>
            <MaterialCommunityIcons
              name="wifi-off"
              size={18}
              color="#f59e0b"
            />
            <View style={styles.privacyText}>
              <Text style={styles.privacyTitle}>离线可用</Text>
              <Text style={styles.privacyDesc}>
                即使云端服务不可用，本地功能完全不受影响。所有数据优先存储在本地 SQLite 数据库中。
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* ===== 操作按钮 ===== */}
      <View style={styles.buttonRow}>
        <Button
          mode="outlined"
          onPress={handleReset}
          icon="restore"
          style={styles.actionBtn}
          textColor="#ef4444"
          disabled={!isConfigured}
        >
          重置配置
        </Button>
        <Button
          mode="outlined"
          onPress={handleTestConnection}
          icon={testing ? 'loading' : 'connection'}
          style={styles.actionBtn}
          loading={testing}
          disabled={testing || !url.trim() || !apiKey.trim()}
        >
          测试连接
        </Button>
        <Button
          mode="contained"
          onPress={handleSave}
          icon="content-save"
          style={styles.actionBtn}
          buttonColor={colors.primary}
          loading={saving}
          disabled={saving || !hasChanges || !url.trim() || !apiKey.trim()}
        >
          保存
        </Button>
      </View>

      {/* 底部说明 */}
      <Text style={styles.bottomHint}>
        配置仅存储在设备安全区，不会上传至任何第三方服务器。{'\n'}
        任何时候关闭或删除配置，本地数据不受影响。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { paddingBottom: 40 },

  // 重要提示横幅
  infoBanner: {
    backgroundColor: '#eef2ff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    elevation: 0,
  },
  infoBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4338ca',
    marginBottom: 4,
  },
  infoBannerDesc: {
    fontSize: 13,
    color: '#6366f1',
    lineHeight: 20,
  },

  // Section 标题
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginTop: 20,
    marginHorizontal: 16,
    marginBottom: 8,
  },

  // 卡片
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 4,
    elevation: 0,
  },

  // 状态行
  statusRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    color: '#888',
  },
  statusChip: {
    borderRadius: 12,
    height: 26,
  },
  note: {
    color: '#999',
    fontSize: 12,
    lineHeight: 18,
  },

  // 获取指引
  guideBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 20,
  },
  linkText: {
    color: '#6366f1',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  // 输入区域
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  inputHint: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
    marginBottom: 2,
  },
  divider: {
    marginVertical: 14,
  },

  // 测试结果
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    gap: 8,
  },
  testResultText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },

  // 工作流步骤
  flowStep: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  flowNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  flowNumText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  flowContent: {
    flex: 1,
  },
  flowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  flowDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },

  // 隐私项
  privacyItem: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  privacyDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
  },

  // 按钮行
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 20,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
  },

  // 底部提示
  bottomHint: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 24,
    marginHorizontal: 32,
    lineHeight: 18,
  },
});
