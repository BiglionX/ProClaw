/**
 * SyncRetryPolicy - 同步重试策略模块
 * P5: 提供离线队列持久化重试计数 + 可配置冲突解决策略 + 同步优先级
 */

import type { IDatabase } from './DatabaseFactory';
import { logger } from '../utils/logger';

// ============================================
// 常量配置
// ============================================

/** 默认最大重试次数 */
export const DEFAULT_MAX_RETRIES = 5;

/** 默认基础重试间隔（毫秒） */
export const DEFAULT_BASE_RETRY_DELAY = 30000;

/** 最大重试间隔（10 分钟） */
export const MAX_RETRY_DELAY = 600000;

// ============================================
// 同步优先级枚举
// ============================================

export enum SyncPriority {
  HIGH = 1,    // 库存变更、订单状态
  MEDIUM = 2,  // 客户信息、产品数据
  LOW = 3,      // 配置变更、聊天消息
}

/** 优先级标签映射 */
export const SYNC_PRIORITY_LABELS: Record<SyncPriority, string> = {
  [SyncPriority.HIGH]: '高优先级',
  [SyncPriority.MEDIUM]: '中优先级',
  [SyncPriority.LOW]: '低优先级',
};

// ============================================
// 离线队列持久化重试计数
// ============================================

/**
 * 获取离线队列项的重试次数（从数据库）
 * P5: 替代内存 Map，实现持久化重试计数
 */
export const getRetryCount = async (db: IDatabase, itemId: string | number): Promise<number> => {
  try {
    const result = await db.getFirstAsync(
      'SELECT retry_count FROM offline_queue WHERE id = ?',
      [itemId]
    ) as { retry_count: number } | null;
    return result?.retry_count ?? 0;
  } catch (error) {
    logger.warn('[SyncRetryPolicy] Failed to get retry count:', error);
    return 0;
  }
};

/**
 * 增加离线队列项的重试次数（持久化到数据库）
 * P5: 重试计数持久化，App 重启后不丢失
 */
export const incrementRetryCount = async (db: IDatabase, itemId: string | number): Promise<number> => {
  try {
    await db.runAsync(
      'UPDATE offline_queue SET retry_count = retry_count + 1, last_retry_at = ? WHERE id = ?',
      [Math.floor(Date.now() / 1000), itemId]
    );
    const newCount = await getRetryCount(db, itemId);
    return newCount;
  } catch (error) {
    logger.warn('[SyncRetryPolicy] Failed to increment retry count:', error);
    return 0;
  }
};

/**
 * 计算下次重试延迟（指数退避 + 抖动）
 * P5: min(30s * 2^retry_count, 10min) + jitter
 */
export const calculateNextRetryDelay = (retryCount: number): number => {
  const base = Math.min(DEFAULT_BASE_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
  const jitter = base * (0.8 + Math.random() * 0.4);
  return Math.floor(jitter);
};

/**
 * 检查是否超过最大重试次数
 */
export const hasExceededMaxRetries = (retryCount: number, maxRetries: number = DEFAULT_MAX_RETRIES): boolean => {
  return retryCount >= maxRetries;
};

// ============================================
// 可配置的冲突解决策略
// ============================================

/** 冲突解决策略类型 */
export type ConflictMergeStrategy = 'timestamp_newer' | 'field_merge' | 'last_write_wins';

/** 单个表的冲突配置 */
export interface ConflictStrategyConfig {
  tableName: string;
  keyFields: string[];        // 关键字段，冲突时需人工处理
  timestampThreshold: number;  // 时间戳阈值（毫秒）
  mergeStrategy: ConflictMergeStrategy;
}

/** 全局冲突策略配置表（可扩展） */
export const CONFLICT_STRATEGIES: ConflictStrategyConfig[] = [
  {
    tableName: 'product_sku',
    keyFields: ['sell_price', 'current_stock'],
    timestampThreshold: 30000,
    mergeStrategy: 'field_merge',
  },
  {
    tableName: 'sales_orders',
    keyFields: ['total_amount', 'status'],
    timestampThreshold: 5000,
    mergeStrategy: 'timestamp_newer',
  },
  {
    tableName: 'customers',
    keyFields: [],
    timestampThreshold: 60000,
    mergeStrategy: 'last_write_wins',
  },
  {
    tableName: 'chat_messages',
    keyFields: [],
    timestampThreshold: 60000,
    mergeStrategy: 'last_write_wins',
  },
];

/** 获取表的冲突策略配置 */
export const getConflictStrategy = (tableName: string): ConflictStrategyConfig | null => {
  return CONFLICT_STRATEGIES.find(s => s.tableName === tableName) ?? null;
};

/** 注册新的冲突策略（用于动态扩展） */
export const registerConflictStrategy = (config: ConflictStrategyConfig): void => {
  const existingIndex = CONFLICT_STRATEGIES.findIndex(s => s.tableName === config.tableName);
  if (existingIndex >= 0) {
    CONFLICT_STRATEGIES[existingIndex] = config;
  } else {
    CONFLICT_STRATEGIES.push(config);
  }
};

// ============================================
// 同步优先级队列
// ============================================

/** 同步队列项接口 */
export interface SyncQueueItem {
  id: string;
  tableName: string;
  operation: string;
  priority: SyncPriority;
  timestamp: number;
}

/** 根据优先级排序（高优先级在前） */
export const sortByPriority = (items: SyncQueueItem[]): SyncQueueItem[] => {
  return [...items].sort((a, b) => {
    // 首先按优先级排序
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    // 相同优先级按时间戳排序（较早的在前）
    return a.timestamp - b.timestamp;
  });
};

/** 根据优先级过滤 */
export const filterByPriority = (
  items: SyncQueueItem[],
  minPriority: SyncPriority
): SyncQueueItem[] => {
  return items.filter(item => item.priority <= minPriority);
};

/** 推断操作优先级（基于表名和操作类型） */
export const inferPriority = (tableName: string, operation: 'insert' | 'update' | 'delete'): SyncPriority => {
  // 高优先级表
  const highPriorityTables = new Set(['inventory_transactions', 'sales_orders', 'purchase_orders']);
  // 中优先级表
  const mediumPriorityTables = new Set([
    'product_spu', 'product_sku', 'customers', 'contacts',
    'sales_order_items', 'purchase_order_items'
  ]);
  
  if (highPriorityTables.has(tableName)) {
    return SyncPriority.HIGH;
  }
  if (mediumPriorityTables.has(tableName)) {
    return SyncPriority.MEDIUM;
  }
  return SyncPriority.LOW;
};

export default {
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_RETRY_DELAY,
  SyncPriority,
  getRetryCount,
  incrementRetryCount,
  calculateNextRetryDelay,
  hasExceededMaxRetries,
  CONFLICT_STRATEGIES,
  getConflictStrategy,
  registerConflictStrategy,
  sortByPriority,
  filterByPriority,
  inferPriority,
};