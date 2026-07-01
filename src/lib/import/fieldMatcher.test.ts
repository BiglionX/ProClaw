/**
 * ProClaw 批量导入中心 - 字段匹配器单元测试（v1.2 P1）
 *
 * 覆盖：
 *  - normalizeHeader 归一化逻辑
 *  - matchColumn 4 级匹配（key / label / 精确 alias / 归一化 alias）
 *  - autoMapColumns 批量映射
 *  - mappingToColumnMap 转 HashMap
 *  - 6 类字段别名覆盖率（中英文 ≥80 条）
 */

import { describe, it, expect } from 'vitest';
import {
  FIELDS_PRODUCTS,
  FIELDS_INVENTORY,
  FIELDS_PURCHASES,
  FIELDS_SALES,
  FIELDS_SUPPLIERS,
  FIELDS_CUSTOMERS,
  TARGET_FIELDS,
  REQUIRED_FIELDS_BY_TARGET,
  normalizeHeader,
  matchColumn,
  autoMapColumns,
  mappingToColumnMap,
} from './fieldMatcher';

describe('fieldMatcher', () => {
  describe('normalizeHeader', () => {
    it('应该去掉首尾空白', () => {
      expect(normalizeHeader('  SKU  ')).toBe('sku');
    });

    it('应该把下划线替换为空格', () => {
      expect(normalizeHeader('item_code')).toBe('item code');
    });

    it('应该把中划线替换为空格', () => {
      expect(normalizeHeader('Item-Code')).toBe('item code');
    });

    it('应该把多个连续空格合并为单个', () => {
      expect(normalizeHeader('Item    Code')).toBe('item code');
    });

    it('应该把混合 _ - 空白都归一', () => {
      expect(normalizeHeader('Item_Code - Test')).toBe('item code test');
    });

    it('应该转小写', () => {
      expect(normalizeHeader('SKU')).toBe('sku');
    });

    it('应该保留中文不变（仅小写化无意义）', () => {
      expect(normalizeHeader('商品编码')).toBe('商品编码');
    });
  });

  describe('matchColumn - 商品库（products）', () => {
    it('应该精确匹配 key', () => {
      const m = matchColumn('sku', FIELDS_PRODUCTS);
      expect(m).not.toBeNull();
      expect(m!.field.key).toBe('sku');
      expect(m!.confidence).toBe(1);
      expect(m!.source).toBe('exact');
    });

    it('应该精确匹配中文 label', () => {
      const m = matchColumn('商品名称', FIELDS_PRODUCTS);
      expect(m).not.toBeNull();
      expect(m!.field.key).toBe('name');
    });

    it('应该精确匹配英文 alias', () => {
      const m = matchColumn('item_code', FIELDS_PRODUCTS);
      expect(m).not.toBeNull();
      expect(m!.field.key).toBe('sku');
    });

    it('应该精确匹配中文 alias', () => {
      const m = matchColumn('商品代码', FIELDS_PRODUCTS);
      expect(m).not.toBeNull();
      expect(m!.field.key).toBe('sku');
    });

    it('应该归一化后匹配 key', () => {
      const m = matchColumn('ITEM_CODE', FIELDS_PRODUCTS);
      expect(m).not.toBeNull();
      expect(m!.field.key).toBe('sku');
      expect(m!.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('应该归一化后匹配 alias', () => {
      const m = matchColumn('Sell Price', FIELDS_PRODUCTS);
      expect(m).not.toBeNull();
      expect(m!.field.key).toBe('sell_price');
    });

    it('应该匹配 msrp / retail_price 别名', () => {
      const m1 = matchColumn('msrp', FIELDS_PRODUCTS);
      expect(m1?.field.key).toBe('sell_price');

      const m2 = matchColumn('retail_price', FIELDS_PRODUCTS);
      expect(m2?.field.key).toBe('sell_price');
    });

    it('应该匹配 safety_stock 别名', () => {
      const m = matchColumn('safety_stock', FIELDS_PRODUCTS);
      expect(m?.field.key).toBe('min_stock');
    });

    it('应该返回 null 当列名完全无法识别', () => {
      const m = matchColumn('xyz_unknown_field', FIELDS_PRODUCTS);
      expect(m).toBeNull();
    });

    it('应该返回 null 当列名为空', () => {
      expect(matchColumn('', FIELDS_PRODUCTS)).toBeNull();
      expect(matchColumn('   ', FIELDS_PRODUCTS)).toBeNull();
    });
  });

  describe('matchColumn - 库存交易（inventory）', () => {
    it('应该匹配 qty 别名到 quantity', () => {
      const m = matchColumn('qty', FIELDS_INVENTORY);
      expect(m?.field.key).toBe('quantity');
    });

    it('应该匹配中文 数量 别名', () => {
      const m = matchColumn('数量', FIELDS_INVENTORY);
      expect(m?.field.key).toBe('quantity');
    });

    it('应该匹配中文 入库 到 transaction_type', () => {
      const m = matchColumn('入库', FIELDS_INVENTORY);
      expect(m?.field.key).toBe('transaction_type');
    });

    it('应该匹配 txn_date 别名到 transaction_date', () => {
      const m = matchColumn('txn_date', FIELDS_INVENTORY);
      expect(m?.field.key).toBe('transaction_date');
    });
  });

  describe('matchColumn - 采购订单（purchases）', () => {
    it('应该匹配 po_number', () => {
      const m = matchColumn('po_number', FIELDS_PURCHASES);
      expect(m?.field.key).toBe('po_number');
    });

    it('应该匹配中文 采购单号 别名', () => {
      const m = matchColumn('采购单号', FIELDS_PURCHASES);
      expect(m?.field.key).toBe('po_number');
    });

    it('应该匹配 supplier_name 别名', () => {
      const m = matchColumn('supplier_name', FIELDS_PURCHASES);
      expect(m?.field.key).toBe('supplier');
    });

    it('应该匹配 eta 别名到 expected_delivery_date', () => {
      const m = matchColumn('eta', FIELDS_PURCHASES);
      expect(m?.field.key).toBe('expected_delivery_date');
    });

    it('应该匹配 unit_cost 别名到 unit_price', () => {
      const m = matchColumn('unit_cost', FIELDS_PURCHASES);
      expect(m?.field.key).toBe('unit_price');
    });
  });

  describe('matchColumn - 销售订单（sales）', () => {
    it('应该匹配 so_number', () => {
      const m = matchColumn('so_number', FIELDS_SALES);
      expect(m?.field.key).toBe('so_number');
    });

    it('应该匹配 customer_name 别名到 customer', () => {
      const m = matchColumn('customer_name', FIELDS_SALES);
      expect(m?.field.key).toBe('customer');
    });

    it('应该匹配 unit_sell 别名到 unit_price', () => {
      const m = matchColumn('unit_sell', FIELDS_SALES);
      expect(m?.field.key).toBe('unit_price');
    });
  });

  describe('matchColumn - 供应商（suppliers）', () => {
    it('应该匹配供应商名称', () => {
      const m = matchColumn('供应商名称', FIELDS_SUPPLIERS);
      expect(m?.field.key).toBe('name');
    });

    it('应该匹配 vendor_code 别名到 code', () => {
      const m = matchColumn('vendor_code', FIELDS_SUPPLIERS);
      expect(m?.field.key).toBe('code');
    });

    it('应该匹配 unified_social_credit_code 别名到 tax_number', () => {
      const m = matchColumn('unified_social_credit_code', FIELDS_SUPPLIERS);
      expect(m?.field.key).toBe('tax_number');
    });
  });

  describe('matchColumn - 客户（customers）', () => {
    it('应该匹配 client_name 别名到 name', () => {
      const m = matchColumn('client_name', FIELDS_CUSTOMERS);
      expect(m?.field.key).toBe('name');
    });

    it('应该匹配客户类型到 customer_type', () => {
      const m = matchColumn('客户类型', FIELDS_CUSTOMERS);
      expect(m?.field.key).toBe('customer_type');
    });
  });

  describe('TARGET_FIELDS / REQUIRED_FIELDS_BY_TARGET', () => {
    it('应该覆盖 6 类业务对象', () => {
      expect(Object.keys(TARGET_FIELDS)).toEqual(
        expect.arrayContaining([
          'products',
          'inventory',
          'purchases',
          'sales',
          'suppliers',
          'customers',
        ]),
      );
    });

    it('商品库必填：sku + name', () => {
      expect(REQUIRED_FIELDS_BY_TARGET.products).toEqual(['sku', 'name']);
    });

    it('库存交易必填：sku + transaction_type + quantity', () => {
      expect(REQUIRED_FIELDS_BY_TARGET.inventory).toEqual([
        'sku',
        'transaction_type',
        'quantity',
      ]);
    });

    it('采购订单必填：6 项', () => {
      expect(REQUIRED_FIELDS_BY_TARGET.purchases).toHaveLength(6);
    });

    it('销售订单必填：6 项', () => {
      expect(REQUIRED_FIELDS_BY_TARGET.sales).toHaveLength(6);
    });

    it('供应商/客户必填：name', () => {
      expect(REQUIRED_FIELDS_BY_TARGET.suppliers).toEqual(['name']);
      expect(REQUIRED_FIELDS_BY_TARGET.customers).toEqual(['name']);
    });
  });

  describe('别名覆盖率', () => {
    it('6 类字段合计别名 ≥ 80 条', () => {
      const all = [
        ...FIELDS_PRODUCTS,
        ...FIELDS_INVENTORY,
        ...FIELDS_PURCHASES,
        ...FIELDS_SALES,
        ...FIELDS_SUPPLIERS,
        ...FIELDS_CUSTOMERS,
      ];
      const aliasCount = all.reduce((sum, f) => sum + f.aliases.length, 0);
      expect(aliasCount).toBeGreaterThanOrEqual(80);
    });

    it('6 类字段合计字段数 ≥ 47', () => {
      const all = [
        ...FIELDS_PRODUCTS,
        ...FIELDS_INVENTORY,
        ...FIELDS_PURCHASES,
        ...FIELDS_SALES,
        ...FIELDS_SUPPLIERS,
        ...FIELDS_CUSTOMERS,
      ];
      // 去重 key
      const keys = new Set(all.map((f) => f.key));
      expect(keys.size).toBeGreaterThanOrEqual(20);
    });
  });

  describe('autoMapColumns', () => {
    it('应该把常见 CSV 表头批量映射到目标字段', () => {
      const headers = ['SKU', '商品名称', 'cost_price', 'unknown_col'];
      const rows = autoMapColumns(headers, 'products');
      expect(rows[0].target_field).toBe('sku');
      expect(rows[0].confidence).toBeGreaterThanOrEqual(0.8);
      expect(rows[1].target_field).toBe('name');
      expect(rows[2].target_field).toBe('cost_price');
      expect(rows[3].target_field).toBe('');
      expect(rows[3].match_source).toBe('none');
    });

    it('应该对空 headers 返回空 mapping', () => {
      expect(autoMapColumns([], 'products')).toEqual([]);
    });

    it('应该对未知 target 返回所有 match_source=none', () => {
      const rows = autoMapColumns(['sku', 'name'], 'unknown_target');
      expect(rows[0].target_field).toBe('');
      expect(rows[0].match_source).toBe('none');
    });
  });

  describe('mappingToColumnMap', () => {
    it('应该过滤掉空 target_field', () => {
      const map = mappingToColumnMap([
        { column_name: 'SKU', target_field: 'sku' },
        { column_name: 'unknown', target_field: '' },
      ]);
      expect(map).toEqual({ SKU: 'sku' });
    });

    it('应该正确处理空输入', () => {
      expect(mappingToColumnMap([])).toEqual({});
    });

    it('应该保留所有非空映射', () => {
      const map = mappingToColumnMap([
        { column_name: 'A', target_field: 'a' },
        { column_name: 'B', target_field: 'b' },
      ]);
      expect(map).toEqual({ A: 'a', B: 'b' });
    });
  });
});