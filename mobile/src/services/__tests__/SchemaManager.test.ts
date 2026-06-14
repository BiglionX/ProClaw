/// <reference types="jest" />

/**
 * SchemaManager 单元测试
 * 测试 applySchema 幂等性、系统表和业务表的创建
 */

import { applySchema, dropAllTables } from '../SchemaManager';
import type { IDatabase } from '../DatabaseFactory';

/** Mock 数据库实现，追踪 SQL 执行记录 */
class MockDatabase implements IDatabase {
  public executedSql: string[] = [];
  public createdTables: Set<string> = new Set();
  public metadata: Map<string, string> = new Map();
  public shouldFail = false;

  async execAsync(sql: string, _params?: any[]): Promise<void> {
    if (this.shouldFail) throw new Error('Mock failure');

    this.executedSql.push(sql);

    // 模拟 CREATE TABLE
    const createMatch = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
    if (createMatch) {
      this.createdTables.add(createMatch[1]);
      return;
    }

    // 模拟 DROP TABLE
    const dropMatch = sql.match(/DROP TABLE IF EXISTS\s+(\w+)/i);
    if (dropMatch) {
      this.createdTables.delete(dropMatch[1]);
    }
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    this.executedSql.push(sql);
    return [];
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    this.executedSql.push(sql);
    // 模拟 sync_metadata 查询（参数中检查 schema_version）
    if (sql.includes('sync_metadata') && params?.includes('schema_version')) {
      const version = this.metadata.get('schema_version');
      return version ? { value: version } : null;
    }
    return null;
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    this.executedSql.push(sql);
    // 模拟 INSERT OR REPLACE INTO sync_metadata
    if (sql.includes('INSERT OR REPLACE INTO sync_metadata') && params) {
      this.metadata.set(String(params[0]), String(params[1]));
    }
    return { rowsAffected: 1 };
  }

  async closeAsync(): Promise<void> {
    // no-op
  }

  /** 重置 mock 状态 */
  reset(): void {
    this.executedSql = [];
    this.createdTables.clear();
    this.metadata.clear();
    this.shouldFail = false;
  }

  /** 获取创建的系统表列表 */
  getSystemTables(): string[] {
    const systemTables = ['sync_metadata', 'device_info', 'change_log', 'plugin_registry', 'offline_queue'];
    return systemTables.filter(t => this.createdTables.has(t));
  }

  /** 获取创建的业务表列表 */
  getBusinessTables(): string[] {
    const businessTables = [
      'product_spu', 'product_sku', 'product_images', 'product_categories',
      'brands', 'customers', 'sales_orders', 'sales_order_items',
      'purchase_orders', 'purchase_order_items', 'inventory_transactions',
      'messages', 'product_attributes', 'product_spu_attributes',
    ];
    return businessTables.filter(t => this.createdTables.has(t));
  }
}

describe('SchemaManager', () => {
  let mockDb: MockDatabase;

  beforeEach(() => {
    mockDb = new MockDatabase();
  });

  describe('applySchema', () => {
    it('should create all system tables', async () => {
      await applySchema(mockDb as unknown as IDatabase);

      const systemTables = mockDb.getSystemTables();
      expect(systemTables).toContain('sync_metadata');
      expect(systemTables).toContain('device_info');
      expect(systemTables).toContain('change_log');
      expect(systemTables).toContain('plugin_registry');
      expect(systemTables).toContain('offline_queue');
    });

    it('should create all V1 business tables', async () => {
      await applySchema(mockDb as unknown as IDatabase);

      const businessTables = mockDb.getBusinessTables();
      expect(businessTables).toContain('product_spu');
      expect(businessTables).toContain('product_sku');
      expect(businessTables).toContain('customers');
      expect(businessTables).toContain('sales_orders');
      expect(businessTables).toContain('sales_order_items');
      expect(businessTables).toContain('purchase_orders');
      expect(businessTables).toContain('purchase_order_items');
      expect(businessTables).toContain('inventory_transactions');
      expect(businessTables).toContain('product_images');
      expect(businessTables).toContain('product_categories');
      expect(businessTables).toContain('brands');
      // SchemaManager V2 迁移会用 chat_sessions + chat_messages 替换旧的 messages 表
      // Mock 模拟 DROP TABLE 会从 createdTables 中删除，但不会重走 CREATE 逻辑
      // 因此 V2 后 mock 中不再保留 messages，但 chat_sessions/chat_messages 未被 mock 重放
      // 验证 V2 迁移的关键 SQL 已被执行（涉及 V2 重建）
      const executedSql = mockDb.executedSql.join('\n');
      expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS chat_sessions');
      expect(executedSql).toContain('CREATE TABLE IF NOT EXISTS chat_messages');
      expect(businessTables).not.toContain('messages');
      expect(businessTables).toContain('product_attributes');
      expect(businessTables).toContain('product_spu_attributes');
    });

    it('should be idempotent - calling twice should not create duplicate tables', async () => {
      await applySchema(mockDb as unknown as IDatabase);
      const tableCountAfterFirst = mockDb.createdTables.size;

      // 重置执行记录，但保留已创建表集合
      const executedBefore = mockDb.executedSql.length;
      await applySchema(mockDb as unknown as IDatabase);
      const executedAfter = mockDb.executedSql.length;

      // 表数量不变（幂等性）
      expect(mockDb.createdTables.size).toBe(tableCountAfterFirst);
    });

    it('should skip schema application if already up to date', async () => {
      // SchemaManager 当前 SCHEMA_VERSION = 3，mock 中设同样值应跳过所有迁移
      mockDb.metadata.set('schema_version', '3');

      const executedBefore = mockDb.executedSql.length;
      await applySchema(mockDb as unknown as IDatabase);
      const executedAfter = mockDb.executedSql.length;

      // 不应创建任何表（因为 schema 已是最新 v3）
      const createTableCount = mockDb.executedSql
        .slice(executedBefore)
        .filter(sql => sql.includes('CREATE TABLE'))
        .length;
      expect(createTableCount).toBe(0);
    });

    it('should create indexes for business tables', async () => {
      await applySchema(mockDb as unknown as IDatabase);

      const indexStatements = mockDb.executedSql.filter(sql =>
        sql.includes('CREATE INDEX')
      );
      expect(indexStatements.length).toBeGreaterThan(10);
    });

    it('should write schema version to sync_metadata after applying', async () => {
      await applySchema(mockDb as unknown as IDatabase);

      // SchemaManager 当前 SCHEMA_VERSION = 3 (升级后含 agent_profile_overrides)
      const versionValue = mockDb.metadata.get('schema_version');
      expect(versionValue).toBe('3');
    });
  });

  describe('dropAllTables', () => {
    it('should drop all created tables', async () => {
      await applySchema(mockDb as unknown as IDatabase);
      const tableCountBefore = mockDb.createdTables.size;
      expect(tableCountBefore).toBeGreaterThan(0);

      await dropAllTables(mockDb as unknown as IDatabase);
      expect(mockDb.createdTables.size).toBe(0);
    });

    it('should not throw when dropping tables on empty database', async () => {
      await expect(
        dropAllTables(mockDb as unknown as IDatabase)
      ).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully during applySchema', async () => {
      mockDb.shouldFail = true;
      // 不应抛出未捕获异常
      await expect(
        applySchema(mockDb as unknown as IDatabase)
      ).rejects.toThrow('Mock failure');
    });
  });
});
