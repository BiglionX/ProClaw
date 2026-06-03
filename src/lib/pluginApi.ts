/**
 * ProClaw 前端插件 API
 *
 * 插件可通过全局对象 `window.ProClawPlugin` 访问 ProClaw 核心能力。
 *
 * 使用方式（在插件 frontend/index.js 中）：
 * ```js
 * // 注册路由
 * ProClawPlugin.registerRoute('/restaurant/menu', MenuPage);
 *
 * // 添加菜单项
 * ProClawPlugin.addMenuItem('餐饮', '菜单管理', '🍽️', '/restaurant/menu');
 *
 * // 查询数据
 * const items = await ProClawPlugin.db.query('SELECT * FROM menu_items');
 *
 * // 调用后端命令
 * const result = await ProClawPlugin.invoke('print_ticket', { order_id: '123' });
 *
 * // 获取 AI Team 列表
 * const agents = await ProClawPlugin.getAgentContext();
 * ```
 *
 * PRD v10.0 规范：此 API 注入到 WebView 中，插件前端代码可直接访问。
 */

import { isTauri } from './tauri';

// ============ 类型定义 ============

/** ProClawPlugin 全局 API 类型 */
export interface ProClawPluginAPI {
  /** 注册新路由，component 为 React 组件 */
  registerRoute: (path: string, component: React.ComponentType<any>) => void;
  /** 在侧边栏增加菜单项 */
  addMenuItem: (parent: string, label: string, icon: string, route: string) => void;
  /** 数据库只读查询 */
  db: {
    query: (sql: string, params?: any[]) => Promise<any[] | null>;
    execute: (sql: string, params?: any[]) => Promise<boolean>;
  };
  /** 调用插件后端命令 */
  invoke: (command: string, args?: Record<string, any>) => Promise<any>;
  /** 获取当前已安装的 AI Team 列表及其能力 */
  getAgentContext: () => Promise<AgentContextItem[]>;
  /** 向指定 AI Team 发送消息并接收回复 */
  sendToAgent: (agentId: string, message: string) => Promise<string | null>;
}

/** AI Team 上下文项 */
export interface AgentContextItem {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  permissions: string[];
  enabled: boolean;
}

/** 路由注册回调类型 */
type RouteRegistryCallback = (path: string, component: React.ComponentType<any>) => void;

/** 菜单项注册回调类型 */
type MenuRegistryCallback = (parent: string, label: string, icon: string, route: string) => void;

// ============ 内部状态 ============

/** 路由注册回调（由应用主模块在初始化时设置） */
let routeRegistry: RouteRegistryCallback | null = null;

/** 菜单注册回调（由应用主模块在初始化时设置） */
let menuRegistry: MenuRegistryCallback | null = null;

/** 已注册的路由集合（防止重复注册） */
const registeredRoutes = new Set<string>();

/** 已注册的菜单项集合（防止重复注册） */
const registeredMenus = new Set<string>();

// ============ 设置函数（由 ProClaw 主应用调用）============

/**
 * 设置路由注册回调
 * 在应用初始化时由主 App 组件调用，用于接收插件注册的路由
 */
export function setRouteRegistry(callback: RouteRegistryCallback): void {
  routeRegistry = callback;
}

/**
 * 设置菜单注册回调
 * 在应用初始化时由主 App 组件调用，用于接收插件注册的菜单项
 */
export function setMenuRegistry(callback: MenuRegistryCallback): void {
  menuRegistry = callback;
}

/**
 * 清除所有已注册的插件路由和菜单（卸载插件时调用）
 */
export function clearPluginRegistrations(): void {
  registeredRoutes.clear();
  registeredMenus.clear();
}

/**
 * 获取已注册的路由路径列表
 */
export function getRegisteredRoutes(): string[] {
  return Array.from(registeredRoutes);
}

/**
 * 获取已注册的菜单项列表
 */
export function getRegisteredMenus(): string[] {
  return Array.from(registeredMenus);
}

// ============ ProClawPlugin API 实现 ============

const pluginApi: ProClawPluginAPI = {
  /**
   * 注册新路由
   * 插件调用此方法注册自己的页面组件到 ProClaw 路由系统。
   *
   * @param path - 路由路径，如 '/restaurant/menu'
   * @param component - React 组件
   */
  registerRoute(path: string, component: React.ComponentType<any>): void {
    if (registeredRoutes.has(path)) {
      console.warn(`[ProClawPlugin] 路由已存在，跳过重复注册: ${path}`);
      return;
    }

    registeredRoutes.add(path);

    if (routeRegistry) {
      routeRegistry(path, component);
      console.log(`[ProClawPlugin] 路由注册成功: ${path}`);
    } else {
      console.warn(
        `[ProClawPlugin] 路由注册回调未设置，路由 ${path} 将在回调可用时注册`
      );
    }
  },

  /**
   * 添加菜单项
   * 插件调用此方法在 ProClaw 侧边栏增加导航菜单项。
   *
   * @param parent - 父菜单分组（如 "餐饮", "工具"）
   * @param label - 菜单显示文本
   * @param icon - 图标 emoji 或图标名称
   * @param route - 点击后导航的路由路径
   */
  addMenuItem(parent: string, label: string, icon: string, route: string): void {
    const key = `${parent}:${label}:${route}`;
    if (registeredMenus.has(key)) {
      console.warn(`[ProClawPlugin] 菜单项已存在，跳过重复注册: ${label}`);
      return;
    }

    registeredMenus.add(key);

    if (menuRegistry) {
      menuRegistry(parent, label, icon, route);
      console.log(`[ProClawPlugin] 菜单项注册成功: ${parent} > ${label}`);
    } else {
      console.warn(
        `[ProClawPlugin] 菜单注册回调未设置，菜单项 ${label} 将在回调可用时注册`
      );
    }
  },

  db: {
    /**
     * 执行只读 SQL 查询（仅限插件声明的表）
     *
     * @param sql - SQL 查询语句（仅 SELECT）
     * @param params - 查询参数
     * @returns 查询结果数组
     */
    async query(sql: string, params?: any[]): Promise<any[] | null> {
      // 安全检查：仅允许 SELECT
      const trimmed = sql.trim().toUpperCase();
      if (!trimmed.startsWith('SELECT')) {
        console.error('[ProClawPlugin] 插件数据库查询仅允许 SELECT 语句');
        return null;
      }

      if (!isTauri()) {
        console.warn('[ProClawPlugin] 数据库查询仅在 Tauri 环境中可用');
        return null;
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const result = await invoke<any[]>('plugin_db_query', {
          sql,
          params: params || [],
        });
        return result;
      } catch (error: any) {
        console.error('[ProClawPlugin] 数据库查询失败:', error);
        return null;
      }
    },

    /**
     * 执行写操作（需插件声明相应权限）
     *
     * @param sql - SQL 语句（INSERT/UPDATE/DELETE）
     * @param params - SQL 参数
     * @returns 是否执行成功
     */
    async execute(sql: string, params?: any[]): Promise<boolean> {
      // 安全检查：不允许 DROP/ALTER/TRUNCATE 等危险操作
      const trimmed = sql.trim().toUpperCase();
      const allowedPrefixes = ['INSERT', 'UPDATE', 'DELETE', 'CREATE TABLE IF NOT EXISTS'];
      const isAllowed = allowedPrefixes.some((prefix) => trimmed.startsWith(prefix));
      if (!isAllowed) {
        console.error(
          `[ProClawPlugin] 插件数据库写入仅允许: ${allowedPrefixes.join(', ')}`
        );
        return false;
      }

      if (!isTauri()) {
        console.warn('[ProClawPlugin] 数据库写入仅在 Tauri 环境中可用');
        return false;
      }

      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('plugin_db_execute', {
          sql,
          params: params || [],
        });
        return true;
      } catch (error: any) {
        console.error('[ProClawPlugin] 数据库写入失败:', error);
        return false;
      }
    },
  },

  /**
   * 调用插件后端命令
   * 插件通过此方法调用其后端 Rust 命令（通过动态库注册）。
   *
   * @param command - 命令名称，如 'print_ticket'
   * @param args - 命令参数对象
   * @returns 命令执行结果
   */
  async invoke(command: string, args?: Record<string, any>): Promise<any> {
    if (!isTauri()) {
      console.warn(`[ProClawPlugin] 命令 "${command}" 仅在 Tauri 环境中可用`);
      return null;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(command, args || {});
    } catch (error: any) {
      console.error(`[ProClawPlugin] 命令 "${command}" 执行失败:`, error);
      throw error;
    }
  },

  /**
   * 获取当前已安装的 AI Team 列表及其能力
   * 供插件了解当前可用的 AI 助手，以便与它们交互。
   */
  async getAgentContext(): Promise<AgentContextItem[]> {
    if (!isTauri()) {
      // 开发模式返回空列表
      return [];
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const agents = await invoke<any[]>('get_teams');
      if (!agents) return [];

      return agents.map((agent: any) => ({
        id: agent.id || agent.agent_id,
        name: agent.name || 'Unknown Agent',
        description: agent.description || '',
        capabilities: agent.capabilities || [],
        permissions: agent.permissions || [],
        enabled: agent.enabled !== false,
      }));
    } catch (error: any) {
      console.error('[ProClawPlugin] 获取 AI Team 上下文失败:', error);
      return [];
    }
  },

  /**
   * 向指定 AI Team 发送消息并接收回复
   *
   * @param agentId - AI Team 的 ID
   * @param message - 要发送的消息文本
   * @returns Agent 的回复文本
   */
  async sendToAgent(agentId: string, message: string): Promise<string | null> {
    if (!isTauri()) {
      console.warn('[ProClawPlugin] 发送消息仅在 Tauri 环境中可用');
      return null;
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const reply = await invoke<string>('send_message', {
        to: agentId,
        content: message,
      });
      return reply;
    } catch (error: any) {
      console.error(`[ProClawPlugin] 向 Agent "${agentId}" 发送消息失败:`, error);
      return null;
    }
  },
};

// ============ 注入到全局 ============

/**
 * 初始化插件 API 并注入到 window 对象
 *
 * 在应用启动时调用一次（通常在 App.tsx 的 useEffect 中）。
 */
export function initPluginAPI(): void {
  if (typeof window !== 'undefined') {
    (window as any).ProClawPlugin = pluginApi;
    console.log('[ProClawPlugin] 插件 API 已初始化并注入到 window.ProClawPlugin');
  }
}

/**
 * 从 window 对象获取 ProClawPlugin API
 */
export function getPluginAPI(): ProClawPluginAPI | null {
  if (typeof window !== 'undefined' && (window as any).ProClawPlugin) {
    return (window as any).ProClawPlugin as ProClawPluginAPI;
  }
  return null;
}

export default pluginApi;
