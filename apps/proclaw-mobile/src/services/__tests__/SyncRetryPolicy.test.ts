/// <reference types="jest" />

/**
 * SyncRetryPolicy 单元测试
 * P5: 同步重试策略 + 冲突解决策略 + 优先级队列
 */

// Mock IDatabase
const createMockDatabase = () => ({
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
  runAsync: jest.fn(),
  execAsync: jest.fn(),
});

import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_BASE_RETRY_DELAY,
  SyncPriority,
  getRetryCount,
  incrementRetryCount,
  calculateNextRetryDelay,
  hasExceededMaxRetries,
  CONFLICT_STRATEGIES,
  getConflictStrategy,
  registerConflictStrategy,
  sortByPriority,
  filterByPriority,
  inferPriority,
} from '../SyncRetryPolicy';

describe('SyncRetryPolicy', () => {
  describe('常量配置', () => {
    it('DEFAULT_MAX_RETRIES 应为 5', () => {
      expect(DEFAULT_MAX_RETRIES).toBe(5);
    });

    it('DEFAULT_BASE_RETRY_DELAY 应为 30000', () => {
      expect(DEFAULT_BASE_RETRY_DELAY).toBe(30000);
    });
  });

  describe('getRetryCount', () => {
    it('应返回数据库中的 retry_count', async () => {
      const db = createMockDatabase();
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ retry_count: 3 });
      
      const count = await getRetryCount(db as any, 'item-123');
      expect(count).toBe(3);
    });

    it('无记录时应返回 0', async () => {
      const db = createMockDatabase();
      (db.getFirstAsync as jest.Mock).mockResolvedValue(null);
      
      const count = await getRetryCount(db as any, 'item-456');
      expect(count).toBe(0);
    });

    it('查询失败时应返回 0', async () => {
      const db = createMockDatabase();
      (db.getFirstAsync as jest.Mock).mockRejectedValue(new Error('DB error'));
      
      const count = await getRetryCount(db as any, 'item-789');
      expect(count).toBe(0);
    });
  });

  describe('incrementRetryCount', () => {
    it('应更新数据库中的 retry_count 并返回新值', async () => {
      const db = createMockDatabase();
      db.runAsync.mockResolvedValue({ rowsAffected: 1 });
      (db.getFirstAsync as jest.Mock).mockResolvedValue({ retry_count: 2 });
      
      const newCount = await incrementRetryCount(db as any, 'item-123');
      expect(db.runAsync).toHaveBeenCalledWith(
        'UPDATE offline_queue SET retry_count = retry_count + 1, last_retry_at = ? WHERE id = ?',
        expect.any(Array)
      );
      expect(newCount).toBe(2);
    });
  });

  describe('calculateNextRetryDelay', () => {
    it('重试次数为 0 时应返回约 30s * (0.8~1.2) 的延迟', () => {
      const delay = calculateNextRetryDelay(0);
      expect(delay).toBeGreaterThanOrEqual(24000);  // 30s * 0.8
      expect(delay).toBeLessThanOrEqual(36000);     // 30s * 1.2
    });

    it('重试次数为 2 时应返回约 120s * (0.8~1.2) 的延迟', () => {
      const delay = calculateNextRetryDelay(2);
      expect(delay).toBeGreaterThanOrEqual(96000);  // 120s * 0.8
      expect(delay).toBeLessThanOrEqual(144000);     // 120s * 1.2
    });

    it('应限制最大延迟为 10 分钟', () => {
      const delay = calculateNextRetryDelay(10);  // 30s * 2^10 = 30s * 1024 > 600s
      expect(delay).toBeLessThanOrEqual(720000);  // 10min * 1.2 (max jitter)
    });
  });

  describe('hasExceededMaxRetries', () => {
    it('重试次数小于最大值时应返回 false', () => {
      expect(hasExceededMaxRetries(4, 5)).toBe(false);
    });

    it('重试次数等于最大值时应返回 true', () => {
      expect(hasExceededMaxRetries(5, 5)).toBe(true);
    });

    it('重试次数大于最大值时应返回 true', () => {
      expect(hasExceededMaxRetries(6, 5)).toBe(true);
    });

    it('使用默认最大值 5', () => {
      expect(hasExceededMaxRetries(5)).toBe(true);
      expect(hasExceededMaxRetries(4)).toBe(false);
    });
  });

  describe('CONFLICT_STRATEGIES', () => {
    it('product_sku 策略应为 field_merge', () => {
      const strategy = getConflictStrategy('product_sku');
      expect(strategy).not.toBeNull();
      expect(strategy?.mergeStrategy).toBe('field_merge');
      expect(strategy?.keyFields).toContain('sell_price');
    });

    it('sales_orders 策略应为 timestamp_newer', () => {
      const strategy = getConflictStrategy('sales_orders');
      expect(strategy).not.toBeNull();
      expect(strategy?.mergeStrategy).toBe('timestamp_newer');
    });

    it('未知表应返回 null', () => {
      const strategy = getConflictStrategy('unknown_table');
      expect(strategy).toBeNull();
    });
  });

  describe('registerConflictStrategy', () => {
    it('应能注册新的冲突策略', () => {
      const initialStrategy = getConflictStrategy('new_table');
      expect(initialStrategy).toBeNull();

      registerConflictStrategy({
        tableName: 'new_table',
        keyFields: ['field1'],
        timestampThreshold: 10000,
        mergeStrategy: 'last_write_wins',
      });

      const newStrategy = getConflictStrategy('new_table');
      expect(newStrategy).not.toBeNull();
      expect(newStrategy?.mergeStrategy).toBe('last_write_wins');
    });

    it('应能覆盖已有策略', () => {
      registerConflictStrategy({
        tableName: 'product_sku',
        keyFields: ['price', 'stock', 'custom_field'],
        timestampThreshold: 60000,
        mergeStrategy: 'timestamp_newer',
      });

      const strategy = getConflictStrategy('product_sku');
      expect(strategy?.keyFields).toContain('custom_field');
      expect(strategy?.mergeStrategy).toBe('timestamp_newer');
    });
  });

  describe('sortByPriority', () => {
    it('应按优先级排序（高优先级在前）', () => {
      const items = [
        { id: '1', tableName: 'a', operation: 'insert', priority: SyncPriority.LOW, timestamp: 100 },
        { id: '2', tableName: 'b', operation: 'update', priority: SyncPriority.HIGH, timestamp: 200 },
        { id: '3', tableName: 'c', operation: 'delete', priority: SyncPriority.MEDIUM, timestamp: 150 },
      ];

      const sorted = sortByPriority(items);
      expect(sorted[0].priority).toBe(SyncPriority.HIGH);
      expect(sorted[1].priority).toBe(SyncPriority.MEDIUM);
      expect(sorted[2].priority).toBe(SyncPriority.LOW);
    });

    it('相同优先级应按时间戳排序', () => {
      const items = [
        { id: '1', tableName: 'a', operation: 'insert', priority: SyncPriority.HIGH, timestamp: 300 },
        { id: '2', tableName: 'b', operation: 'update', priority: SyncPriority.HIGH, timestamp: 100 },
        { id: '3', tableName: 'c', operation: 'delete', priority: SyncPriority.HIGH, timestamp: 200 },
      ];

      const sorted = sortByPriority(items);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('不应修改原数组', () => {
      const items = [
        { id: '1', tableName: 'a', operation: 'insert', priority: SyncPriority.LOW, timestamp: 100 },
        { id: '2', tableName: 'b', operation: 'update', priority: SyncPriority.HIGH, timestamp: 200 },
      ];

      sortByPriority(items);
      expect(items[0].id).toBe('1');
    });
  });

  describe('filterByPriority', () => {
    it('应只返回指定优先级及更高的项', () => {
      const items = [
        { id: '1', tableName: 'a', operation: 'insert', priority: SyncPriority.HIGH, timestamp: 100 },
        { id: '2', tableName: 'b', operation: 'update', priority: SyncPriority.MEDIUM, timestamp: 200 },
        { id: '3', tableName: 'c', operation: 'delete', priority: SyncPriority.LOW, timestamp: 150 },
      ];

      const filtered = filterByPriority(items, SyncPriority.MEDIUM);
      expect(filtered).toHaveLength(2);
      expect(filtered.map(i => i.id)).toContain('1');
      expect(filtered.map(i => i.id)).toContain('2');
    });
  });

  describe('inferPriority', () => {
    it('inventory_transactions 应为 HIGH', () => {
      expect(inferPriority('inventory_transactions', 'insert')).toBe(SyncPriority.HIGH);
    });

    it('sales_orders 应为 HIGH', () => {
      expect(inferPriority('sales_orders', 'update')).toBe(SyncPriority.HIGH);
    });

    it('product_sku 应为 MEDIUM', () => {
      expect(inferPriority('product_sku', 'insert')).toBe(SyncPriority.MEDIUM);
    });

    it('customers 应为 MEDIUM', () => {
      expect(inferPriority('customers', 'delete')).toBe(SyncPriority.MEDIUM);
    });

    it('chat_messages 应为 LOW', () => {
      expect(inferPriority('chat_messages', 'insert')).toBe(SyncPriority.LOW);
    });

    it('未知表默认为 LOW', () => {
      expect(inferPriority('unknown_table', 'update')).toBe(SyncPriority.LOW);
    });
  });
});