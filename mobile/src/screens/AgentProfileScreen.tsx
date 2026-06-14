/**
 * AgentProfileScreen - Agent 介绍页（移动端版）
 *
 * 对应桌面端 `src/pages/AgentProfilePage.tsx`：
 * - 路由参数 agentId 一致
 * - 功能一致：昵称编辑 + 头像库选择 + 自定义头像上传 + 保存到本地
 * - 与 agentProfileService 集成（数据格式与桌面端 100% 一致）
 * - 跨屏同步：监听 onProfileChanged 事件
 *
 * 移动端差异：
 * - 桌面端用 MUI Tabs + Grid；移动端用 RN Paper Surface + SegmentedButtons + FlatList
 * - 桌面端通过 Tauri 上传；移动端通过 expo-file-system
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Surface,
  TextInput,
  Button,
  Chip,
  useTheme,
  Divider,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  agentRuntimeBridge,
  type AgentInfo,
} from '../services/AgentRuntimeBridge';
import {
  getAgentProfileOverride,
  saveAgentProfileOverride,
  resetAgentProfile,
  readCustomAvatarFileUri,
  onProfileChanged,
  type AgentProfileOverride,
} from '../services/agentProfileService';
import { getDefaultAgentAvatarKey } from '../types/agentAvatarLibrary';
import { TeamAvatar } from '../components/TeamAvatar';
import { AvatarPicker, type AvatarPickerChange } from '../components/AvatarPicker';
import { showToast } from '../components/Toast';
import { OUTBOUND_ERROR_MESSAGE } from '../lib/fetchWithTimeout';
import { logger } from '../utils/logger';

interface AgentProfileScreenProps {
  route?: { params?: { agentId?: string } };
  navigation?: any;
}

export const AgentProfileScreen: React.FC<AgentProfileScreenProps> = ({
  route,
  navigation,
}) => {
  const theme = useTheme();
  const agentId: string = route?.params?.agentId || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [override, setOverride] = useState<AgentProfileOverride | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [pendingAvatarKey, setPendingAvatarKey] = useState<string | null>(null);
  const [pendingCustomPath, setPendingCustomPath] = useState<string | null>(null);
  const [pendingCustomDataUrl, setPendingCustomDataUrl] = useState<string | null>(null);
  const [previewCustomUri, setPreviewCustomUri] = useState<string | null>(null);

  const loadAgentAndOverride = useCallback(async () => {
    if (!agentId) {
      showToast('error', '参数错误', '未指定 Agent ID');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // 1. 加载 Agent manifest
      try {
        await agentRuntimeBridge.initialize();
      } catch (e) {
        logger.warn('[AgentProfileScreen] initialize bridge failed:', e);
      }
      const installed = agentRuntimeBridge.getInstalledAgents();
      const found = installed.find((a) => a.id === agentId) || null;
      setAgent(found);

      // 2. 加载 override
      const ovr = await getAgentProfileOverride(agentId);
      setOverride(ovr);
      setEditName(ovr?.display_name || found?.name || agentId);
      setPendingAvatarKey(ovr?.avatar_key || null);
      setPendingCustomPath(ovr?.custom_avatar_path || null);

      // 3. 加载自定义头像预览 URI
      if (ovr?.custom_avatar_path) {
        const uri = await readCustomAvatarFileUri(ovr.custom_avatar_path);
        setPreviewCustomUri(uri);
      }
    } catch (err) {
      logger.error('[AgentProfileScreen] load failed:', err);
      showToast('error', '加载失败', OUTBOUND_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    loadAgentAndOverride();
    const unsubscribe = onProfileChanged((changedId) => {
      if (!changedId || changedId === agentId) loadAgentAndOverride();
    });
    return () => unsubscribe();
  }, [agentId, loadAgentAndOverride]);

  const handleAvatarChange = useCallback(
    (change: AvatarPickerChange) => {
      if (change.kind === 'preset') {
        setPendingAvatarKey(change.key);
        setPendingCustomPath(null);
        setPendingCustomDataUrl(null);
        setPreviewCustomUri(null);
      } else if (change.kind === 'custom') {
        setPendingAvatarKey(null);
        setPendingCustomPath(change.relativePath);
        setPendingCustomDataUrl(change.dataUrl);
        setPreviewCustomUri(change.dataUrl);
      } else if (change.kind === 'remove') {
        setPendingAvatarKey(null);
        setPendingCustomPath(null);
        setPendingCustomDataUrl(null);
        setPreviewCustomUri(null);
      }
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const fields: Partial<Pick<AgentProfileOverride, 'display_name' | 'avatar_key' | 'custom_avatar_path'>> = {};

      // 昵称：只有用户改了才保存
      const originalName = override?.display_name || agent?.name || agentId;
      if (editName.trim() && editName.trim() !== originalName) {
        fields.display_name = editName.trim();
      } else if (!editName.trim()) {
        // 清空昵称时，传 null 表示恢复默认
        fields.display_name = null;
      }

      // 头像 key
      const originalKey = override?.avatar_key || null;
      const originalCustom = override?.custom_avatar_path || null;
      if (pendingAvatarKey !== originalKey) {
        fields.avatar_key = pendingAvatarKey;
      }
      if (pendingCustomPath !== originalCustom) {
        fields.custom_avatar_path = pendingCustomPath;
      }

      // 至少要有一个字段变化
      if (Object.keys(fields).length === 0) {
        showToast('info', '未做任何修改');
        return;
      }

      await saveAgentProfileOverride(agentId, fields);
      showToast('success', '已保存');
    } catch (err) {
      logger.error('[AgentProfileScreen] save failed:', err);
      showToast('error', '保存失败', OUTBOUND_ERROR_MESSAGE);
    } finally {
      setSaving(false);
    }
  }, [
    agent,
    agentId,
    editName,
    override,
    pendingAvatarKey,
    pendingCustomPath,
    saving,
  ]);

  const handleReset = useCallback(() => {
    Alert.alert(
      '恢复默认',
      '将删除此 Agent 的个性化配置（昵称、头像），确定继续？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAgentProfile(agentId);
              showToast('success', '已恢复默认');
              loadAgentAndOverride();
            } catch (err) {
              logger.error('[AgentProfileScreen] reset failed:', err);
              showToast('error', '恢复失败', OUTBOUND_ERROR_MESSAGE);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [agentId, loadAgentAndOverride]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>加载 Agent 资料中...</Text>
      </View>
    );
  }

  const defaultAvatarKey = getDefaultAgentAvatarKey(agentId);
  const headerAvatarKey = pendingAvatarKey || override?.avatar_key || defaultAvatarKey;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agent 介绍</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner - 大头像 + 昵称 */}
        <Surface style={styles.banner} elevation={2}>
          <View style={styles.avatarWrap}>
            {pendingCustomDataUrl || previewCustomUri ? (
              <Image
                source={{ uri: pendingCustomDataUrl || previewCustomUri || '' }}
                style={styles.bigAvatar}
              />
            ) : (
              <TeamAvatar presetKey={headerAvatarKey} size={96} />
            )}
          </View>

          <TextInput
            mode="outlined"
            label="昵称"
            value={editName}
            onChangeText={setEditName}
            placeholder="输入 Agent 昵称"
            style={styles.nameInput}
            maxLength={20}
            right={
              editName && editName !== (agent?.name || agentId) ? (
                <TextInput.Icon icon="close-circle" onPress={() => setEditName('')} />
              ) : undefined
            }
          />
          {agent?.name && editName !== agent.name && (
            <Text style={styles.originalName}>原名：{agent.name}</Text>
          )}
        </Surface>

        {/* 信息条 */}
        <Surface style={styles.infoCard} elevation={1}>
          <Text style={styles.sectionTitle}>基本信息</Text>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ID</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{agentId}</Text>
          </View>
          {agent?.version && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>版本</Text>
              <Text style={styles.infoValue}>{agent.version}</Text>
            </View>
          )}
          {agent?.manifest?.author && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>作者</Text>
              <Text style={styles.infoValue}>{agent.manifest.author}</Text>
            </View>
          )}
          {(agent?.manifest?.description || override) && (
            <View style={styles.descriptionBlock}>
              <Text style={styles.infoLabel}>描述</Text>
              <Text style={styles.descriptionText}>
                {agent?.manifest?.description || '暂无描述'}
              </Text>
            </View>
          )}
          {agent && (
            <View style={styles.chipsRow}>
              {agent.is_builtin && <Chip mode="outlined" style={styles.chip} compact>内置</Chip>}
              <Chip
                mode={agent.enabled ? 'flat' : 'outlined'}
                style={[
                  styles.chip,
                  agent.enabled ? styles.chipEnabled : null,
                ]}
                textStyle={agent.enabled ? styles.chipEnabledText : null}
                compact
              >
                {agent.enabled ? '已启用' : '未启用'}
              </Chip>
              <Chip mode="outlined" style={styles.chip} compact>
                {agent.permissions_granted.length} 项权限
              </Chip>
            </View>
          )}
        </Surface>

        {/* 头像设置卡片 */}
        <Surface style={styles.avatarCard} elevation={1}>
          <Text style={styles.sectionTitle}>头像设置</Text>
          <Divider style={styles.divider} />
          <AvatarPicker
            agentId={agentId}
            currentKey={pendingAvatarKey || override?.avatar_key || null}
            currentDataUrl={previewCustomUri}
            onChange={handleAvatarChange}
          />
        </Surface>

        {/* 操作按钮 */}
        <View style={styles.actionBar}>
          <Button
            mode="outlined"
            icon="restore"
            onPress={handleReset}
            textColor="#ef4444"
            style={[styles.actionBtn, styles.resetBtn]}
          >
            恢复默认
          </Button>
          <Button
            mode="contained"
            icon={saving ? 'loading' : 'content-save'}
            onPress={handleSave}
            loading={saving}
            disabled={saving}
            style={[styles.actionBtn, styles.saveBtn]}
          >
            保存
          </Button>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0a24',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0a24',
    gap: 12,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#302b63',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  banner: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  avatarWrap: {
    marginBottom: 16,
    borderRadius: 48,
    overflow: 'hidden',
  },
  bigAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  nameInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  originalName: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  avatarCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  divider: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    alignItems: 'center',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    width: 56,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  descriptionBlock: {
    paddingTop: 6,
  },
  descriptionText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipEnabled: {
    backgroundColor: 'rgba(16,185,129,0.2)',
  },
  chipEnabledText: {
    color: '#10b981',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 4,
  },
  resetBtn: {
    borderColor: '#ef4444',
  },
  saveBtn: {},
  bottomSpacer: {
    height: 24,
  },
});

export default AgentProfileScreen;