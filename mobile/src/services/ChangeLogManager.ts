/**
 * ChangeLogManager - 变更日志管理
 * 提供 JS 级别变更拦截包装器（跨平台兼容），以及 SQLite 触发器管理。
 * 自动追踪所有业务表的 CUD 操作，为增量同步提供数据源。
 *
 * 对应 PRD v11.0 第2.3节：变更日志（Change Log）
 */

import type { IDatabase } from './DatabaseFactory';

// 需要追踪变更的业务表列表
// 审计 I5：添加 chat_sessions、chat_messages、product_spu_attributes
// 与 SchemaManager 创建的表及 SyncEngine ALLOWED_TABLES 保持一致
const TRACKED_TABLES = [
  'product_spu',
  'product_sku',
  'product_images',
  'product_categories',
  'brands',
  'customers',
  'sales_orders',
  'sales_order_items',
  'purchase_orders',
  'purchase_order_items',
  'inventory_transactions',
  'product_attributes',
  'product_spu_attributes',
  'chat_sessions',
  'chat_messages',
];

/**
 * 每张表的列名列表（用于构建 json_object 触发器）
 */
const TABLE_COLUMNS: Record<string, string[]> = {
  product_spu: ['id', 'spu_code', 'name', 'subtitle', 'description', 'category_id', 'brand_id',
    'unit', 'weight', 'is_on_sale', 'is_featured', 'sort_order', 'status', 'metadata',
    'last_modified', 'sync_status', 'created_at', 'updated_at', 'deleted_at'],
  product_sku: ['id', 'spu_id', 'sku_code', 'specifications', 'spec_text', 'cost_price', 'sell_price',
    'market_price', 'current_stock', 'min_stock', 'max_stock', 'barcode', 'is_default',
    'sort_order', 'is_active', 'last_modified', 'sync_status', 'created_at', 'updated_at', 'deleted_at'],
  product_images: ['id', 'spu_id', 'image_url', 'image_type', 'sort_order', 'is_primary',
    'last_modified', 'sync_status', 'created_at'],
  product_categories: ['id', 'name', 'parent_id', 'icon', 'sort_order',
    'last_modified', 'sync_status', 'created_at'],
  brands: ['id', 'name', 'logo_url', 'description', 'last_modified', 'sync_status', 'created_at'],
  customers: ['id', 'name', 'phone', 'email', 'address', 'company', 'position', 'department',
    'contact_type', 'notes', 'last_modified', 'sync_status', 'created_at', 'updated_at'],
  sales_orders: ['id', 'order_number', 'customer_id', 'total_amount', 'discount_amount', 'paid_amount',
    'status', 'payment_status', 'notes', 'last_modified', 'sync_status', 'created_at', 'updated_at'],
  sales_order_items: ['id', 'order_id', 'sku_id', 'sku_code', 'product_name', 'spec_text', 'quantity',
    'unit_price', 'cost_price', 'subtotal', 'last_modified', 'sync_status', 'created_at'],
  purchase_orders: ['id', 'order_number', 'supplier_id', 'total_amount', 'status', 'notes',
    'last_modified', 'sync_status', 'created_at', 'updated_at'],
  purchase_order_items: ['id', 'order_id', 'sku_id', 'sku_code', 'product_name', 'quantity',
    'unit_price', 'subtotal', 'received_quantity', 'last_modified', 'sync_status', 'created_at'],
  inventory_transactions: ['id', 'sku_id', 'transaction_type', 'quantity', 'balance_before', 'balance_after',
    'reference_type', 'reference_id', 'notes', 'last_modified', 'sync_status', 'created_at'],
  product_attributes: ['id', 'name', 'type', 'options', 'is_required', 'sort_order',
    'last_modified', 'sync_status', 'created_at'],
  product_spu_attributes: ['id', 'spu_id', 'attribute_id', 'value_text', 'value_number',
    'value_boolean', 'created_at'],
  chat_sessions: ['id', 'session_type', 'target_id', 'target_name', 'target_icon',
    'last_message', 'last_message_time', 'unread_count', 'is_pinned',
    'sync_status', 'created_at'],
  chat_messages: ['id', 'session_id', 'sender_type', 'content', 'created_at', 'sync_status'],
};

/**
 * 为指定表生成 json_object 表达式（用于触发器中的 NEW/OLD 行序列化）
 */
const buildJsonObjectExpr = (rowAlias: 'NEW' | 'OLD', tableName: string): string => {
  const cols = TABLE_COLUMNS[tableName];
  if (!cols || cols.length === 0) return `'{}'`;
  const pairs: string[] = [];
  for (const col of cols) {
    pairs.push(`'${col}', ${rowAlias}.${col}`);
  }
  return `json_object(${pairs.join(', ')})`;
};

/**
 * 为所有业务表安装变更日志触发器（原生 SQLite 使用）
 * 注意：Web 平台（IndexedDB）不支持 SQLite 触发器，
 * 应使用 wrapWithChangeLog() 包装器代替。
 */
export const setupChangeLogTriggers = async (db: IDatabase): Promise<void> => {
  for (const table of TRACKED_TABLES) {
    await createTriggersForTable(db, table);
  }
  console.log(`[ChangeLog] Installed triggers for ${TRACKED_TABLES.length} tables`);
};

/**
 * 创建带变更日志拦截的数据库包装器
 * 使用 JS 拦截 INSERT/UPDATE/DELETE 操作，自动写入 change_log。
 * 跨平台兼容（同时适用于原生 SQLite 和 Web IndexedDB）。
 *
 * @param db 原始数据库实例
 * @returns 包装后的数据库实例
 */
export const wrapWithChangeLog = (db: IDatabase): IDatabase => {
  const proxy: IDatabase = {
    execAsync: async (sql: string, params?: any[]) => {
      await db.execAsync(sql, params);
    },
    getAllAsync: async (sql: string, params?: any[]) => {
      return db.getAllAsync(sql, params);
    },
    getFirstAsync: async (sql: string, params?: any[]) => {
      return db.getFirstAsync(sql, params);
    },
    runAsync: async (sql: string, params?: any[]) => {
      // 解析 SQL 获取操作信息
      const parsed = parseSqlOperation(sql, params);
      if (!parsed || !parsed.tableName || !TRACKED_TABLES.includes(parsed.tableName)) {
        // 非追踪表，直接执行
        return await db.runAsync(sql, params);
      }

      let oldValueJson: string | null = null;
      let rowId: string = parsed.rowId;

      // UPDATE/DELETE: 执行前查询旧值
      if (parsed.operation === 'update' || parsed.operation === 'delete') {
        if (rowId && parsed.idParamIndex >= 0) {
          try {
            const oldRow = await db.getFirstAsync(
              `SELECT * FROM ${parsed.tableName} WHERE id = ?`,
              [rowId]
            );
            if (oldRow) {
              oldValueJson = JSON.stringify(oldRow);
            }
          } catch (e) {
            console.warn('[ChangeLog] Failed to query old value:', e);
          }
        }
      }

      // 执行原始 SQL
      const result = await db.runAsync(sql, params);

      let newValueJson: string | null = null;

      // INSERT/UPDATE: 执行后查询新值
      if (parsed.operation === 'insert' || parsed.operation === 'update') {
        // 对于 INSERT，从参数或 result 获取 rowId
        if (parsed.operation === 'insert') {
          rowId = parsed.rowId;
          // expo-sqlite 的 runAsync 返回 lastInsertRowId
          if (!rowId && result && (result as any).lastInsertRowId) {
            rowId = String((result as any).lastInsertRowId);
          }
        }
        if (rowId) {
          try {
            const newRow = await db.getFirstAsync(
              `SELECT * FROM ${parsed.tableName} WHERE id = ?`,
              [rowId]
            );
            if (newRow) {
              newValueJson = JSON.stringify(newRow);
            }
          } catch (e) {
            console.warn('[ChangeLog] Failed to query new value:', e);
          }
        }
      }

      // 写入变更日志
      if (rowId) {
        try {
          const now = Math.floor(Date.now() / 1000);
          await db.runAsync(
            `INSERT INTO change_log (table_name, row_id, operation, old_value, new_value, timestamp, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [parsed.tableName, rowId, parsed.operation, oldValueJson, newValueJson, now]
          );
        } catch (e) {
          console.warn('[ChangeLog] Failed to write change log:', e);
        }
      }

      return result;
    },
    closeAsync: async () => {
      await db.closeAsync();
    },
  };
  return proxy;
};

/**
 * 解析 SQL 操作，提取 tableName, operation, rowId
 */
interface SqlOperationInfo {
  tableName: string;
  operation: 'insert' | 'update' | 'delete';
  rowId: string;
  idParamIndex: number;
}

const parseSqlOperation = (sql: string, params?: any[]): SqlOperationInfo | null => {
  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  if (!upper.startsWith('INSERT') && !upper.startsWith('UPDATE') && !upper.startsWith('DELETE')) {
    return null;
  }

  let tableName = '';
  let operation: 'insert' | 'update' | 'delete' = 'insert';
  let rowId = '';
  let idParamIndex = -1;

  if (upper.startsWith('INSERT')) {
    operation = 'insert';
    const match = trimmed.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
    tableName = match ? match[1] : '';
    // INSERT 的第一个参数通常是 id
    if (params && params.length > 0) {
      rowId = String(params[0] || '');
      idParamIndex = 0;
    }
  } else if (upper.startsWith('UPDATE')) {
    operation = 'update';
    const match = trimmed.match(/UPDATE\s+(\w+)/i);
    tableName = match ? match[1] : '';
    // 查找 WHERE id = ?
    if (params && params.length > 0) {
      const whereMatch = trimmed.match(/WHERE\s+id\s*=\s*\?/i);
      if (whereMatch) {
        const beforeWhere = trimmed.substring(0, trimmed.indexOf('WHERE'));
      // 审计 M6：统计 WHERE 之前的 ? 占位符定位 id 参数索引
      // 注意：若 SET 子句中含字符串字面量 '?'，此计数会偏差
      // 使用传入的 params 数组顺序约定：id 始终是 WHERE 之后的第一个 ? 参数
      const paramCountBeforeWhere = (beforeWhere.match(/\?/g) || []).length;
        idParamIndex = paramCountBeforeWhere;
        if (idParamIndex < params.length) {
          rowId = String(params[idParamIndex] || '');
        }
      } else if (params.length > 0) {
        idParamIndex = params.length - 1;
        rowId = String(params[params.length - 1] || '');
      }
    }
  } else if (upper.startsWith('DELETE')) {
    operation = 'delete';
    const match = trimmed.match(/DELETE\s+FROM\s+(\w+)/i);
    tableName = match ? match[1] : '';
    // DELETE 的 WHERE 参数
    if (params && params.length > 0) {
      const whereMatch = trimmed.match(/WHERE\s+id\s*=\s*\?/i);
      if (whereMatch) {
        idParamIndex = 0;
        rowId = String(params[0] || '');
      } else {
        idParamIndex = 0;
        rowId = String(params[0] || '');
      }
    }
  }

  return { tableName, operation, rowId, idParamIndex };
};

/**
 * 从 SQL 中解析操作类型并自动写入变更日志
 */
/**
 * 移除所有业务表的变更日志触发器
 */
export const removeChangeLogTriggers = async (db: IDatabase): Promise<void> => {
  for (const table of TRACKED_TABLES) {
    for (const op of ['insert', 'update', 'delete']) {
      const triggerName = `trg_changelog_${table}_${op}`;
      try {
        await db.execAsync(`DROP TRIGGER IF EXISTS ${triggerName}`);
      } catch (e) {
        console.warn(`[ChangeLog] Failed to drop trigger ${triggerName}:`, e);
      }
    }
  }
  console.log('[ChangeLog] Removed all triggers');
};

/**
 * 为单张表创建 INSERT / UPDATE / DELETE 触发器
 */
const createTriggersForTable = async (db: IDatabase, table: string): Promise<void> => {
  // 先删除已有触发器（确保幂等）
  for (const op of ['insert', 'update', 'delete']) {
    await db.execAsync(`DROP TRIGGER IF EXISTS trg_changelog_${table}_${op}`);
  }

  const newJsonExpr = buildJsonObjectExpr('NEW', table);
  const oldJsonExpr = buildJsonObjectExpr('OLD', table);

  // INSERT 触发器
  await db.execAsync(`
    CREATE TRIGGER trg_changelog_${table}_insert
    AFTER INSERT ON ${table}
    FOR EACH ROW
    BEGIN
      INSERT INTO change_log (table_name, row_id, operation, old_value, new_value, timestamp, sync_status)
      VALUES ('${table}', NEW.id, 'insert', NULL, ${newJsonExpr},
              CAST(strftime('%s','now') AS INTEGER), 'pending');
    END
  `);

  // UPDATE 触发器
  await db.execAsync(`
    CREATE TRIGGER trg_changelog_${table}_update
    AFTER UPDATE ON ${table}
    FOR EACH ROW
    BEGIN
      INSERT INTO change_log (table_name, row_id, operation, old_value, new_value, timestamp, sync_status)
      VALUES ('${table}', NEW.id, 'update', ${oldJsonExpr}, ${newJsonExpr},
              CAST(strftime('%s','now') AS INTEGER), 'pending');
    END
  `);

  // DELETE 触发器
  await db.execAsync(`
    CREATE TRIGGER trg_changelog_${table}_delete
    AFTER DELETE ON ${table}
    FOR EACH ROW
    BEGIN
      INSERT INTO change_log (table_name, row_id, operation, old_value, new_value, timestamp, sync_status)
      VALUES ('${table}', OLD.id, 'delete', ${oldJsonExpr}, NULL,
              CAST(strftime('%s','now') AS INTEGER), 'pending');
    END
  `);
};

/**
 * 获取所有待同步的变更记录
 * @param db 数据库实例
 * @param limit 最大条数（默认500）
 * @returns 变更记录数组
 */
export const getPendingChanges = async (
  db: IDatabase,
  limit: number = 500
): Promise<ChangeLogEntry[]> => {
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM change_log WHERE sync_status = 'pending' ORDER BY timestamp ASC LIMIT ?`,
      [limit]
    );
    return rows as ChangeLogEntry[];
  } catch (error) {
    console.warn('[ChangeLog] Failed to get pending changes:', error);
    return [];
  }
};

/**
 * 获取待同步变更的汇总（按表分组统计）
 */
export const getPendingSummary = async (
  db: IDatabase
): Promise<{ tableName: string; insert: number; update: number; delete: number }[]> => {
  try {
    const rows = await db.getAllAsync(
      `SELECT table_name, operation, COUNT(*) as count 
       FROM change_log WHERE sync_status = 'pending' 
       GROUP BY table_name, operation 
       ORDER BY table_name`
    );
    const summaryMap = new Map<string, { insert: number; update: number; delete: number }>();
    for (const row of rows as any[]) {
      if (!summaryMap.has(row.table_name)) {
        summaryMap.set(row.table_name, { insert: 0, update: 0, delete: 0 });
      }
      const entry = summaryMap.get(row.table_name)!;
      entry[row.operation as keyof typeof entry] = row.count;
    }
    return Array.from(summaryMap.entries()).map(([tableName, counts]) => ({
      tableName,
      ...counts,
    }));
  } catch {
    return [];
  }
};

/**
 * 标记指定变更记录为已同步
 * @param db 数据库实例
 * @param changeIds 变更ID数组
 */
export const markSynced = async (
  db: IDatabase,
  changeIds: number[]
): Promise<void> => {
  if (changeIds.length === 0) return;

  try {
    const placeholders = changeIds.map(() => '?').join(',');
    // 审计 H5：使用 runAsync 显式绑定参数，避免 execAsync 平台差异
    await db.runAsync(
      `UPDATE change_log SET sync_status = 'synced' WHERE id IN (${placeholders})`,
      changeIds
    );
    console.log(`[ChangeLog] Marked ${changeIds.length} changes as synced`);
  } catch (error) {
    console.warn('[ChangeLog] Failed to mark synced:', error);
  }
};

/**
 * 清理已同步的变更记录
 * @param db 数据库实例
 * @param olderThan 清理早于此时间戳的记录（毫秒，默认7天前）
 */
export const clearSyncedChanges = async (
  db: IDatabase,
  olderThan: number = Date.now() - 7 * 24 * 60 * 60 * 1000
): Promise<number> => {
  try {
    const olderThanSeconds = Math.floor(olderThan / 1000);
    const result = await db.runAsync(
      `DELETE FROM change_log WHERE sync_status = 'synced' AND timestamp < ?`,
      [olderThanSeconds]
    );
    console.log(`[ChangeLog] Cleared ${result.rowsAffected} synced changes`);
    return result.rowsAffected;
  } catch (error) {
    console.warn('[ChangeLog] Failed to clear synced changes:', error);
    return 0;
  }
};

/**
 * 获取待同步变更数量
 */
export const getPendingCount = async (db: IDatabase): Promise<number> => {
  try {
    const row = await db.getFirstAsync(
      `SELECT COUNT(*) as count FROM change_log WHERE sync_status = 'pending'`
    );
    return (row as any)?.count || 0;
  } catch {
    return 0;
  }
};

/**
 * 手动写入变更日志（用于非触发器场景）
 */
export const writeChangeLog = async (
  db: IDatabase,
  tableName: string,
  rowId: string,
  operation: 'insert' | 'update' | 'delete',
  oldValue?: string,
  newValue?: string
): Promise<void> => {
  await db.runAsync(
    `INSERT INTO change_log (table_name, row_id, operation, old_value, new_value, timestamp, sync_status)
     VALUES (?, ?, ?, ?, ?, CAST(strftime('%s','now') AS INTEGER), 'pending')`,
    [tableName, rowId, operation, oldValue || null, newValue || null]
  );
};

export interface ChangeLogEntry {
  id: number;
  table_name: string;
  row_id: string;
  operation: 'insert' | 'update' | 'delete';
  old_value: string | null;
  new_value: string | null;
  timestamp: number;
  sync_status: 'pending' | 'synced';
}

export default {
  setupChangeLogTriggers,
  removeChangeLogTriggers,
  wrapWithChangeLog,
  getPendingChanges,
  getPendingSummary,
  markSynced,
  clearSyncedChanges,
  getPendingCount,
  writeChangeLog,
};
