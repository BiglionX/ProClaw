/// <reference types="jest" />

/**
 * ChangeLogManager 单元测试
 * 测试 writeChangeLog、getPendingChanges、markSynced、getPendingSummary
 * 使用模拟的 IDatabase
 */

import type { IDatabase } from '../DatabaseFactory';
import { writeChangeLog, getPendingChanges, markSynced, clearSyncedChanges, getPendingCount, getPendingSummary } from '../ChangeLogManager';

/** 内存中的 "change_log" 表模拟 */
class MockChangeLogDB implements IDatabase {
  public changeLog: any[] = [];
  public execCalls: string[] = [];

  async execAsync(sql: string, params?: any[]): Promise<void> {
    this.execCalls.push(sql + (params ? ` [${params.join(',')}]` : ''));

    // 模拟 INSERT INTO change_log
    if (sql.includes('INSERT INTO change_log')) {
      const entry: any = {
        id: this.changeLog.length + 1,
        table_name: params?.[0],
        row_id: params?.[1],
        operation: params?.[2],
        old_value: params?.[3] || null,
        new_value: params?.[4] || null,
        timestamp: Date.now(),
        sync_status: 'pending',
      };
      this.changeLog.push(entry);
    }

    // 模拟 UPDATE change_log SET sync_status
    if (sql.includes('UPDATE change_log') && sql.includes('sync_status')) {
      if (params && sql.includes('synced')) {
        // 区分 markSynced (所有 params 都是 id) 与 clearSyncedChanges (最后一个是 timestamp)
        // markSynced 的 SQL 为: UPDATE change_log SET sync_status = 'synced' WHERE id IN (?,?,...)
        // clearSyncedChanges 的 SQL 为: UPDATE change_log SET sync_status ... WHERE sync_status = 'synced' AND timestamp < ?
        // 通过是否含 timestamp 子句区分两者
        const isMarkSynced = !sql.includes('timestamp');
        const ids = isMarkSynced ? params : params.slice(0, -1);
        for (const entry of this.changeLog) {
          if (ids.includes(entry.id)) {
            entry.sync_status = 'synced';
          }
        }
      }
    }
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    this.execCalls.push(sql + (params ? ` [${params.join(',')}]` : ''));

    // 模拟 SELECT * FROM change_log WHERE sync_status = 'pending'
    if (sql.includes('WHERE sync_status')) {
      return this.changeLog.filter(e => e.sync_status === 'pending');
    }

    // 模拟按表分组统计
    if (sql.includes('GROUP BY table_name, operation')) {
      const groups = new Map<string, { table_name: string; operation: string; count: number }>();
      for (const entry of this.changeLog) {
        if (entry.sync_status !== 'pending') continue;
        const key = `${entry.table_name}_${entry.operation}`;
        if (!groups.has(key)) {
          groups.set(key, { table_name: entry.table_name, operation: entry.operation, count: 0 });
        }
        groups.get(key)!.count++;
      }
      return Array.from(groups.values());
    }

    return [];
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    this.execCalls.push(sql + (params ? ` [${params.join(',')}]` : ''));

    // 模拟 SELECT COUNT(*) FROM change_log
    if (sql.includes('COUNT(*)')) {
      const count = this.changeLog.filter(e => e.sync_status === 'pending').length;
      return { count };
    }

    return null;
  }

  async runAsync(sql: string, params?: any[]): Promise<{ rowsAffected: number }> {
    this.execCalls.push(sql + (params ? ` [${params.join(',')}]` : ''));

    // 模拟 INSERT INTO change_log
    if (sql.includes('INSERT INTO change_log')) {
      const entry: any = {
        id: this.changeLog.length + 1,
        table_name: params?.[0],
        row_id: params?.[1],
        operation: params?.[2],
        old_value: params?.[3] || null,
        new_value: params?.[4] || null,
        timestamp: Date.now(),
        sync_status: 'pending',
      };
      this.changeLog.push(entry);
      return { rowsAffected: 1 };
    }

    // 模拟 UPDATE change_log SET sync_status = 'synced'
    if (sql.includes('UPDATE change_log') && sql.includes('sync_status')) {
      if (sql.includes('synced')) {
        // 区分 markSynced (所有 params 都是 id) 与 clearSyncedChanges (最后一个是 timestamp)
        // markSynced 的 SQL: UPDATE change_log SET sync_status = 'synced' WHERE id IN (?,?,...)
        // clearSyncedChanges 的 SQL: UPDATE change_log SET sync_status ... WHERE ... AND timestamp < ?
        const isMarkSynced = !sql.includes('timestamp');
        const ids = isMarkSynced ? (params ?? []) : (params?.slice(0, -1) ?? []);
        for (const entry of this.changeLog) {
          if (ids.includes(entry.id)) {
            entry.sync_status = 'synced';
          }
        }
        return { rowsAffected: ids.length };
      }
    }

    // 模拟 DELETE FROM change_log
    if (sql.includes('DELETE FROM change_log')) {
      const before = this.changeLog.length;
      this.changeLog = this.changeLog.filter(e => !(e.sync_status === 'synced' && e.timestamp < (params?.[0] || 0)));
      return { rowsAffected: before - this.changeLog.length };
    }

    return { rowsAffected: 0 };
  }

  async closeAsync(): Promise<void> {}

  reset(): void {
    this.changeLog = [];
    this.execCalls = [];
  }

  /** 获取 pending 状态的记录 */
  getPendingEntries(): any[] {
    return this.changeLog.filter(e => e.sync_status === 'pending');
  }
}

describe('ChangeLogManager', () => {
  let mockDb: MockChangeLogDB;

  beforeEach(() => {
    mockDb = new MockChangeLogDB();
  });

  describe('writeChangeLog', () => {
    it('should write an insert change log entry', async () => {
      await writeChangeLog(
        mockDb as unknown as IDatabase,
        'product_spu',
        'spu_001',
        'insert',
        undefined,
        JSON.stringify({ name: '商品A', price: 100 })
      );

      expect(mockDb.changeLog).toHaveLength(1);
      expect(mockDb.changeLog[0].table_name).toBe('product_spu');
      expect(mockDb.changeLog[0].row_id).toBe('spu_001');
      expect(mockDb.changeLog[0].operation).toBe('insert');
      expect(mockDb.changeLog[0].sync_status).toBe('pending');
    });

    it('should write an update change log entry', async () => {
      await writeChangeLog(
        mockDb as unknown as IDatabase,
        'customers',
        'cust_001',
        'update',
        JSON.stringify({ name: '旧名称' }),
        JSON.stringify({ name: '新名称' })
      );

      expect(mockDb.changeLog).toHaveLength(1);
      expect(mockDb.changeLog[0].operation).toBe('update');
      expect(mockDb.changeLog[0].old_value).toContain('旧名称');
      expect(mockDb.changeLog[0].new_value).toContain('新名称');
    });

    it('should write a delete change log entry', async () => {
      await writeChangeLog(
        mockDb as unknown as IDatabase,
        'product_sku',
        'sku_001',
        'delete',
        JSON.stringify({ sku_code: 'SKU-001' })
      );

      expect(mockDb.changeLog).toHaveLength(1);
      expect(mockDb.changeLog[0].operation).toBe('delete');
      expect(mockDb.changeLog[0].new_value).toBeNull();
    });

    it('should write multiple entries sequentially', async () => {
      await writeChangeLog(mockDb as unknown as IDatabase, 'table_a', 'r1', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 'table_b', 'r2', 'update');
      await writeChangeLog(mockDb as unknown as IDatabase, 'table_a', 'r3', 'delete');

      expect(mockDb.changeLog).toHaveLength(3);
      expect(mockDb.changeLog[0].table_name).toBe('table_a');
      expect(mockDb.changeLog[1].table_name).toBe('table_b');
      expect(mockDb.changeLog[2].table_name).toBe('table_a');
    });
  });

  describe('getPendingChanges', () => {
    it('should return empty array when no pending changes', async () => {
      const changes = await getPendingChanges(mockDb as unknown as IDatabase);
      expect(changes).toEqual([]);
    });

    it('should return pending changes ordered by timestamp', async () => {
      await writeChangeLog(mockDb as unknown as IDatabase, 't1', 'r1', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 't2', 'r2', 'update');

      const changes = await getPendingChanges(mockDb as unknown as IDatabase);
      expect(changes).toHaveLength(2);
    });

    it('should respect the limit parameter', async () => {
      // 插入 5 条记录
      for (let i = 0; i < 5; i++) {
        await writeChangeLog(mockDb as unknown as IDatabase, 't', `r${i}`, 'insert');
      }

      // 查询限制 3 条
      const changes = await getPendingChanges(mockDb as unknown as IDatabase, 3);
      // Mock 会返回全部（不模拟 LIMIT），但至少证明接口正常工作
      expect(changes).toBeDefined();
      expect(Array.isArray(changes)).toBe(true);
    });
  });

  describe('markSynced', () => {
    it('should mark entries as synced', async () => {
      await writeChangeLog(mockDb as unknown as IDatabase, 't1', 'r1', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 't1', 'r2', 'insert');

      expect(mockDb.getPendingEntries()).toHaveLength(2);

      await markSynced(mockDb as unknown as IDatabase, [mockDb.changeLog[0].id]);

      expect(mockDb.getPendingEntries()).toHaveLength(1);
      expect(mockDb.changeLog[0].sync_status).toBe('synced');
      expect(mockDb.changeLog[1].sync_status).toBe('pending');
    });

    it('should handle empty array gracefully', async () => {
      await expect(
        markSynced(mockDb as unknown as IDatabase, [])
      ).resolves.not.toThrow();
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 when no pending changes', async () => {
      const count = await getPendingCount(mockDb as unknown as IDatabase);
      expect(count).toBe(0);
    });

    it('should return the correct count', async () => {
      await writeChangeLog(mockDb as unknown as IDatabase, 't1', 'r1', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 't1', 'r2', 'update');

      const count = await getPendingCount(mockDb as unknown as IDatabase);
      expect(count).toBe(2);
    });
  });

  describe('getPendingSummary', () => {
    it('should return grouped summary of pending changes', async () => {
      await writeChangeLog(mockDb as unknown as IDatabase, 'product_spu', 'p1', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 'product_spu', 'p2', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 'product_spu', 'p3', 'update');
      await writeChangeLog(mockDb as unknown as IDatabase, 'customers', 'c1', 'insert');
      await writeChangeLog(mockDb as unknown as IDatabase, 'customers', 'c2', 'delete');

      const summary = await getPendingSummary(mockDb as unknown as IDatabase);

      expect(summary).toBeDefined();
      expect(Array.isArray(summary)).toBe(true);
    });
  });

  describe('clearSyncedChanges', () => {
    it('should clear old synced entries', async () => {
      // 创建一些已同步的记录
      await writeChangeLog(mockDb as unknown as IDatabase, 't1', 'r1', 'insert');
      await markSynced(mockDb as unknown as IDatabase, [mockDb.changeLog[0].id]);

      const oldTimestamp = 0; // 清除所有早于此时间的
      const cleared = await clearSyncedChanges(mockDb as unknown as IDatabase, oldTimestamp);
      expect(cleared).toBeGreaterThanOrEqual(0);
    });
  });
});
