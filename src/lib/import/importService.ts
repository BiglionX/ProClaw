/**
 * ProClaw 批量导入中心 - 服务层（v1.2 P1）
 *
 * 封装 13 个 Tauri 命令；前端组件通过本模块访问后端能力。
 */

import { ipcInvoke, isTauri } from '../tauri';
import type {
  ImportBatch,
  ImportBatchError,
  ImportCreateResponse,
  ImportTarget,
  ExecuteResponse,
  MappingTemplate,
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
