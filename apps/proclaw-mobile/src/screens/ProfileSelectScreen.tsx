/**
 * ProfileSelectScreen - 身份选择/管理页面
 * 列出所有身份，支持创建、删除和切换。
 *
 * 对应 PRD v11.0 第6.2节
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  listProfiles,
  createProfile,
  deleteProfile,
  getCurrentProfile,
  type Profile,
} from '../services/ProfileManager';
import { useAppStore, switchProfile } from '../stores/AppStore';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

const ProfileSelectScreen: React.FC = () => {
  const [profiles, setProfilesLocal] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSwitching = useAppStore((s) => s.isSwitchingProfile);

  // 加载身份列表
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const items = await listProfiles();
      setProfilesLocal(items);
      useAppStore.getState().setProfiles(items);
    } catch (error) {
      logger.error('[ProfileSelect] Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // 创建新身份
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      Alert.alert('提示', '请输入身份名称');
      return;
    }

    try {
      setLoading(true);
      const profile = await createProfile(name);
      setNewName('');
      setShowCreate(false);
      await loadProfiles();
      // 自动切换到新创建的身份
      await switchProfile(profile);
    } catch (error) {
      Alert.alert('创建失败', getErrorMessage(error, '无法创建身份'));
    } finally {
      setLoading(false);
    }
  };

  // 选择身份
  const handleSelect = async (profile: Profile) => {
    await switchProfile(profile);
  };

  // 删除身份
  const handleDelete = (profile: Profile) => {
    Alert.alert(
      '确认删除',
      `删除身份 "${profile.name}" 将同时清除其所有本地数据，此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingId(profile.id);
              await deleteProfile(profile.id);
              await loadProfiles();
            } catch (error) {
              Alert.alert('删除失败', getErrorMessage(error, '无法删除身份'));
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // 格式化时间
  const formatDate = (timestamp: number): string => {
    if (!timestamp) return '从未使用';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(timestamp).toLocaleDateString('zh-CN');
  };

  // 渲染单个身份项
  const renderProfileItem = ({ item }: { item: Profile }) => {
    const isActive = isSwitching || deletingId === item.id;

    return (
      <TouchableOpacity
        style={styles.glassProfileItem}
        onPress={() => handleSelect(item)}
        onLongPress={() => handleDelete(item)}
        disabled={isActive}
        activeOpacity={0.7}
      >
        <View style={styles.glassAvatarWrap}>
          <Text style={styles.profileAvatar}>{item.avatar || '\uD83D\uDC64'}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.name}</Text>
          <View style={styles.profileMeta}>
            <Text style={styles.profileDate}>
              {formatDate(item.lastUsed)}
            </Text>
            {item.lastUsed !== item.createdAt && (
              <Text style={styles.profileDate}> | 创建 {new Date(item.createdAt).toLocaleDateString('zh-CN')}</Text>
            )}</View>
        </View>
        {isActive && (
          <ActivityIndicator size="small" color="#00d2ff" />
        )}
        <MaterialCommunityIcons name="chevron-right" size={22} color="rgba(255,255,255,0.3)" />
      </TouchableOpacity>
    );
  };

  if (loading && profiles.length === 0) {
    return (
      <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={{ flex: 1 }}>
        <SafeAreaView style={styles.container}>
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#00d2ff" />
            <Text style={styles.loadingText}>加载中...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={{ flex: 1 }}>
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>选择身份</Text>
        <Text style={styles.subtitle}>
          每个身份拥有独立的数据、插件和配置
        </Text>
      </View>

      {profiles.length === 0 && !showCreate ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="cellphone" size={64} color="rgba(0,210,255,0.4)" />
          <Text style={styles.emptyText}>欢迎使用 ProClaw</Text>
          <Text style={styles.emptyHint}>创建一个身份开始管理您的业务</Text>
          <Text style={styles.emptyGuide}>每个身份拥有独立的数据和插件，</Text>
          <Text style={styles.emptyGuide}>可服务于不同的公司或角色</Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfileItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {showCreate ? (
        <View style={styles.glassCreateForm}>
          <TextInput
            style={styles.glassInput}
            placeholder="输入身份名称（如：个人店铺、公司A）"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={30}
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.glassCancelButton}
              onPress={() => {
                setShowCreate(false);
                setNewName('');
              }}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.glassCreateButton, !newName.trim() && styles.glassCreateButtonDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim() || loading}
            >
              <Text style={styles.createButtonText}>创建</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.glassAddButton}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="plus" size={20} color="#fff" style={{marginRight:8}} />
          <Text style={styles.addButtonText}>新建身份</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.hint}>
        长按身份名称可删除 | 点击进入
      </Text>
    </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.95)',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  glassProfileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  glassAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,210,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,210,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatar: {
    fontSize: 24,
  },
  profileInfo: {
    flex: 1,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  profileDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyGuide: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.25)',
    marginTop: 2,
    textAlign: 'center',
  },
  glassAddButton: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: 'rgba(0,210,255,0.2)',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.35)',
    shadowColor: '#00d2ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  glassCreateForm: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  glassCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  glassCreateButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(0,210,255,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(0,210,255,0.4)',
  },
  glassCreateButtonDisabled: {
    backgroundColor: 'rgba(0,210,255,0.1)',
    borderColor: 'rgba(0,210,255,0.2)',
    },
  createButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255,255,255,0.25)',
    paddingBottom: 20,
  },
});

export default ProfileSelectScreen;
