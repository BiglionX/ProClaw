/**
 * ProClaw 批量导入中心 - 共享类型（v1.2 P1 + v1.3 老系统迁移）
 *
 * 与 src-tauri/src/import/types.rs 一一对应
 */

/** 业务对象导入目标 */
export type ImportTarget =
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'suppliers'
  | 'customers';

/** 目标类型中文标签 */
export const TARGET_LABELS: Record<ImportTarget, string> = {
  products: '商品库',
  inventory: '库存交易',
  purchases: '采购订单',
  sales: '销售订单',
  suppliers: '供应商',
  customers: '客户',
};

/** 批次状态机 */
export type BatchStatus =
  | 'pending'
  | 'parsing'
  | 'mapping'
  | 'validating'
  | 'importing'
  | 'paused'
  | 'retrying'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

/** 状态中文标签 */
export const STATUS_LABELS: Record<BatchStatus, string> = {
  pending: '待处理',
  parsing: '解析中',
  mapping: '待映射',
  validating: '校验中',
  importing: '导入中',
  paused: '已暂停',
  retrying: '重试中',
  success: '成功',
  partial: '部分成功',
  failed: '失败',
  cancelled: '已取消',
};

/** 状态颜色（用于 Chip） */
export const STATUS_COLORS: Record<BatchStatus, 'default' | 'primary' | 'warning' | 'success' | 'error' | 'info'> = {
  pending: 'default',
  parsing: 'info',
  mapping: 'info',
  validating: 'warning',
  importing: 'warning',
  paused: 'default',
  retrying: 'info',
  success: 'success',
  partial: 'warning',
  failed: 'error',
  cancelled: 'default',
};

/** 字段元数据 */
export interface FieldDef {
  key: string;
  label: string;
  aliases: string[];
  required: boolean;
  field_type: 'string' | 'number' | 'date' | 'boolean';
  example: string;
}

/** 一行数据（按列名 → 值） */
export type FieldMap = Record<string, string>;

/** 解析后的一行 */
export interface ParsedRow {
  row_index: number;
  fields: FieldMap;
}

/** 解析结果 */
export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  total_rows: number;
}

/** 批次主表（与 import_batches 表对齐） */
export interface ImportBatch {
  id: string;
  target_type: ImportTarget;
  source_filename: string;
  source_format: 'csv' | 'json' | 'xlsx';
  source_size?: number;
  source_path?: string;
  row_count?: number;
  column_mapping?: string;
  status: BatchStatus;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  error_summary?: string;
  dedup_key?: string;
  started_at?: string;
  finished_at?: string;
  performed_by?: string;
  notes?: string;
}

/** 行级错误（与 import_batch_errors 表对齐） */
export interface ImportBatchError {
  id: string;
  batch_id: string;
  row_index: number;
  field_name?: string;
  error_code: string;
  error_message: string;
  raw_value?: string;
  phase: 'validating' | 'importing';
  created_at?: string;
}

/** 创建批次响应 */
export interface ImportCreateResponse {
  batch_id: string;
  target_type: ImportTarget;
  target_label: string;
  total_rows: number;
  headers: string[];
  sample_rows: FieldMap[];
  /** v1.3 源文件保存路径（用于老格式 preview/execute 时定位实际文件） */
  source_path?: string;
}

/** 校验响应 */
export interface ValidateResponse {
  batch_id: string;
  status: BatchStatus;
  valid_rows: number;
  invalid_rows: number;
  error_count: number;
}

/** 执行响应 */
export interface ExecuteResponse {
  batch_id: string;
  status: BatchStatus;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  finished_at: string;
}

/** 模板元数据 */
export interface TemplateInfo {
  filename: string;
  display_name: string;
  description: string;
  path: string;
  size_bytes: number;
}

/** 用户保存的字段映射模板 */
export interface MappingTemplate {
  id: string;
  target_type: ImportTarget;
  template_name: string;
  mapping: Record<string, string>;
  config?: Record<string, string>;
  use_count: number;
  last_used_at?: string;
}

/** 字段映射方案（前端用，列名 → 字段 key + 别名集合） */
export interface FieldMappingRow {
  /** 解析后的列名（来自 CSV/JSON 表头） */
  column_name: string;
  /** 匹配到的目标字段 key，可空（不导入） */
  target_field: string;
  /** 匹配到的字段定义（用于显示中文 label） */
  target_field_def?: FieldDef;
  /** 匹配置信度 0-1（1=精确匹配，0.8=别名匹配，0=未匹配） */
  confidence: number;
  /** 匹配来源（'exact' | 'alias' | 'manual' | 'none'） */
  match_source: 'exact' | 'alias' | 'manual' | 'none';
}

// ============================================
// v1.3 老系统数据迁移 - 新增类型
// ============================================

/**
 * 表头探测结果
 * - header_row_index: 主表头所在行（0-based）
 * - data_start_row: 数据起始行
 * - segment_titles: 分段标题列表（每个元素是一个段落的标题/范围）
 * - detection_confidence: 0-1 探测置信度
 */
export interface HeaderStructure {
  header_row_index: number;
  data_start_row: number;
  segment_titles: SegmentTitle[];
  detection_confidence: number;
}

/** 单个分段（"客户档案" 整个段落、"联系方式" 子段落） */
export interface SegmentTitle {
  /** 分段标题（如 "客户档案"、"联系方式"、"商品基本信息"） */
  title: string;
  /** 起始行（0-based） */
  start_row: number;
  /** 结束行（exclusive） */
  end_row: number;
  /** 起始列（0-based） */
  start_col: number;
  /** 结束列（exclusive） */
  end_col: number;
}

/**
 * 预览接口实际返回的分段标题。
 * 后端把列号写进 HashMap<String, String>，JSON 里 start_col / end_col 是字符串。
 */
export interface LegacySegmentTitle {
  start_col: string;
  title: string;
  end_col: string;
}

/** 聚合规则（用户在 Step 4 编辑后传给后端） */
export interface AggregationRule {
  /** 分组键（客户编号 / 商品 SPU 等） */
  group_key: string;
  /** 行为：'spu' = 当成 SPU 主行 / 'merge' = 合并 / 'skip' = 跳过 */
  action: 'spu' | 'merge' | 'skip';
  /** 选中作为主行的 row_index */
  primary_row_index: number;
  /** 包含的所有 row_index（用于合并多联系人 / 多 SKU） */
  included_row_indices: number[];
}

/** 客户聚合组（聚合后的 1 customer + N contacts） */
export interface CustomerAggregate {
  code: string;
  name: string;
  base_fields: FieldMap;
  contacts: CustomerContactRecord[];
}

/** 客户单联系人 */
export interface CustomerContactRecord {
  contact_name: string;
  phone: string;
  landline: string;
  qq_wechat: string;
  address: string;
  is_primary: boolean;
}

/** 商品聚合组（聚合后的 1 product + N skus） */
export interface ProductAggregate {
  sku: string;
  name: string;
  category?: string;
  spec?: string;
  tag?: string;
  variants: ProductSkuRecord[];
}

/** 商品 SKU（变体） */
export interface ProductSkuRecord {
  sku: string;
  variant_name: string;
  spec: string;
}

/** 老格式解析结果（后端 parse_legacy_file 返回） */
export interface LegacyParseResult {
  format: 'xls' | 'xlsx';
  detected_format: 'xls' | 'xlsx';
  total_data_rows: number;
  field_names: string[];
  segment_titles: LegacySegmentTitle[];
  customer_groups: CustomerAggregate[];
  product_groups: ProductAggregate[];
  /** 待建档类别：{ product: [...], supplier: [...], customer: [...] } */
  categories_to_create: Record<string, string[]>;
  /** 表头预览（前 10 行） */
  header_preview: string[][];
}

/** 老格式预览请求 */
export interface LegacyPreviewRequest {
  source_path: string;
  target_type: ImportTarget;
}

/** 老格式执行请求 */
export interface LegacyExecuteRequest {
  batch_id: string;
  column_mapping: Record<string, string>;
  default_values?: Record<string, string>;
  skip_errors?: boolean;
  /** 用户在 Step 4 编辑后的聚合规则 */
  aggregation_rules?: AggregationRule[];
  /** 跳过类别自动建档（默认 false = 自动建档） */
  skip_category_auto_create?: boolean;
}

/** 类别建档汇总 */
export interface CategoryCreateSummary {
  product_created: number;
  supplier_created: number;
  customer_created: number;
  product_skipped: number;
  supplier_skipped: number;
  customer_skipped: number;
}

/** 老格式执行响应 */
export interface LegacyExecuteResponse {
  batch_id: string;
  status: 'success' | 'partial' | 'failed';
  customers_created: number;
  customer_contacts_created: number;
  products_created: number;
  product_skus_created: number;
  suppliers_created: number;
  categories_summary: CategoryCreateSummary;
  finished_at: string;
}

/** 老格式撤销响应 */
export interface RollbackResponse {
  batch_id: string;
  contacts_deleted: number;
  product_skus_deleted: number;
  categories_deleted: number;
  rolled_back_at: string;
}
