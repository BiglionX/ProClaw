/**
 * Plugin Frontend Loader
 *
 * 负责在应用启动时加载所有内置插件的 frontend 脚本（manifest.entryPoints.frontend）。
 * 前端脚本以 IIFE 形式执行，通过全局 `ProClawPlugin` API 注册路由、菜单、Tauri 命令桥接等。
 *
 * 设计要点：
 * - 使用 Vite 的 `import.meta.glob('../plugins/*\/frontend/index.js', { eager: true })`
 *   在 build 时把所有插件 frontend 打包进主 bundle，无需运行时网络请求
 * - 加载顺序：先调用 setRouteRegistry/setMenuRegistry 注入回调，再执行脚本
 * - 幂等：相同 pluginId 多次加载只生效一次
 *
 * 与 plugin_loader.ts 的区别：
 * - plugin_loader.ts 走 Tauri IPC，负责"已下载到 user data dir 的第三方插件"的下载/校验/安装
 * - 本模块负责"src/plugins/ 目录下内置插件"的前端代码加载（打包期已包含）
 *
 * 使用方式（main.tsx）：
 * ```ts
 * import { loadBuiltinPluginFrontends } from './lib/pluginFrontend';
 * await loadBuiltinPluginFrontends();
 * ```
 *
 * 关联文档：
 * - 跨包 API 参考：[`docs/integration/NVWAX_INTEGRATION.md`](../../docs/integration/NVWAX_INTEGRATION.md)
 * - 架构规范：[`docs/MULTI_PROJECT_INTEGRATION_SPEC.md` §11](../../docs/MULTI_PROJECT_INTEGRATION_SPEC.md#11-虚拟公司闭环sprint-213215-已交付-)
 * - 跨包数据契约：[`docs/integration/virtual-company-package.schema.json`](../../docs/integration/virtual-company-package.schema.json)（schemaVersion 1.0.0）
 */

import { setRouteRegistry, setMenuRegistry } from './pluginApi';
import type { PluginManifest } from './manifestRegistry';
import { listPluginManifests } from './manifestRegistry';

interface PluginFrontendModule {
  /** Vite 会注入模块路径 */
  __vite_loaded?: boolean;
  /** 默认导出占位（避免 tree-shaking 把空模块删掉） */
  default?: unknown;
}

/**
 * 在 main.tsx 启动时调用。Vite 在 build 时把 ../plugins/*\/frontend/index.js
 * 全部内联进 bundle。运行时由 main.tsx 的 loadBuiltinPluginFrontends() 触发。
 *
 * ⚠️ 注意：vitest 测试时如果 import 本文件，import.meta.glob 会被 Vite plugin
 * 静态扫描并把所有匹配模块打包进测试 runner，即使被 try/catch 包裹也会执行
 * 模块副作用（React 全局未定义 → 报错）。
 *
 * 解决方案：插件 frontend 的加载逻辑放在专门的方法 loadBuiltinPluginFrontendsFromGlob()
 * 中，由 main.tsx 显式调用。**单文件测试**请用 vi.mock 模拟整个插件 frontend 模块。
 */
function getBuiltinPluginFrontendsRaw(): Record<string, PluginFrontendModule> {
  // import.meta.glob 是 Vite 编译期注入的 API；TS 类型声明在 vite/client.d.ts
  // vitest 测试环境（无 Vite dev server）下 typeof 为 'undefined'
  const meta = import.meta as { glob?: (pattern: string, opts?: { eager?: boolean }) => Record<string, PluginFrontendModule> };
  if (typeof meta.glob !== 'function') {
    return {};
  }
  return meta.glob(
    '../plugins/*/frontend/index.js',
    { eager: true }
  );
}

/**
 * 已加载的 plugin ID 集合（防止重复执行）
 */
const loadedPluginIds = new Set<string>();

/**
 * 全局事件名：通知 App 跳转到 /vc/wizard
 * 虚拟公司插件的 wizard 按钮会 dispatch 这个事件
 */
export const EVT_OPEN_VIRTUAL_COMPANY_WIZARD = 'plugin:virtual-company:open-wizard';

/**
 * 全局事件名：通知 App 跳转到 /vc/import（用户从 NvWaX 复制 URL 后回 ProClaw 自动打开导入页）
 */
export const EVT_OPEN_VIRTUAL_COMPANY_IMPORT = 'plugin:virtual-company:open-import';

/**
 * 全局事件名：通知 App 跳转到 /vc/companies
 */
export const EVT_OPEN_VIRTUAL_COMPANY_COMPANIES = 'plugin:virtual-company:open-companies';

/**
 * 注入路由注册回调。App 启动时调用一次。
 *
 * @param registerRoute App 暴露给插件的路由注册器（如往 React Router 注入 <Route>）
 * @param registerMenuItem App 暴露给插件的菜单注册器（往侧边栏插入菜单项）
 */
export function installPluginRuntimeHooks(
  registerRoute: (path: string, component: React.ComponentType<any>) => void,
  registerMenuItem: (parent: string, label: string, icon: string, route: string) => void
): void {
  setRouteRegistry(registerRoute);
  setMenuRegistry(registerMenuItem);
  console.log('[PluginFrontend] 已安装插件运行时回调（route + menu）');
}

/**
 * 加载所有内置插件的前端脚本。
 * 必须在 React 应用挂载之前或同时调用。
 *
 * 加载流程：
 * 1. 扫描 import.meta.glob 得到的 builtinPluginFrontends
 * 2. 从 path 反推出 plugin_id（"../plugins/virtual-company/frontend/index.js" → "virtual-company"）
 * 3. 检查该 plugin 是否已在 manifestRegistry 注册；未注册则跳过（保持插件隔离）
 * 4. 模块副作用：每个 frontend/index.js 的 IIFE 会自动执行，调用 ProClawPlugin.registerRoute 等
 */
export async function loadBuiltinPluginFrontends(): Promise<{
  loaded: string[];
  skipped: string[];
}> {
  const loaded: string[] = [];
  const skipped: string[] = [];

  // 已注册的 manifest 集合（用于过滤）
  const registeredManifests = new Map<string, PluginManifest>();
  for (const m of listPluginManifests()) {
    registeredManifests.set(m.id, m);
  }

  // 获取插件 frontend 模块（vitest 测试环境下为空对象）
  let builtinPluginFrontends: Record<string, PluginFrontendModule> = {};
  try {
    builtinPluginFrontends = getBuiltinPluginFrontendsRaw();
  } catch (e) {
    console.warn('[PluginFrontend] import.meta.glob 不可用，跳过:', e);
    return { loaded, skipped };
  }

  for (const [modulePath, mod] of Object.entries(builtinPluginFrontends)) {
    const pluginId = extractPluginIdFromPath(modulePath);
    if (!pluginId) {
      console.warn('[PluginFrontend] 无法从路径推断 plugin_id:', modulePath);
      skipped.push(modulePath);
      continue;
    }

    // 防止重复执行
    if (loadedPluginIds.has(pluginId)) {
      skipped.push(pluginId);
      continue;
    }

    // 仅加载 manifest 已注册的 builtin（防止未声明的插件代码意外执行）
    if (!registeredManifests.has(pluginId)) {
      console.warn(
        `[PluginFrontend] 跳过未注册的插件 frontend: ${pluginId}（在 manifestRegistry 注册后才能加载）`
      );
      skipped.push(pluginId);
      continue;
    }

    // 标记：模块的副作用已执行（模块本身是 IIFE）
    mod.__vite_loaded = true;
    loadedPluginIds.add(pluginId);
    loaded.push(pluginId);
    console.log(`[PluginFrontend] 已加载插件 frontend: ${pluginId}`);
  }

  return { loaded, skipped };
}

/**
 * 从 Vite glob 返回的 modulePath 反推 plugin_id
 * "../plugins/virtual-company/frontend/index.js" → "virtual-company"
 * "../plugins/catering/frontend/index.js" → "catering"
 */
function extractPluginIdFromPath(modulePath: string): string | null {
  const match = modulePath.match(/\/plugins\/([^/]+)\/frontend\/index\.js$/);
  return match && match[1] ? match[1] : null;
}

/**
 * 触发：打开虚拟公司创建向导。
 * 前端 UI（聊天输入框、Agent 对话、插件市场卡片）都可以调用此方法。
 *
 * @param options.target 可选，'wizard' | 'import' | 'companies'，默认 'wizard'
 */
export function openVirtualCompanyPage(target: 'wizard' | 'import' | 'companies' = 'wizard'): void {
  if (typeof window === 'undefined') return;
  const eventName =
    target === 'wizard'
      ? EVT_OPEN_VIRTUAL_COMPANY_WIZARD
      : target === 'import'
      ? EVT_OPEN_VIRTUAL_COMPANY_IMPORT
      : EVT_OPEN_VIRTUAL_COMPANY_COMPANIES;
  window.dispatchEvent(new CustomEvent(eventName, { detail: { pluginId: 'virtual-company' } }));
}