/**
 * TeamMembersDialog - AI Team 群组成员列表弹窗（移动端版）
 *
 * 在 ContactsTab 点击群组头像时弹出，展示该群组所有成员。
 * 点击成员后跳转到 AgentProfileScreen（路由 AgentProfile）。
 *
 * 对应桌面端 `src/components/Contacts/TeamMembersDialog.tsx`：
 * - Props / 行为一致（open / groupConfig / onClose / onMemberClick）
 * - 监听 onProfileChanged 自动刷新（个性化变更后）
 * - 头像优先级：custom_avatar_path → avatar_key 库 → 默认
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Surface, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AITeamGroupConfig } from '../data/aiTeamGroups';
import {
  getAgentProfileOverride,
  resolveAgentDisplay,
  onProfileChanged,
  readCustomAvatarFileUri,
  type AgentProfileOverride,
} from '../services/agentProfileService';
import {
  getDefaultAgentAvatarKey,
  getDefaultAgentAvatar as getDefaultAgentAvatarUrl,
} from '../types/agentAvatarLibrary';
import { TeamAvatar } from './TeamAvatar';

interface TeamMembersDialogProps {
  open: boolean;
  groupConfig: AITeamGroupConfig | null;
  onClose: () => void;
  onMemberClick: (agentId: string) => void;
}

interface MemberDisplay {
  agentId: string;
  displayName: string;
  role: string;
  emojiFallback: string;
  avatarKey: string | null;
  customAvatarUri: string | null;
  isCustomAvatar: boolean;
  isOverridden: boolean;
}

export const TeamMembersDialog: React.FC<TeamMembersDialogProps> = ({
  open,
  groupConfig,
  onClose,
  onMemberClick,
}) => {
  const theme = useTheme();
  const [members, setMembers] = useState<MemberDisplay[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!groupConfig) {
      setMembers([]);
      return;
    }
    setLoading(true);
    try {
      const entries = Object.entries(groupConfig.members);
      const results: MemberDisplay[] = [];
      for (const [agentId, member] of entries) {
        const override: AgentProfileOverride | null = await getAgentProfileOverride(agentId);
        const resolved = resolveAgentDisplay(agentId, member.name, member.avatar, override);
        const isOverridden =
          (override?.display_name && override.display_name !== member.name) ||
          !!override?.avatar_key ||
          !!override?.custom_avatar_path;

        // 加载自定义头像的 file:// URI
        let customAvatarUri: string | null = null;
        if (override?.custom_avatar_path) {
          customAvatarUri = await readCustomAvatarFileUri(override.custom_avatar_path);
        }

        results.push({
          agentId,
          displayName: resolved.displayName,
          role: member.role,
          emojiFallback: member.avatar,
          avatarKey: resolved.activeAvatarKey,
          customAvatarUri,
          isCustomAvatar: resolved.isCustomAvatar,
          isOverridden,
        });
      }
      setMembers(results);
    } finally {
      setLoading(false);
    }
  }, [groupConfig]);

  useEffect(() => {
    if (!open || !groupConfig) return;
    loadMembers();
    const unsubscribe = onProfileChanged(() => loadMembers());
    return () => unsubscribe();
  }, [open, groupConfig, loadMembers]);

  if (!groupConfig) return null;

  const renderItem = ({ item }: { item: MemberDisplay }) => (
    <TouchableOpacity
      style={styles.memberRow}
      onPress={() => {
        onClose();
        onMemberClick(item.agentId);
      }}
      activeOpacity={0.7}
      accessibilityLabel={`查看 ${item.displayName} 介绍`}
    >
      {/* 头像 */}
      <View style={styles.avatarBox}>
        {item.isCustomAvatar && item.customAvatarUri ? (
          <Image source={{ uri: item.customAvatarUri }} style={styles.avatarImage} />
        ) : item.avatarKey ? (
          <TeamAvatar presetKey={item.avatarKey} size={44} />
        ) : (
          <View style={[styles.fallbackAvatar, { backgroundColor: groupConfig.color || '#6366f1' }]}>
            <Text style={styles.fallbackEmoji}>{item.emojiFallback}</Text>
          </View>
        )}
      </View>

      {/* 中间：名字 + role */}
      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {item.displayName}
          </Text>
          {item.isOverridden && (
            <Chip
              mode="outlined"
              style={styles.overriddenChip}
              textStyle={styles.overriddenChipText}
              compact
            >
              自定义
            </Chip>
          )}
        </View>
        <Text style={styles.roleText} numberOfLines={1}>
          {item.role}
        </Text>
      </View>

      {/* 右侧：chevron */}
      <MaterialCommunityIcons
        name="chevron-right"
        size={22}
        color={theme.colors.onSurfaceVariant}
      />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.overlay, open ? styles.visible : styles.hidden]} pointerEvents={open ? 'auto' : 'none'}>
      <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
      <Surface style={styles.sheet} elevation={5}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTitle}>
            <MaterialCommunityIcons
              name="account-group"
              size={22}
              color={groupConfig.color || '#ff6d00'}
            />
            <View style={styles.headerTextBox}>
              <Text style={styles.groupName} numberOfLines={1}>
                {groupConfig.name}
              </Text>
              <Text style={styles.memberCount}>
                {members.length} 位成员 · 点击查看介绍
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
            <MaterialCommunityIcons name="close" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" />
          </View>
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.agentId}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            contentContainerStyle={styles.listContent}
          />
        )}
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  visible: {
    display: 'flex',
  },
  hidden: {
    display: 'none',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#1f1b3a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 280,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  headerTextBox: {
    flex: 1,
  },
  groupName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  memberCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  fallbackAvatar: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 22,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  overriddenChip: {
    height: 18,
    backgroundColor: 'rgba(251,191,36,0.15)',
    borderColor: '#fbbf24',
  },
  overriddenChipText: {
    fontSize: 10,
    color: '#fbbf24',
    lineHeight: 12,
    marginVertical: 0,
  },
  roleText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 78,
  },
});

export default TeamMembersDialog;