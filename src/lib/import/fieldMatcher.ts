/**
 * ProClaw 批量导入中心 - 中英文字段别名词典（v1.2 P1）
 *
 * 通过别名匹配让用户上传的 CSV/JSON 表头自动关联到目标字段。
 * 覆盖 6 类业务对象共 47+ 字段 / 80+ 别名。
 */

import type { FieldDef } from '../../types/import';

// ============================================
// 6 类业务对象字段定义（与后端 types.rs FIELDS_* 严格对齐）
// ============================================

export const FIELDS_PRODUCTS: FieldDef[] = [
  { key: 'sku', label: 'SKU 编码', aliases: ['sku', 'SKU', '商品编码', '商品代码', '货号', 'item_code', 'product_code'], required: true, field_type: 'string', example: 'SKU-001' },
  { key: 'name', label: '商品名称', aliases: ['name', '商品名称', '名称', '品名', '产品名', 'product_name', 'item_name'], required: true, field_type: 'string', example: 'iPhone 15 电池' },
  { key: 'category', label: '分类', aliases: ['category', '分类', '品类', '商品分类', 'cat'], required: false, field_type: 'string', example: 'iPhone 15 系列' },
  { key: 'brand', label: '品牌', aliases: ['brand', '品牌', '牌子'], required: false, field_type: 'string', example: 'Apple' },
  { key: 'unit', label: '单位', aliases: ['unit', '单位', '计量单位', 'uom'], required: false, field_type: 'string', example: '块' },
  { key: 'cost_price', label: '成本价', aliases: ['cost_price', 'cost', '成本价', '进价', '进货价', 'purchase_price', 'cif'], required: false, field_type: 'number', example: '80.00' },
  { key: 'sell_price', label: '销售价', aliases: ['sell_price', 'price', '售价', '销售价', '零售价', 'msrp', 'retail_price'], required: false, field_type: 'number', example: '199.00' },
  { key: 'current_stock', label: '初始库存', aliases: ['current_stock', 'stock', '库存', '初始库存', '期初库存', 'qty_on_hand'], required: false, field_type: 'number', example: '50' },
  { key: 'min_stock', label: '最低库存', aliases: ['min_stock', 'min', '最低库存', '安全库存', 'safety_stock'], required: false, field_type: 'number', example: '5' },
  { key: 'max_stock', label: '最高库存', aliases: ['max_stock', 'max', '最高库存', '最大库存'], required: false, field_type: 'number', example: '999' },
  { key: 'barcode', label: '条形码', aliases: ['barcode', '条形码', '条码', 'ean', 'upc'], required: false, field_type: 'string', example: '6931234560001' },
  { key: 'description', label: '商品描述', aliases: ['description', '描述', '商品描述', '备注', 'desc', 'remark'], required: false, field_type: 'string', example: '原装电池' },
];

export const FIELDS_INVENTORY: FieldDef[] = [
  { key: 'sku', label: 'SKU 编码', aliases: ['sku', 'SKU', '商品编码', 'product_code'], required: true, field_type: 'string', example: 'SKU-001' },
  { key: 'transaction_type', label: '交易类型', aliases: ['transaction_type', 'type', '交易类型', '类型', 'txn_type', '入库', '出库', '调整', '调拨'], required: true, field_type: 'string', example: 'inbound' },
  { key: 'quantity', label: '数量', aliases: ['quantity', 'qty', '数量', 'amount', 'count'], required: true, field_type: 'number', example: '10' },
  { key: 'transaction_date', label: '交易日期', aliases: ['transaction_date', 'date', '日期', '交易日期', 'txn_date', '日期date'], required: false, field_type: 'date', example: '2026-07-01' },
  { key: 'reference_no', label: '参考单号', aliases: ['reference_no', 'ref', '参考单号', '关联单号', '单号', 'ref_no'], required: false, field_type: 'string', example: 'PO-2026-001' },
  { key: 'reason', label: '原因', aliases: ['reason', '原因', '理由'], required: false, field_type: 'string', example: '采购入库' },
  { key: 'notes', label: '备注', aliases: ['notes', '备注', 'note'], required: false, field_type: 'string', example: '' },
];

export const FIELDS_PURCHASES: FieldDef[] = [
  { key: 'po_number', label: '采购单号', aliases: ['po_number', 'po', '采购单号', '单号', 'purchase_order', 'po_no'], required: true, field_type: 'string', example: 'PO-2026-001' },
  { key: 'supplier', label: '供应商', aliases: ['supplier', '供应商名称', 'vendor', 'supplier_name'], required: true, field_type: 'string', example: '深圳电池供应商' },
  { key: 'order_date', label: '采购日期', aliases: ['order_date', '采购日期', '日期', 'po_date', 'purchase_date'], required: true, field_type: 'date', example: '2026-07-01' },
  { key: 'sku', label: 'SKU 编码', aliases: ['sku', 'SKU', '商品编码', 'product_code'], required: true, field_type: 'string', example: 'SKU-001' },
  { key: 'quantity', label: '数量', aliases: ['quantity', 'qty', '数量', 'amount'], required: true, field_type: 'number', example: '10' },
  { key: 'unit_price', label: '单价', aliases: ['unit_price', 'price', '单价', 'cost', 'unit_cost'], required: true, field_type: 'number', example: '80.00' },
  { key: 'expected_delivery_date', label: '预计到货日期', aliases: ['expected_delivery_date', '到货日期', 'eta', 'delivery_date', 'expect_arrival'], required: false, field_type: 'date', example: '2026-07-08' },
  { key: 'status', label: '状态', aliases: ['status', '状态', 'po_status'], required: false, field_type: 'string', example: 'confirmed' },
  { key: 'notes', label: '备注', aliases: ['notes', '备注', 'remarks'], required: false, field_type: 'string', example: '' },
];

export const FIELDS_SALES: FieldDef[] = [
  { key: 'so_number', label: '销售单号', aliases: ['so_number', 'so', '销售单号', '单号', 'sales_order', 'so_no'], required: true, field_type: 'string', example: 'SO-2026-001' },
  { key: 'customer', label: '客户', aliases: ['customer', '客户名称', 'client', 'customer_name'], required: true, field_type: 'string', example: '手机维修店 A' },
  { key: 'order_date', label: '销售日期', aliases: ['order_date', '销售日期', '日期', 'so_date', 'sales_date'], required: true, field_type: 'date', example: '2026-07-01' },
  { key: 'sku', label: 'SKU 编码', aliases: ['sku', 'SKU', '商品编码', 'product_code'], required: true, field_type: 'string', example: 'SKU-001' },
  { key: 'quantity', label: '数量', aliases: ['quantity', 'qty', '数量', 'amount'], required: true, field_type: 'number', example: '1' },
  { key: 'unit_price', label: '单价', aliases: ['unit_price', 'price', '单价', 'sell_price', 'unit_sell'], required: true, field_type: 'number', example: '199.00' },
  { key: 'status', label: '状态', aliases: ['status', '状态', 'so_status'], required: false, field_type: 'string', example: 'delivered' },
  { key: 'notes', label: '备注', aliases: ['notes', '备注', 'remarks'], required: false, field_type: 'string', example: '' },
];

export const FIELDS_SUPPLIERS: FieldDef[] = [
  { key: 'name', label: '供应商名称', aliases: ['name', '供应商名称', '名称', 'supplier_name', 'vendor_name'], required: true, field_type: 'string', example: '深圳电池供应商' },
  { key: 'code', label: '供应商编码', aliases: ['code', '供应商编码', '编码', 'supplier_code', 'vendor_code'], required: false, field_type: 'string', example: 'SUP-001' },
  { key: 'contact_person', label: '联系人', aliases: ['contact_person', 'contact', '联系人', 'contact_name'], required: false, field_type: 'string', example: '张三' },
  { key: 'phone', label: '电话', aliases: ['phone', '电话', '联系电话', 'tel', 'mobile'], required: false, field_type: 'string', example: '13800138000' },
  { key: 'email', label: '邮箱', aliases: ['email', '邮箱', '电子邮箱', 'mail'], required: false, field_type: 'string', example: 'supplier@example.com' },
  { key: 'address', label: '地址', aliases: ['address', '地址', 'addr'], required: false, field_type: 'string', example: '' },
  { key: 'tax_number', label: '税号', aliases: ['tax_number', '税号', 'tax_id', 'unified_social_credit_code'], required: false, field_type: 'string', example: '' },
];

export const FIELDS_CUSTOMERS: FieldDef[] = [
  { key: 'name', label: '客户名称', aliases: ['name', '客户名称', '名称', 'customer_name', 'client_name'], required: true, field_type: 'string', example: '手机维修店 A' },
  { key: 'code', label: '客户编码', aliases: ['code', '客户编码', '编码', 'customer_code', 'client_code'], required: false, field_type: 'string', example: 'CUS-001' },
  { key: 'contact_person', label: '联系人', aliases: ['contact_person', 'contact', '联系人', 'contact_name'], required: false, field_type: 'string', example: '李四' },
  { key: 'phone', label: '电话', aliases: ['phone', '电话', '联系电话', 'tel', 'mobile'], required: false, field_type: 'string', example: '13900139000' },
  { key: 'email', label: '邮箱', aliases: ['email', '邮箱', '电子邮箱', 'mail'], required: false, field_type: 'string', example: '' },
  { key: 'address', label: '地址', aliases: ['address', '地址', 'addr'], required: false, field_type: 'string', example: '' },
  { key: 'customer_type', label: '客户类型', aliases: ['customer_type', '客户类型', 'type', '客户种类'], required: false, field_type: 'string', example: 'company' },
];

/** 各目标 → 字段定义 */
export const TARGET_FIELDS: Record<string, FieldDef[]> = {
  products: FIELDS_PRODUCTS,
  inventory: FIELDS_INVENTORY,
  purchases: FIELDS_PURCHASES,
  sales: FIELDS_SALES,
  suppliers: FIELDS_SUPPLIERS,
  customers: FIELDS_CUSTOMERS,
};

/** 各目标必填字段 key 列表 */
export const REQUIRED_FIELDS_BY_TARGET: Record<string, string[]> = {
  products: ['sku', 'name'],
  inventory: ['sku', 'transaction_type', 'quantity'],
  purchases: ['po_number', 'supplier', 'order_date', 'sku', 'quantity', 'unit_price'],
  sales: ['so_number', 'customer', 'order_date', 'sku', 'quantity', 'unit_price'],
  suppliers: ['name'],
  customers: ['name'],
};

/**
 * 把列名归一化（小写、去空格、去下划线与中划线）
 *  - "Item Code" -> "item code"
 *  - "Item_Code" -> "item code"
 *  - "商品编码"  -> "商品编码"
 */
export function normalizeHeader(name: string): string {
  return name.trim().toLowerCase().replace(/[_\-\s]+/g, ' ');
}

/**
 * 单列名 → 目标字段匹配
 *  - 置信度：1.0 = 精确匹配 key 或 alias；0.8 = 归一化后匹配；0 = 不匹配
 */
export interface FieldMatch {
  field: FieldDef;
  confidence: number;
  source: 'exact' | 'alias' | 'manual';
}

export function matchColumn(column: string, fields: FieldDef[]): FieldMatch | null {
  const original = column.trim();
  if (!original) return null;

  // 1) 精确匹配 key / label / 任一 alias
  for (const f of fields) {
    if (f.key === original || f.label === original) {
      return { field: f, confidence: 1, source: 'exact' };
    }
    for (const a of f.aliases) {
      if (a === original) {
        return { field: f, confidence: 1, source: 'alias' };
      }
    }
  }

  // 2) 归一化后再匹配
  const norm = normalizeHeader(original);
  for (const f of fields) {
    if (normalizeHeader(f.key) === norm || normalizeHeader(f.label) === norm) {
      return { field: f, confidence: 0.9, source: 'alias' };
    }
    for (const a of f.aliases) {
      if (normalizeHeader(a) === norm) {
        return { field: f, confidence: 0.85, source: 'alias' };
      }
    }
  }

  return null;
}

/** 把一组列名自动映射为 FieldMappingRow[]（高置信度自动锁定） */
export function autoMapColumns(headers: string[], target: string): Array<{
  column_name: string;
  target_field: string;
  target_field_def?: FieldDef;
  confidence: number;
  match_source: 'exact' | 'alias' | 'manual' | 'none';
}> {
  const fields = TARGET_FIELDS[target] || [];
  return headers.map((h) => {
    const m = matchColumn(h, fields);
    if (m) {
      return {
        column_name: h,
        target_field: m.field.key,
        target_field_def: m.field,
        confidence: m.confidence,
        match_source: m.source,
      };
    }
    return {
      column_name: h,
      target_field: '',
      confidence: 0,
      match_source: 'none' as const,
    };
  });
}

/** 把 mapping rows 转成后端需要的 HashMap<列名, 字段key> */
export function mappingToColumnMap(rows: Array<{ column_name: string; target_field: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of rows) {
    if (r.target_field) {
      map[r.column_name] = r.target_field;
    }
  }
  return map;
}
