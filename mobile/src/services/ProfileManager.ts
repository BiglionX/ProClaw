/**
 * ProfileManager - 全局身份管理器
 * 管理多个身份（Profile）的元数据，每个身份拥有独立的SQLite数据库和插件集。
 * 元数据存储在 AsyncStorage 中，独立于任何身份数据库。
 *
 * 对应 PRD v11.0 第6节：多身份数据隔离
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PROFILES_KEY = '@proclaw_profiles';
const CURRENT_PROFILE_KEY = '@proclaw_current_profile';

export interface Profile {
  id: string;
  name: string;
  avatar: string;
  createdAt: number;   // 创建时间戳
  lastUsed: number;    // 最后使用时间戳
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return 'profile_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
};

/**
 * 加载所有身份列表
 */
export const listProfiles = async (): Promise<Profile[]> => {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.warn('[ProfileManager] Failed to load profiles:', error);
    return [];
  }
};

/**
 * 保存身份列表
 */
const saveProfiles = async (profiles: Profile[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch (error) {
    console.error('[ProfileManager] Failed to save profiles:', error);
    throw error;
  }
};

/**
 * 创建新身份
 * @param name 身份名称
 * @param avatar 头像标识（emoji或图片路径）
 * @returns 新创建的身份
 */
export const createProfile = async (name: string, avatar: string = ''): Promise<Profile> => {
  const profiles = await listProfiles();

  const newProfile: Profile = {
    id: generateId(),
    name,
    avatar: avatar || getDefaultAvatar(profiles.length),
    createdAt: Date.now(),
    lastUsed: Date.now(),
  };

  profiles.push(newProfile);
  await saveProfiles(profiles);
  console.log('[ProfileManager] Created profile:', newProfile.id, newProfile.name);
  return newProfile;
};

/**
 * 获取默认头像（基于序号循环）
 */
const getDefaultAvatar = (index: number): string => {
  const avatars = ['👤', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍🌾', '👩‍🌾', '👨‍🍳', '👩‍🍳'];
  return avatars[index % avatars.length];
};

/**
 * 更新身份信息
 */
export const updateProfile = async (id: string, updates: Partial<Pick<Profile, 'name' | 'avatar'>>): Promise<Profile | null> => {
  const profiles = await listProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return null;

  profiles[index] = { ...profiles[index], ...updates };
  await saveProfiles(profiles);
  return profiles[index];
};

/**
 * 清理身份对应的数据库文件和插件目录
 * @param profileId 身份ID
 */
export const cleanupProfileFiles = async (profileId: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      // Web 平台: 删除 IndexedDB 数据库
      const dbName = `proclaw_profiles_${profileId.replace(/[\/.]/g, '_')}_data_db`;
      try {
        indexedDB.deleteDatabase(dbName);
        console.log('[ProfileManager] Deleted IndexedDB:', dbName);
      } catch (e) {
        console.warn('[ProfileManager] Failed to delete IndexedDB:', e);
      }
    } else {
      // 原生平台: 使用 expo-file-system 删除目录
      try {
        const FileSystem = await import('expo-file-system');
        const profileDir = `${FileSystem.documentDirectory}profiles/${profileId}`;
        const dirInfo = await FileSystem.getInfoAsync(profileDir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(profileDir, { idempotent: true });
          console.log('[ProfileManager] Deleted profile directory:', profileDir);
        }
      } catch (e) {
        console.warn('[ProfileManager] Failed to delete profile directory:', e);
      }
    }
  } catch (error) {
    console.warn('[ProfileManager] Failed to cleanup profile files:', error);
  }
};

/**
 * 删除身份（同时清理对应的数据库文件和插件目录）
 */
export const deleteProfile = async (id: string): Promise<boolean> => {
  const profiles = await listProfiles();
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return false;

  profiles.splice(index, 1);
  await saveProfiles(profiles);

  // 如果删除的是当前身份，清除 currentProfile
  const current = await getCurrentProfile();
  if (current?.id === id) {
    await AsyncStorage.removeItem(CURRENT_PROFILE_KEY);
  }

  // 清理数据库文件和插件目录
  await cleanupProfileFiles(id);

  console.log('[ProfileManager] Deleted profile:', id);
  return true;
};

/**
 * 切换当前身份
 * 注意：此函数仅更新元数据，实际数据库切换由调用方处理
 */
export const setCurrentProfile = async (id: string): Promise<void> => {
  const profiles = await listProfiles();
  const profile = profiles.find(p => p.id === id);
  if (!profile) {
    throw new Error(`Profile not found: ${id}`);
  }

  // 更新 lastUsed
  profile.lastUsed = Date.now();
  await saveProfiles(profiles);

  // 保存当前身份ID
  await AsyncStorage.setItem(CURRENT_PROFILE_KEY, id);
  console.log('[ProfileManager] Set current profile:', id);
};

/**
 * 获取当前身份
 */
export const getCurrentProfile = async (): Promise<Profile | null> => {
  try {
    const id = await AsyncStorage.getItem(CURRENT_PROFILE_KEY);
    if (!id) return null;
    const profiles = await listProfiles();
    return profiles.find(p => p.id === id) || null;
  } catch {
    return null;
  }
};

/**
 * 获取身份数据库文件路径
 * @param profileId 身份ID
 * @returns 相对于 appData 的路径
 */
export const getProfileDbPath = (profileId: string): string => {
  return `profiles/${profileId}/data.db`;
};

/**
 * 获取身份插件目录路径
 * @param profileId 身份ID
 * @returns 相对于 appData 的路径
 */
export const getProfilePluginPath = (profileId: string): string => {
  return `profiles/${profileId}/plugins`;
};

export default {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  setCurrentProfile,
  getCurrentProfile,
  getProfileDbPath,
  getProfilePluginPath,
};
