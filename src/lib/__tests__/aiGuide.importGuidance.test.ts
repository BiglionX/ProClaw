/**
 * v1.3 D4：generateImportGuidance 8 类引导单元测试（30+ case）
 */
import { describe, it, expect } from 'vitest';

import { generateImportGuidance, type ImportGuidance } from '../aiGuide';
import type { ImportError, ImportTarget } from '../importers/types';

// ---------- 测试数据工厂 ----------

function mkError(
  code: string,
  field: string,
  rowIndex: number,
  message = `${field} 错误`,
): ImportError {
  return { code, field, rowIndex, level: 'L2', message };
}

// ---------- 8 类基础识别 ----------

describe('generateImportGuidance - 8 类基础识别', () => {
  it('1) MISSING_REQUIRED → missing_required', () => {
    const g = generateImportGuidance('products', [mkError('MISSING_REQUIRED', 'name', 1)], ['商品名称']);
    expect(g).toHaveLength(1);
    expect(g[0].category).toBe('missing_required');
    expect(g[0].title).toContain('缺');
    expect(g[0].title).toContain('商品库');
  });

  it('2) REQUIRED_FIELD_EMPTY → missing_required', () => {
    const g = generateImportGuidance('products', [mkError('REQUIRED_FIELD_EMPTY', 'name', 1)], []);
    expect(g[0].category).toBe('missing_required');
  });

  it('3) MAPPING_CONFLICT → mapping_conflict', () => {
    const g = generateImportGuidance('products', [mkError('MAPPING_CONFLICT', 'spu_code', 1)], []);
    expect(g[0].category).toBe('mapping_conflict');
  });

  it('4) AMBIGUOUS_MAPPING → mapping_conflict', () => {
    const g = generateImportGuidance('products', [mkError('AMBIGUOUS_MAPPING', 'category', 1)], []);
    expect(g[0].category).toBe('mapping_conflict');
  });

  it('5) DUPLICATE_ROW → duplicate_row', () => {
    const g = generateImportGuidance('products', [mkError('DUPLICATE_ROW', 'spu_code', 1)], []);
    expect(g[0].category).toBe('duplicate_row');
    expect(g[0].title).toContain('商品库');
  });

  it('6) ROW_DUPLICATE → duplicate_row', () => {
    const g = generateImportGuidance('products', [mkError('ROW_DUPLICATE', 'spu_code', 1)], []);
    expect(g[0].category).toBe('duplicate_row');
  });

  it('7) SKU_NOT_FOUND → reference_missing（purchases 场景）', () => {
    const g = generateImportGuidance('purchases', [mkError('SKU_NOT_FOUND', 'sku_code', 1)], []);
    expect(g[0].category).toBe('reference_missing');
    expect(g[0].title).toContain('SKU / 供应商');
  });

  it('8) SUPPLIER_NOT_FOUND → reference_missing', () => {
    const g = generateImportGuidance('purchases', [mkError('SUPPLIER_NOT_FOUND', 'supplier_name', 1)], []);
    expect(g[0].category).toBe('reference_missing');
  });

  it('9) CUSTOMER_NOT_FOUND → reference_missing（sales）', () => {
    const g = generateImportGuidance('sales', [mkError('CUSTOMER_NOT_FOUND', 'customer_name', 1)], []);
    expect(g[0].category).toBe('reference_missing');
    expect(g[0].title).toContain('SKU / 客户');
  });

  it('10) REFERENCE_NOT_FOUND → reference_missing（inventory 标签）', () => {
    const g = generateImportGuidance('inventory', [mkError('REFERENCE_NOT_FOUND', 'sku_code', 1)], []);
    expect(g[0].category).toBe('reference_missing');
    expect(g[0].title).toContain('SKU / 库位');
  });

  it('11) OUT_OF_RANGE → value_out_of_range', () => {
    const g = generateImportGuidance('inventory', [mkError('OUT_OF_RANGE', 'quantity', 1)], []);
    expect(g[0].category).toBe('value_out_of_range');
  });

  it('12) VALUE_OUT_OF_RANGE → value_out_of_range', () => {
    const g = generateImportGuidance('products', [mkError('VALUE_OUT_OF_RANGE', 'sale_price', 1)], []);
    expect(g[0].category).toBe('value_out_of_range');
  });

  it('13) NEGATIVE_QTY → value_out_of_range', () => {
    const g = generateImportGuidance('inventory', [mkError('NEGATIVE_QTY', 'quantity', 1)], []);
    expect(g[0].category).toBe('value_out_of_range');
  });

  it('14) DATE_FORMAT_INVALID → date_format', () => {
    const g = generateImportGuidance('purchases', [mkError('DATE_FORMAT_INVALID', 'order_date', 1)], []);
    expect(g[0].category).toBe('date_format');
  });

  it('15) INVALID_DATE → date_format', () => {
    const g = generateImportGuidance('sales', [mkError('INVALID_DATE', 'order_date', 1)], []);
    expect(g[0].category).toBe('date_format');
  });

  it('16) DATE_PARSE_FAIL → date_format', () => {
    const g = generateImportGuidance('purchases', [mkError('DATE_PARSE_FAIL', 'expected_date', 1)], []);
    expect(g[0].category).toBe('date_format');
  });

  it('17) ENCODING_INVALID → encoding_unknown', () => {
    const g = generateImportGuidance('products', [mkError('ENCODING_INVALID', 'name', 1)], []);
    expect(g[0].category).toBe('encoding_unknown');
  });

  it('18) INVALID_ENCODING → encoding_unknown', () => {
    const g = generateImportGuidance('products', [mkError('INVALID_ENCODING', 'description', 1)], []);
    expect(g[0].category).toBe('encoding_unknown');
  });

  it('19) BOM_MISSING → encoding_unknown', () => {
    const g = generateImportGuidance('products', [mkError('BOM_MISSING', 'name', 1)], []);
    expect(g[0].category).toBe('encoding_unknown');
  });

  it('20) IMAGE_NOT_FOUND → image_missing（products 模板路径）', () => {
    const g = generateImportGuidance('products', [mkError('IMAGE_NOT_FOUND', 'image_filename', 1)], []);
    expect(g[0].category).toBe('image_missing');
    expect(g[0].actionPath).toBe('/products?downloadTemplate=products');
  });

  it('21) IMAGE_MISSING → image_missing', () => {
    const g = generateImportGuidance('products', [mkError('IMAGE_MISSING', 'image_filename', 1)], []);
    expect(g[0].category).toBe('image_missing');
  });
});

// ---------- 聚合 / 排序 / 边界 ----------

describe('generateImportGuidance - 聚合与排序', () => {
  it('22) 同 category 多行聚合：affectedRows 等于行数（去重）', () => {
    const errors = [
      mkError('MISSING_REQUIRED', 'name', 1),
      mkError('MISSING_REQUIRED', 'name', 2),
      mkError('MISSING_REQUIRED', 'name', 3),
    ];
    const g = generateImportGuidance('products', errors, []);
    expect(g).toHaveLength(1);
    expect(g[0].affectedRows).toBe(3);
    expect(g[0].fields).toEqual(['name']);
  });

  it('23) 同 category 多字段聚合：fields 集合去重', () => {
    const errors = [
      mkError('OUT_OF_RANGE', 'quantity', 1),
      mkError('OUT_OF_RANGE', 'unit_price', 2),
      mkError('NEGATIVE_QTY', 'quantity', 3),
    ];
    const g = generateImportGuidance('inventory', errors, []);
    expect(g).toHaveLength(1);
    expect(g[0].category).toBe('value_out_of_range');
    expect(g[0].affectedRows).toBe(3);
    expect(g[0].fields.sort()).toEqual(['quantity', 'unit_price']);
  });

  it('24) 多种 category 混合：返回多条且按 affectedRows 降序', () => {
    const errors = [
      // duplicate: 1 行
      mkError('DUPLICATE_ROW', 'spu_code', 1),
      // missing: 5 行
      ...Array.from({ length: 5 }, (_, i) => mkError('MISSING_REQUIRED', 'name', i + 2)),
      // image: 3 行
      ...Array.from({ length: 3 }, (_, i) => mkError('IMAGE_NOT_FOUND', 'image_filename', i + 10)),
    ];
    const g = generateImportGuidance('products', errors, []);
    expect(g.length).toBeGreaterThanOrEqual(3);
    expect(g[0].affectedRows).toBe(5); // missing_required 最大
    // 严格降序
    for (let i = 1; i < g.length; i++) {
      expect(g[i - 1].affectedRows).toBeGreaterThanOrEqual(g[i].affectedRows);
    }
  });

  it('25) 空 errorList → 返回 []', () => {
    expect(generateImportGuidance('products', [], [])).toEqual([]);
  });

  it('26) 未知错误码 → 不出现在结果', () => {
    const errors = [mkError('SOMETHING_UNKNOWN', 'name', 1)];
    const g = generateImportGuidance('products', errors, []);
    expect(g).toEqual([]);
  });

  it('27) 错误码大小写不敏感', () => {
    const g = generateImportGuidance('products', [mkError('missing_required', 'name', 1)], []);
    expect(g[0].category).toBe('missing_required');
  });

  it('28) 错误码无 field 也能分类', () => {
    const e: ImportError = { code: 'IMAGE_NOT_FOUND', field: '', rowIndex: 1, level: 'L3', message: '' };
    const g = generateImportGuidance('products', [e], []);
    expect(g[0].category).toBe('image_missing');
    expect(g[0].fields).toEqual([]);
  });
});

// ---------- targetType 影响 ----------

describe('generateImportGuidance - targetType 适配', () => {
  const targets: ImportTarget[] = ['products', 'inventory', 'purchases', 'sales', 'suppliers', 'customers'];
  const targetLabels: Record<ImportTarget, string> = {
    products: '商品库',
    inventory: '库存交易',
    purchases: '采购订单',
    sales: '销售订单',
    suppliers: '供应商主数据',
    customers: '客户主数据',
  };

  it.each(targets)('29) %s target → title 含正确中文标签', (t) => {
    const g = generateImportGuidance(t, [mkError('DUPLICATE_ROW', 'x', 1)], []);
    expect(g[0].title).toContain(targetLabels[t]);
  });

  it('30) purchases target → 模板路径指向 purchases', () => {
    const g = generateImportGuidance('purchases', [mkError('MISSING_REQUIRED', 'po_number', 1)], []);
    expect(g[0].actionPath).toBe('/products?downloadTemplate=purchases');
  });

  it('31) suppliers target → 模板路径指向 suppliers-customers', () => {
    const g = generateImportGuidance('suppliers', [mkError('MISSING_REQUIRED', 'supplier_name', 1)], []);
    expect(g[0].actionPath).toBe('/products?downloadTemplate=suppliers-customers');
  });

  it('32) image_missing 在非商品 target 也提供 actionLabel', () => {
    // 实际上图片主要关联 products，但 action 仍可生成
    const g = generateImportGuidance('products', [mkError('IMAGE_NOT_FOUND', 'image_filename', 1)], []);
    expect(g[0].actionLabel).toBe('下载商品图片示例');
  });
});

// ---------- AI Hint（别名猜测）----------

describe('generateImportGuidance - AI Hint 别名', () => {
  it('33) headers 含中文别名 → aiHint 出现', () => {
    const g = generateImportGuidance(
      'products',
      [mkError('MISSING_REQUIRED', 'name', 1)],
      ['商品名称', '品名', 'SPU编码'],
    );
    expect(g[0].aiHint).toBeDefined();
    expect(g[0].aiHint).toMatch(/name/);
    expect(g[0].aiHint).toMatch(/商品名称|品名/);
  });

  it('34) headers 不含别名 → aiHint 为 undefined', () => {
    const g = generateImportGuidance(
      'products',
      [mkError('MISSING_REQUIRED', 'name', 1)],
      ['foo', 'bar', 'baz'],
    );
    expect(g[0].aiHint).toBeUndefined();
  });

  it('35) mapping_conflict 也有 AI hint', () => {
    const g = generateImportGuidance(
      'products',
      [mkError('MAPPING_CONFLICT', 'category', 1)],
      ['分类', '类目'],
    );
    expect(g[0].aiHint).toBeDefined();
  });
});

// ---------- 接口契约 ----------

describe('generateImportGuidance - 返回值契约', () => {
  it('36) 返回类型为 ImportGuidance[]，每条都有 category/title/suggestion/affectedRows/fields', () => {
    const g: ImportGuidance[] = generateImportGuidance(
      'products',
      [mkError('MISSING_REQUIRED', 'name', 1)],
      [],
    );
    expect(g).toBeInstanceOf(Array);
    expect(g[0]).toHaveProperty('category');
    expect(g[0]).toHaveProperty('title');
    expect(g[0]).toHaveProperty('suggestion');
    expect(g[0]).toHaveProperty('affectedRows');
    expect(g[0]).toHaveProperty('fields');
  });

  it('37) suggestion 永远非空字符串', () => {
    const g = generateImportGuidance('products', [mkError('IMAGE_NOT_FOUND', 'image_filename', 1)], []);
    expect(typeof g[0].suggestion).toBe('string');
    expect(g[0].suggestion.length).toBeGreaterThan(0);
  });

  it('38) 同类多字段：title 列出所有字段', () => {
    const g = generateImportGuidance(
      'products',
      [mkError('MISSING_REQUIRED', 'name', 1), mkError('MISSING_REQUIRED', 'spu_code', 2)],
      [],
    );
    expect(g[0].title).toMatch(/name/);
    expect(g[0].title).toMatch(/spu_code/);
  });

  it('39) reference_missing actionPath 指向主数据模板', () => {
    const g = generateImportGuidance('sales', [mkError('CUSTOMER_NOT_FOUND', 'customer_name', 1)], []);
    expect(g[0].actionPath).toContain('suppliers-customers');
    expect(g[0].actionLabel).toBe('查看导入主数据');
  });

  it('40) duplicate_row 没有 actionPath（继续建议在 Step 5 调整策略）', () => {
    const g = generateImportGuidance('products', [mkError('DUPLICATE_ROW', 'spu_code', 1)], []);
    expect(g[0].actionPath).toBeUndefined();
  });
});
