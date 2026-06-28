/// <reference types="jest" />

/**
 * 跨身份数据传输集成测试
 * 测试 DataExportService 的导出-导入完整流程：
 * 1. 导出源身份数据 -> 导入到目标身份
 * 2. 冲突策略 skip/overwrite
 * 3. 系统表不被导出
 *
 * 对应 PRD v11.0 第6.3节：数据共享机制
 */

import { exportProfileData, importProfileData, DEFAULT_EXPORT_TABLES } from '../DataExportService';
import type { ExportDataPackage } from '../DataExportService';
import type { IDatabase } from '../DatabaseFactory';

declare const global: typeof globalThis;

// In-memory mock database for integration testing
class MockDataExportDB implements IDatabase {
  private tables: Map<string, any[]> = new Map();

  constructor(profileId: string) {
    // Seed with business tables
    this.tables.set('product_spu', []);
    this.tables.set('customers', []);
    this.tables.set('sales_orders', []);
    // System tables
    this.tables.set('change_log', []);
    this.tables.set('sync_metadata', [{ key: 'device_id', value: 'test-device' }]);
    this.tables.set('plugin_registry', []);
  }

  getRows(tableName: string): any[] {
    return this.tables.get(tableName) || [];
  }

  async execAsync(sql: string, params?: any[]): Promise<void> {
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('DELETE')) {
      const match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      if (match) {
        const tableName = match[1];
        const table = this.tables.get(tableName);
        if (table) table.length = 0;
      }
    }
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return [];
    const tableName = fromMatch[1];
    const table = this.tables.get(tableName);
    return table ? [...table] : [];
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    const fromMatch = sql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) return null;
    const tableName = fromMatch[1];
    const table = this.tables.get(tableName);
    if (!table || table.length === 0) return null;

    // Handle COUNT(*) queries
    if (sql.toUpperCase().includes('COUNT(*)')) {
      return { 'COUNT(*)': table.length };
    }
    return { ...table[0] };
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    const upper = sql.trim().toUpperCase();

    if (upper.startsWith('DELETE') && !upper.includes('WHERE')) {
      const match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      if (match) {
        const table = this.tables.get(match[1]);
        if (table) table.length = 0;
      }
      return { rowsAffected: 1 };
    }

    if (upper.startsWith('INSERT')) {
      const match = sql.match(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/i);
      if (!match) return { rowsAffected: 0 };
      const tableName = match[1];
      const table = this.tables.get(tableName);
      if (!table) return { rowsAffected: 0 };

      const colMatch = sql.match(/\(([^)]+)\)\s*(?:VALUES|SELECT)/i);
      const cols = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];
      const row: any = {};
      cols.forEach((col, i) => {
        row[col] = params?.[i] ?? null;
      });

      // INSERT OR IGNORE: skip if unique constraint would be violated
      const isIgnore = upper.includes('INSERT OR IGNORE');
      if (isIgnore && row.id) {
        const existing = table.find(r => r.id === row.id);
        if (existing) return { rowsAffected: 0 };
      }

      // INSERT OR REPLACE: replace if exists
      const isReplace = upper.includes('INSERT OR REPLACE');
      if (isReplace && row.id) {
        const idx = table.findIndex(r => r.id === row.id);
        if (idx >= 0) {
          table[idx] = { ...table[idx], ...row };
          return { rowsAffected: 1 };
        }
      }

      table.push(row);
      return { rowsAffected: 1 };
    }

    return { rowsAffected: 0 };
  }

  async closeAsync(): Promise<void> {
    this.tables.clear();
  }
}

// Mock DatabaseFactory.openDatabase to return our mock DB
const mockDatabases: Record<string, MockDataExportDB> = {};
jest.mock('../DatabaseFactory', () => ({
  openDatabase: jest.fn(async (profileId: string) => {
    if (!mockDatabases[profileId]) {
      mockDatabases[profileId] = new MockDataExportDB(profileId);
    }
    return mockDatabases[profileId];
  }),
}));

import { openDatabase } from '../DatabaseFactory';

describe('跨身份数据传输集成测试 (PRD 6.3)', () => {
  const sourceProfileId = 'profile_source';
  const targetProfileId = 'profile_target';

  beforeEach(async () => {
    // Clear all mock databases
    Object.keys(mockDatabases).forEach(k => delete mockDatabases[k]);

    // Seed source profile with data
    const sourceDb = (await openDatabase(sourceProfileId)) as MockDataExportDB;
    const targetDb = (await openDatabase(targetProfileId)) as MockDataExportDB;

    // Source: add products
    sourceDb.getRows('product_spu').push(
      { id: 'spu_001', name: '商品A', price: 100, last_modified: 1000, created_at: 1000, updated_at: 1000 },
      { id: 'spu_002', name: '商品B', price: 200, last_modified: 1000, created_at: 1000, updated_at: 1000 },
    );

    // Source: add customers
    sourceDb.getRows('customers').push(
      { id: 'cust_001', name: '客户A', phone: '13800000001', last_modified: 1000, created_at: 1000, updated_at: 1000 },
    );

    // Source: add system table data (should NOT be exported)
    sourceDb.getRows('change_log').push(
      { id: 1, table_name: 'product_spu', row_id: 'spu_001', operation: 'insert', timestamp: 1000, sync_status: 'synced' },
    );

    // Target: seed with some existing data (for conflict testing)
    targetDb.getRows('product_spu').push(
      { id: 'spu_001', name: '目标已有商品', price: 999, last_modified: 1000, created_at: 1000, updated_at: 1000 },
    );
    targetDb.getRows('customers').push(
      { id: 'custom_cust_001', name: '目标自有客户', phone: '13900000001', last_modified: 1000, created_at: 1000, updated_at: 1000 },
    );
  });

  describe('导出-导入完整流程', () => {
    it('应完整导出一个身份的数据并导入到另一个身份', async () => {
      // === 1. 导出 ===
      const exportData = await exportProfileData(sourceProfileId);
      expect(exportData.version).toBe(1);
      expect(exportData.sourceProfileId).toBe(sourceProfileId);
      expect(exportData.exportedAt).toBeGreaterThan(0);

      // Verify exported tables
      expect(exportData.tables['product_spu']).toHaveLength(2);
      expect(exportData.tables['customers']).toHaveLength(1);

      // === 2. 系统表不应被导出 ===
      expect(exportData.tables['change_log']).toBeUndefined();
      expect(exportData.tables['sync_metadata']).toBeUndefined();
      expect(exportData.tables['plugin_registry']).toBeUndefined();

      // === 3. 导入到目标身份（overwrite模式）===
      const result = await importProfileData(targetProfileId, exportData, {
        onConflict: 'overwrite',
        includeRelated: true,
        clearBeforeImport: false,
      });

      expect(result.imported).toBeGreaterThan(0);
      expect(result.errors).toHaveLength(0);

      // === 4. Verify target now has source data ===
      const targetDb = (await openDatabase(targetProfileId)) as MockDataExportDB;

      // Overwrite: spu_001 should now have source data (not the target's old data)
      const products = targetDb.getRows('product_spu');
      const spu001 = products.find((p: any) => p.id === 'spu_001');
      expect(spu001?.name).toBe('商品A');  // Source overwrote target

      // Source's spu_002 should be present
      const spu002 = products.find((p: any) => p.id === 'spu_002');
      expect(spu002?.name).toBe('商品B');

      // Target's own customer should still be there
      const customers = targetDb.getRows('customers');
      expect(customers).toHaveLength(2); // 1 source + 1 target's own
    });
  });

  describe('冲突策略验证', () => {
    it('skip 模式应保留目标身份已有数据', async () => {
      const exportData = await exportProfileData(sourceProfileId);

      // Import with skip mode
      const result = await importProfileData(targetProfileId, exportData, {
        onConflict: 'skip',
        includeRelated: true,
        clearBeforeImport: false,
      });

      const targetDb = (await openDatabase(targetProfileId)) as MockDataExportDB;

      // spu_001 exists in target -> should be skipped, target's version remains
      const products = targetDb.getRows('product_spu');
      const spu001 = products.find((p: any) => p.id === 'spu_001');
      expect(spu001?.name).toBe('目标已有商品');  // Target's version preserved
      expect(spu001?.price).toBe(999);

      // spu_002 is new -> should be imported
      const spu002 = products.find((p: any) => p.id === 'spu_002');
      expect(spu002?.name).toBe('商品B');

      // Total: 2 source items, but spu_001 was skipped -> 1 new imported
      expect(result.skipped).toBeGreaterThanOrEqual(1);
    });

    it('overwrite 模式应用覆盖目标身份已有数据', async () => {
      const exportData = await exportProfileData(sourceProfileId);

      // Import with overwrite mode
      const result = await importProfileData(targetProfileId, exportData, {
        onConflict: 'overwrite',
        includeRelated: true,
        clearBeforeImport: false,
      });

      const targetDb = (await openDatabase(targetProfileId)) as MockDataExportDB;

      // spu_001 should be overwritten with source data
      const products = targetDb.getRows('product_spu');
      const spu001 = products.find((p: any) => p.id === 'spu_001');
      expect(spu001?.name).toBe('商品A');  // Source overwrote
      expect(spu001?.price).toBe(100);
    });

    it('clearBeforeImport 应在导入前清空目标表', async () => {
      const exportData = await exportProfileData(sourceProfileId);

      // Create a slim export with just customers
      const slimExport: ExportDataPackage = {
        version: 1,
        exportedAt: Date.now(),
        sourceProfileId: sourceProfileId,
        tables: {
          customers: exportData.tables['customers'],
        },
      };

      // Import with clearBeforeImport = true
      await importProfileData(targetProfileId, slimExport, {
        onConflict: 'overwrite',
        includeRelated: true,
        clearBeforeImport: true,
      });

      const targetDb = (await openDatabase(targetProfileId)) as MockDataExportDB;

      // Target's original customer should be gone (table was cleared)
      const customers = targetDb.getRows('customers');
      expect(customers).toHaveLength(1);  // Only the imported one
      expect(customers[0].name).toBe('客户A');  // Source's customer, not target's
    });
  });

  describe('系统表过滤', () => {
    it('系统表在导出时不应出现', async () => {
      const exportData = await exportProfileData(sourceProfileId);

      // Verify no system tables in export
      expect(exportData.tables['change_log']).toBeUndefined();
      expect(exportData.tables['sync_metadata']).toBeUndefined();
      expect(exportData.tables['plugin_registry']).toBeUndefined();
      expect(exportData.tables['plugin_migrations']).toBeUndefined();
      expect(exportData.tables['conflict_records']).toBeUndefined();
    });

    it('尝试在 tableNames 中提供系统表名应被忽略', async () => {
      // Attempt to export with system table names explicitly
      const exportData = await exportProfileData(sourceProfileId, [
        'product_spu',
        'change_log',
        'sync_metadata',
      ]);

      // System tables should be filtered out
      expect(exportData.tables['product_spu']).toBeDefined();
      expect(exportData.tables['change_log']).toBeUndefined();
      expect(exportData.tables['sync_metadata']).toBeUndefined();
    });
  });

  describe('空数据处理', () => {
    it('导出空身份不应报错', async () => {
      const emptyProfileId = 'profile_empty';
      const emptyDb = (await openDatabase(emptyProfileId)) as MockDataExportDB;
      // No data seeded

      const exportData = await exportProfileData(emptyProfileId);
      expect(exportData.tables['product_spu']).toHaveLength(0);
      expect(exportData.tables['customers']).toHaveLength(0);
    });

    it('导入空数据包不应报错', async () => {
      const emptyPackage: ExportDataPackage = {
        version: 1,
        exportedAt: Date.now(),
        sourceProfileId: 'empty_source',
        tables: {},
      };

      const result = await importProfileData(targetProfileId, emptyPackage, {
        onConflict: 'skip',
        includeRelated: true,
        clearBeforeImport: false,
      });

      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('DEFAULT_EXPORT_TABLES 常量验证', () => {
    it('DEFAULT_EXPORT_TABLES 应包含所有必需的业务表', () => {
      const tableKeys = DEFAULT_EXPORT_TABLES.map(t => t.key);
      expect(tableKeys).toContain('product_spu');
      expect(tableKeys).toContain('product_sku');
      expect(tableKeys).toContain('customers');
      expect(tableKeys).toContain('sales_orders');

      // Verify no system tables are included
      expect(tableKeys).not.toContain('change_log');
      expect(tableKeys).not.toContain('sync_metadata');
    });

    it('每个表定义应有 key, label 和 icon', () => {
      for (const def of DEFAULT_EXPORT_TABLES) {
        expect(def.key).toBeTruthy();
        expect(def.label).toBeTruthy();
        expect(def.icon).toBeTruthy();
      }
    });
  });
});
