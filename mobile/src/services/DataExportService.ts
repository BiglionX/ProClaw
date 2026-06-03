/**
 * DataExportService - 跨身份数据导出/导入服务
 * 允许用户将一个身份的数据导出为 JSON，再导入到另一个身份。
 *
 * 对应 PRD v11.0 第6.3节：数据共享机制（可选）
 */

import { openDatabase } from './DatabaseFactory';
import type { IDatabase } from './DatabaseFactory';

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

const EXPORT_VERSION = 1;

/** 默认导出的业务表列表 */
const DEFAULT_EXPORT_TABLES = [
  'product_spu',
  'product_sku',
  'product_categories',
  'product_images',
  'brands',
  'customers',
  'sales_orders',
  'sales_order_items',
  'purchase_orders',
  'purchase_order_items',
  'inventory_transactions',
];

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
  tableNames: string[] = DEFAULT_EXPORT_TABLES
): Promise<ExportDataPackage> => {
  console.log(`[DataExport] Exporting data from profile: ${profileId}`);

  const db = await openDatabase(profileId);
  const tables: Record<string, any[]> = {};

  for (const tableName of tableNames) {
    if (SYSTEM_TABLES.has(tableName)) {
      console.warn(`[DataExport] Skipping system table: ${tableName}`);
      continue;
    }
    try {
      const rows = await db.getAllAsync(`SELECT * FROM ${tableName}`);
      tables[tableName] = rows;
      console.log(`[DataExport] Exported ${rows.length} rows from ${tableName}`);
    } catch (error) {
      console.warn(`[DataExport] Failed to export table ${tableName}:`, error);
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
  console.log(`[DataExport] Importing data to profile: ${profileId}`);

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
        } catch (error: any) {
          if (config.onConflict === 'skip' && (error as any)?.message?.includes('UNIQUE')) {
            result.skipped++;
          } else {
            result.errors.push(`[${tableName}] ${error?.message || 'Unknown error'}`);
          }
        }
      }
    } catch (error: any) {
      result.errors.push(`[${tableName}] ${error?.message || 'Table access error'}`);
    }
  }

  console.log(`[DataExport] Import complete: ${result.imported} imported, ${result.skipped} skipped, ${result.errors.length} errors`);
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
    await db.runAsync(
      `INSERT OR IGNORE INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
      values
    );
  }
};

export default {
  exportProfileData,
  importProfileData,
};
