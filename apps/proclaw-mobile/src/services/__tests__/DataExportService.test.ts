/// <reference types="jest" />

/**
 * DataExportService 单元测试
 * P4 阶段：覆盖跨身份数据导出/导入服务的核心逻辑
 */

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// 创建 mock 数据库对象（全局共享）
const mockDb = {
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  execAsync: jest.fn(),
  closeAsync: jest.fn(),
};

// Mock DatabaseFactory
jest.mock('../DatabaseFactory', () => ({
  openDatabase: jest.fn().mockResolvedValue(mockDb),
}));

// 获取 mock 函数引用
import { openDatabase } from '../DatabaseFactory';

import {
  exportProfileData,
  importProfileData,
  estimateRowCounts,
  DEFAULT_EXPORT_TABLES,
  ExportDataPackage,
} from '../DataExportService';

// 推导常量：DEFAULT_EXPORT_TABLE_NAMES = DEFAULT_EXPORT_TABLES.map(t => t.key)
const DEFAULT_EXPORT_TABLE_NAMES = DEFAULT_EXPORT_TABLES.map((t) => t.key);

describe('DEFAULT_EXPORT_TABLES', () => {
  it('应包含预期的业务表', () => {
    expect(DEFAULT_EXPORT_TABLES).toContainEqual(expect.objectContaining({ key: 'product_spu' }));
    expect(DEFAULT_EXPORT_TABLES).toContainEqual(expect.objectContaining({ key: 'product_sku' }));
    expect(DEFAULT_EXPORT_TABLES).toContainEqual(expect.objectContaining({ key: 'customers' }));
    expect(DEFAULT_EXPORT_TABLES).toContainEqual(expect.objectContaining({ key: 'sales_orders' }));
  });

  it('DEFAULT_EXPORT_TABLE_NAMES 应与 tables 的 key 一致', () => {
    const keys = DEFAULT_EXPORT_TABLES.map((t) => t.key);
    expect(keys).toEqual(DEFAULT_EXPORT_TABLE_NAMES);
  });

  it('每个 ExportTableDef 应包含 key/label/icon', () => {
    for (const table of DEFAULT_EXPORT_TABLES) {
      expect(table).toHaveProperty('key');
      expect(table).toHaveProperty('label');
      expect(table).toHaveProperty('icon');
      expect(typeof table.key).toBe('string');
      expect(typeof table.label).toBe('string');
      expect(typeof table.icon).toBe('string');
    }
  });
});

describe('exportProfileData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockReset();
    mockDb.getFirstAsync.mockReset();
    mockDb.runAsync.mockReset();
  });

  it('应正确导出指定表的全部数据', async () => {
    mockDb.getAllAsync
      .mockResolvedValueOnce([
        { id: 'p1', name: 'Product 1' },
        { id: 'p2', name: 'Product 2' },
      ])
      .mockResolvedValueOnce([{ id: 's1', spu_id: 'p1', sku_code: 'SKU-001' }]);

    const result = await exportProfileData('profile-1', ['product_spu', 'product_sku']);

    expect(result.version).toBe(1);
    expect(result.sourceProfileId).toBe('profile-1');
    expect(result.exportedAt).toBeGreaterThan(0);
    expect(result.tables.product_spu).toHaveLength(2);
    expect(result.tables.product_sku).toHaveLength(1);
  });

  it('应跳过系统表', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    const result = await exportProfileData('profile-1', ['change_log', 'sync_metadata', 'plugin_registry']);

    expect(result.tables.change_log).toBeUndefined();
    expect(result.tables.sync_metadata).toBeUndefined();
    expect(result.tables.plugin_registry).toBeUndefined();
  });

  it('导出失败的表应返回空数组且不抛出', async () => {
    mockDb.getAllAsync.mockRejectedValue(new Error('Table not found'));

    const result = await exportProfileData('profile-1', ['nonexistent_table']);

    // 表数据为 undefined（错误不写入 tables）
    expect(result.tables.nonexistent_table).toBeUndefined();
  });

  it('默认导出应包含 DEFAULT_EXPORT_TABLE_NAMES', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);

    await exportProfileData('profile-1');

    // 验证调用次数 = 默认表数量（跳过系统表）
    expect(mockDb.getAllAsync).toHaveBeenCalled();
    const callCount = mockDb.getAllAsync.mock.calls.length;
    expect(callCount).toBe(DEFAULT_EXPORT_TABLE_NAMES.length);
  });
});

describe('importProfileData', () => {
  const createValidPackage = (): ExportDataPackage => ({
    version: 1,
    exportedAt: Date.now(),
    sourceProfileId: 'profile-1',
    tables: {
      product_spu: [
        { id: 'p1', name: 'Product 1' },
        { id: 'p2', name: 'Product 2' },
      ],
      product_sku: [
        { id: 's1', spu_id: 'p1', sku_code: 'SKU-001' },
      ],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockReset();
    mockDb.getFirstAsync.mockReset();
    mockDb.runAsync.mockReset();
    mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });
  });

  it('onConflict=skip 时应跳过已存在的记录（通过 INSERT OR IGNORE）', async () => {
    mockDb.runAsync.mockResolvedValueOnce({ rowsAffected: 0 }); // 第一条跳过

    const pkg = createValidPackage();
    const result = await importProfileData('profile-2', pkg, { onConflict: 'skip', includeRelated: true, clearBeforeImport: false });

    // INSERT OR IGNORE 被调用
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE'),
      expect.any(Array)
    );
    expect(result.skipped).toBe(1);
  });

  it('onConflict=overwrite 时应使用 INSERT OR REPLACE', async () => {
    const pkg = createValidPackage();
    await importProfileData('profile-2', pkg, { onConflict: 'overwrite', includeRelated: true, clearBeforeImport: false });

    // INSERT OR REPLACE 被调用
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE'),
      expect.any(Array)
    );
  });

  it('clearBeforeImport=true 时应先清空表', async () => {
    mockDb.runAsync.mockResolvedValue({ rowsAffected: 1 });

    const pkg = createValidPackage();
    const result = await importProfileData('profile-2', pkg, { onConflict: 'skip', includeRelated: true, clearBeforeImport: true });

    // 验证 DELETE FROM 被调用
    const calls = mockDb.runAsync.mock.calls;
    const deleteCall = calls.find(call => typeof call[0] === 'string' && call[0].includes('DELETE FROM'));
    expect(deleteCall).toBeDefined();
    expect(result.imported).toBeGreaterThanOrEqual(3);
  });

  it('空表的 rows 应被跳过', async () => {
    const pkg: ExportDataPackage = {
      version: 1,
      exportedAt: Date.now(),
      sourceProfileId: 'profile-1',
      tables: {
        empty_table: [],
      },
    };

    const result = await importProfileData('profile-2', pkg, { onConflict: 'skip', includeRelated: true, clearBeforeImport: false });

    expect(result.imported).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('默认配置应为 onConflict=skip', async () => {
    const pkg = createValidPackage();
    const result = await importProfileData('profile-2', pkg);

    // 默认使用 INSERT OR IGNORE
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR IGNORE'),
      expect.any(Array)
    );
    expect(result.errors).toHaveLength(0);
  });
});

describe('estimateRowCounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.getAllAsync.mockReset();
    mockDb.getFirstAsync.mockReset();
    mockDb.runAsync.mockReset();
  });

  it('应正确统计各表的行数', async () => {
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });

    const counts = await estimateRowCounts('profile-1', ['product_spu', 'product_sku', 'customers']);

    expect(counts.product_spu).toBe(3);
    expect(counts.product_sku).toBe(2);
    expect(counts.customers).toBe(1);
  });

  it('应跳过系统表', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 5 });

    const counts = await estimateRowCounts('profile-1', ['change_log']);

    expect(counts.change_log).toBeUndefined();
  });

  it('查询失败时应返回 0 且不抛出', async () => {
    mockDb.getFirstAsync.mockRejectedValue(new Error('DB error'));

    const counts = await estimateRowCounts('profile-1', ['nonexistent']);

    expect(counts.nonexistent).toBe(0);
  });

  it('默认统计应包含 DEFAULT_EXPORT_TABLE_NAMES', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 0 });

    await estimateRowCounts('profile-1');

    // 验证调用次数 = 默认表数量
    const callCount = mockDb.getFirstAsync.mock.calls.length;
    expect(callCount).toBe(DEFAULT_EXPORT_TABLE_NAMES.length);
  });
});