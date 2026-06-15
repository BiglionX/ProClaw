/**
 * 插件 Manifest 注册表（ProClaw 1.0.0）
 * ------------------------------------------------------------------
 * 管理所有已内置的插件 manifest（与 `public/plugins/<id>/manifest.json` 镜像）。
 * - 内置插件：把 manifest JSON 直接 import 注册；适用 demo / 官方预置场景。
 * - 从市场/商店下载的插件：通过 registerPluginManifest 动态注册。
 * 提供统一 listPluginManifests / getPluginManifest 接口，替代散落的 JSON 加载。
 */

import foreignCounterManifest from '../plugins/ma_foreign_counter/manifest.json';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  category: string;
  tags: string[];
  minProclawVersion?: string;
  author?: string;
  homepage?: string;
  permissions: string[];
  features?: {
    modules?: string[];
    dashboards?: string[];
    reports?: string[];
  };
  navigation?: {
    add?: Array<{ text: string; icon: string; path: string; group: string }>;
  };
  dataModels?: {
    tables?: string[];
    migrations?: string[];
  };
  ui?: {
    quickActions?: Array<{ label: string; icon: string; action: string; color?: string }>;
  };
  assets?: {
    path: string;
    files: string[];
  };
  /** 内置标记：true = 应用启动时自动注册，false = 需用户手动启用 */
  builtin?: boolean;
  /** 注册来源 */
  source?: 'builtin' | 'market' | 'local';
}

// =============== 内置插件清单 ===============

const BUILTIN_MANIFESTS: PluginManifest[] = [
  foreignCounterManifest as PluginManifest,
];

// =============== 动态注册表 ===============

const dynamicManifests: Map<string, PluginManifest> = new Map();

// =============== 公共 API ===============

/** 注册一个插件 manifest（id 已存在则覆盖） */
export function registerPluginManifest(manifest: PluginManifest): void {
  if (!manifest || !manifest.id) {
    console.warn('[manifestRegistry] 缺少 id 的 manifest，跳过注册');
    return;
  }
  dynamicManifests.set(manifest.id, { ...manifest, source: manifest.source || 'market' });
}

/** 注销插件 manifest */
export function unregisterPluginManifest(id: string): void {
  dynamicManifests.delete(id);
}

/** 列出所有已注册的插件 manifest（内置 + 动态） */
export function listPluginManifests(): PluginManifest[] {
  return [
    ...BUILTIN_MANIFESTS.map(m => ({ ...m, source: 'builtin' as const })),
    ...Array.from(dynamicManifests.values()),
  ];
}

/** 获取单个插件 manifest（内置或动态） */
export function getPluginManifest(id: string): PluginManifest | null {
  const dyn = dynamicManifests.get(id);
  if (dyn) return dyn;
  const builtin = BUILTIN_MANIFESTS.find(m => m.id === id);
  return builtin ? { ...builtin, source: 'builtin' } : null;
}

/** 是否已注册（含内置） */
export function hasPluginManifest(id: string): boolean {
  return !!getPluginManifest(id);
}

// =============== 便捷函数 ===============

/**
 * 注册「外贸柜台运营助手」插件。
 * 该函数由 demoBootstrap 调用；也可独立调用，幂等。
 */
export function registerForeignCounterPlugin(): PluginManifest {
  const existing = getPluginManifest('ma_foreign_counter');
  if (existing) return existing;
  const manifest: PluginManifest = {
    ...(foreignCounterManifest as PluginManifest),
    builtin: true,
    source: 'builtin',
  };
  registerPluginManifest(manifest);
  return manifest;
}

/** 根据插件 id 获取其声明的导航条目（用于 Sidebar 渲染） */
export function getPluginNavigationEntries(id: string): Array<{ text: string; icon: string; path: string; group: string }> {
  const manifest = getPluginManifest(id);
  if (!manifest?.navigation?.add) return [];
  return manifest.navigation.add;
}

/** 根据插件 id 获取其 quick actions */
export function getPluginQuickActions(id: string): Array<{ label: string; icon: string; action: string; color?: string }> {
  const manifest = getPluginManifest(id);
  if (!manifest?.ui?.quickActions) return [];
  return manifest.ui.quickActions;
}

// 注意:不要在模块加载时循环 register BUILTIN_MANIFESTS 到 dynamicManifests,
// 否则 listPluginManifests() 会同时返回 BUILTIN + dynamic 两份,
// 导致 AiPluginPanel "已使用" Tab 显示 2 个重复的 ma_foreign_counter。
// BUILTIN_MANIFESTS 本身在 listPluginManifests() 中作为 fallback 输出,
// dynamicManifests 只用于按需注册从服务器下载/导入的插件。
