/**
 * SyncEngine - 同步引擎核心
 * 定义同步接口 ISyncProvider，实现冲突解决策略和增量序列化。
 *
 * 对应 PRD v11.0 第3.3节、第3.4节
 */

import type { IDatabase } from './DatabaseFactory';
import type { ChangeLogEntry } from './ChangeLogManager';
import { getPendingChanges, markSynced } from './ChangeLogManager';
import { getLastSyncTime, updateLastSyncTime } from './SyncMetadataManager';
import { logger } from '../utils/logger';

// 审计 S11：允许的表名白名单，防止 SQL 注入
// 审计 M3：此白名单需与 SchemaManager 创建的表手动保持同步
// 新增表到 SchemaManager 时，务必同时添加到此 Set，否则同步引擎拒绝该表变更
// 参考：SchemaManager.createV1Tables / migrateToV2
// 审计 R2 修复：白名单已包含 chat_sessions/chat_messages（V2 迁移创建的表）
const ALLOWED_TABLES = new Set([
  'product_spu', 'product_sku', 'product_images', 'product_categories', 'brands',
  'customers', 'sales_orders', 'sales_order_items', 'purchase_orders', 'purchase_order_items',
  'inventory_transactions', 'chat_sessions', 'chat_messages', 'plugin_registry',
  'change_log', 'conflict_records', 'offline_queue', 'sync_metadata', 'device_info',
  'product_attributes', 'product_spu_attributes',
]);

const isValidTableName = (name: string): boolean => ALLOWED_TABLES.has(name);

// ============================================
// 同步数据结构
// ============================================

/** 同步数据包（一组变更按表分组） */
export interface SyncPackage {
  deviceId: string;
  profileId: string;
  timestamp: number;
  changes: ChangeLogEntry[];
}

/** 同步结果 */
export interface SyncResult {
  success: boolean;
  applied: number;
  conflicts: number;
  errors: string[];
}

/** 冲突记录 */
export interface ConflictRecord {
  tableName: string;
  rowId: string;
  localChange: ChangeLogEntry;
  remoteChange: ChangeLogEntry;
  resolvedValue?: any;
  resolution?: 'local_win' | 'remote_win' | 'manual';
}

// ============================================
// ISyncProvider 接口
// ============================================

/**
 * 同步提供者接口
 * 云备份和局域网同步分别实现此接口
 */
export interface ISyncProvider {
  /** 提供者名称 */
  readonly name: string;

  /** 上传变更 */
  upload(package_: SyncPackage): Promise<SyncResult>;

  /** 下载变更 */
  download(sinceTimestamp: number, deviceId: string): Promise<SyncPackage | null>;

  /** 获取提供者是否可用 */
  isAvailable(): Promise<boolean>;

  /** 断开连接 */
  disconnect(): Promise<void>;
}

// ============================================
// 冲突解决策略
// ============================================

/** 冲突解决结果 */
export interface ResolvedConflict {
  /** 最终版本的数据 */
  mergedData: any;
  /** 冲突是否已自动解决 */
  autoResolved: boolean;
  /** 解决方式 */
  strategy: 'timestamp_newer' | 'field_merge' | 'manual';
  /** 需要人工处理的字段 */
  manualFields?: string[];
}

/**
 * 冲突解决器
 * 实现 PRD 3.4 的三层冲突策略：
 * 1. 时间戳优先 - 较新的覆盖
 * 2. 字段级合并 - 不同字段可合并
 * 3. 手动处理 - 标记需要人工介入
 */
export class ConflictResolver {
  /**
   * 解决两个版本之间的冲突
   * @param localData 本地版本
   * @param remoteData 远程版本
   * @param localTimestamp 本地修改时间
   * @param remoteTimestamp 远程修改时间
   * @param keyFields 关键字段（如价格、库存），冲突时需人工处理
   */
  resolve(
    localData: Record<string, any>,
    remoteData: Record<string, any>,
    localTimestamp: number,
    remoteTimestamp: number,
    keyFields: string[] = ['price', 'stock', 'status']
  ): ResolvedConflict {
    // 策略1: 时间戳优先 - 如果时间相差超过30秒，取最新的
    if (Math.abs(localTimestamp - remoteTimestamp) > 30000) {
      const newerData = localTimestamp > remoteTimestamp ? localData : remoteData;
      return {
        mergedData: newerData,
        autoResolved: true,
        strategy: 'timestamp_newer',
      };
    }

    // 策略2: 字段级合并
    const merged: Record<string, any> = {};
    const manualFields: string[] = [];

    // 收集所有字段
    const allKeys = Array.from(
      new Set([...Object.keys(localData), ...Object.keys(remoteData)])
    );

    for (const key of allKeys) {
      const localVal = localData[key];
      const remoteVal = remoteData[key];

      if (localVal === undefined) {
        merged[key] = remoteVal;
      } else if (remoteVal === undefined) {
        merged[key] = localVal;
      } else if (JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
        // 相同值，任意取
        merged[key] = localVal;
      } else if (keyFields.includes(key)) {
        // 关键字段冲突，标记人工处理
        manualFields.push(key);
        // 临时取本地值
        merged[key] = localVal;
      } else {
        // 非关键字段，取最新修改的值
        merged[key] = localTimestamp > remoteTimestamp ? localVal : remoteVal;
      }
    }

    if (manualFields.length > 0) {
      return {
        mergedData: merged,
        autoResolved: false,
        strategy: 'field_merge',
        manualFields,
      };
    }

    return {
      mergedData: merged,
      autoResolved: true,
      strategy: 'field_merge',
    };
  }
}

// ============================================
// 变更序列化工具
// ============================================

/**
 * 将变更记录按表分组并序列化为 JSON
 */
export const serializeChanges = (changes: ChangeLogEntry[]): string => {
  const grouped: Record<string, ChangeLogEntry[]> = {};
  for (const change of changes) {
    if (!grouped[change.table_name]) {
      grouped[change.table_name] = [];
    }
    grouped[change.table_name].push(change);
  }
  return JSON.stringify(grouped);
};

/**
 * 从 JSON 反序列化变更记录
 */
export const deserializeChanges = (json: string): ChangeLogEntry[] => {
  try {
    const grouped = JSON.parse(json) as Record<string, ChangeLogEntry[]>;
    const all: ChangeLogEntry[] = [];
    for (const entries of Object.values(grouped)) {
      all.push(...entries);
    }
    return all;
  } catch {
    return [];
  }
};

/**
 * 应用远程变更到本地数据库
 * @param db 本地数据库
 * @param changes 远程变更列表
 * @param resolver 冲突解决器
 * @returns 冲突记录列表
 */
export const applyRemoteChanges = async (
  db: IDatabase,
  changes: ChangeLogEntry[],
  resolver: ConflictResolver = new ConflictResolver()
): Promise<ConflictRecord[]> => {
  const conflicts: ConflictRecord[] = [];
  let failedCount = 0;

  // 审计 C6：在事务中执行所有变更，防止部分应用导致数据不一致
  try {
    await db.execAsync('BEGIN TRANSACTION');
  } catch {
    // Web IDB 不支持事务命令，继续逐条执行
  }

  for (const change of changes) {
    try {
      // 审计 S11：校验表名是否在白名单中
      if (!isValidTableName(change.table_name)) {
        logger.warn(`[SyncEngine] Rejected change for invalid table: ${change.table_name}`);
        continue;
      }

      // 根据操作类型应用
      switch (change.operation) {
        case 'delete':
          await db.runAsync(
            `DELETE FROM ${change.table_name} WHERE id = ?`,
            [change.row_id]
          );
          break;

        case 'insert':
        case 'update': {
          // 查询本地是否存在该记录
          const localRow = await db.getFirstAsync(
            `SELECT * FROM ${change.table_name} WHERE id = ?`,
            [change.row_id]
          );

          if (localRow) {
            // 存在则比较 last_modified
            const localModified = (localRow as any).last_modified || 0;
            if (change.timestamp > localModified) {
              // 远程更新较新，应用远程变更
              await applyChangeToRow(db, change.table_name, change);
            } else if (change.timestamp < localModified) {
              // 本地较新，记录冲突到 memory 和 DB
              const conflictRecord: ConflictRecord = {
                tableName: change.table_name,
                rowId: change.row_id,
                localChange: {
                  ...change,
                  old_value: JSON.stringify(localRow),
                  timestamp: localModified,
                },
                remoteChange: change,
                resolution: 'local_win',
              };
              conflicts.push(conflictRecord);

              // 持久化到 conflict_records 表
              try {
                await db.runAsync(
                  `INSERT INTO conflict_records (table_name, row_id, local_value, remote_value, local_timestamp, remote_timestamp, resolution)
                   VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
                  [
                    change.table_name,
                    change.row_id,
                    JSON.stringify(localRow),
                    change.new_value || change.old_value,
                    localModified,
                    change.timestamp,
                  ]
                );
              } catch (e) {
                logger.warn('[SyncEngine] Failed to persist conflict record:', e);
              }
            }
          } else {
            // 本地不存在，直接插入
            await applyChangeToRow(db, change.table_name, change);
          }
          break;
        }
      }
    } catch (error) {
      failedCount++;
      logger.warn(`[SyncEngine] Failed to apply change to ${change.table_name}#${change.row_id}:`, error);
    }
  }

  // 审计 R7 修复：若有变更失败则 ROLLBACK，保证事务原子性
  if (failedCount > 0) {
    try {
      await db.execAsync('ROLLBACK');
      logger.warn(`[SyncEngine] Rolled back transaction due to ${failedCount} failed changes`);
      // 审计 H3：回滚时返回空 conflicts，避免调用方基于已回滚的数据做后续处理
      return [];
    } catch {
      // Web IDB 不支持事务命令，继续 COMMIT
    }
  }

  // 审计 C6：提交事务
  try {
    await db.execAsync('COMMIT');
  } catch {
    // Web IDB 不支持事务命令，忽略
  }

  return conflicts;
};

/**
 * 应用单条变更到指定表
 * 完整实现：记录不存在则 INSERT，存在则 UPDATE（带 last_modified 更新）
 */
const applyChangeToRow = async (
  db: IDatabase,
  tableName: string,
  change: ChangeLogEntry
): Promise<void> => {
  if (change.operation === 'delete') {
    await db.runAsync(`DELETE FROM ${tableName} WHERE id = ?`, [change.row_id]);
    return;
  }

  // 检查本地是否已有该记录
  const existingRow = await db.getFirstAsync(
    `SELECT id FROM ${tableName} WHERE id = ?`,
    [change.row_id]
  );

  if (!existingRow) {
    // 记录不存在 -> INSERT
    if (change.new_value) {
      try {
        const newData = JSON.parse(change.new_value);
        // 审计 D7：校验 new_value 必须是普通对象，过滤原型污染键
        if (newData && typeof newData === 'object' && !Array.isArray(newData)) {
          const safeCols: string[] = [];
          const safeVals: any[] = [];
          for (const [key, value] of Object.entries(newData)) {
            // 跳过 __proto__、constructor 等危险键
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
            // 列名只允许字母数字下划线
            if (!/^[a-zA-Z_]\w*$/.test(key)) continue;
            safeCols.push(key);
            safeVals.push(value);
          }
          if (safeCols.length > 0) {
            const placeholders = safeCols.map(() => '?').join(', ');
            const colNames = safeCols.join(', ');
            await db.runAsync(
              `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
              safeVals
            );
            return;
          }
        }
      } catch {
        // JSON 解析失败，回退到简化插入
      }
    }
    // 简化插入：仅设置 id 和 sync_status
    await db.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (id, sync_status, last_modified) VALUES (?, 'clean', ?)`,
      [change.row_id, change.timestamp]
    );
    return;
  }

  // 记录存在 -> UPDATE（用 change.new_value 中的字段）
  if (change.new_value) {
    try {
      const newData = JSON.parse(change.new_value);
      if (newData && typeof newData === 'object' && !Array.isArray(newData)) {
        const setClauses: string[] = [];
        const values: any[] = [];
        for (const [key, value] of Object.entries(newData)) {
          if (key === 'id') continue; // 不更新主键
          // 审计 D7：跳过危险键，校验列名格式
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
          if (!/^[a-zA-Z_]\w*$/.test(key)) continue;
          setClauses.push(`${key} = ?`);
          values.push(value);
        }
        // 确保 sync_status 和 last_modified 被更新
        setClauses.push('sync_status = ?');
        values.push('clean');
        setClauses.push('last_modified = ?');
        values.push(change.timestamp);
        values.push(change.row_id);

        await db.runAsync(
          `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE id = ?`,
          values
        );
        return;
      }
    } catch {
      // JSON 解析失败或不是对象，使用简化更新
    }
  }

  // 简化更新：仅标记 sync_status 和 last_modified
  await db.runAsync(
    `UPDATE ${tableName} SET sync_status = 'clean', last_modified = ? WHERE id = ?`,
    [change.timestamp, change.row_id]
  );
};

export default {
  ConflictResolver,
  serializeChanges,
  deserializeChanges,
  applyRemoteChanges,
};
