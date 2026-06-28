/**
 * 业务服务层：上传文件存储
 * - 文件落到 /data/uploads/merchants/<merchantId>/<clips|voice>/<fileKey>
 * - 返回 fileKey 与可访问的 remoteUrl
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { logger } from '../logger.js';

const ALLOWED_VIDEO_MIMES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
]);
const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-m4a',
  'audio/aac',
]);

export interface SaveResult {
  fileKey: string;       // 相对路径（merchantId/clips/xxx.mp4）
  absolutePath: string;  // 磁盘绝对路径
  fileName: string;
  fileSize: number;
  mimeType: string;
  remoteUrl: string;
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * 保存上传文件
 * @param merchantId 商家 ID
 * @param category clips | voice
 * @param originalName 原始文件名
 * @param buffer 文件内容
 * @param mimeType MIME 类型
 */
export function saveUpload(
  merchantId: string,
  category: 'clips' | 'voice',
  originalName: string,
  buffer: Buffer,
  mimeType: string
): SaveResult {
  // MIME 校验
  if (category === 'clips' && !ALLOWED_VIDEO_MIMES.has(mimeType)) {
    throw new Error(`UNSUPPORTED_VIDEO_MIME: ${mimeType}`);
  }
  if (category === 'voice' && !ALLOWED_AUDIO_MIMES.has(mimeType)) {
    throw new Error(`UNSUPPORTED_AUDIO_MIME: ${mimeType}`);
  }

  // 文件大小校验（100MB）
  if (buffer.length > 100 * 1024 * 1024) {
    throw new Error('FILE_TOO_LARGE: 单文件不能超过 100MB');
  }

  const ext = path.extname(originalName) || mimeExt(mimeType);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  const ts = Date.now();
  const stored = `${ts}_${hash}${ext}`;
  const fileKey = `merchants/${merchantId}/${category}/${stored}`;
  const absolutePath = path.join(config.UPLOAD_DIR, fileKey);

  ensureDir(path.dirname(absolutePath));
  fs.writeFileSync(absolutePath, buffer);
  logger.info({ merchantId, category, fileKey, size: buffer.length }, 'file saved');

  const remoteUrl = `${config.PUBLIC_BASE_URL}/static/uploads/${fileKey}`;
  return {
    fileKey,
    absolutePath,
    fileName: originalName,
    fileSize: buffer.length,
    mimeType,
    remoteUrl,
  };
}

function mimeExt(mime: string): string {
  switch (mime) {
    case 'video/mp4':
    case 'audio/mp4':
      return '.mp4';
    case 'video/quicktime':
      return '.mov';
    case 'audio/mpeg':
      return '.mp3';
    case 'audio/wav':
      return '.wav';
    case 'audio/x-m4a':
      return '.m4a';
    case 'audio/aac':
      return '.aac';
    default:
      return '';
  }
}

/**
 * 删除文件（任务清理、错误回滚）
 */
export function deleteUpload(fileKey: string): void {
  const abs = path.join(config.UPLOAD_DIR, fileKey);
  if (fs.existsSync(abs)) {
    fs.unlinkSync(abs);
    logger.info({ fileKey }, 'file deleted');
  }
}
