/**
 * DataExportService - 跨身份数据导出/导入服务
 * 允许用户将一个身份的数据导出为 JSON，再导入到另一个身份。
 *
 * 对应 PRD v11.0 第6.3节：数据共享机制（可选）
 */

import { openDatabase } from './DatabaseFactory';
import type { IDatabase } from './DatabaseFactory';
import { logger } from '../utils/logger';
import { getErrorMessage } from '../utils/errorUtils';

/** 导出数据包结构 */
export interface ExportDataPackage {
  version: number;
  exportedAt: number;
  sourceProfileId: string;
  tables: Record<string, any[]>;
}

/** 导入配置 */
export interface ImportConfig {
  /** 遇到重复记录时的策略 */
  onConflict: 'skip' | 'overwrite' | 'ask';
  /** 是否同时导入关联表数据 */
  includeRelated: boolean;
  /** 是否在导入前清空目标表 */
  clearBeforeImport: boolean;
}

/** 导出表定义（含显示标签和图标） */
export interface ExportTableDef {
  key: string;
  label: string;
  icon: string;
}

export const DEFAULT_EXPORT_TABLES: ExportTableDef[] = [
  { key: 'product_spu', label: '商品 SPU', icon: 'package-variant-closed' },
  { key: 'product_sku', label: '商品 SKU', icon: 'barcode' },
  { key: 'product_categories', label: '商品分类', icon: 'shape' },
  { key: 'product_images', label: '商品图片', icon: 'image-multiple' },
  { key: 'brands', label: '品牌', icon: 'trademark' },
  { key: 'customers', label: '客户', icon: 'account-group' },
  { key: 'sales_orders', label: '销售订单', icon: 'file-document' },
  { key: 'sales_order_items', label: '销售订单明细', icon: 'format-list-bulleted' },
  { key: 'purchase_orders', label: '采购订单', icon: 'truck' },
  { key: 'purchase_order_items', label: '采购订单明细', icon: 'clipboard-list' },
  { key: 'inventory_transactions', label: '库存交易', icon: 'swap-horizontal-bold' },
];

const EXPORT_VERSION = 1;

/** 默认导出的业务表名列表 */
const DEFAULT_EXPORT_TABLE_NAMES = DEFAULT_EXPORT_TABLES.map(t => t.key);

// 不应导出的系统表
const SYSTEM_TABLES = new Set([
  'change_log',
  'sync_metadata',
  'plugin_registry',
  'plugin_migrations',
  'conflict_records',
]);

/**
 * 从指定身份导出数据
 * @param profileId 源身份ID
 * @param tableNames 要导出的表名列表（默认导出所有业务表）
 * @returns 导出的数据包
 */
export const exportProfileData = async (
  profileId: string,
  tableNames: string[] = DEFAULT_EXPORT_TABLE_NAMES
): Promise<ExportDataPackage> => {
  logger.log(`[DataExport] Exporting data from profile: ${profileId}`);

  const db = await openDatabase(profileId);
  const tables: Record<string, any[]> = {};

  for (const tableName of tableNames) {
    if (SYSTEM_TABLES.has(tableName)) {
      logger.warn(`[DataExport] Skipping system table: ${tableName}`);
      continue;
    }
    try {
      const rows = await db.getAllAsync(`SELECT * FROM ${tableName}`);
      tables[tableName] = rows;
      logger.log(`[DataExport] Exported ${rows.length} rows from ${tableName}`);
    } catch (error) {
      logger.warn(`[DataExport] Failed to export table ${tableName}:`, error);
    }
  }

  return {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    sourceProfileId: profileId,
    tables,
  };
};

/**
 * 将数据包导入到指定身份
 * @param profileId 目标身份ID
 * @param data 数据包
 * @param config 导入配置
 * @returns 导入统计
 */
export const importProfileData = async (
  profileId: string,
  data: ExportDataPackage,
  config: ImportConfig = { onConflict: 'skip', includeRelated: true, clearBeforeImport: false }
): Promise<{ imported: number; skipped: number; errors: string[] }> => {
  logger.log(`[DataExport] Importing data to profile: ${profileId}`);

  const result = { imported: 0, skipped: 0, errors: [] as string[] };
  const db = await openDatabase(profileId);

  for (const [tableName, rows] of Object.entries(data.tables)) {
    if (rows.length === 0) continue;

    try {
      // 清空表（如果需要）
      if (config.clearBeforeImport) {
        await db.runAsync(`DELETE FROM ${tableName}`);
      }

      for (const row of rows) {
        try {
          await importRow(db, tableName, row, config);
          result.imported++;
        } catch (error) {
          const msg = getErrorMessage(error);
          if (config.onConflict === 'skip' && msg.includes('UNIQUE')) {
            result.skipped++;
          } else {
            result.errors.push(`[${tableName}] ${msg || 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      result.errors.push(`[${tableName}] ${getErrorMessage(error, 'Table access error')}`);
    }
  }

  logger.log(`[DataExport] Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
  return result;
};

/**
 * 导入单行数据
 */
const importRow = async (
  db: IDatabase,
  tableName: string,
  row: Record<string, any>,
  config: ImportConfig
): Promise<void> => {
  const columns = Object.keys(row);
  const values = Object.values(row);
  const placeholders = columns.map(() => '?').join(', ');
  const colNames = columns.join(', ');

  if (config.onConflict === 'overwrite') {
    await db.runAsync(
      `INSERT OR REPLACE INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
      values
    );
  } else {
    // skip: 使用 INSERT OR IGNORE
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
      values
    );
    // rowsAffected 为 0 表示该行已被跳过（UNIQUE 约束冲突）
    // 抛出异常让调用方正确统计 skipped 数量
    if (result && result.rowsAffected === 0) {
      throw new Error(`UNIQUE constraint failed: row ${row.id || JSON.stringify(row)} already exists`);
    }
  }
};

/**
 * 预估指定身份各表的行数（用于 UI 显示数据量）
 * @param profileId 身份ID
 * @param tableNames 要预估的表名列表
 * @returns 表名 -> 行数的映射
 */
export const estimateRowCounts = async (
  profileId: string,
  tableNames: string[] = DEFAULT_EXPORT_TABLE_NAMES
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};

  try {
    const db = await openDatabase(profileId);

    for (const tableName of tableNames) {
      if (SYSTEM_TABLES.has(tableName)) continue;
      try {
        const row = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${tableName}`);
        counts[tableName] = (row as any)?.count || 0;
      } catch {
        counts[tableName] = 0;
      }
    }
  } catch (error) {
    logger.warn('[DataExport] Failed to estimate row counts:', error);
  }

  return counts;
};

export default {
  exportProfileData,
  importProfileData,
  estimateRowCounts,
};
