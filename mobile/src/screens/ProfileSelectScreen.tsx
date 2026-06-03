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
import {
  listProfiles,
  createProfile,
  deleteProfile,
  getCurrentProfile,
  type Profile,
} from '../services/ProfileManager';
import { useAppStore, switchProfile } from '../stores/AppStore';

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
      console.error('[ProfileSelect] Failed to load profiles:', error);
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
    } catch (error: any) {
      Alert.alert('创建失败', error?.message || '无法创建身份');
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
            } catch (error: any) {
              Alert.alert('删除失败', error?.message || '无法删除身份');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  // 渲染单个身份项
  const renderProfileItem = ({ item }: { item: Profile }) => {
    const isActive = isSwitching || deletingId === item.id;

    return (
      <TouchableOpacity
        style={styles.profileItem}
        onPress={() => handleSelect(item)}
        onLongPress={() => handleDelete(item)}
        disabled={isActive}
        activeOpacity={0.7}
      >
        <Text style={styles.profileAvatar}>{item.avatar || '👤'}</Text>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{item.name}</Text>
          <Text style={styles.profileDate}>
            创建于 {new Date(item.createdAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>
        {isActive && (
          <ActivityIndicator size="small" color="#6366f1" />
        )}
        <Text style={styles.enterIcon}>→</Text>
      </TouchableOpacity>
    );
  };

  if (loading && profiles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>选择身份</Text>
        <Text style={styles.subtitle}>
          每个身份拥有独立的数据、插件和配置
        </Text>
      </View>

      {profiles.length === 0 && !showCreate ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📱</Text>
          <Text style={styles.emptyText}>还没有身份</Text>
          <Text style={styles.emptyHint}>创建一个身份开始使用 ProClaw</Text>
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
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="输入身份名称（如：个人店铺、公司A）"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            maxLength={30}
          />
          <View style={styles.createActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowCreate(false);
                setNewName('');
              }}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.createButton, !newName.trim() && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!newName.trim() || loading}
            >
              <Text style={styles.createButtonText}>创建</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreate(true)}
        >
          <Text style={styles.addButtonText}>+ 新建身份</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.hint}>
        长按身份名称可删除 | 点击进入
      </Text>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    fontSize: 32,
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  profileDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  enterIcon: {
    fontSize: 18,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  addButton: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#6366f1',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  createForm: {
    marginHorizontal: 24,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  createButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6366f1',
  },
  createButtonDisabled: {
    backgroundColor: '#b1b3f1',
  },
  createButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#ccc',
    paddingBottom: 20,
  },
});

export default ProfileSelectScreen;
