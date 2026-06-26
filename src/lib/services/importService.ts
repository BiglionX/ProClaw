/**
 * 商品数据导入服务层
 *
 * 封装 7 个 Tauri command 调用，提供 TS Promise 接口。
 * 与 `src-tauri/src/import/commands.rs` 一一对应。
 */

import { invoke } from '@tauri-apps/api/core';

import type {
  BatchStatus,
  ImageArchiveManifest,
  ImageArchiveSummary,
  ImportError,
  ImportRequest,
  ImportResult,
  ImportTarget,
} from '../importers/types';

/** 创建批次（返回 batch_id）
 * v1.2 P1：targetType 参数支持库存/采购/销售/供应商/客户
 */
export async function createBatch(
  fileName: string,
  fileType: string,
  totalRows: number,
  fileHash?: string | null,
  targetType?: ImportTarget,
  fileSize?: number | null,
): Promise<string> {
  return await invoke<string>('import_create_batch', {
    fileName,
    fileType,
    totalRows,
    fileHash: fileHash ?? null,
    fileSize: fileSize ?? null,
    targetType: targetType ?? 'products',
  });
}

/** 更新批次字段映射 */
export async function updateMapping(batchId: string, mappingJson: string): Promise<void> {
  await invoke('import_update_mapping', { batchId, mappingJson });
}

/** 三级校验（不入库） */
export async function validateImport(request: ImportRequest): Promise<ImportError[]> {
  return await invoke<ImportError[]>('import_validate', { request });
}

/** 执行导入（事务包裹） */
export async function executeImport(
  batchId: string,
  request: ImportRequest,
): Promise<ImportResult> {
  return await invoke<ImportResult>('import_execute', { batchId, request });
}

/** 查询批次 */
export interface ImportBatchInfo {
  id: string;
  user_id: string;
  file_name: string;
  file_hash: string | null;
  file_size: number | null;
  file_type: string;
  target_type: string;
  mapping_json: string | null;
  conflict_strategy: string;
  status: BatchStatus;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  skipped_rows: number;
  started_at: string | null;
  finished_at: string | null;
  error_report_json: string | null;
  created_at: string;
  /** v1.3：最后一次心跳（暂停 / 进行中） */
  last_heartbeat_at: string | null;
  /** v1.3：已处理行数（断点续导进度） */
  processed_rows: number;
  /** v1.3：暂停原因（仅 paused 时有值） */
  paused_reason: string | null;
}

export async function getBatch(batchId: string): Promise<ImportBatchInfo> {
  return await invoke<ImportBatchInfo>('import_get_batch', { batchId });
}

/** 历史批次列表 */
export async function listBatches(limit: number, offset: number): Promise<ImportBatchInfo[]> {
  return await invoke<ImportBatchInfo[]>('import_list_batches', { limit, offset });
}

/** 回滚导入 */
export async function rollbackBatch(batchId: string): Promise<number> {
  return await invoke<number>('import_rollback', { batchId });
}

/** v1.3：解压用户上传的图片 zip 包，返回 manifest（archive_dir + entries + total_size） */
export async function extractImages(
  fileName: string,
  fileBytes: Uint8Array,
): Promise<ImageArchiveManifest> {
  return await invoke<ImageArchiveManifest>('import_extract_images', {
    fileName,
    fileBytes: Array.from(fileBytes), // Tauri 命令参数通常用 number[] 表示字节
  });
}

/** v1.3：从 manifest 派生 archive 相对路径（executor 会用它定位 manifest.json） */
export function deriveArchiveRelativePath(manifest: ImageArchiveManifest): string {
  // archive_dir 形如 `C:\Users\xxx\AppData\Roaming\com.proclaw.desktop\data\import_images\abc123`
  // 取 `import_images/<last_segment>` 即可
  const sep = manifest.archive_dir.includes('\\') ? '\\' : '/';
  const segments = manifest.archive_dir.split(/[\\/]+/).filter(Boolean);
  const idx = segments.lastIndexOf('import_images');
  if (idx < 0) return manifest.archive_dir;
  return segments.slice(idx).join(sep);
}

/** v1.3：从 manifest 生成 UI 摘要 */
export function summarizeImageArchive(manifest: ImageArchiveManifest): ImageArchiveSummary {
  return {
    archiveRelativePath: deriveArchiveRelativePath(manifest),
    entryCount: manifest.entries.length,
    totalSize: manifest.total_size,
  };
}

// ==================== v1.3 Import Center：pause / resume / cancel / retry ====================

/** v1.3：暂停导入任务 */
export async function pauseBatch(batchId: string, reason?: string | null): Promise<ImportBatchInfo> {
  return await invoke<ImportBatchInfo>('import_pause', { batchId, reason: reason ?? null });
}

/** v1.3：继续导入任务（仅 paused → pending） */
export async function resumeBatch(batchId: string): Promise<ImportBatchInfo> {
  return await invoke<ImportBatchInfo>('import_resume', { batchId });
}

/** v1.3：取消导入任务 */
export async function cancelBatch(batchId: string): Promise<ImportBatchInfo> {
  return await invoke<ImportBatchInfo>('import_cancel', { batchId });
}

/** v1.3：重试失败/部分/已取消的批次；返回新 batch_id */
export async function retryBatch(
  batchId: string,
  conflictStrategy?: 'skip' | 'overwrite' | 'duplicate' | null,
): Promise<string> {
  return await invoke<string>('import_retry', {
    batchId,
    conflictStrategy: conflictStrategy ?? null,
  });
}

// ==================== v1.3 C1：导入模板下载 ====================

/** 单套模板元数据（与后端 ImportTemplate 对应） */
export interface ImportTemplateInfo {
  name: string;
  target_type: string;
  file_name: string;
  size_bytes: number;
  sha256: string;
}

/** 模板字节（保存对话框用） */
export interface TemplateBytes {
  file_name: string;
  bytes: number[];
}

/** 列出 AppData 内的所有可用模板（首次启动由 main.rs 自动拷贝） */
export async function listTemplates(): Promise<ImportTemplateInfo[]> {
  return await invoke<ImportTemplateInfo[]>('import_list_templates');
}

/** 读取单套模板的字节内容（前端配合 tauri-plugin-dialog 触发保存对话框） */
export async function getTemplateBytes(name: string): Promise<TemplateBytes> {
  return await invoke<TemplateBytes>('import_get_template_bytes', { name });
}

/** 读取 examples.zip 字节（5 模板 + 10 张占位图） */
export async function getExamplesZip(): Promise<TemplateBytes> {
  return await invoke<TemplateBytes>('import_get_examples_zip');
}