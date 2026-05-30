// ProClaw Cloud 托管版 - 文件存储工具
// 基于 Supabase Storage 实现文件上传与管理

import { getSupabaseClient } from './supabase';

const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'tenant-files';

export interface UploadResult {
  url: string;
  path: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface StoredFile {
  name: string;
  path: string;
  url: string;
  size: number;
  created_at: string;
  mimeType: string;
}

/**
 * 获取文件扩展名
 */
function getExtension(filename: string): string {
  const ext = filename.split('.').pop();
  return ext ? ext.toLowerCase() : '';
}

/**
 * 检查文件类型是否允许上传
 */
export function isAllowedFileType(filename: string): boolean {
  const allowedExtensions = [
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
    'pdf', 'doc', 'docx', 'xls', 'xlsx',
    'txt', 'csv',
  ];
  return allowedExtensions.includes(getExtension(filename));
}

/**
 * 检查文件大小是否在限制内 (默认 10MB)
 */
export function isFileSizeAllowed(size: number, maxBytes = 10 * 1024 * 1024): boolean {
  return size <= maxBytes;
}

/**
 * 生成唯一的文件路径
 */
function generateFilePath(userId: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = getExtension(filename);
  return `${userId}/${timestamp}-${random}.${ext}`;
}

/**
 * 上传文件到 Supabase Storage
 */
export async function uploadFile(
  file: File,
  userId: string,
  bucket = STORAGE_BUCKET
): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const path = generateFilePath(userId, file.name);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(`文件上传失败: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return {
    url: urlData.publicUrl,
    path: data.path,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  };
}

/**
 * 删除文件
 */
export async function deleteFile(
  path: string,
  bucket = STORAGE_BUCKET
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('删除文件失败:', error);
    return false;
  }
  return true;
}

/**
 * 获取文件的公开 URL
 */
export function getFileUrl(
  path: string,
  bucket = STORAGE_BUCKET
): string {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

/**
 * 列出用户上传的文件
 */
export async function listFiles(
  userId: string,
  bucket = STORAGE_BUCKET
): Promise<StoredFile[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(userId, {
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.error('获取文件列表失败:', error);
    return [];
  }

  return (data || []).map((item: { name: string; created_at?: string; metadata?: { size?: number; mimetype?: string } }) => {
    const path = `${userId}/${item.name}`;
    return {
      name: item.name,
      path,
      url: getFileUrl(path, bucket),
      size: item.metadata?.size || 0,
      created_at: item.created_at || '',
      mimeType: item.metadata?.mimetype || 'application/octet-stream',
    };
  });
}

/**
 * 估算文件上传的 Token 消耗 (10 token/MB)
 */
export function estimateUploadTokens(fileSize: number): number {
  const sizeMB = fileSize / (1024 * 1024);
  return Math.ceil(sizeMB * 10) || 10; // 至少 10 token
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
