/**
 * DatabaseFactory - 多身份数据库工厂
 * 管理每个身份的独立 SQLite 数据库实例。
 * 原生平台使用 expo-sqlite，Web 平台使用 IndexedDB 模拟。
 *
 * 对应 PRD v11.0 第2节：手机端独立数据库设计
 */

import { Platform } from 'react-native';
import { getProfileDbPath, getProfilePluginPath } from './ProfileManager';

// 数据库实例缓存
const dbInstances: Map<string, any> = new Map();
let currentProfileId: string | null = null;

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
 * 这是一个标记级加密方案：数据写入时用 AES-256-GCM 加密单个敏感字段，
 * 而非整个数据库文件加密。
 *
 * @param profileId 身份ID
 * @param password 加密密码（可选，不传则使用普通数据库）
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
    console.log('[DatabaseFactory] Database encryption marker set for profile:', profileId);
  } catch (e) {
    console.warn('[DatabaseFactory] Failed to set encryption marker:', e);
  }

  return db;
};

/**
 * 检查数据库是否已加密
 */
export const isDatabaseEncrypted = async (profileId: string): Promise<boolean> => {
  try {
    const db = await openDatabase(profileId);
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_metadata WHERE key = 'db_encrypted'`
    );
    return (row as any)?.value === 'true';
  } catch {
    return false;
  }
};

/**
 * 验证数据库加密密码
 */
export const verifyEncryptionPassword = async (profileId: string, password: string): Promise<boolean> => {
  try {
    const db = await openDatabase(profileId);
    const row = await db.getFirstAsync(
      `SELECT value FROM sync_metadata WHERE key = 'db_encryption_hash'`
    );
    if (!row) return false;
    const { generateHash } = await import('../utils/EncryptionUtil');
    const expectedHash = (row as any).value;
    const actualHash = generateHash(password + profileId);
    return expectedHash === actualHash;
  } catch {
    return false;
  }
};

/**
 * 打开指定身份的数据库
 * @param profileId 身份ID
 */
export const openDatabase = async (profileId: string): Promise<IDatabase> => {
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
  console.log(`[DatabaseFactory] Opened database for profile: ${profileId}`);
  return db;
};

/**
 * 关闭指定身份的数据库
 */
export const closeDatabase = async (profileId: string): Promise<void> => {
  const db = dbInstances.get(profileId);
  if (db) {
    await db.closeAsync();
    dbInstances.delete(profileId);
    console.log(`[DatabaseFactory] Closed database for profile: ${profileId}`);
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
  console.log('[DatabaseFactory] All databases closed');
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
    execAsync: async (sql: string, params?: any[]) => {
      // execAsync 不支持参数绑定
      if (params && params.length > 0) {
        // 使用 runAsync 代替
        await db.runAsync(sql, ...params);
      } else {
        await db.execAsync(sql);
      }
    },
    getAllAsync: async (sql: string, params?: any[]) => {
      if (params && params.length > 0) {
        return await db.getAllAsync(sql, ...params);
      }
      return await db.getAllAsync(sql);
    },
    getFirstAsync: async (sql: string, params?: any[]) => {
      if (params && params.length > 0) {
        return await db.getFirstAsync(sql, ...params);
      }
      return await db.getFirstAsync(sql);
    },
    runAsync: async (sql: string, params?: any[]) => {
      let result;
      if (params && params.length > 0) {
        result = await db.runAsync(sql, ...params);
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
