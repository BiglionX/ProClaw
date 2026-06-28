/// <reference types="jest" />

/**
 * SyncEngine 单元测试
 * 测试 ConflictResolver、序列化工具、applyRemoteChanges
 */

import { ConflictResolver, serializeChanges, deserializeChanges } from '../SyncEngine';
import type { ChangeLogEntry } from '../ChangeLogManager';

describe('ConflictResolver', () => {
  const resolver = new ConflictResolver();

  describe('timestamp_newer strategy', () => {
    it('should use remote when remote timestamp is significantly newer', () => {
      const local = { name: '旧名称', price: 100 };
      const remote = { name: '新名称', price: 150 };
      const result = resolver.resolve(local, remote, 1000, 100000);
      expect(result.autoResolved).toBe(true);
      expect(result.strategy).toBe('timestamp_newer');
      expect(result.mergedData).toEqual(remote);
    });

    it('should use local when local timestamp is significantly newer', () => {
      const local = { name: '新名称', price: 150 };
      const remote = { name: '旧名称', price: 100 };
      const result = resolver.resolve(local, remote, 100000, 1000);
      expect(result.autoResolved).toBe(true);
      expect(result.strategy).toBe('timestamp_newer');
      expect(result.mergedData).toEqual(local);
    });
  });

  describe('field_merge strategy', () => {
    it('should merge different fields from local and remote', () => {
      const local = { name: '商品A', description: '旧描述', stock: 50 };
      const remote = { name: '商品A', description: '新描述', stock: 50 };
      const result = resolver.resolve(local, remote, 1000, 2000);
      expect(result.autoResolved).toBe(true);
      expect(result.strategy).toBe('field_merge');
      expect(result.mergedData.name).toBe('商品A');
      expect(result.mergedData.stock).toBe(50);
      expect(result.mergedData.description).toBe('新描述');
    });

    it('should flag key fields as manual when they conflict', () => {
      const local = { price: 100, stock: 50 };
      const remote = { price: 120, stock: 30 };
      const result = resolver.resolve(local, remote, 1000, 2000, ['price', 'stock']);
      expect(result.autoResolved).toBe(false);
      expect(result.strategy).toBe('field_merge');
      expect(result.manualFields).toEqual(['price', 'stock']);
    });

    it('should use local value for key fields awaiting manual resolution', () => {
      const local = { price: 100, stock: 50 };
      const remote = { price: 120, stock: 30 };
      const result = resolver.resolve(local, remote, 1000, 2000, ['price']);
      expect(result.mergedData.price).toBe(100);
      expect(result.mergedData.stock).toBe(30);
    });

    it('should take newer-modified-side value for non-key fields', () => {
      const local = { description: '旧描述', note: '旧备注' };
      const remote = { description: '新描述', note: '旧备注' };
      const result = resolver.resolve(local, remote, 1000, 2000, ['price']);
      expect(result.mergedData.description).toBe('新描述');
      expect(result.mergedData.note).toBe('旧备注');
    });

    it('should handle empty objects', () => {
      const result = resolver.resolve({}, {}, 1000, 2000);
      expect(result.autoResolved).toBe(true);
      expect(result.mergedData).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle undefined fields in local data', () => {
      const local = { name: '商品' };
      const remote = { name: '商品', price: 200 };
      const result = resolver.resolve(local, remote, 1000, 2000);
      expect(result.mergedData.price).toBe(200);
    });

    it('should handle undefined fields in remote data', () => {
      const local = { name: '商品', price: 100 };
      const remote = { name: '商品' };
      const result = resolver.resolve(local, remote, 1000, 2000);
      expect(result.mergedData.price).toBe(100);
    });

    it('should treat identical values as equal regardless of timestamp', () => {
      const local = { name: '商品', price: 100 };
      const remote = { name: '商品', price: 100 };
      const result = resolver.resolve(local, remote, 1000, 2000);
      expect(result.autoResolved).toBe(true);
      expect(result.mergedData).toEqual(local);
    });
  });
});

describe('serializeChanges', () => {
  it('should group changes by table name', () => {
    const changes: ChangeLogEntry[] = [
      {
        id: 1,
        table_name: 'product_spu',
        row_id: 'p1',
        operation: 'insert',
        old_value: null,
        new_value: '{"name":"商品A"}',
        timestamp: 1000,
        sync_status: 'pending',
      },
      {
        id: 2,
        table_name: 'customers',
        row_id: 'c1',
        operation: 'update',
        old_value: null,
        new_value: '{"name":"客户A"}',
        timestamp: 1001,
        sync_status: 'pending',
      },
      {
        id: 3,
        table_name: 'product_spu',
        row_id: 'p2',
        operation: 'delete',
        old_value: null,
        new_value: null,
        timestamp: 1002,
        sync_status: 'pending',
      },
    ];

    const serialized = serializeChanges(changes);
    const parsed = JSON.parse(serialized);

    expect(parsed.product_spu).toHaveLength(2);
    expect(parsed.customers).toHaveLength(1);
    expect(parsed.product_spu[0].row_id).toBe('p1');
    expect(parsed.product_spu[1].row_id).toBe('p2');
  });

  it('should return empty object for empty array', () => {
    const result = serializeChanges([]);
    expect(JSON.parse(result)).toEqual({});
  });
});

describe('deserializeChanges', () => {
  it('should flatten grouped changes back into array', () => {
    const grouped = {
      product_spu: [
        { id: 1, table_name: 'product_spu', row_id: 'p1', operation: 'insert', old_value: null, new_value: '{}', timestamp: 1000, sync_status: 'pending' },
      ],
      customers: [
        { id: 2, table_name: 'customers', row_id: 'c1', operation: 'update', old_value: null, new_value: '{}', timestamp: 1001, sync_status: 'pending' },
      ],
    };

    const result = deserializeChanges(JSON.stringify(grouped));
    expect(result).toHaveLength(2);
    expect(result[0].table_name).toBe('product_spu');
    expect(result[1].table_name).toBe('customers');
  });

  it('should return empty array for invalid JSON', () => {
    const result = deserializeChanges('invalid json');
    expect(result).toEqual([]);
  });

  it('should return empty array for empty grouped data', () => {
    const result = deserializeChanges(JSON.stringify({}));
    expect(result).toEqual([]);
  });
});
