/**
 * DatabaseService (Native) - 兼容层
 * 委托给 DatabaseFactory 实现多身份数据库管理。
 */

import {
  openDatabase,
  closeDatabase as factoryCloseDatabase,
  closeAllDatabases,
  getDatabase,
  getCurrentProfileId,
} from './DatabaseFactory';

/**
 * 初始化数据库（兼容旧接口）
 * 注意：在新架构下，请在选择身份后调用 openDatabase()
 */
export const initDatabase = async (): Promise<void> => {
  console.log('[DatabaseService] initDatabase() called - use openDatabase(profileId) instead');
};

export { getDatabase, closeAllDatabases as closeDatabase };

/**
 * 清理缓存表（保留兼容）
 */
export const clearCache = async (): Promise<void> => {
  const db = getDatabase();
  const tables = ['offline_queue', 'products_cache', 'customers_cache', 'orders_cache', 'messages'];
  for (const table of tables) {
    try {
      await db.execAsync(`DELETE FROM ${table}`);
    } catch {
      // 表可能不存在
    }
  }
};

export { openDatabase, closeAllDatabases, getCurrentProfileId };

export default { initDatabase, getDatabase, closeDatabase: closeAllDatabases, clearCache, openDatabase };
