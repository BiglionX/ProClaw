/**
 * 商品数据导入 - 前端类型定义
 *
 * 与 Rust 端 `src-tauri/src/import/types.rs` 保持字段名一致（snake_case 由 serde 自动转换）。
 * Rust 端返回的 ImportResult.batch_id 等保留 snake_case，前端 TS 字段对应使用 snake_case。
 */

/** 一行原始数据（解析后的扁平字典 + 原始行号） */
export interface ImportRow {
  rowIndex: number;
  raw: Record<string, string>;
}

/** 字段映射：源列 → 目标字段 */
export interface FieldMapping {
  sourceColumn: string;
  targetField: string; // 'name' | 'spu_code' | 'sku_code' | 'cost_price' | ...
}

/** 行级错误 */
export interface ImportError {
  rowIndex: number;
  field: string;
  level: 'L1' | 'L2' | 'L3';
  code: string;
  message: string;
  value?: string | null;
}

/** 字段映射自动匹配结果（前端 UI 用） */
export interface FieldMatchCandidate {
  sourceColumn: string;
  targetField: string;
  confidence: number; // 0~1
  reason: 'exact' | 'alias' | 'fuzzy' | 'manual';
}

/** 前端发往后端的请求体 */
export interface ImportRequest {
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'json';
  fileHash?: string | null;
  rows: ImportRow[];
  mapping: FieldMapping[];
  conflictStrategy: 'skip' | 'overwrite' | 'duplicate';
  /** v1.2 P1：目标类型（向后兼容，未传则后端默认 'products'） */
  targetType?: ImportTarget;
  /** v1.3：图片 zip 包在 AppData 内的相对路径（指向 `import_images/<hash>/`） */
  imageArchive?: string | null;
}

/** v1.3：单张图片条目（zip 解压后由后端填充） */
export interface ImageManifestEntry {
  archive_name: string;
  spu_code: string | null;
  sku_code: string | null;
  size_bytes: number;
  local_path: string;
}

/** v1.3：图片 zip 包清单 */
export interface ImageArchiveManifest {
  archive_dir: string;
  entries: ImageManifestEntry[];
  total_size: number;
}

/** v1.3：图片归档摘要（前端用） */
export interface ImageArchiveSummary {
  archiveRelativePath: string; // 相对 AppData 路径
  entryCount: number;
  totalSize: number;
}

/** 前端接收的导入结果 */
export interface ImportResult {
  batch_id: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  errors: ImportError[];
}

/** 批次状态（与 Rust import_batches.status 对应） */
export type BatchStatus =
  | 'pending'
  | 'parsing'
  | 'mapping'
  | 'validating'
  | 'importing'
  // v1.3：新增暂停/重试
  | 'paused'
  | 'retrying'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

/** 前端导入向导的目标类型（v1.2 P1 扩展：库存/采购/销售/供应商/客户） */
export type ImportTarget =
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'suppliers'
  | 'customers';

/** v1.2 P1：库存交易必填字段（与 Rust validator.rs REQUIRED_INVENTORY_FIELDS 一致） */
export const REQUIRED_INVENTORY_FIELDS = [
  'sku_code',
  'transaction_type',
  'quantity',
  'transaction_date',
] as const;

/** v1.2 P1：采购订单必填字段（每行 = 1 个采购单 + 1 个 item，平铺结构） */
export const REQUIRED_PURCHASE_FIELDS = [
  'po_number',
  'supplier_name',
  'order_date',
  'sku_code',
  'item_qty',
  'item_unit_price',
] as const;

/** v1.2 P1：销售订单必填字段 */
export const REQUIRED_SALES_FIELDS = [
  'so_number',
  'customer_name',
  'order_date',
  'sku_code',
  'item_qty',
  'item_unit_price',
] as const;

/** v1.2 P1：供应商主数据必填字段 */
export const REQUIRED_SUPPLIER_FIELDS = ['supplier_name'] as const;

/** v1.2 P1：客户主数据必填字段 */
export const REQUIRED_CUSTOMER_FIELDS = ['customer_name'] as const;

/** v1.2 P1：商品库（MVP）必填字段 */
export const REQUIRED_PRODUCT_FIELDS = ['name'] as const;

/** v1.2 P1：按目标查必填字段（与 Rust required_fields_for 对应） */
export const REQUIRED_FIELDS_BY_TARGET: Record<ImportTarget, readonly string[]> = {
  products: REQUIRED_PRODUCT_FIELDS,
  inventory: REQUIRED_INVENTORY_FIELDS,
  purchases: REQUIRED_PURCHASE_FIELDS,
  sales: REQUIRED_SALES_FIELDS,
  suppliers: REQUIRED_SUPPLIER_FIELDS,
  customers: REQUIRED_CUSTOMER_FIELDS,
};

/** v1.2 P1：库存交易可选字段 */
export const INVENTORY_FIELDS = [
  'sku_code',
  'transaction_type',
  'quantity',
  'unit_price',
  'transaction_date',
  'reference_no',
  'reason',
  'operator',
  'notes',
] as const;

/** v1.2 P1：采购单可选字段 */
export const PURCHASE_FIELDS = [
  'po_number',
  'supplier_name',
  'supplier_phone',
  'supplier_contact',
  'order_date',
  'expected_date',
  'sku_code',
  'item_qty',
  'item_unit_price',
  'notes',
] as const;

/** v1.2 P1：销售单可选字段 */
export const SALES_FIELDS = [
  'so_number',
  'customer_name',
  'customer_phone',
  'customer_contact',
  'order_date',
  'expected_date',
  'shipping_address',
  'sku_code',
  'item_qty',
  'item_unit_price',
  'notes',
] as const;

/** v1.2 P1：供应商主数据可选字段 */
export const SUPPLIER_FIELDS = [
  'supplier_name',
  'supplier_phone',
  'supplier_contact',
  'supplier_email',
  'supplier_address',
  'supplier_payment_terms',
  'supplier_tax_number',
  'notes',
] as const;

/** v1.2 P1：客户主数据可选字段 */
export const CUSTOMER_FIELDS = [
  'customer_name',
  'customer_phone',
  'customer_contact',
  'customer_email',
  'customer_address',
  'customer_tax_number',
  'notes',
] as const;

/** 文件解析的中间结果 */
export interface ParsedFile {
  fileName: string;
  fileType: 'xlsx' | 'csv' | 'json';
  fileHash: string;
  sheetNames: string[]; // xlsx 多 sheet 记录；csv/json 为单元素数组
  rows: ImportRow[]; // 表头已剔除
  headers: string[]; // 解析出的列名（去重）
}

/** 冲突策略 */
export type ConflictStrategy = 'skip' | 'overwrite' | 'duplicate';

export const CONFLICT_STRATEGIES: { value: ConflictStrategy; label: string; description: string }[] = [
  { value: 'skip', label: '跳过', description: '已存在则跳过，仅导入新数据' },
  { value: 'overwrite', label: '覆盖', description: '已存在则更新该记录' },
  { value: 'duplicate', label: '复制为新', description: '已存在则创建副本（编码追加 _copy2）' },
];