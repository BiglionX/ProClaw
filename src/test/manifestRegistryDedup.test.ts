/**
 * manifestRegistry 去重测试
 *
 * 根因回归测试: 之前 manifestRegistry.ts 在 module load 时有
 *   for (const m of BUILTIN_MANIFESTS) { registerPluginManifest({ ...m, builtin: true }); }
 * 这会导致 listPluginManifests() 同时返回 BUILTIN + dynamic 两份 ma_foreign_counter,
 * 触发 AiPluginPanel "已使用" Tab 显示 2 个一样的"外贸柜台运营助手"。
 *
 * 修复:删除模块加载时的循环(BUILTIN_MANIFESTS 本身在 listPluginManifests() 中作为 fallback 输出)。
 */

import { describe, it, expect } from 'vitest';
import {
  listPluginManifests,
  getPluginManifest,
  registerPluginManifest,
  unregisterPluginManifest,
} from '../lib/manifestRegistry';

describe('manifestRegistry - 唯一性回归测试', () => {
  it('listPluginManifests 对每个内置 plugin_id 应只返回 1 个对象(BUILTIN 不应双注册到 dynamic)', () => {
    const manifests = listPluginManifests();
    // 收集所有 plugin_id,验证去重后数量 == 原始数量
    const ids = manifests.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
    // 至少要有 1 个 ma_foreign_counter
    expect(uniqueIds.has('ma_foreign_counter')).toBe(true);
    expect(ids.filter((id) => id === 'ma_foreign_counter').length).toBe(1);
  });

  it('registerPluginManifest 重复注册同一 id 不应产生 2 个对象', () => {
    const before = listPluginManifests().length;
    registerPluginManifest({
      id: 'test_dedup_plugin',
      name: '测试去重插件',
      version: '1.0.0',
    } as any);
    const afterAdd = listPluginManifests();
    expect(afterAdd.filter((m) => m.id === 'test_dedup_plugin').length).toBe(1);

    // 再次注册同一 id（应覆盖而非追加）
    registerPluginManifest({
      id: 'test_dedup_plugin',
      name: '测试去重插件 v2',
      version: '1.1.0',
    } as any);
    const afterReAdd = listPluginManifests();
    const matches = afterReAdd.filter((m) => m.id === 'test_dedup_plugin');
    expect(matches.length).toBe(1);
    expect(matches[0].name).toBe('测试去重插件 v2');  // 被覆盖

    // 清理
    unregisterPluginManifest('test_dedup_plugin');
    const afterRemove = listPluginManifests();
    expect(afterRemove.length).toBe(before);
  });

  it('getPluginManifest 在 builtin 路径下应能找到 ma_foreign_counter', () => {
    const m = getPluginManifest('ma_foreign_counter');
    expect(m).not.toBeNull();
    expect(m?.id).toBe('ma_foreign_counter');
  });
});
