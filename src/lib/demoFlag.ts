/**
 * 演示数据标记工具（ProClaw 1.0.0）
 * 用于在 localStorage 中记录演示账号的初始化状态、产品/云商城/团队/插件清单，
 * 便于后续「重置为演示数据」功能。
 */

const DEMO_FLAG_KEY = 'proclaw_demo_flag_v1';

export interface DemoFlagPayload {
  /** 演示数据版本号（结构调整时递增） */
  version: string;
  /** 注入的产品数量 */
  productsCount: number;
  /** 演示云商城子域名 */
  cloudStoreSubdomain: string;
  /** 已安装 AI Team 名称列表 */
  teamNames: string[];
  /** 已注册插件 ID 列表 */
  pluginIds: string[];
  /** 首次初始化时间（ISO） */
  initializedAt: string;
  /** 最近一次重置时间（ISO，可选） */
  lastResetAt?: string;
  /** 重置次数 */
  resetCount?: number;
}

/** 当前是否为演示账号 */
export function isDemoAccountContext(): boolean {
  try {
    const user = JSON.parse(localStorage.getItem('proclaw_user') || 'null');
    return user?.email === 'boss@proclaw.demo';
  } catch {
    return false;
  }
}

/** 是否已初始化过演示数据（是否存在 flag） */
export function isDemoDataInitialized(): boolean {
  try {
    return !!localStorage.getItem(DEMO_FLAG_KEY);
  } catch {
    return false;
  }
}

/** 读取当前演示 flag（不存在时返回 null） */
export function readDemoFlag(): DemoFlagPayload | null {
  try {
    const raw = localStorage.getItem(DEMO_FLAG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** 写入/更新演示 flag */
export function markAsDemoData(payload: DemoFlagPayload): void {
  try {
    localStorage.setItem(DEMO_FLAG_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

/** 更新已有 flag 的部分字段（如重置时间） */
export function updateDemoFlag(partial: Partial<DemoFlagPayload>): void {
  try {
    const existing = readDemoFlag();
    if (!existing) return;
    const merged = { ...existing, ...partial };
    localStorage.setItem(DEMO_FLAG_KEY, JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

/** 记录一次重置 */
export function recordDemoReset(): void {
  try {
    const existing = readDemoFlag();
    updateDemoFlag({
      lastResetAt: new Date().toISOString(),
      resetCount: (existing?.resetCount || 0) + 1,
    });
  } catch {
    /* ignore */
  }
}

/** 清除演示 flag（不影响其他数据，仅移除标记） */
export function clearDemoData(): void {
  try {
    localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 检查给定的资源（产品 spuId / 商城 id / 团队名 / 插件 id）是否属于演示数据
 * 仅根据本地 flag 做粗略判断（适用于前端 UI 标识）。
 */
export function isDemoResource(kind: 'product' | 'cloudStore' | 'team' | 'plugin', id: string): boolean {
  const flag = readDemoFlag();
  if (!flag) return false;
  switch (kind) {
    case 'cloudStore':
      // 子域名匹配
      return Boolean(flag.cloudStoreSubdomain) && id === flag.cloudStoreSubdomain;
    case 'team':
      return flag.teamNames.includes(id);
    case 'plugin':
      return flag.pluginIds.includes(id);
    case 'product':
    default:
      // 产品 demo 判断交给后端，前端只基于「flag 存在 + productsCount > 0」粗判
      return false;
  }
}
