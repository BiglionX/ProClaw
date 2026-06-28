/// <reference types="jest" />

/**
 * ProfileManager 单元测试
 */

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  getCurrentProfile,
  setCurrentProfile,
  getProfileDbPath,
  getProfilePluginPath,
} from '../ProfileManager';

describe('ProfileManager', () => {
  beforeEach(() => {
    // 清空 mock 存储
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  });

  describe('listProfiles', () => {
    it('should return empty array when no profiles exist', async () => {
      const profiles = await listProfiles();
      expect(profiles).toEqual([]);
    });

    it('should return saved profiles', async () => {
      await createProfile('测试身份');
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe('测试身份');
    });
  });

  describe('createProfile', () => {
    it('should create a new profile with correct fields', async () => {
      const profile = await createProfile('我的店铺');
      expect(profile.name).toBe('我的店铺');
      expect(profile.id).toBeTruthy();
      expect(profile.avatar).toBeTruthy();
      expect(profile.createdAt).toBeGreaterThan(0);
      expect(profile.lastUsed).toBeGreaterThan(0);
    });

    it('should increment profile count', async () => {
      await createProfile('身份A');
      await createProfile('身份B');
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(2);
    });
  });

  describe('updateProfile', () => {
    it('should update profile name', async () => {
      const profile = await createProfile('旧名称');
      await updateProfile(profile.id, { name: '新名称' });
      const updated = await getCurrentProfile();
      // getCurrentProfile 需要先 setCurrentProfile
      await setCurrentProfile(profile.id);
      const profiles = await listProfiles();
      const found = profiles.find(p => p.id === profile.id);
      expect(found?.name).toBe('新名称');
    });

    it('should return null for non-existent profile', async () => {
      const result = await updateProfile('nonexistent', { name: '测试' });
      expect(result).toBeNull();
    });
  });

  describe('deleteProfile', () => {
    it('should delete an existing profile', async () => {
      const profile = await createProfile('待删除');
      const deleted = await deleteProfile(profile.id);
      expect(deleted).toBe(true);
      const profiles = await listProfiles();
      expect(profiles).toHaveLength(0);
    });

    it('should return false for non-existent profile', async () => {
      const result = await deleteProfile('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('setCurrentProfile / getCurrentProfile', () => {
    it('should set and get current profile', async () => {
      const profile = await createProfile('当前身份');
      await setCurrentProfile(profile.id);
      const current = await getCurrentProfile();
      expect(current?.id).toBe(profile.id);
      expect(current?.name).toBe('当前身份');
    });

    it('should return null when no profile is set', async () => {
      const current = await getCurrentProfile();
      expect(current).toBeNull();
    });
  });

  describe('getProfileDbPath', () => {
    it('should return correct database path format', () => {
      const path = getProfileDbPath('profile_test123');
      expect(path).toBe('profiles/profile_test123/data.db');
    });
  });

  describe('getProfilePluginPath', () => {
    it('should return correct plugin path format', () => {
      const path = getProfilePluginPath('profile_test123');
      expect(path).toBe('profiles/profile_test123/plugins');
    });
  });
});
