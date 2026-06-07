/**
 * AISettingsScreen - AI 大模型配置
 *
 * 多供应商 API Key 配置（DeepSeek / OpenAI / Anthropic / Ollama）
 * 密钥通过 expo-secure-store 加密存储。
 *
 * PRD v11.2 Phase 3
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import {
  Text,
  List,
  Divider,
  useTheme,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAIConfig,
  setProviderApiKey,
  type ProviderId,
  type ProviderConfig,
} from '../config/ai';
import { showToast } from '../components/Toast';

const PROVIDER_META: Record<ProviderId, { name: string; icon: string; desc: string }> = {
  deepseek: { name: 'DeepSeek', icon: 'robot', desc: '国产高性价比，推荐首选' },
  openai: { name: 'OpenAI', icon: 'robot-outline', desc: 'GPT-4o mini，生态最成熟' },
  anthropic: { name: 'Anthropic Claude', icon: 'brain', desc: 'Claude 3 Haiku，安全优先' },
  ollama: { name: 'Ollama (本地)', icon: 'laptop', desc: '完全离线，无需联网' },
};

const PROVIDER_ORDER: ProviderId[] = ['deepseek', 'openai', 'anthropic', 'ollama'];

export default function AISettingsScreen() {
  const { colors } = useTheme();
  const [providers, setProviders] = useState<Record<ProviderId, ProviderConfig>>(
    {} as Record<ProviderId, ProviderConfig>,
  );
  const [activeProvider, setActiveProvider] = useState<ProviderId>('deepseek');
  const [editingKeys, setEditingKeys] = useState<Record<string, string>>({});

  const loadConfig = useCallback(async () => {
    try {
      const cfg = await getAIConfig();
      setProviders(cfg.providers);
      setActiveProvider(cfg.activeProvider);
      // 预填当前 key
      const keys: Record<string, string> = {};
      for (const id of PROVIDER_ORDER) {
        keys[id] = cfg.providers[id].apiKey;
      }
      setEditingKeys(keys);
    } catch {
      /* config not ready */
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  useFocusEffect(useCallback(() => { loadConfig(); }, [loadConfig]));

  const handleSaveKey = async (providerId: ProviderId, key: string) => {
    try {
      await setProviderApiKey(providerId, key.trim());
      showToast('success', `${PROVIDER_META[providerId].name} Key 已保存`);
      await loadConfig();
    } catch {
      showToast('error', '保存失败');
    }
  };

  const isOllama = (id: ProviderId) => id === 'ollama';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>当前活跃: {PROVIDER_META[activeProvider]?.name ?? activeProvider}</Text>

      {PROVIDER_ORDER.map((id, idx) => {
        const meta = PROVIDER_META[id];
        const cfg = providers[id];
        const enabled = cfg?.enabled ?? false;
        const currentKey = editingKeys[id] ?? '';

        return (
          <View key={id} style={styles.card}>
            {idx > 0 && <Divider style={styles.divider} />}

            {/* 标题行 */}
            <View style={styles.providerHeader}>
              <MaterialCommunityIcons name={meta.icon} size={24} color={colors.primary} />
              <View style={styles.providerInfo}>
                <Text variant="titleSmall" style={styles.providerName}>{meta.name}</Text>
                <Text variant="bodySmall" style={styles.providerDesc}>{meta.desc}</Text>
              </View>
              <Chip
                compact
                style={[
                  styles.statusChip,
                  { backgroundColor: enabled ? '#d1fae5' : '#fee2e2' },
                ]}
                textStyle={{
                  color: enabled ? '#10b981' : '#ef4444',
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {enabled ? '已配置' : '未配置'}
              </Chip>
            </View>

            {/* Key 输入 */}
            <View style={styles.keyRow}>
              <TextInput
                style={[styles.input, { borderColor: '#ddd', color: '#333' }]}
                placeholder={isOllama(id) ? 'Ollama 自动配置，无需密钥' : '粘贴 API Key'}
                placeholderTextColor="#aaa"
                value={isOllama(id) ? 'ollama-local' : currentKey}
                editable={!isOllama(id)}
                secureTextEntry={!isOllama(id)}
                onChangeText={(v) =>
                  setEditingKeys((prev) => ({ ...prev, [id]: v }))
                }
                onSubmitEditing={() => {
                  if (!isOllama(id)) handleSaveKey(id, editingKeys[id] ?? '');
                }}
                returnKeyType="done"
              />
              {!isOllama(id) && (
                <MaterialCommunityIcons
                  name="content-save"
                  size={22}
                  color={colors.primary}
                  style={styles.saveIcon}
                  onPress={() => handleSaveKey(id, editingKeys[id] ?? '')}
                />
              )}
            </View>
          </View>
        );
      })}

      <Text style={styles.hint}>
        密钥仅存储在设备安全区（iOS Keychain / Android Keystore），不上传云端。
      </Text>
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
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    padding: 14,
  },
  divider: { marginBottom: 12 },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  providerName: {
    fontWeight: '600',
  },
  providerDesc: {
    color: '#999',
    marginTop: 2,
  },
  statusChip: {
    borderRadius: 12,
    height: 26,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  saveIcon: {
    marginLeft: 10,
    padding: 6,
  },
  hint: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    marginHorizontal: 32,
    lineHeight: 18,
  },
});
