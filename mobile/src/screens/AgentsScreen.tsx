/**
 * AgentsScreen - 移动端 Agent 管理页面
 * 显示已安装 Agent 列表，支持启用/禁用、打开视图
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Switch,
} from 'react-native';
import {
  Card,
  Text,
  useTheme,
  ActivityIndicator,
  Chip,
  IconButton,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { agentRuntimeBridge, type AgentInfo } from '../services/AgentRuntimeBridge';
import AgentView from '../components/AgentView';

export default function AgentsScreen() {
  const { colors } = useTheme();
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openAgent, setOpenAgent] = useState<AgentInfo | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      await agentRuntimeBridge.initialize();
      const list = agentRuntimeBridge.getInstalledAgents();
      setAgents(list);
    } catch (err) {
      console.warn('[AgentsScreen] Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  // 监听 Agent 变化
  useEffect(() => {
    const unsubscribe = agentRuntimeBridge.addChangeListener('agents-screen', (updatedAgents) => {
      setAgents([...updatedAgents]);
    });
    return unsubscribe;
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAgents();
    setRefreshing(false);
  };

  const handleToggleAgent = async (agent: AgentInfo) => {
    try {
      if (agent.enabled) {
        await agentRuntimeBridge.disableAgent(agent.id);
      } else {
        await agentRuntimeBridge.enableAgent(agent.id);
      }
      // 立即更新本地状态
      setAgents(prev =>
        prev.map(a =>
          a.id === agent.id ? { ...a, enabled: !agent.enabled } : a,
        ),
      );
    } catch (err) {
      console.warn('[AgentsScreen] Toggle failed:', err);
    }
  };

  const handleOpenAgent = (agent: AgentInfo) => {
    if (!agent.enabled) return;
    setOpenAgent(agent);
  };

  const renderAgentItem = ({ item }: { item: AgentInfo }) => {
    const isBuiltin = item.is_builtin;
    return (
      <Card
        style={[styles.agentCard, !item.enabled && styles.disabledCard]}
        onPress={() => handleOpenAgent(item)}
      >
        <Card.Content style={styles.agentContent}>
          {/* Agent 图标 */}
          <View style={[styles.iconBox, { backgroundColor: isBuiltin ? '#1976d2' : '#ff3b30' }]}>
            <MaterialCommunityIcons name="puzzle" size={24} color="#fff" />
          </View>

          {/* Agent 信息 */}
          <View style={styles.agentInfo}>
            <View style={styles.nameRow}>
              <Text variant="titleMedium" style={styles.agentName} numberOfLines={1}>
                {item.name}
              </Text>
              {isBuiltin && (
                <Chip
                  mode="outlined"
                  style={styles.builtinChip}
                  textStyle={styles.builtinChipText}
                >
                  内置
                </Chip>
              )}
            </View>
            {item.manifest.description && (
              <Text
                variant="bodySmall"
                style={styles.agentDesc}
                numberOfLines={1}
              >
                {item.manifest.description}
              </Text>
            )}
            <View style={styles.metaRow}>
              <Text variant="labelSmall" style={styles.metaText}>
                v{item.version}
              </Text>
              {item.manifest.author && (
                <>
                  <Text variant="labelSmall" style={styles.metaSeparator}>|</Text>
                  <Text variant="labelSmall" style={styles.metaText}>
                    {item.manifest.author}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* 状态切换 */}
          <View style={styles.actions}>
            <Switch
              value={item.enabled}
              onValueChange={() => handleToggleAgent(item)}
              trackColor={{ false: '#ddd', true: '#ff8a80' }}
              thumbColor={item.enabled ? '#ff3b30' : '#f4f3f4'}
            />
            {/* 打开按钮（仅在启用时有效） */}
            <IconButton
              icon="open-in-new"
              size={20}
              disabled={!item.enabled}
              onPress={() => handleOpenAgent(item)}
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="puzzle-outline" size={64} color="#ccc" />
      <Text variant="titleMedium" style={styles.emptyTitle}>
        尚未安装任何 Agent
      </Text>
      <Text variant="bodySmall" style={styles.emptyHint}>
        在桌面端安装 Agent 后将在此处同步显示
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 页面标题 */}
      <View style={styles.pageHeader}>
        <Text variant="headlineSmall" style={styles.pageTitle}>
          Agent 管理
        </Text>
        <Text variant="bodySmall" style={styles.pageSubtitle}>
          管理已安装的能力模块
        </Text>
      </View>

      {/* Agent 列表 */}
      <FlatList
        data={agents}
        renderItem={renderAgentItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          agents.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Agent 视图弹窗 */}
      {openAgent && (
        <AgentView
          agent={openAgent}
          visible={!!openAgent}
          onClose={() => setOpenAgent(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontWeight: '700',
    color: '#333',
  },
  pageSubtitle: {
    color: '#999',
    marginTop: 4,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  listEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  separator: {
    height: 8,
  },
  agentCard: {
    borderRadius: 14,
    backgroundColor: '#fff',
    elevation: 2,
  },
  disabledCard: {
    opacity: 0.6,
  },
  agentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentInfo: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentName: {
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  builtinChip: {
    height: 20,
    borderRadius: 10,
    borderColor: '#1976d2',
  },
  builtinChipText: {
    fontSize: 10,
    color: '#1976d2',
    marginHorizontal: 4,
  },
  agentDesc: {
    color: '#999',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  metaText: {
    color: '#bbb',
    fontSize: 11,
  },
  metaSeparator: {
    color: '#ddd',
    fontSize: 11,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyHint: {
    color: '#bbb',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
