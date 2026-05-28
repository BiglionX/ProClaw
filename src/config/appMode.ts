/**
 * 应用模式配置
 * inventory: 进销存版（默认）
 * virtual_company: 虚拟公司版
 */
export type AppMode = 'inventory' | 'virtual_company';

/** 从 import.meta.env 获取运行时构建模式 */
function detectAppMode(): AppMode {
  // 优先从 Vite 环境变量获取
  const mode = import.meta.env.VITE_BUILD_MODE as string | undefined;
  if (mode === 'virtual_company') return 'virtual_company';
  // 默认进销存版
  return 'inventory';
}

export const APP_MODE: AppMode = detectAppMode();

/** 是否为虚拟公司版 */
export const IS_VIRTUAL_COMPANY = APP_MODE === 'virtual_company';

/** 是否为进销存版 */
export const IS_INVENTORY = APP_MODE === 'inventory';
