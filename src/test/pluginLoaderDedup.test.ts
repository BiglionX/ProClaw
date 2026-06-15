/**
 * pluginLoader.getInstalledPlugins 去重测试
 *
 * 目标：保证 "已使用" Tab 在任何场景下都只展示 1 个唯一 plugin_id 的卡片，
 * 避免出现 2 个重复的"外贸柜台运营助手"问题。
 *
 * 关键场景：
 * - Tauri + 后端有 1 个 ma_foreign_counter → 1 个
 * - Tauri + 后端空 → 1 个 builtin fallback
 * - Tauri + 后端抛错 → 1 个 builtin fallback
 * - 浏览器 dev 模式 → 1 个 builtin fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// mock tauri 模块
const mockIsTauri = vi.fn();
const mockSafeInvoke = vi.fn();
vi.mock('../lib/tauri', () => ({
  isTauri: () => mockIsTauri(),
  safeInvoke: (...args: any[]) => mockSafeInvoke(...args),
}));

// mock manifestRegistry
vi.mock('../lib/manifestRegistry', () => {
  const fakeManifest = {
    id: 'ma_foreign_counter',
    name: '外贸柜台运营助手',
    version: '1.0.0',
    description: '外贸测试',
    permissions: [],
    commands: [],
    source: 'builtin',
  };
  return {
    listPluginManifests: () => [fakeManifest],
    getPluginManifest: (id: string) =>
      id === 'ma_foreign_counter' ? fakeManifest : null,
    registerPluginManifest: () => {},
    registerForeignCounterPlugin: () => fakeManifest,
    BUILTIN_PLUGIN_IDS: ['ma_foreign_counter'],
  };
});

import { pluginLoader } from '../lib/pluginLoader';

const sampleBackendPlugin = {
  plugin_id: 'ma_foreign_counter',
  name: '外贸柜台运营助手',
  version: '1.0.0',
  install_path: 'C:\\Users\\Admin\\AppData\\Roaming\\ProClaw\\plugins\\ma_foreign_counter',
  manifest: {
    id: 'ma_foreign_counter',
    name: '外贸柜台运营助手',
    version: '1.0.0',
  },
  enabled: true,
};

describe('pluginLoader.getInstalledPlugins - 唯一性保证', () => {
  beforeEach(() => {
    mockIsTauri.mockReset();
    mockSafeInvoke.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Tauri + 后端返回 1 个真实插件 → UI 应只展示 1 张卡片', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSafeInvoke.mockResolvedValue([sampleBackendPlugin]);

    const result = await pluginLoader.getInstalledPlugins();
    expect(result).toHaveLength(1);
    expect(result[0].plugin_id).toBe('ma_foreign_counter');
  });

  it('Tauri + 后端返回空数组 → 兜底到内置 manifest → 1 个', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSafeInvoke.mockResolvedValue([]);

    const result = await pluginLoader.getInstalledPlugins();
    expect(result).toHaveLength(1);
    expect(result[0].plugin_id).toBe('ma_foreign_counter');
  });

  it('Tauri + 后端抛错 → 兜底到内置 manifest → 1 个', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSafeInvoke.mockRejectedValue(new Error('IPC disconnected'));

    const result = await pluginLoader.getInstalledPlugins();
    expect(result).toHaveLength(1);
    expect(result[0].plugin_id).toBe('ma_foreign_counter');
  });

  it('浏览器 dev 模式 → 直接返回内置 manifest → 1 个', async () => {
    mockIsTauri.mockReturnValue(false);
    // 浏览器模式下不应该调 safeInvoke
    mockSafeInvoke.mockResolvedValue([sampleBackendPlugin]);

    const result = await pluginLoader.getInstalledPlugins();
    expect(result).toHaveLength(1);
    expect(result[0].plugin_id).toBe('ma_foreign_counter');
    // 关键:浏览器模式不应触达后端
    expect(mockSafeInvoke).not.toHaveBeenCalled();
  });

  it('Tauri + 后端有真实数据时绝不能 merge 内置(避免重复)', async () => {
    // 关键回归测试:之前版本"merge builtin"逻辑会强制加 1 个内置,
    // 当后端已经有 1 个时 → 数组变成 2 个 → UI 显示 2 张相同的"外贸柜台运营助手"
    mockIsTauri.mockReturnValue(true);
    mockSafeInvoke.mockResolvedValue([sampleBackendPlugin]);

    const result = await pluginLoader.getInstalledPlugins();
    const uniqueIds = new Set(result.map((p) => p.plugin_id));
    expect(uniqueIds.size).toBe(result.length);  // 无重复
    expect(uniqueIds.size).toBe(1);
  });

  it('Tauri + 后端返回 null → 兜底到内置 manifest → 1 个', async () => {
    mockIsTauri.mockReturnValue(true);
    mockSafeInvoke.mockResolvedValue(null);

    const result = await pluginLoader.getInstalledPlugins();
    expect(result).toHaveLength(1);
    expect(result[0].plugin_id).toBe('ma_foreign_counter');
  });
});
