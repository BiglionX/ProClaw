/**
 * 应用模式配置
 * 插件化行业版架构升级 (v1.0)
 * 
 * 废弃 VITE_BUILD_MODE 编译时常量，改为运行时 Zustand Store + PluginManager 单例
 * 
 * 向后兼容：IS_LIGHT / IS_VIRTUAL_COMPANY / IS_INVENTORY 仍可直接引用
 * 新代码建议使用 useAppModeStore hook 获取响应式状态
 */
import { create } from 'zustand';

/** 行业模式标识 - 扩展支持现有 + 第三方插件 */
export type AppMode = 'inventory' | 'virtual_company' | 'light' | 'catering' | 'beauty' | 'pet' | 'cloud-proclaw' | string;

/** 第三方插件开发者信息 */
export interface PluginDeveloper {
  name: string;
  website?: string;
  email?: string;
  publicKey?: string;
}

/** 插件兼容性检查结果 */
export interface CompatibilityCheck {
  compatible: boolean;
  appVersionOk: boolean;
  dataModelConflicts: string[];
  issues: string[];
}

/** 插件功能配置 */
export interface PluginFeatureConfig {
  modules: string[];
  dashboards: string[];
  reports: string[];
}

/** 插件导航项 */
export interface PluginNavItem {
  text: string;
  icon: string;
  path: string;
  group?: string;
}

/** 行业插件 Manifest（与需求文档 IndustryPluginManifest 一致）
 * PRD v10.0 规范扩展：所有新增字段均为可选以保持向后兼容。 */
export interface IndustryPluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  compatibleAppVersion: string;
  /** 最低 ProClaw 版本要求（PRD v10.0 新字段） */
  minProclawVersion?: string;
  /** 插件作者（PRD v10.0 新字段） */
  author?: string;
  features: PluginFeatureConfig;
  navigation: {
    add: PluginNavItem[];
    remove: string[];
    reorder?: string[];
  };
  dataModels?: {
    tables: string[];
    migrations: string[];
  };
  ui: {
    theme?: Record<string, string>;
    onboarding?: string;
    quickActions?: Array<{
      label: string;
      icon: string;
      action: string;
      color: string;
    }>;
  };
  /** 开发者信息（第三方插件用） */
  developer?: PluginDeveloper;
  /** 插件分类标签：内置 / 官方 / 第三方 */
  category?: 'builtin' | 'official' | 'third-party';
  /** 标签列表（如 "餐饮", "预约管理", "AI"） */
  tags?: string[];
  assets: {
    path: string;
    files: string[];
  };
  /** 权限声明列表（PRD v10.0 新字段）
   * 示例：["database:create_table", "database:read:products", "printer:write"] */
  permissions?: string[];
  /** 入口点配置（PRD v10.0 新字段） */
  entryPoints?: {
    /** 前端入口文件 */
    frontend?: string;
    /** 后端动态库路径 */
    backend?: string;
    /** 数据库迁移脚本路径 */
    migrations?: string;
  };
  /** 插件配置界面 JSON Schema（PRD v10.0 新字段） */
  settingsSchema?: Record<string, any>;
}

// ============ Zustand Store ============

interface AppModeState {
  /** 当前行业模式 */
  mode: AppMode;
  /** 当前激活的行业插件 manifest（未来插件系统用） */
  activePlugin: IndustryPluginManifest | null;
  /** 已安装的插件列表（未来插件系统用） */
  installedPlugins: IndustryPluginManifest[];

  setMode: (mode: AppMode) => void;
  setActivePlugin: (plugin: IndustryPluginManifest | null) => void;
  setInstalledPlugins: (plugins: IndustryPluginManifest[]) => void;
  isModuleEnabled: (moduleId: string) => boolean;
  isPathEnabled: (path: string) => boolean;
  getQuickActions: () => IndustryPluginManifest['ui']['quickActions'];
  getNavAddItems: () => PluginNavItem[];
  getNavRemovePaths: () => string[];
  getPluginDashboardIds: () => string[];
}

/** 从当前运行环境检测默认模式 */
function detectAppMode(): AppMode {
  // 仍然从环境变量读取初始值，但不再作为编译时常量
  const mode = import.meta.env.VITE_BUILD_MODE as string | undefined;
  if (mode === 'virtual_company') return 'virtual_company';
  if (mode === 'light') return 'light';
  return 'inventory';
}

export const useAppModeStore = create<AppModeState>((set, get) => ({
  mode: detectAppMode(),
  activePlugin: null,
  installedPlugins: [],

  setMode: (mode) => set({ mode }),
  setActivePlugin: (plugin) => set({ activePlugin: plugin }),
  setInstalledPlugins: (plugins) => set({ installedPlugins: plugins }),

  isModuleEnabled: (moduleId) => {
    const plugin = get().activePlugin;
    if (!plugin) return true; // 无插件时默认启用全部
    return plugin.features.modules.includes(moduleId);
  },

  isPathEnabled: (path) => {
    const plugin = get().activePlugin;
    if (!plugin) return true;
    return !plugin.navigation.remove.includes(path);
  },

  getQuickActions: () => {
    return get().activePlugin?.ui.quickActions ?? [];
  },

  getNavAddItems: () => {
    return get().activePlugin?.navigation.add ?? [];
  },

  getNavRemovePaths: () => {
    return get().activePlugin?.navigation.remove ?? [];
  },

  getPluginDashboardIds: () => {
    return get().activePlugin?.features.dashboards ?? [];
  },
}));

// ============ 向后兼容的同步 getter ============
// 注意：这些读取的是 store 初始化时的值。
// 如果需要响应式更新，请使用 useAppModeStore hook。
const initialState = useAppModeStore.getState();
export const APP_MODE: AppMode = initialState.mode;
export const IS_VIRTUAL_COMPANY = initialState.mode === 'virtual_company';
export const IS_INVENTORY = initialState.mode === 'inventory';
export const IS_LIGHT = initialState.mode === 'light';

// ============ PluginManager 单例 ============

/**
 * PluginManager - 插件生命周期管理器
 * 
 * 职责：
 * - 管理当前激活行业
 * - 加载/卸载行业插件
 * - 注册动态路由、导航项
 * 
 * 当前阶段（Phase 1）：管理行业模式切换
 * 后续阶段（Phase 2+）：管理完整插件生命周期
 */
export class PluginManager {
  private static instance: PluginManager;

  static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  /** 获取当前行业模式 */
  getActiveIndustry(): AppMode {
    return useAppModeStore.getState().mode;
  }

  /** 设置行业模式（Phase 2 将改为通过插件加载实现） */
  async setIndustry(id: AppMode): Promise<void> {
    const store = useAppModeStore.getState();
    if (store.mode === id) return;

    useAppModeStore.getState().setMode(id);

    // Phase 2 将在此处触发插件下载 + 验证 + 加载
    // Phase 1 仅更新模式状态
    console.log(`[PluginManager] Industry switched to: ${id}`);

    // 触发页面刷新（通过 React key 机制实现）
    window.dispatchEvent(new CustomEvent('plugin:industry-changed', { detail: { industry: id } }));
  }

  /** 获取当前插件 manifest */
  getPlugin(): IndustryPluginManifest | null {
    return useAppModeStore.getState().activePlugin;
  }

  /** 设置当前插件（Phase 2 实现） */
  async setPlugin(manifest: IndustryPluginManifest): Promise<void> {
    useAppModeStore.getState().setActivePlugin(manifest);
    console.log(`[PluginManager] Plugin loaded: ${manifest.id}@${manifest.version}`);
    window.dispatchEvent(new CustomEvent('plugin:loaded', { detail: manifest }));
  }

  /** 获取动态导航项 */
  getNavItems(): PluginNavItem[] {
    return useAppModeStore.getState().getNavAddItems();
  }

  /** 检查路径是否启用 */
  isPathEnabled(path: string): boolean {
    return useAppModeStore.getState().isPathEnabled(path);
  }

  /** 检查模块是否启用 */
  isModuleEnabled(moduleId: string): boolean {
    return useAppModeStore.getState().isModuleEnabled(moduleId);
  }

  /** 检查当前是否为指定行业模式 */
  isCurrentIndustry(id: AppMode): boolean {
    return this.getActiveIndustry() === id;
  }

  /** 当前是否为 Light/零售模式 */
  isLightMode(): boolean {
    return this.isCurrentIndustry('light');
  }

  /** 当前是否为虚拟公司模式 */
  isVirtualCompanyMode(): boolean {
    return this.isCurrentIndustry('virtual_company');
  }

  /** 当前是否为进销存模式 */
  isInventoryMode(): boolean {
    return this.isCurrentIndustry('inventory');
  }

  // ========== Phase 4 插件生态功能 ==========

  /** 注册的内置插件列表 */
  private static builtInPlugins: IndustryPluginManifest[] | null = null;

  /** 获取所有内置插件的 manifest */
  async getBuiltInPlugins(): Promise<IndustryPluginManifest[]> {
    if (PluginManager.builtInPlugins) {
      return PluginManager.builtInPlugins;
    }

    const pluginIds = ['retail', 'inventory', 'virtual-company', 'catering', 'beauty', 'pet', 'cloud-proclaw'];
    const plugins: IndustryPluginManifest[] = [];

    for (const id of pluginIds) {
      try {
        // 尝试加载内置 manifest
        const response = await fetch(`/plugins/${id}/manifest.json`);
        if (response.ok) {
          const manifest = await response.json() as IndustryPluginManifest;
          manifest.category = 'builtin';
          plugins.push(manifest);
        }
      } catch {
        console.warn(`[PluginManager] 内置插件 ${id} manifest 未找到，跳过`);
      }
    }

    PluginManager.builtInPlugins = plugins;
    return plugins;
  }

  /**
   * 从插件商店获取公开发布的插件
   * @param baseUrl 插件商店 API 地址（营销站点地址）
   */
  async getStorePlugins(baseUrl: string): Promise<IndustryPluginManifest[]> {
    try {
      const response = await fetch(`${baseUrl}/api/plugins/published`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      console.warn('[PluginManager] 无法连接插件商店');
      return [];
    }
  }

  /**
   * 提交第三方插件审核
   */
  async submitForReview(
    baseUrl: string,
    manifest: IndustryPluginManifest,
    packageUrl: string,
    packageHash?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${baseUrl}/api/plugins/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          package_url: packageUrl,
          package_hash: packageHash,
        }),
      });
      const result = await response.json();
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || '提交失败' };
    }
  }

  /**
   * 获取插件开发模板（生成脚手架）
   */
  generateScaffold(pluginId: string, pluginName: string): IndustryPluginManifest {
    return {
      id: pluginId,
      name: pluginName,
      version: '1.0.0',
      description: '',
      icon: '🔌',
      compatibleAppVersion: '>=0.1.0',
      features: {
        modules: [],
        dashboards: [],
        reports: [],
      },
      navigation: {
        add: [],
        remove: [],
      },
      ui: {},
      assets: { path: './assets', files: [] },
      category: 'third-party',
      developer: {
        name: '',
      },
      tags: [],
    };
  }
}

