/// <reference types="jest" />

/**
 * 跨身份切换集成测试
 * 测试：多身份框架、身份切换时路由清理、数据隔离完整性
 *
 * 对应 PRD v11.0 第6.2节、验收标准第1条
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

// Mock expo-sqlite
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
            if (!data.tables[tableName]) data.tables[tableName] = [];
            const colMatch = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
            const cols = colMatch ? colMatch[1].split(',').map((c: string) => c.trim()) : [];
            const row: any = {};
            const flatParams = params.flat();
            cols.forEach((col: string, i: number) => {
              row[col] = flatParams[i] ?? null;
            });
            if (row.id) {
              const idx = data.tables[tableName].findIndex((r: any) => r.id === row.id);
              if (idx >= 0) data.tables[tableName][idx] = row;
              else data.tables[tableName].push(row);
            } else {
              data.tables[tableName].push(row);
            }
          }
        }
        return { changes: 1 };
      }),
      closeAsync: jest.fn().mockResolvedValue(undefined),
    };
  };
  return {
    openDatabaseAsync: jest.fn().mockImplementation(async (dbName: string) => {
      if (!dbCache[dbName]) dbCache[dbName] = { tables: {} };
      return createMockDb(dbName);
    }),
  };
}, { virtual: true });

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// Mock expo-file-system (dynamically imported by ProfileManager)
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  deleteAsync: jest.fn(),
}), { virtual: true });

import {
  createProfile,
  listProfiles,
  deleteProfile,
  getProfileDbPath,
} from '../ProfileManager';

import {
  openDatabase,
  closeAllDatabases,
  getDatabase,
  getCurrentProfileId,
} from '../DatabaseFactory';

import { applySchema } from '../SchemaManager';
import { registerPluginRoutes, unregisterPluginRoutes, getDynamicRoutes } from '../PluginRegistry';

describe('跨身份切换完整集成测试 (PRD 6.2)', () => {
  beforeEach(async () => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    await closeAllDatabases().catch(() => {});
  });

  afterAll(async () => {
    await closeAllDatabases().catch(() => {});
  });

  it('应能创建两个身份并验证数据完全隔离', async () => {
    // 创建身份A并写入数据
    const profileA = await createProfile('店铺A');
    const dbA = await openDatabase(profileA.id);
    await applySchema(dbA);

    await dbA.runAsync(
      `INSERT INTO product_spu (id, spu_code, name, last_modified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['spu_a', 'SPU-001', '商品A', 1000, 1000, 1000]
    );

    await dbA.runAsync(
      `INSERT INTO customers (id, name, phone, last_modified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['cust_a', '客户A', '13800000001', 1000, 1000, 1000]
    );

    // 创建身份B并写入数据
    const profileB = await createProfile('店铺B');
    const dbB = await openDatabase(profileB.id);
    await applySchema(dbB);

    await dbB.runAsync(
      `INSERT INTO product_spu (id, spu_code, name, last_modified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['spu_b', 'SPU-002', '商品B', 1000, 1000, 1000]
    );

    // 验证：身份B看不到身份A的数据
    const productsInB = await dbB.getAllAsync('SELECT * FROM product_spu');
    expect(productsInB).toHaveLength(1);
    expect(productsInB[0].id).toBe('spu_b');

    const customersInB = await dbB.getAllAsync('SELECT * FROM customers');
    expect(customersInB).toHaveLength(0);

    // 切回身份A验证数据完整
    const dbA2 = await openDatabase(profileA.id);
    const productsInA = await dbA2.getAllAsync('SELECT * FROM product_spu');
    expect(productsInA).toHaveLength(1);
    expect(productsInA[0].id).toBe('spu_a');

    const customersInA = await dbA2.getAllAsync('SELECT * FROM customers');
    expect(customersInA).toHaveLength(1);
    expect(customersInA[0].id).toBe('cust_a');
  });

  it('切换身份时应正确清理插件动态路由', async () => {
    // 身份A注册一些插件路由
    registerPluginRoutes('plugin_catering', [
      { path: '/catering', component: 'CateringView', title: '餐厅管理' },
    ]);
    registerPluginRoutes('plugin_beauty', [
      { path: '/beauty', component: 'BeautyView', title: '美容管理' },
    ]);

    expect(getDynamicRoutes()).toHaveLength(2);

    // 模拟 switchProfile 中的路由清理
    const pluginIds = [...new Set(getDynamicRoutes().map(r => r.pluginId))];
    for (const pid of pluginIds) {
      unregisterPluginRoutes(pid);
    }

    expect(getDynamicRoutes()).toHaveLength(0);
  });

  it('切换身份时应保持未受影响的身份插件路由', async () => {
    // 身份A有插件
    registerPluginRoutes('plugin_catering', [
      { path: '/catering', component: 'CateringView', title: '餐厅管理' },
    ]);

    // 清理后注册新插件（模拟切换后重新加载）
    unregisterPluginRoutes('plugin_catering');

    // 新身份加载不同的插件
    registerPluginRoutes('plugin_pet', [
      { path: '/pet', component: 'PetView', title: '宠物管理' },
    ]);

    const routes = getDynamicRoutes();
    expect(routes).toHaveLength(1);
    expect(routes[0].pluginId).toBe('plugin_pet');
  });

  it('删除身份时应能正确清理关联数据', async () => {
    const profile = await createProfile('待删除');
    await openDatabase(profile.id);
    await applySchema(getDatabase());

    // 验证身份存在
    let profiles = await listProfiles();
    expect(profiles).toHaveLength(1);

    // 删除身份
    const deleted = await deleteProfile(profile.id);
    expect(deleted).toBe(true);

    profiles = await listProfiles();
    expect(profiles).toHaveLength(0);
  });

  it('每个身份应有独立的数据库文件路径', async () => {
    const pathA = getProfileDbPath('profile_company_a');
    const pathB = getProfileDbPath('profile_company_b');

    expect(pathA).toContain('profile_company_a');
    expect(pathB).toContain('profile_company_b');
    expect(pathA).not.toEqual(pathB);
    expect(pathA).toMatch(/^profiles\/.+\/data\.db$/);
  });

  it('身份切换时 currentProfileId 应正确更新', async () => {
    const p1 = await createProfile('身份1');
    await openDatabase(p1.id);
    expect(getCurrentProfileId()).toBe(p1.id);

    const p2 = await createProfile('身份2');
    await openDatabase(p2.id);
    expect(getCurrentProfileId()).toBe(p2.id);

    // 切回身份1
    await openDatabase(p1.id);
    expect(getCurrentProfileId()).toBe(p1.id);
  });

  it('创建身份后 lastUsed 应与 createdAt 相同', async () => {
    const profile = await createProfile('新身份');
    expect(profile.lastUsed).toBe(profile.createdAt);
  });
});
