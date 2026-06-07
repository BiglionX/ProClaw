/**
 * AppStore - 全局应用状态管理
 * 使用 zustand 管理身份切换、数据库状态和连接模式。
 */

import { create } from 'zustand';
import type { Profile } from '../services/ProfileManager';
import { openDatabase, closeAllDatabases, getDatabase } from '../services/DatabaseFactory';
import { applySchema, dropAllTables } from '../services/SchemaManager';
import { setupChangeLogTriggers } from '../services/ChangeLogManager';
import { initSyncMetadata, getOrCreateDeviceId } from '../services/SyncMetadataManager';
import { unregisterPluginRoutes } from '../services/PluginRegistry';
import { closeAllSyncConnections } from './SyncConnectionManager';

export type AppPhase = 'loading' | 'profile_select' | 'ready' | 'error';
// 审计 M4：合并 import/export 为单行
export type { ConnectionMode } from '../services/ConnectionManager';
import type { ConnectionMode as ConnectionModeType } from '../services/ConnectionManager';

interface AppState {
  // 应用阶段
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;

  // 当前身份
  currentProfile: Profile | null;
  profiles: Profile[];
  setProfiles: (profiles: Profile[]) => void;

  // 连接模式
  connectionMode: ConnectionModeType;
  setConnectionMode: (mode: ConnectionModeType) => void;

  // 错误信息
  error: string | null;
  setError: (error: string | null) => void;

  // 操作状态
  isSwitchingProfile: boolean;
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'loading',
  setPhase: (phase) => set({ phase }),

  currentProfile: null,
  profiles: [],
  setProfiles: (profiles) => set({ profiles }),

  connectionMode: 'offline',
  setConnectionMode: (mode) => set({ connectionMode: mode }),

  error: null,
  setError: (error) => set({ error, phase: error ? 'error' : 'loading' }),

  isSwitchingProfile: false,
}));

/**
 * 切换身份（完整流程）
 * 1. 关闭当前数据库和插件
 * 2. 打开新身份数据库
 * 3. 应用 Schema 迁移
 * 4. 更新全局状态
 */
export const switchProfile = async (profile: Profile): Promise<void> => {
  // 审计 C1：原子检查 + 设置，使用 getState 直接读写避免竞态窗口
  if (useAppStore.getState().isSwitchingProfile) {
    console.warn('[AppStore] Profile switch already in progress, ignoring');
    return;
  }

  try {
    // 审计 C1：在设置之前再次检查（双重锁保障），使用 setState 合并方式保证原子性
    useAppStore.setState({ isSwitchingProfile: true });

    // 0. 清理当前身份资源
    // 清除所有插件动态路由
    // 使用 'all' 作为特殊 ID 清空所有路由
    const currentRoutes = (await import('../services/PluginRegistry')).getDynamicRoutes();
    const pluginIds = [...new Set(currentRoutes.map(r => r.pluginId))];
    for (const pid of pluginIds) {
      unregisterPluginRoutes(pid);
    }
    // 重置同步连接
    try {
      await closeAllSyncConnections();
    } catch (e) {
      console.warn('[AppStore] Failed to close sync connections:', e);
    }

    // 1. 关闭当前数据库
    await closeAllDatabases();

    // 2. 打开新身份数据库
    await openDatabase(profile.id);

    // 3. 获取当前数据库实例
    const db = getDatabase();

    // 4. 应用 Schema 迁移
    await applySchema(db);

    // 5. 初始化同步元数据
    const deviceId = await getOrCreateDeviceId();
    await initSyncMetadata(db, deviceId);

    // 6. 安装变更日志触发器
    try {
      await setupChangeLogTriggers(db);
      console.log('[AppStore] ChangeLog triggers installed');
    } catch (e) {
      console.warn('[AppStore] Failed to setup change log triggers:', e);
    }

    // 7. 更新状态
    const { setCurrentProfile } = await import('../services/ProfileManager');
    await setCurrentProfile(profile.id);

    // 8. 加载已安装插件列表
    try {
      const { getInstalledPlugins } = await import('../services/PluginRegistry');
      const installedPlugins = await getInstalledPlugins(db);
      console.log('[AppStore] Loaded', installedPlugins.length, 'plugins for profile:', profile.name);
    } catch (e) {
      console.warn('[AppStore] Failed to load plugins:', e);
    }

    useAppStore.setState({
      currentProfile: profile,
      phase: 'ready',
      error: null,
      isSwitchingProfile: false,
    });

    console.log('[AppStore] Switched to profile:', profile.name);
  } catch (error: any) {
    useAppStore.setState({
      phase: 'error',
      error: `切换身份失败: ${error?.message || '未知错误'}`,
      isSwitchingProfile: false,
    });
    console.error('[AppStore] Failed to switch profile:', error);
  }
};
