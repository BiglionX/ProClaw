/**
 * ProClaw 批量导入中心 - 服务层（v1.2 P1 + v1.3 老系统迁移）
 *
 * 封装 13 + 3 = 16 个 Tauri 命令；前端组件通过本模块访问后端能力。
 */

import { ipcInvoke, isTauri } from '../tauri';
import type {
  ImportBatch,
  ImportBatchError,
  ImportCreateResponse,
  ImportTarget,
  ExecuteResponse,
  LegacyExecuteRequest,
  LegacyExecuteResponse,
  LegacyParseResult,
  LegacyPreviewRequest,
  MappingTemplate,
  RollbackResponse,
  TemplateInfo,
  ValidateResponse,
} from '../../types/import';

// ============================================
// 1. 创建批次（上传文件 + 解析）
// ============================================

export interface CreateBatchRequest {
  target_type: ImportTarget;
  source_filename: string;
  source_format: 'csv' | 'json' | 'xlsx';
  source_base64: string;
  performed_by?: string | null;
  notes?: string | null;
}

/** 把 File 转成 base64（浏览器 / Tauri webview 通用） */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:<mime>;base64,XXXXX" → "XXXXX"
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

export async function createBatch(
  target: ImportTarget,
  file: File,
  options?: { performed_by?: string; notes?: string },
): Promise<ImportCreateResponse> {
  const base64 = await fileToBase64(file);
  const format = file.name.toLowerCase().endsWith('.json')
    ? 'json'
    : file.name.toLowerCase().endsWith('.xlsx')
      ? 'xlsx'
      : 'csv';
  return ipcInvoke<ImportCreateResponse>('import_create_batch', {
    request: {
      target_type: target,
      source_filename: file.name,
      source_format: format,
      source_base64: base64,
      performed_by: options?.performed_by ?? null,
      notes: options?.notes ?? null,
    } satisfies CreateBatchRequest,
  });
}

// ============================================
// 2. 重新解析
// ============================================

export async function reparseBatch(batchId: string): Promise<ImportCreateResponse> {
  return ipcInvoke<ImportCreateResponse>('import_parse_file', { batchId });
}

// ============================================
// 3. 校验
// ============================================

export interface ValidateBatchRequest {
  batch_id: string;
  column_mapping: Record<string, string>;
  default_values?: Record<string, string>;
}

export async function validateBatch(req: ValidateBatchRequest): Promise<ValidateResponse> {
  return ipcInvoke<ValidateResponse>('import_validate_batch', { request: req });
}

// ============================================
// 4. 执行
// ============================================

export interface ExecuteBatchRequest {
  batch_id: string;
  column_mapping: Record<string, string>;
  default_values?: Record<string, string>;
  skip_errors?: boolean;
}

export async function executeBatch(req: ExecuteBatchRequest): Promise<ExecuteResponse> {
  return ipcInvoke<ExecuteResponse>('import_execute_batch', {
    request: { ...req, skip_errors: req.skip_errors ?? true },
  });
}

// ============================================
// 5. 批次控制
// ============================================

export async function pauseBatch(batchId: string): Promise<void> {
  await ipcInvoke<void>('import_pause_batch', { batchId });
}

export async function cancelBatch(batchId: string): Promise<void> {
  await ipcInvoke<void>('import_cancel_batch', { batchId });
}

export async function retryBatch(batchId: string): Promise<ExecuteResponse> {
  return ipcInvoke<ExecuteResponse>('import_retry_batch', { batchId });
}

// ============================================
// 6. 查询
// ============================================

export async function getBatch(batchId: string): Promise<ImportBatch | null> {
  return ipcInvoke<ImportBatch | null>('import_get_batch', { batchId });
}

export interface ListBatchesRequest {
  target_type?: ImportTarget;
  status?: string;
  limit?: number;
  offset?: number;
}

export async function listBatches(req: ListBatchesRequest = {}): Promise<ImportBatch[]> {
  return ipcInvoke<ImportBatch[]>('import_list_batches', {
    request: {
      target_type: req.target_type ?? null,
      status: req.status ?? null,
      limit: req.limit ?? 50,
      offset: req.offset ?? 0,
    },
  });
}

export async function getBatchErrors(
  batchId: string,
  limit = 200,
  offset = 0,
): Promise<ImportBatchError[]> {
  return ipcInvoke<ImportBatchError[]>('import_get_batch_errors', {
    batchId,
    limit,
    offset,
  });
}

// ============================================
// 7. 模板（CSV 下载 + 用户保存的映射）
// ============================================

export async function getTemplates(): Promise<TemplateInfo[]> {
  return ipcInvoke<TemplateInfo[]>('import_get_templates');
}

/** 浏览器端下载文本文件（用于下载 CSV 模板） */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function listMappingTemplates(target?: ImportTarget): Promise<MappingTemplate[]> {
  return ipcInvoke<MappingTemplate[]>('import_list_mapping_templates', {
    request: { target_type: target ?? null },
  });
}

export interface SaveMappingTemplateRequest {
  target_type: ImportTarget;
  template_name: string;
  mapping: Record<string, string>;
  config?: Record<string, string>;
}

export async function saveMappingTemplate(
  req: SaveMappingTemplateRequest,
): Promise<MappingTemplate> {
  return ipcInvoke<MappingTemplate>('import_save_mapping_template', { request: req });
}

// ============================================
// 8. 工具：环境探测
// ============================================

export function importAvailable(): boolean {
  return isTauri();
}

// ============================================
// 9. v1.3 老系统数据迁移 — 新增 3 个命令封装
// ============================================

/**
 * 老格式文件预览（上传后调用，仅解析不写库）
 *
 * 用法：用户上传 .xls / .xlsx → 后端探测表头结构 + 聚合预览 → 前端展示给用户
 *
 * @param sourcePath 文件绝对路径（前端从 base64 解码写到 import_uploads/<batch_id>/）
 * @param target 目标类型（customers / products / suppliers）
 */
export async function previewLegacy(
  sourcePath: string,
  target: ImportTarget,
): Promise<LegacyParseResult> {
  return ipcInvoke<LegacyParseResult>('import_preview_legacy', {
    request: { source_path: sourcePath, target_type: target } satisfies LegacyPreviewRequest,
  });
}

/**
 * 老格式执行（用户在 Step 4 编辑聚合规则后调用）
 *
 * @param req 包含 batch_id / column_mapping / aggregation_rules / skip_category_auto_create 等
 */
export async function executeLegacy(
  req: LegacyExecuteRequest,
): Promise<LegacyExecuteResponse> {
  return ipcInvoke<LegacyExecuteResponse>('import_execute_legacy', { request: req });
}

/**
 * 不限时撤销（v1.3 决策 2026-07-02）
 *
 * 范围：
 *  - 删除 customer_contacts / product_sku 中 source = 'import_legacy' 的行
 *  - 删除 categories 中 source = 'import_legacy' 的行
 *  - 不动 customers / products / suppliers 主表
 */
export async function rollbackBatch(batchId: string): Promise<RollbackResponse> {
  return ipcInvoke<RollbackResponse>('import_rollback_batch', { batchId });
}

// ============================================
// 10. 工具：检测文件是否为老格式（仅前端启发式，最终由后端判定）
// ============================================

/** 判定文件扩展名是否需要走 v1.3 老格式导入 */
export function isLegacyFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.xls') || lower.endsWith('.xlsx');
}

// 重新导出 legacyAdapter 类型（方便组件层 import）
export { LegacyAdapter } from './legacyAdapter';
