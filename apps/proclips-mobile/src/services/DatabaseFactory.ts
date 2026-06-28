/**
 * DatabaseFactory - 多身份数据库工厂
 * 管理每个身份的独立 SQLite 数据库实例。
 * 原生平台使用 expo-sqlite，Web 平台使用 IndexedDB 模拟。
 *
 * 对应 PRD v11.0 第2节：手机端独立数据库设计
 */

import { Platform } from 'react-native';
import { getProfileDbPath, getProfilePluginPath } from './ProfileManager';
import { logger } from '../utils/logger';

// 数据库实例缓存
const dbInstances: Map<string, any> = new Map();
let currentProfileId: string | null = null;
// 审计 C1：互斥锁防止并发打开/切换数据库
let dbMutex: Promise<void> = Promise.resolve();

/**
 * 数据库操作接口（统一抽象）
 */
export interface IDatabase {
  execAsync(sql: string, params?: any[]): Promise<void>;
  getAllAsync(sql: string, params?: any[]): Promise<any[]>;
  getFirstAsync(sql: string, params?: any[]): Promise<any | null>;
  runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }>;
  closeAsync(): Promise<void>;
}

/**
 * 获取当前身份的数据库实例
 */
export const getDatabase = (): IDatabase => {
  if (!currentProfileId) {
    throw new Error('[DatabaseFactory] No active profile. Call openDatabase() first.');
  }
  const db = dbInstances.get(currentProfileId);
  if (!db) {
    throw new Error(`[DatabaseFactory] Database not opened for profile: ${currentProfileId}`);
  }
  return db;
};

/**
 * 打开加密数据库（使用密码对数据库文件进行加密）
 * 对应 PRD v11.0 第2.4节：数据库加密
 *
 * 注意：expo-sqlite 原生不支持 SQLCipher。
 * Web 平台通过 IndexedDB 无法加密；原生平台通过 expo-secure-store 存储密码派生密钥。
 * 当前实现是标记级加密方案：数据写入时用 AES-256-GCM 加密单个敏感字段，
 * 而非整个数据库文件加密。
 *
 * @param profileId 身份ID
 * @param password 加密密码（可选，不传则使用普通数据库）
 *
 * 审计 S10：加密标记写入失败时抛出错误（而非静默继续）
 * 审计 H6：函数名承诺加密，失败时调用方必须感知
 */
export const openEncryptedDatabase = async (profileId: string, password?: string): Promise<IDatabase> => {
  if (!password) {
    return openDatabase(profileId);
  }

  // 先打开普通数据库
  const db = await openDatabase(profileId);

  // 在 sync_metadata 中标记加密状态
  try {
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
      ['db_encrypted', 'true']
    );
    // 存储密码哈希作为验证
    const { generateHash } = await import('../utils/EncryptionUtil');
    const passwordHash = generateHash(password + profileId);
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_metadata (key, value) VALUES (?, ?)`,
      ['db_encryption_hash', passwordHash]
    );
    logger.log('[DatabaseFactory] Database encryption marker set for profile:', profileId);
  } catch (e) {
    // 审计 H6：加密标记写入失败时抛出错误
    logger.error('[DatabaseFactory] Failed to set encryption marker:', e);
    throw new Error('数据库加密初始化失败：无法写入加密标记');
  }

  return db;
};

/**
 * 检查数据库是否已加密
 * 审计 V2 修复：优先从已缓存的实例查询，避免 openDatabase 的副作用（切换 currentProfileId）
 */
export const isDatabaseEncrypted = async (profileId: string): Promise<boolean> => {
  try {
    // 优先使用已打开的数据库实例，避免副作用
    const db = dbInstances.get(profileId);
    if (db) {
      const row = await db.getFirstAsync(
        `SELECT value FROM sync_metadata WHERE key = 'db_encrypted'`
      );
      return (row as any)?.value === 'true';
    }
    // 审计 W1 修复：保存/恢复 currentProfileId，避免 openDatabase 副作用
    const prevProfileId = currentProfileId;
    const wasInCache = dbInstances.has(profileId);
    const tempDb = await openDatabase(profileId);
    try {
      const row = await tempDb.getFirstAsync(
        `SELECT value FROM sync_metadata WHERE key = 'db_encrypted'`
      );
      return (row as any)?.value === 'true';
    } finally {
      // 如果之前未缓存此数据库，用完需关闭
      if (!wasInCache) {
        await closeDatabase(profileId);
      }
      // 恢复之前的活跃数据库
      if (prevProfileId && prevProfileId !== profileId) {
        await openDatabase(prevProfileId);
      }
    }
  } catch {
    return false;
  }
};

/**
 * 验证数据库加密密码
 * 审计 W19：与 isDatabaseEncrypted 保持一致，优先使用缓存实例，
 * 否则保存/恢复 currentProfileId 避免切换副作用
 */
export const verifyEncryptionPassword = async (profileId: string, password: string): Promise<boolean> => {
  try {
    // 优先使用已打开的数据库实例，避免副作用
    const db = dbInstances.get(profileId);
    if (db) {
      const row = await db.getFirstAsync(
        `SELECT value FROM sync_metadata WHERE key = 'db_encryption_hash'`
      );
      if (!row) return false;
      const { generateHash } = await import('../utils/EncryptionUtil');
      const expectedHash = (row as any).value;
      const actualHash = generateHash(password + profileId);
      // 审计 V3 修复：使用 constant-time 比较防止时序攻击
      if (expectedHash.length !== actualHash.length) return false;
      let diff = 0;
      for (let i = 0; i < expectedHash.length; i++) {
        diff |= expectedHash.charCodeAt(i) ^ actualHash.charCodeAt(i);
      }
      return diff === 0;
    }

    // 未缓存时：保存/恢复 currentProfileId，避免 openDatabase 副作用
    const prevProfileId = currentProfileId;
    const wasInCache = dbInstances.has(profileId);
    const tempDb = await openDatabase(profileId);
    try {
      const row = await tempDb.getFirstAsync(
        `SELECT value FROM sync_metadata WHERE key = 'db_encryption_hash'`
      );
      if (!row) return false;
      const { generateHash } = await import('../utils/EncryptionUtil');
      const expectedHash = (row as any).value;
      const actualHash = generateHash(password + profileId);
      // 审计 V3 修复：使用 constant-time 比较防止时序攻击
      if (expectedHash.length !== actualHash.length) return false;
      let diff = 0;
      for (let i = 0; i < expectedHash.length; i++) {
        diff |= expectedHash.charCodeAt(i) ^ actualHash.charCodeAt(i);
      }
      return diff === 0;
    } finally {
      if (!wasInCache) {
        await closeDatabase(profileId);
      }
      if (prevProfileId && prevProfileId !== profileId) {
        await openDatabase(prevProfileId);
      }
    }
  } catch {
    return false;
  }
};

/**
 * 打开指定身份的数据库
 * 审计 C1：使用互斥锁防止并发打开/切换导致数据库状态混乱
 * @param profileId 身份ID
 */
export const openDatabase = async (profileId: string): Promise<IDatabase> => {
  // 审计 C1：互斥锁保证同一时刻只有一个 openDatabase 在执行
  const prevMutex = dbMutex;
  let releaseMutex: () => void = () => {};
  dbMutex = new Promise<void>((resolve) => { releaseMutex = resolve; });
  await prevMutex;

  try {
    // 如果已打开其他身份DB，先关闭
    if (currentProfileId && currentProfileId !== profileId) {
      await closeDatabase(currentProfileId);
    }

    // 如果已缓存，直接返回
    if (dbInstances.has(profileId)) {
      currentProfileId = profileId;
      return dbInstances.get(profileId)!;
    }

    const dbPath = getProfileDbPath(profileId);
    let db: IDatabase;

    if (Platform.OS === 'web') {
      db = await openWebDatabase(dbPath);
    } else {
      db = await openNativeDatabase(dbPath);
    }

    dbInstances.set(profileId, db);
    currentProfileId = profileId;
    logger.log(`[DatabaseFactory] Opened database for profile: ${profileId}`);
    return db;
  } finally {
    // 审计 R2-C6：try-catch release 防止异常导致互斥锁永久锁定
    try { releaseMutex(); } catch (e) {
      logger.warn('[DatabaseFactory] Mutex release failed:', e);
    }
  }
};

/**
 * 关闭指定身份的数据库
 * 审计 R2-T1：当前未使用互斥锁保护 closeDatabase。
 * 若与 openDatabase 的自动 closeDatabase 并发执行，可能导致竞态。
 * 后续可在 closeDatabase 中也使用 dbMutex。
 */
export const closeDatabase = async (profileId: string): Promise<void> => {
  const db = dbInstances.get(profileId);
  if (db) {
    await db.closeAsync();
    dbInstances.delete(profileId);
    logger.log(`[DatabaseFactory] Closed database for profile: ${profileId}`);
  }
  if (currentProfileId === profileId) {
    currentProfileId = null;
  }
};

/**
 * 关闭所有数据库连接
 */
export const closeAllDatabases = async (): Promise<void> => {
  for (const [profileId, db] of dbInstances.entries()) {
    await db.closeAsync();
  }
  dbInstances.clear();
  currentProfileId = null;
  logger.log('[DatabaseFactory] All databases closed');
};

/**
 * 获取当前活跃的身份ID
 */
export const getCurrentProfileId = (): string | null => {
  return currentProfileId;
};

/**
 * 检查指定身份数据库是否已打开
 */
export const isDatabaseOpen = (profileId: string): boolean => {
  return dbInstances.has(profileId);
};

// ============================================
// Web 平台：IndexedDB 模拟 SQLite
// ============================================

class WebIDBDatabase implements IDatabase {
  private dbName: string;
  private db: IDBDatabase | null = null;

  constructor(dbName: string) {
    this.dbName = dbName;
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // 创建元数据存储
        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'name' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async getTableStore(mode: IDBTransactionMode = 'readonly') {
    const db = await this.getDb();
    const tx = db.transaction('tables', mode);
    return tx.objectStore('tables');
  }

  async execAsync(sql: string, params?: any[]): Promise<void> {
    const upper = sql.trim().toUpperCase();

    if (upper.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
      if (!match) return;
      const tableName = match[1];
      const store = await this.getTableStore('readwrite');
      const existing = await new Promise<any>((resolve) => {
        const req = store.get(tableName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (!existing) {
        // 解析列定义
        const colMatch = sql.match(/\(([\s\S]*)\)/);
        const columns = colMatch ? this.parseColumns(colMatch[1]) : [];
        store.put({ name: tableName, columns, rows: [] });
      }
    } else if (upper.startsWith('INSERT')) {
      await this.handleInsert(sql, params);
    } else if (upper.startsWith('DELETE')) {
      const match = sql.match(/DELETE FROM\s+(\w+)/i);
      if (match) {
        const store = await this.getTableStore('readwrite');
        const table = await this.getTable(store, match[1]);
        if (table) {
          table.rows = [];
          store.put(table);
        }
      }
    } else if (upper.startsWith('UPDATE')) {
      await this.handleUpdate(sql, params);
    }
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    const store = await this.getTableStore();
    const match = sql.match(/FROM\s+(\w+)/i);
    if (!match) return [];
    const table = await this.getTable(store, match[1]);
    if (!table) return [];

    let rows = [...table.rows];

    // 处理 WHERE
    if (params && params.length > 0) {
      const whereClause = sql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|OFFSET|$)/i)?.[1];
      if (whereClause?.includes('LIKE')) {
        const term = String(params[0]).replace(/%/g, '').toLowerCase();
        rows = rows.filter((r: any) =>
          Object.values(r).some(v => String(v || '').toLowerCase().includes(term))
        );
      }
    }

    // 处理 ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(ASC|DESC)?/i);
    if (orderMatch) {
      const [, field, dir] = orderMatch;
      rows.sort((a: any, b: any) => {
        const cmp = String(a[field] || '').localeCompare(String(b[field] || ''));
        return dir?.toUpperCase() === 'DESC' ? -cmp : cmp;
      });
    }

    // 处理 LIMIT / OFFSET
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1]) : rows.length;
    const offset = offsetMatch ? parseInt(offsetMatch[1]) : 0;
    rows = rows.slice(offset, offset + limit);

    return rows;
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    const rows = await this.getAllAsync(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    await this.execAsync(sql, params);
    return { rowsAffected: 1 };
  }

  async closeAsync(): Promise<void> {
    this.db?.close();
    this.db = null;
  }

  private parseColumns(columnDefs: string): any[] {
    const columns: any[] = [];
    const parts = columnDefs.split(',').map(s => s.trim());
    for (const part of parts) {
      // 跳过约束定义
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CREATE|INDEX)/i.test(part)) continue;
      const colMatch = part.match(/^(\w+)/);
      if (colMatch) {
        columns.push({ name: colMatch[1] });
      }
    }
    return columns;
  }

  private async getTable(store: IDBObjectStore, name: string): Promise<any | null> {
    return new Promise((resolve) => {
      const req = store.get(name);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  private async handleInsert(sql: string, params?: any[]): Promise<void> {
    const match = sql.match(/INSERT OR (REPLACE|IGNORE|ROLLBACK|ABORT|FAIL)\s+INTO\s+(\w+)/i)
      || sql.match(/INSERT INTO\s+(\w+)/i);
    if (!match) return;

    const tableName = match[match.length - 1];
    const store = await this.getTableStore('readwrite');
    const table = await this.getTable(store, tableName);
    if (!table) return;

    const colMatch = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
    const cols = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];

    const row: any = {};
    cols.forEach((col, i) => {
      row[col] = params?.[i] ?? null;
    });

    const replaceMode = sql.toUpperCase().includes('OR REPLACE');
    if (replaceMode) {
      const pkIdx = table.rows.findIndex((r: any) => r.id === row.id);
      if (pkIdx >= 0) {
        table.rows[pkIdx] = row;
      } else {
        table.rows.push(row);
      }
    } else {
      table.rows.push(row);
    }

    store.put(table);
  }

  private async handleUpdate(sql: string, params?: any[]): Promise<void> {
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)(?:WHERE|$)/i);
    if (!match) return;

    const tableName = match[1];
    const setClause = match[2];
    const store = await this.getTableStore('readwrite');
    const table = await this.getTable(store, tableName);
    if (!table) return;

    // 解析 SET 子句
    const setPairs = setClause.split(',').map(s => {
      const parts = s.trim().split('=');
      return { col: parts[0].trim(), val: parts[1].trim() };
    });

    const whereMatch = sql.match(/WHERE\s+(.+)/i);
    for (const row of table.rows) {
      // 简化：如果没 WHERE 条件或者条件匹配，更新所有行
      if (!whereMatch || this.matchesWhere(row, whereMatch[1], params)) {
        setPairs.forEach((pair, idx) => {
          if (pair.val === '?') {
            row[pair.col] = params?.[idx] ?? row[pair.col];
          } else if (pair.val.toUpperCase() !== '?') {
            // 字面量
            row[pair.col] = pair.val.replace(/'/g, '');
          }
        });
      }
    }

    store.put(table);
  }

  private matchesWhere(row: any, whereClause: string, params?: any[]): boolean {
    // 简化实现：只处理 id = ? 模式
    const eqMatch = whereClause.match(/(\w+)\s*=\s*\?/);
    if (eqMatch) {
      return row[eqMatch[1]] === params?.[0];
    }
    return true;
  }
}

// ============================================
// Web 平台
// ============================================
const openWebDatabase = async (_dbPath: string): Promise<IDatabase> => {
  const dbName = `proclaw_${_dbPath.replace(/[\\/.]/g, '_')}`;
  return new WebIDBDatabase(dbName);
};

// ============================================
// 原生平台 (expo-sqlite)
// ============================================
const openNativeDatabase = async (dbPath: string): Promise<IDatabase> => {
  const SQLite = await import('expo-sqlite');
  // expo-sqlite 使用数据库名称而非路径
  const dbName = dbPath.replace(/[\\/]/g, '_');
  const db = await SQLite.openDatabaseAsync(dbName);
  return {
    // 审计 D3：expo-sqlite runAsync/getAllAsync/getFirstAsync 接受 (sql, params) 数组参数
    execAsync: async (sql: string, params?: any[]) => {
      if (params && params.length > 0) {
        await db.runAsync(sql, params as any);
      } else {
        await db.execAsync(sql);
      }
    },
    getAllAsync: async (sql: string, params?: any[]) => {
      if (params && params.length > 0) {
        return await db.getAllAsync(sql, params as any);
      }
      return await db.getAllAsync(sql);
    },
    getFirstAsync: async (sql: string, params?: any[]) => {
      if (params && params.length > 0) {
        return await db.getFirstAsync(sql, params as any);
      }
      return await db.getFirstAsync(sql);
    },
    runAsync: async (sql: string, params?: any[]) => {
      let result;
      if (params && params.length > 0) {
        result = await db.runAsync(sql, params as any);
      } else {
        result = await db.runAsync(sql);
      }
      return { rowsAffected: result.changes };
    },
    closeAsync: () => db.closeAsync(),
  };
};

export default {
  getDatabase,
  openDatabase,
  openEncryptedDatabase,
  closeDatabase,
  closeAllDatabases,
  getCurrentProfileId,
  isDatabaseOpen,
  isDatabaseEncrypted,
  verifyEncryptionPassword,
};
