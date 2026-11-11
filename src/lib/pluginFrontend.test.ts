/**
 * pluginFrontend unit tests.
 *
 * Verifies:
 * - openVirtualCompanyPage: dispatches the right window event
 * - installPluginRuntimeHooks: can be called repeatedly without throwing
 * - loadBuiltinPluginFrontends: returns the correct structure
 *
 * NOTE: This test must mock the plugins frontend module
 * (otherwise vitest's transform phase will execute the plugin IIFE
 * and fail because React is not defined globally).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 在导入 pluginFrontend 之前 mock 掉 import.meta.glob 的解析结果
vi.mock('../plugins/virtual-company/frontend/index.js', () => ({ default: {} }));

import {
  EVT_OPEN_VIRTUAL_COMPANY_WIZARD,
  EVT_OPEN_VIRTUAL_COMPANY_IMPORT,
  EVT_OPEN_VIRTUAL_COMPANY_COMPANIES,
  openVirtualCompanyPage,
  loadBuiltinPluginFrontends,
  installPluginRuntimeHooks,
} from './pluginFrontend';

describe('openVirtualCompanyPage 跳转事件', () => {
  beforeEach(() => {
    // vitest 默认在 happy-dom/jsdom 中不提供 removeAllListeners；这里用 removeEventListener
    // 测试本身只用单一监听器并显式 removeEventListener，无需额外清理
  });

  it('默认 target=wizard 时 dispatch wizard 事件', () => {
    const listener = vi.fn();
    window.addEventListener(EVT_OPEN_VIRTUAL_COMPANY_WIZARD, listener);
    openVirtualCompanyPage();
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVT_OPEN_VIRTUAL_COMPANY_WIZARD, listener);
  });

  it('target="import" 时 dispatch import 事件', () => {
    const listener = vi.fn();
    window.addEventListener(EVT_OPEN_VIRTUAL_COMPANY_IMPORT, listener);
    openVirtualCompanyPage('import');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVT_OPEN_VIRTUAL_COMPANY_IMPORT, listener);
  });

  it('target="companies" 时 dispatch companies 事件', () => {
    const listener = vi.fn();
    window.addEventListener(EVT_OPEN_VIRTUAL_COMPANY_COMPANIES, listener);
    openVirtualCompanyPage('companies');
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVT_OPEN_VIRTUAL_COMPANY_COMPANIES, listener);
  });

  it('event detail 应包含 pluginId', () => {
    const listener = vi.fn();
    window.addEventListener(EVT_OPEN_VIRTUAL_COMPANY_WIZARD, listener);
    openVirtualCompanyPage('wizard');
    const evt = listener.mock.calls[0][0] as CustomEvent;
    expect(evt.detail).toEqual({ pluginId: 'virtual-company' });
    window.removeEventListener(EVT_OPEN_VIRTUAL_COMPANY_WIZARD, listener);
  });
});

describe('installPluginRuntimeHooks 回调安装', () => {
  it('应被调用且不抛错', () => {
    expect(() =>
      installPluginRuntimeHooks(
        () => {},
        () => {}
      )
    ).not.toThrow();
  });

  it('重复安装不应抛错（幂等）', () => {
    expect(() => {
      installPluginRuntimeHooks(() => {}, () => {});
      installPluginRuntimeHooks(() => {}, () => {});
    }).not.toThrow();
  });
});

describe('loadBuiltinPluginFrontends 加载逻辑', () => {
  it('返回 loaded 与 skipped 数组', async () => {
    const result = await loadBuiltinPluginFrontends();
    expect(Array.isArray(result.loaded)).toBe(true);
    expect(Array.isArray(result.skipped)).toBe(true);
    // In test env import.meta.glob is statically rewritten and throws,
    // so the loader returns empty arrays (no plugins loaded).
    expect(result.loaded.length).toBe(0);
    expect(result.skipped.length).toBe(0);
  });

  it('第二次调用相同函数应仍能完成（幂等）', async () => {
    const a = await loadBuiltinPluginFrontends();
    const b = await loadBuiltinPluginFrontends();
    expect(a.loaded.length).toBeGreaterThanOrEqual(b.loaded.length);
  });
});