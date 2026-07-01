/**
 * ProClaw 批量导入中心 - 共享类型（v1.2 P1）
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
