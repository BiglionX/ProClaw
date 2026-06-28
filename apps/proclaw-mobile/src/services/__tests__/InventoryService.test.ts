/// <reference types="jest" />

/**
 * InventoryService 单元测试
 * P2 项 2：覆盖库存状态分级 + SQL 查询 + 聚合统计
 */

import type { IDatabase } from '../DatabaseFactory';
import {
  classifyStockStatus,
  getInventoryOverview,
  getLowStockItems,
  getInventoryStats,
  InventoryItem,
} from '../InventoryService';

/**
 * In-memory mock database for InventoryService tests.
 * 模拟必要的 SQL 子集：SELECT/FROM/INNER JOIN/WHERE/ORDER BY/COUNT。
 */
class MockInventoryDB implements IDatabase {
  private skuRows: any[];
  private spuRows: any[];
  private txRows: any[];
  public lastSelectSql = '';
  public lastSelectParams: any[] = [];
  public lastCountSql = '';
  public lastCountParams: any[] = [];

  constructor(skuRows: any[], spuRows: any[], txRows: any[] = []) {
    this.skuRows = skuRows;
    this.spuRows = spuRows;
    this.txRows = txRows;
  }

  async execAsync(_sql: string, _params?: any[]): Promise<void> {
    // no-op
  }

  async getAllAsync(sql: string, params?: any[]): Promise<any[]> {
    this.lastSelectSql = sql;
    this.lastSelectParams = params || [];

    const upper = sql.trim().toUpperCase();
    if (!upper.startsWith('SELECT')) return [];

    // 解析 FROM product_sku + INNER JOIN product_spu
    const skuMatch = sql.match(/FROM\s+(\w+)\s+\w+/i);
    const joinMatch = sql.match(/JOIN\s+(\w+)\s+\w+/i);
    if (!skuMatch) return [];
    const skuTable = skuMatch[1];
    if (skuTable !== 'product_sku') return [];

    // 解析 SELECT 列别名（AS aliasName），保留原始大小写以匹配 InventoryItem 字段
    const selectMatch = sql.match(/SELECT\s+(.+?)\s+FROM/is);
    const aliasMap: Record<string, string> = {};
    if (selectMatch) {
      const cols = selectMatch[1].split(',').map((c) => c.trim());
      for (const col of cols) {
        const m = col.match(/\bas\s+(\w+)$/i);
        if (m) aliasMap[m[1]] = col.split(/\s+as\s+/i)[0].trim();
      }
    }

    // LEFT JOIN: 以 spu.id == sku.spu_id 关联
    const joined = this.skuRows
      .filter((s) => s.is_active === 1 || s.is_active === true)
      .map((sku) => {
        const spu = this.spuRows.find((p) => p.id === sku.spu_id && p.deleted_at == null);
        if (!spu) return null;
        const row: any = { ...sku };
        // 应用别名映射
        for (const [alias, expr] of Object.entries(aliasMap)) {
          if (expr.startsWith('sku.')) {
            row[alias] = sku[expr.slice(4)];
          } else if (expr.startsWith('spu.')) {
            row[alias] = spu[expr.slice(4)];
          }
        }
        return row;
      })
      .filter((r) => r !== null);

    // ORDER BY sku.current_stock ASC, sku.sku_code ASC
    joined.sort((a, b) => {
      const sa = Number(a.currentStock ?? 0);
      const sb = Number(b.currentStock ?? 0);
      if (sa !== sb) return sa - sb;
      return String(a.skuCode ?? '').localeCompare(String(b.skuCode ?? ''));
    });

    return joined;
  }

  async getFirstAsync(sql: string, params?: any[]): Promise<any | null> {
    this.lastCountSql = sql;
    this.lastCountParams = params || [];

    const upper = sql.trim().toUpperCase();
    if (upper.startsWith('SELECT COUNT')) {
      // inventory_transactions 表的简单过滤
      const tableMatch = sql.match(/FROM\s+(\w+)/i);
      if (tableMatch && tableMatch[1] === 'inventory_transactions' && params && params.length > 0) {
        const cutoff = Number(params[0]);
        const matched = this.txRows.filter((t) => Number(t.created_at) >= cutoff);
        return { cnt: matched.length };
      }
      return { cnt: 0 };
    }
    return null;
  }

  async runAsync(_sql: string, _params?: any[]): Promise<{ rowsAffected: number }> {
    return { rowsAffected: 0 };
  }

  async closeAsync(): Promise<void> {
    // no-op
  }
}

describe('classifyStockStatus', () => {
  it('current_stock === 0 应判定为 out', () => {
    expect(classifyStockStatus(0, 10, 100)).toBe('out');
  });

  it('current_stock < 0 应判定为 out（数据异常兜底）', () => {
    expect(classifyStockStatus(-5, 10, 100)).toBe('out');
  });

  it('current_stock <= min_stock 应判定为 low', () => {
    expect(classifyStockStatus(5, 10, 100)).toBe('low');
    expect(classifyStockStatus(10, 10, 100)).toBe('low');
  });

  it('min_stock = 0 时永远不会 low（只有 out / normal / over）', () => {
    expect(classifyStockStatus(1, 0, 100)).toBe('normal');
    expect(classifyStockStatus(50, 0, 100)).toBe('normal');
  });

  it('min_stock < current_stock <= max_stock * 0.8 应判定为 normal', () => {
    expect(classifyStockStatus(50, 10, 100)).toBe('normal');     // 50 <= 80
    expect(classifyStockStatus(80, 10, 100)).toBe('normal');     // 80 = 80 * 1.0 = 80，刚好不超
  });

  it('current_stock > max_stock * 0.8 应判定为 over', () => {
    expect(classifyStockStatus(81, 10, 100)).toBe('over');
    expect(classifyStockStatus(100, 10, 100)).toBe('over');
  });

  it('max_stock 无效（<= 0）时使用 999999 默认值，不会触发 over', () => {
    expect(classifyStockStatus(1000, 10, 0)).toBe('normal');
    expect(classifyStockStatus(1000, 10, -1)).toBe('normal');
  });

  it('边界值测试：max_stock * 0.8 临界', () => {
    // max=100, threshold=80
    expect(classifyStockStatus(80, 10, 100)).toBe('normal');  // 80 == 80，不是 > 80
    expect(classifyStockStatus(81, 10, 100)).toBe('over');    // 81 > 80
  });
});

describe('getInventoryOverview', () => {
  const now = Math.floor(Date.now() / 1000);

  function buildSku(id: string, spuId: string, code: string, stock: number, min: number, max: number, price: number, isActive = 1) {
    return {
      id, spu_id: spuId, sku_code: code, spec_text: null,
      current_stock: stock, min_stock: min, max_stock: max,
      sell_price: price, is_active: isActive,
    };
  }

  function buildSpu(id: string, code: string, name: string, deletedAt: number | null = null) {
    return { id, spu_code: code, name, deleted_at: deletedAt };
  }

  it('join 后的数据应正确映射为 InventoryItem 字段', async () => {
    const db = new MockInventoryDB(
      [
        buildSku('s1', 'p1', 'SKU-001', 50, 10, 100, 99.9),
        buildSku('s2', 'p2', 'SKU-002', 5, 10, 100, 199),
      ],
      [
        buildSpu('p1', 'SPU-001', 'Product A'),
        buildSpu('p2', 'SPU-002', 'Product B'),
      ]
    );

    const items = await getInventoryOverview(db);
    expect(items).toHaveLength(2);
    // 按 current_stock ASC 排序：s2 (5) 在前
    expect(items[0].skuId).toBe('s2');
    expect(items[0].productName).toBe('Product B');
    expect(items[0].status).toBe('low');
    expect(items[1].skuId).toBe('s1');
    expect(items[1].productName).toBe('Product A');
    expect(items[1].status).toBe('normal');
  });

  it('应过滤 is_active = 0 的 SKU', async () => {
    const db = new MockInventoryDB(
      [
        buildSku('s1', 'p1', 'SKU-001', 50, 10, 100, 99.9, 1),
        buildSku('s2', 'p2', 'SKU-002', 5, 10, 100, 199, 0),
      ],
      [
        buildSpu('p1', 'SPU-001', 'Product A'),
        buildSpu('p2', 'SPU-002', 'Product B'),
      ]
    );
    const items = await getInventoryOverview(db);
    expect(items).toHaveLength(1);
    expect(items[0].skuId).toBe('s1');
  });

  it('应过滤 deleted_at 不为空的 SPU', async () => {
    const db = new MockInventoryDB(
      [buildSku('s1', 'p1', 'SKU-001', 50, 10, 100, 99.9)],
      [buildSpu('p1', 'SPU-001', 'Product A', now)]  // 已删除
    );
    const items = await getInventoryOverview(db);
    expect(items).toHaveLength(0);
  });

  it('SQL 错误时应返回空数组且不抛出', async () => {
    const db = new MockInventoryDB([], []);
    // 模拟 getAllAsync 抛错
    db.getAllAsync = jest.fn().mockRejectedValue(new Error('DB error'));
    const items = await getInventoryOverview(db);
    expect(items).toEqual([]);
  });

  it('数字字段应为 number 类型', async () => {
    const db = new MockInventoryDB(
      [buildSku('s1', 'p1', 'SKU-001', 50, 10, 100, 99.9)],
      [buildSpu('p1', 'SPU-001', 'Product A')]
    );
    const items = await getInventoryOverview(db);
    expect(typeof items[0].currentStock).toBe('number');
    expect(typeof items[0].sellPrice).toBe('number');
    expect(items[0].currentStock).toBe(50);
  });
});

describe('getLowStockItems', () => {
  it('应只返回 out 与 low 状态的 SKU', async () => {
    const db = new MockInventoryDB(
      [
        { id: 's1', spu_id: 'p1', sku_code: 'SKU-001', spec_text: null, current_stock: 0,   min_stock: 10, max_stock: 100, sell_price: 99, is_active: 1 },
        { id: 's2', spu_id: 'p2', sku_code: 'SKU-002', spec_text: null, current_stock: 5,   min_stock: 10, max_stock: 100, sell_price: 199,is_active: 1 },
        { id: 's3', spu_id: 'p3', sku_code: 'SKU-003', spec_text: null, current_stock: 50,  min_stock: 10, max_stock: 100, sell_price: 299,is_active: 1 },
        { id: 's4', spu_id: 'p4', sku_code: 'SKU-004', spec_text: null, current_stock: 95,  min_stock: 10, max_stock: 100, sell_price: 399,is_active: 1 },
      ],
      [
        { id: 'p1', spu_code: 'SPU-001', name: 'A', deleted_at: null },
        { id: 'p2', spu_code: 'SPU-002', name: 'B', deleted_at: null },
        { id: 'p3', spu_code: 'SPU-003', name: 'C', deleted_at: null },
        { id: 'p4', spu_code: 'SPU-004', name: 'D', deleted_at: null },
      ]
    );
    const items = await getLowStockItems(db);
    expect(items).toHaveLength(2);
    expect(items.map((i: InventoryItem) => i.skuId).sort()).toEqual(['s1', 's2']);
  });
});

describe('getInventoryStats', () => {
  it('应正确计算 totalSkus / outOfStockCount / lowStockCount / totalStockValue', async () => {
    const db = new MockInventoryDB(
      [
        { id: 's1', spu_id: 'p1', sku_code: 'SKU-001', spec_text: null, current_stock: 0,   min_stock: 10, max_stock: 100, sell_price: 100, is_active: 1 },
        { id: 's2', spu_id: 'p2', sku_code: 'SKU-002', spec_text: null, current_stock: 5,   min_stock: 10, max_stock: 100, sell_price: 200, is_active: 1 },
        { id: 's3', spu_id: 'p3', sku_code: 'SKU-003', spec_text: null, current_stock: 50,  min_stock: 10, max_stock: 100, sell_price: 300, is_active: 1 },
      ],
      [
        { id: 'p1', spu_code: 'SPU-001', name: 'A', deleted_at: null },
        { id: 'p2', spu_code: 'SPU-002', name: 'B', deleted_at: null },
        { id: 'p3', spu_code: 'SPU-003', name: 'C', deleted_at: null },
      ]
    );
    const stats = await getInventoryStats(db);
    expect(stats.totalSkus).toBe(3);
    expect(stats.outOfStockCount).toBe(1);
    expect(stats.lowStockCount).toBe(2); // 含缺货
    expect(stats.totalStockValue).toBe(0 * 100 + 5 * 200 + 50 * 300); // 16000
  });

  it('近 7 天交易数应正确（按 created_at 过滤）', async () => {
    const now = Math.floor(Date.now() / 1000);
    const db = new MockInventoryDB(
      [{ id: 's1', spu_id: 'p1', sku_code: 'SKU-001', spec_text: null, current_stock: 5, min_stock: 10, max_stock: 100, sell_price: 100, is_active: 1 }],
      [{ id: 'p1', spu_code: 'SPU-001', name: 'A', deleted_at: null }],
      [
        { id: 't1', created_at: now - 3 * 24 * 60 * 60 }, // 3 天前
        { id: 't2', created_at: now - 5 * 24 * 60 * 60 }, // 5 天前
        { id: 't3', created_at: now - 10 * 24 * 60 * 60 }, // 10 天前（应排除）
      ]
    );
    const stats = await getInventoryStats(db);
    expect(stats.recentTransactions).toBe(2);
    // SQL 参数应为 7 天前的时间戳
    expect(db.lastCountParams[0]).toBe(now - 7 * 24 * 60 * 60);
  });

  it('查询失败时应返回零值且不抛出', async () => {
    const db = new MockInventoryDB([], []);
    db.getAllAsync = jest.fn().mockRejectedValue(new Error('DB error'));
    const stats = await getInventoryStats(db);
    expect(stats).toEqual({
      totalSkus: 0,
      outOfStockCount: 0,
      lowStockCount: 0,
      recentTransactions: 0,
      totalStockValue: 0,
    });
  });
});
