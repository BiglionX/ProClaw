/**
 * PluginRegistry - 插件元数据注册表
 * 管理已安装插件的注册信息和生命周期。
 *
 * 对应 PRD v11.0 第5.1节
 */

import type { IDatabase } from './DatabaseFactory';

// 动态路由注册表（内存中，供 App.tsx 动态读取）
interface DynamicRoute {
  pluginId: string;
  path: string;
  title: string;
  /** 保留给动态加载的组件引用 */
  componentName: string;
}

let dynamicRoutes: DynamicRoute[] = [];

/** 路由变化回调函数类型 */
type RoutesChangeCallback = (routes: DynamicRoute[]) => void;

/** 路由变化监听器集合 */
const routesChangeListeners: Set<RoutesChangeCallback> = new Set();

/**
 * 注册路由变化监听
 * @param callback 回调函数，路由变化时被调用
 * @returns 取消监听的函数
 */
export const onRoutesChanged = (callback: RoutesChangeCallback): (() => void) => {
  routesChangeListeners.add(callback);
  return () => {
    routesChangeListeners.delete(callback);
  };
};

/**
 * 通知所有监听器路由已变化
 */
const notifyRoutesChanged = (): void => {
  const routes = getDynamicRoutes();
  routesChangeListeners.forEach(cb => {
    try {
      cb(routes);
    } catch (e) {
      console.warn('[PluginRegistry] Route change listener error:', e);
    }
  });
};

/**
 * 获取当前所有已注册的动态路由
 */
export const getDynamicRoutes = (): DynamicRoute[] => {
  return [...dynamicRoutes];
};

/**
 * 注册插件路由（安装时调用）
 * @param pluginId 插件ID
 * @param routes 路由配置数组
 */
export const registerPluginRoutes = (pluginId: string, routes: { path: string; title: string; component: string }[]): void => {
  // 先移除该插件的旧路由
  dynamicRoutes = dynamicRoutes.filter(r => r.pluginId !== pluginId);

  // 添加新路由
  for (const route of routes) {
    dynamicRoutes.push({
      pluginId,
      path: route.path,
      title: route.title,
      componentName: route.component,
    });
  }
  console.log(`[PluginRegistry] Registered ${routes.length} routes for plugin: ${pluginId}`);
  notifyRoutesChanged();
};

/**
 * 卸载插件路由（卸载时调用）
 * @param pluginId 插件ID
 */
export const unregisterPluginRoutes = (pluginId: string): void => {
  const removedCount = dynamicRoutes.filter(r => r.pluginId === pluginId).length;
  dynamicRoutes = dynamicRoutes.filter(r => r.pluginId !== pluginId);
  console.log(`[PluginRegistry] Unregistered ${removedCount} routes for plugin: ${pluginId}`);
  notifyRoutesChanged();
};

/** 插件状态 */
export type PluginStatus = 'installed' | 'updating' | 'uninstalled';

/** 插件清单 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  icon: string;
  permissions: string[];
  minAppVersion: string;
  dependencies?: string[];
  recommendedAgents?: string[];   // 推荐的 AI Team（PRD 5.4）
  upSql: string;                   // 数据库迁移脚本
  downSql: string;                 // 回滚脚本
  entryPoint: string;              // 前端入口文件
  routes?: { path: string; component: string; title: string }[];
}

/** 已安装插件 */
export interface InstalledPlugin {
  id: string;
  name: string;
  version: string;
  status: PluginStatus;
  manifestJson: string;
  installedAt: number;
  updatedAt: number | null;
}

/**
 * 获取所有已安装插件
 */
export const getInstalledPlugins = async (db: IDatabase): Promise<InstalledPlugin[]> => {
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM plugin_registry WHERE status != 'uninstalled' ORDER BY installed_at DESC`
    );
    return rows as InstalledPlugin[];
  } catch (error) {
    console.warn('[PluginRegistry] Failed to get plugins:', error);
    return [];
  }
};

/**
 * 获取指定插件信息
 */
export const getPlugin = async (
  db: IDatabase,
  pluginId: string
): Promise<InstalledPlugin | null> => {
  try {
    const row = await db.getFirstAsync(
      `SELECT * FROM plugin_registry WHERE id = ?`,
      [pluginId]
    );
    return (row as InstalledPlugin) || null;
  } catch {
    return null;
  }
};

/**
 * 注册已安装的插件
 */
export const registerPlugin = async (
  db: IDatabase,
  manifest: PluginManifest
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `INSERT OR REPLACE INTO plugin_registry (id, name, version, status, manifest_json, installed_at, updated_at)
     VALUES (?, ?, ?, 'installed', ?, ?, ?)`,
    [manifest.id, manifest.name, manifest.version, JSON.stringify(manifest), now, now]
  );
  console.log(`[PluginRegistry] Registered plugin: ${manifest.name} v${manifest.version}`);
};

/**
 * 标记插件为更新中
 */
export const markPluginUpdating = async (
  db: IDatabase,
  pluginId: string
): Promise<void> => {
  await db.runAsync(
    `UPDATE plugin_registry SET status = 'updating' WHERE id = ?`,
    [pluginId]
  );
};

/**
 * 更新插件版本
 */
export const updatePluginVersion = async (
  db: IDatabase,
  pluginId: string,
  newVersion: string,
  newManifest: string
): Promise<void> => {
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `UPDATE plugin_registry SET version = ?, manifest_json = ?, updated_at = ?, status = 'installed' WHERE id = ?`,
    [newVersion, newManifest, now, pluginId]
  );
};

/**
 * 标记插件为已卸载
 */
export const unregisterPlugin = async (
  db: IDatabase,
  pluginId: string
): Promise<void> => {
  await db.runAsync(
    `UPDATE plugin_registry SET status = 'uninstalled' WHERE id = ?`,
    [pluginId]
  );
  console.log(`[PluginRegistry] Unregistered plugin: ${pluginId}`);
};

/**
 * 解析插件清单 JSON
 */
export const parseManifest = (manifestJson: string): PluginManifest | null => {
  try {
    return JSON.parse(manifestJson) as PluginManifest;
  } catch {
    return null;
  }
};

/**
 * 检查插件是否已安装
 */
export const isPluginInstalled = async (
  db: IDatabase,
  pluginId: string
): Promise<boolean> => {
  const plugin = await getPlugin(db, pluginId);
  return plugin !== null && plugin.status === 'installed';
};

/**
 * 检查版本是否可更新
 */
export const isUpdateAvailable = (
  current: string,
  latest: string
): boolean => {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const cur = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    if (lat > cur) return true;
    if (lat < cur) return false;
  }
  return false;
};

export default {
  getInstalledPlugins,
  getPlugin,
  registerPlugin,
  markPluginUpdating,
  updatePluginVersion,
  unregisterPlugin,
  parseManifest,
  isPluginInstalled,
  isUpdateAvailable,
  getDynamicRoutes,
  registerPluginRoutes,
  unregisterPluginRoutes,
};
