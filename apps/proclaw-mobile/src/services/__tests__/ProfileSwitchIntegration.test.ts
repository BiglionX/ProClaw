/// <reference types="jest" />

/**
 * 集成测试：身份切换流程
 * 测试完整流程：创建身份 -> 打开数据库 -> 应用Schema -> 切换身份 -> 数据库隔离验证
 */

// Mock AsyncStorage
const mockStorage: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] || null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
}));

// Mock expo-sqlite - cache DB instances by name so data persists across profile switches
jest.mock('expo-sqlite', () => {
  const dbCache: Record<string, any> = {};

  const createMockDb = (dbName: string) => {
    const data = dbCache[dbName] || { tables: {} };
    dbCache[dbName] = data;

    return {
      execAsync: jest.fn().mockImplementation(async (sql: string) => {
        const upper = sql.trim().toUpperCase();
        if (upper.startsWith('CREATE TABLE')) {
          const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (match && !data.tables[match[1]]) {
            data.tables[match[1]] = [];
          }
        }
      }),
      getAllAsync: jest.fn().mockImplementation(async (sql: string) => {
        const match = sql.match(/FROM\s+(\w+)/i);
        if (!match) return [];
        const table = data.tables[match[1]];
        return table ? [...table] : [];
      }),
      getFirstAsync: jest.fn().mockImplementation(async (sql: string) => {
        const match = sql.match(/FROM\s+(\w+)/i);
        if (!match) return null;
        const table = data.tables[match[1]];
        if (!table || table.length === 0) return null;
        return { ...table[0] };
      }),
      runAsync: jest.fn().mockImplementation(async (sql: string, ...params: any[]) => {
        const upper = sql.trim().toUpperCase();
        if (upper.startsWith('INSERT')) {
          const match = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
          if (match) {
            const tableName = match[1];
            if (!data.tables[tableName]) {
              data.tables[tableName] = [];
            }
            const colMatch = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
            const cols = colMatch ? colMatch[1].split(',').map((c: string) => c.trim()) : [];
            const row: any = {};
            const flatParams = params.flat();
            cols.forEach((col: string, i: number) => {
              row[col] = flatParams[i] ?? null;
            });
            data.tables[tableName].push(row);
          }
        }
        return { changes: 1 };
      }),
      closeAsync: jest.fn().mockResolvedValue(undefined),
    };
  };

  return {
    openDatabaseAsync: jest.fn().mockImplementation(async (dbName: string) => {
      if (!dbCache[dbName]) {
        dbCache[dbName] = { tables: {} };
      }
      return createMockDb(dbName);
    }),
  };
}, { virtual: true });

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import {
  createProfile,
  listProfiles,
  deleteProfile,
  getCurrentProfile,
  setCurrentProfile,
  getProfileDbPath,
} from '../ProfileManager';

import {
  openDatabase,
  closeDatabase,
  closeAllDatabases,
  getDatabase,
  getCurrentProfileId,
  isDatabaseOpen,
} from '../DatabaseFactory';

import { applySchema } from '../SchemaManager';

describe('身份切换完整流程集成测试', () => {
  beforeEach(async () => {
    // 清空 mock 状态
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    await closeAllDatabases().catch(() => {});
  });

  afterAll(async () => {
    await closeAllDatabases().catch(() => {});
  });

  it('应能创建身份并打开其数据库', async () => {
    const profile = await createProfile('个人店铺');
    expect(profile.name).toBe('个人店铺');

    const db = await openDatabase(profile.id);
    expect(db).toBeDefined();

    await applySchema(db);

    expect(getCurrentProfileId()).toBe(profile.id);
    expect(isDatabaseOpen(profile.id)).toBe(true);
  });

  it('应能在两个身份间切换并保持数据隔离', async () => {
    // 创建身份A
    const profileA = await createProfile('店铺A');
    const dbA = await openDatabase(profileA.id);
    await applySchema(dbA);

    // 身份A写入一条数据
    await dbA.runAsync(
      `INSERT INTO product_spu (id, spu_code, name, last_modified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['spu_a', 'SPU-001', '商品A', 1000, 1000, 1000]
    );

    // 切换到身份B
    const profileB = await createProfile('店铺B');
    const dbB = await openDatabase(profileB.id);
    await applySchema(dbB);

    // 身份B查询 - 不应看到身份A的数据
    const productsInB = await dbB.getAllAsync('SELECT * FROM product_spu');
    expect(productsInB).toHaveLength(0);

    // 身份B写入自己的数据
    await dbB.runAsync(
      `INSERT INTO product_spu (id, spu_code, name, last_modified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['spu_b', 'SPU-002', '商品B', 1000, 1000, 1000]
    );

    // 切回身份A验证数据不变
    const dbA2 = await openDatabase(profileA.id);
    const productsInA = await dbA2.getAllAsync('SELECT * FROM product_spu');
    expect(productsInA).toHaveLength(1);
    expect(productsInA[0].id).toBe('spu_a');
  });

  it('切换身份时应正确更新 currentProfileId', async () => {
    const profile1 = await createProfile('身份1');
    await openDatabase(profile1.id);
    expect(getCurrentProfileId()).toBe(profile1.id);

    const profile2 = await createProfile('身份2');
    await openDatabase(profile2.id);
    expect(getCurrentProfileId()).toBe(profile2.id);

    // 切回身份1
    await openDatabase(profile1.id);
    expect(getCurrentProfileId()).toBe(profile1.id);
  });

  it('setCurrentProfile 应更新 AsyncStorage 中的最后使用时间', async () => {
    const profile = await createProfile('测试');

    // 记录设置前的 lastUsed
    const before = profile.lastUsed;

    // 延迟一点确保时间戳不同
    await new Promise(r => setTimeout(r, 10));

    await setCurrentProfile(profile.id);

    const current = await getCurrentProfile();
    expect(current?.id).toBe(profile.id);
    expect(current?.lastUsed).toBeGreaterThanOrEqual(before);
  });

  it('删除身份后应能正确清理数据库连接', async () => {
    const profile = await createProfile('待删除');
    await openDatabase(profile.id);
    expect(isDatabaseOpen(profile.id)).toBe(true);

    // 关闭数据库
    await closeDatabase(profile.id);
    expect(isDatabaseOpen(profile.id)).toBe(false);

    // 删除身份
    const deleted = await deleteProfile(profile.id);
    expect(deleted).toBe(true);

    const profiles = await listProfiles();
    expect(profiles).toHaveLength(0);
  });

  it('getProfileDbPath 应为每个身份生成隔离的路径', async () => {
    const pathA = getProfileDbPath('profile_a');
    const pathB = getProfileDbPath('profile_b');
    expect(pathA).toContain('profile_a');
    expect(pathB).toContain('profile_b');
    expect(pathA).not.toEqual(pathB);
  });

  it('无身份时应能正常处理空列表', async () => {
    const profiles = await listProfiles();
    expect(profiles).toEqual([]);

    const current = await getCurrentProfile();
    expect(current).toBeNull();
  });
});
