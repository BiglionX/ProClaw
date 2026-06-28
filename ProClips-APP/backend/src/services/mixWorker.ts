/**
 * 混剪任务 Worker
 * - 每 2s 扫描 status IN ('pending', 'processing') 的任务
 * - 推进 progress，到达 1 后置为 completed 并生成占位 mp4
 * - V1 mock：MIX_TASK_MOCK_DURATION_SEC 秒后完成
 */
import path from 'node:path';
import fs from 'node:fs';
import { getDb } from '../db/connection.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { generateId } from '../utils/id.js';

let timer: NodeJS.Timeout | null = null;

interface MixTaskRow {
  id: string;
  merchant_id: string;
  template_id: string;
  product_name: string;
  status: string;
  progress: number;
  created_at: string;
}

interface MixTaskUpdate {
  status: string;
  progress: number;
  result_file_key?: string;
  result_video_url?: string;
  completed_at?: string;
  updated_at: string;
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/**
 * 解析任务创建时间戳，兼容三种格式：
 * - ISO 8601 带 Z（mix.ts 写入的 new Date().toISOString()）
 * - ISO 8601 不带 Z（理论上不应出现，但保穴）
 * - SQLite datetime('now') 输出格式 "YYYY-MM-DD HH:MM:SS"（无 T、无 Z）
 *
 * 返回 UTC 毫秒时间戳；解析失败返回 NaN
 */
function parseTaskTimestamp(s: string): number {
  if (!s) return NaN;
  // ISO 8601 带 Z 结尾或包含 T：依赖 JS 原生解析
  if (s.endsWith('Z') || s.includes('T')) {
    return new Date(s).getTime();
  }
  // SQLite datetime 格式：视为 UTC，补上 T 和 Z
  return new Date(s.replace(' ', 'T') + 'Z').getTime();
}

/**
 * 生成占位 mp4 文件（V1 mock：仅写入标记，不做真实编码）
 * Phase 4 接入真实混剪服务后由 ffmpeg 生成
 */
function writeMockMp4(filePath: string): void {
  // 占位：写入几 KB 的伪 mp4 头，便于文件存在性校验
  const placeholder = Buffer.from([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, // ftyp box
    0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
    0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  fs.writeFileSync(filePath, placeholder);
}

function processOneTask(task: MixTaskRow): void {
  const db = getDb();
  const now = new Date().toISOString();

  if (task.status === 'pending') {
    // 推进到 processing
    db.prepare(`UPDATE video_mix_tasks SET status='processing', progress=0.05, updated_at=? WHERE id=?`).run(now, task.id);
    logger.info({ taskId: task.id }, 'mix task → processing');
    return;
  }

  // processing：推进 progress
  const createdMs = parseTaskTimestamp(task.created_at);
  const elapsedSec = Number.isFinite(createdMs)
    ? (Date.now() - createdMs) / 1000
    : 0;
  const target = config.MIX_TASK_MOCK_DURATION_SEC;
  const progress = Math.min(1, 0.05 + elapsedSec / target);

  if (progress < 1) {
    db.prepare(`UPDATE video_mix_tasks SET progress=?, updated_at=? WHERE id=?`).run(progress, now, task.id);
    return;
  }

  // 完成：写占位 mp4 + 插入 video_final_products
  const videoId = generateId('vid');
  const fileKey = `${task.merchant_id}/videos/${task.id}.mp4`;
  const filePath = path.join(config.RESULT_DIR, fileKey);
  ensureDir(path.dirname(filePath));
  writeMockMp4(filePath);

  const publicUrl = `${config.PUBLIC_BASE_URL}/static/results/${fileKey}`;
  const completedAt = now;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE video_mix_tasks SET status='completed', progress=1, result_file_key=?, result_video_url=?, completed_at=?, updated_at=? WHERE id=?`
    ).run(fileKey, publicUrl, completedAt, now, task.id);

    // 回写 raw_clips.task_id
    db.prepare(`UPDATE video_raw_clips SET task_id=? WHERE merchant_id=? AND task_id IS NULL`).run(task.id, task.merchant_id);

    // 插入 final_products
    db.prepare(
      `INSERT INTO video_final_products
       (id, merchant_id, task_id, title, cover_color, duration, file_key, file_size, is_public, view_count, share_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`
    ).run(
      videoId,
      task.merchant_id,
      task.id,
      `${task.product_name} · 探店种草`,
      '#ff6b9d',
      '30s',
      fileKey,
      fs.statSync(filePath).size
    );
  });
  tx();

  logger.info({ taskId: task.id, videoId, publicUrl }, 'mix task → completed');
}

export function tick(): void {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, merchant_id, template_id, product_name, status, progress, created_at
         FROM video_mix_tasks
         WHERE status IN ('pending','processing')
         ORDER BY created_at ASC
         LIMIT 5`
      )
      .all() as MixTaskRow[];

    for (const row of rows) {
      processOneTask(row);
    }
  } catch (err) {
    logger.error({ err }, 'mix worker tick failed');
  }
}

export function startMixWorker(): void {
  if (timer) return;
  ensureDir(config.RESULT_DIR);
  timer = setInterval(tick, config.MIX_WORKER_INTERVAL_MS);
  logger.info({ intervalMs: config.MIX_WORKER_INTERVAL_MS }, 'mix worker started');
}

export function stopMixWorker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('mix worker stopped');
  }
}
