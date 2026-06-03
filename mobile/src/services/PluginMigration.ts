/**
 * PluginMigration - 插件数据库迁移执行器
 * 对身份数据库执行插件的 up.sql / down.sql 脚本，管理迁移版本。
 *
 * 对应 PRD v11.0 第5.2节、第5.3节
 */

import type { IDatabase } from './DatabaseFactory';

/** 迁移状态 */
export type MigrationStatus = 'success' | 'failed' | 'already_applied';

/** 迁移结果 */
export interface MigrationResult {
  status: MigrationStatus;
  version: number;
  error?: string;
  appliedStatements: number;
}

/** 迁移记录 */
export interface PluginMigrationRecord {
  pluginId: string;
  version: number;
  appliedAt: number;
  checksum: string;
}

// 插件迁移版本记录表名
const MIGRATION_TABLE = 'plugin_migrations';

/**
 * 确保迁移记录表存在
 */
const ensureMigrationTable = async (db: IDatabase): Promise<void> => {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      plugin_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      applied_at INTEGER NOT NULL,
      checksum TEXT NOT NULL,
      PRIMARY KEY (plugin_id, version)
    )`
  );
};

/**
 * 计算 SQL 脚本的校验和（简单哈希用于检测脚本变更）
 */
export const computeChecksum = (sql: string): string => {
  let hash = 0;
  for (let i = 0; i < sql.length; i++) {
    const char = sql.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

/**
 * 从 SQL 脚本中解析版本号
 * 支持注释标记: -- @version N
 */
const parseVersionFromSql = (sql: string): number => {
  const match = sql.match(/--\s*@version\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 1;
};

/**
 * 将 SQL 拆分为独立语句
 * 按分号分割，过滤空语句和注释行
 */
export const splitStatements = (sql: string): string[] => {
  // 1. 移除多行注释 /* */
  let cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  // 2. 移除单行注释 --（整行或行尾），保留注释前的非注释内容
  cleaned = cleaned.replace(/--[^\n]*/g, '');
  return cleaned
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => {
      if (!stmt) return false;
      return true;
    });
};

/**
 * 执行插件 up.sql 迁移
 * @param db 身份数据库实例
 * @param pluginId 插件ID
 * @param upSql 迁移 SQL 脚本
 * @returns 迁移结果
 */
export const runPluginMigration = async (
  db: IDatabase,
  pluginId: string,
  upSql: string
): Promise<MigrationResult> => {
  try {
    await ensureMigrationTable(db);

    const version = parseVersionFromSql(upSql);
    const checksum = computeChecksum(upSql);

    // 检查当前版本是否已应用
    const existing = await db.getFirstAsync(
      `SELECT version, checksum FROM ${MIGRATION_TABLE} WHERE plugin_id = ? ORDER BY version DESC LIMIT 1`,
      [pluginId]
    );

    if (existing) {
      const record = existing as PluginMigrationRecord;
      if (record.version >= version) {
        return {
          status: 'already_applied',
          version: record.version,
          appliedStatements: 0,
        };
      }
    }

    // 分割并执行 SQL 语句（事务内）
    const statements = splitStatements(upSql);
    let appliedCount = 0;

    await db.execAsync('BEGIN TRANSACTION');
    try {
      for (const stmt of statements) {
        try {
          await db.execAsync(stmt);
          appliedCount++;
        } catch (error: any) {
          console.error(`[PluginMigration] Statement failed for ${pluginId}:`, stmt, error);
          throw new Error(`迁移语句执行失败: ${error?.message || '未知错误'}`);
        }
      }

      // 记录迁移版本
      const now = Math.floor(Date.now() / 1000);
      await db.runAsync(
        `INSERT OR REPLACE INTO ${MIGRATION_TABLE} (plugin_id, version, applied_at, checksum) VALUES (?, ?, ?, ?)`,
        [pluginId, version, now, checksum]
      );

      await db.execAsync('COMMIT');
    } catch (txError) {
      await db.execAsync('ROLLBACK');
      throw txError;
    }

    console.log(`[PluginMigration] Applied migration v${version} for plugin ${pluginId} (${appliedCount} statements)`);

    return {
      status: 'success',
      version,
      appliedStatements: appliedCount,
    };
  } catch (error: any) {
    const errMsg = error?.message || '未知迁移错误';
    console.error(`[PluginMigration] Migration failed for ${pluginId}:`, errMsg);
    return {
      status: 'failed',
      version: parseVersionFromSql(upSql),
      error: errMsg,
      appliedStatements: 0,
    };
  }
};

/**
 * 回滚插件 down.sql 迁移
 * @param db 身份数据库实例
 * @param pluginId 插件ID
 * @param downSql 回滚 SQL 脚本
 * @returns 回滚结果
 */
export const rollbackPluginMigration = async (
  db: IDatabase,
  pluginId: string,
  downSql: string
): Promise<MigrationResult> => {
  try {
    await ensureMigrationTable(db);

    const version = parseVersionFromSql(downSql);

    // 检查是否有对应版本的迁移记录
    const existing = await db.getFirstAsync(
      `SELECT version FROM ${MIGRATION_TABLE} WHERE plugin_id = ? AND version = ?`,
      [pluginId, version]
    );

    if (!existing) {
      // 没有迁移记录仍然执行回滚（幂等）
      console.warn(`[PluginMigration] No migration record found for ${pluginId} v${version}, executing anyway`);
    }

    // 执行回滚 SQL
    const statements = splitStatements(downSql);
    let appliedCount = 0;

    for (const stmt of statements) {
      try {
        await db.execAsync(stmt);
        appliedCount++;
      } catch (error: any) {
        console.error(`[PluginMigration] Rollback statement failed for ${pluginId}:`, stmt, error);
        // 回滚中允许单个语句失败（表可能已被其他操作删除）
      }
    }

    // 删除迁移记录
    await db.runAsync(
      `DELETE FROM ${MIGRATION_TABLE} WHERE plugin_id = ? AND version >= ?`,
      [pluginId, version]
    );

    console.log(`[PluginMigration] Rolled back v${version} for plugin ${pluginId} (${appliedCount} statements)`);

    return {
      status: 'success',
      version,
      appliedStatements: appliedCount,
    };
  } catch (error: any) {
    const errMsg = error?.message || '未知回滚错误';
    console.error(`[PluginMigration] Rollback failed for ${pluginId}:`, errMsg);
    return {
      status: 'failed',
      version: parseVersionFromSql(downSql),
      error: errMsg,
      appliedStatements: 0,
    };
  }
};

/**
 * 获取插件当前迁移版本
 */
export const getPluginMigrationVersion = async (
  db: IDatabase,
  pluginId: string
): Promise<number> => {
  try {
    await ensureMigrationTable(db);
    const row = await db.getFirstAsync(
      `SELECT MAX(version) as version FROM ${MIGRATION_TABLE} WHERE plugin_id = ?`,
      [pluginId]
    );
    return (row as any)?.version || 0;
  } catch {
    return 0;
  }
};

/**
 * 获取插件的完整迁移历史
 */
export const getPluginMigrationHistory = async (
  db: IDatabase,
  pluginId: string
): Promise<PluginMigrationRecord[]> => {
  try {
    await ensureMigrationTable(db);
    const rows = await db.getAllAsync(
      `SELECT * FROM ${MIGRATION_TABLE} WHERE plugin_id = ? ORDER BY version ASC`,
      [pluginId]
    );
    return rows as PluginMigrationRecord[];
  } catch {
    return [];
  }
};

/**
 * 获取所有插件的迁移摘要（用于备份恢复时重建）
 */
export const getAllMigrationSummaries = async (
  db: IDatabase
): Promise<{ pluginId: string; currentVersion: number }[]> => {
  try {
    await ensureMigrationTable(db);
    const rows = await db.getAllAsync(
      `SELECT plugin_id, MAX(version) as currentVersion FROM ${MIGRATION_TABLE} GROUP BY plugin_id`
    );
    return rows as { pluginId: string; currentVersion: number }[];
  } catch {
    return [];
  }
};

export default {
  runPluginMigration,
  rollbackPluginMigration,
  getPluginMigrationVersion,
  getPluginMigrationHistory,
  getAllMigrationSummaries,
};
