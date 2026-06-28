/**
 * 路由：混剪任务
 * POST /api/proclips/mix/submit
 * GET  /api/proclips/mix/status/:taskId
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { generateId } from '../utils/id.js';
import { logger } from '../logger.js';

const SubmitMixBody = z.object({
  templateId: z.string().min(1),
  product: z.object({
    name: z.string().min(1).max(100),
    features: z.array(z.string()).default([]),
    promo: z.string().optional(),
  }),
  script: z.string().min(1).max(2000),
  voiceSampleUri: z.string().optional(),
  sceneUploads: z
    .array(
      z.object({
        sceneIndex: z.number().int().min(0),
        fileKey: z.string().min(1),
        remoteUrl: z.string().url().optional(),
      })
    )
    .min(1, '至少上传 1 个分镜'),
});

interface TaskRow {
  id: string;
  merchant_id: string;
  template_id: string;
  status: string;
  progress: number;
  result_video_url: string | null;
  error_message: string | null;
}

export async function registerMixRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/proclips/mix/submit
  app.post(
    '/api/proclips/mix/submit',
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = SubmitMixBody.parse(request.body);
      const merchantId = request.user!.sub;

      // 校验 template 存在
      const db = getDb();
      const tpl = db.prepare('SELECT id FROM video_templates WHERE id = ? AND is_active = 1').get(body.templateId);
      if (!tpl) {
        reply.code(404);
        return fail('TEMPLATE_NOT_FOUND', '模板不存在');
      }

      // 校验所有 sceneUploads 归属该 merchant（防越权）
      const fileKeys = body.sceneUploads.map(s => s.fileKey);
      const placeholders = fileKeys.map(() => '?').join(',');
      const ownedRows = db
        .prepare(
          `SELECT file_key FROM video_raw_clips
           WHERE merchant_id = ? AND file_key IN (${placeholders})`
        )
        .all(merchantId, ...fileKeys) as Array<{ file_key: string }>;
      const owned = new Set(ownedRows.map(r => r.file_key));
      const foreign = fileKeys.filter(k => !owned.has(k));
      if (foreign.length > 0) {
        return fail('FORBIDDEN_CLIPS', `下列素材不属于当前商家: ${foreign.join(', ')}`);
      }

      const taskId = generateId('local_mix');
      const now = new Date().toISOString();

      db.prepare(
        `INSERT INTO video_mix_tasks
         (id, merchant_id, template_id, product_name, product_features_json, product_promo,
          script, voice_sample_uri, scene_clips_json, status, progress, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`
      ).run(
        taskId,
        merchantId,
        body.templateId,
        body.product.name,
        JSON.stringify(body.product.features),
        body.product.promo ?? null,
        body.script,
        body.voiceSampleUri ?? null,
        JSON.stringify(body.sceneUploads.map(s => ({ sceneIndex: s.sceneIndex, fileKey: s.fileKey }))),
        now,
        now
      );

      logger.info({ taskId, merchantId, templateId: body.templateId }, 'mix task submitted');
      return ok({ taskId, status: 'pending', progress: 0 });
    }
  );

  // GET /api/proclips/mix/status/:taskId
  app.get<{ Params: { taskId: string } }>(
    '/api/proclips/mix/status/:taskId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const merchantId = request.user!.sub;
      const { taskId } = request.params;

      const db = getDb();
      const row = db
        .prepare(
          `SELECT id, merchant_id, template_id, status, progress, result_video_url, error_message
           FROM video_mix_tasks WHERE id = ?`
        )
        .get(taskId) as TaskRow | undefined;

      if (!row) {
        reply.code(404);
        return fail('TASK_NOT_FOUND', '任务不存在');
      }
      if (row.merchant_id !== merchantId) {
        reply.code(403);
        return fail('FORBIDDEN', '无权访问该任务');
      }

      return ok({
        status: row.status,
        progress: row.progress,
        resultVideoUrl: row.result_video_url ?? undefined,
        errorMessage: row.error_message ?? undefined,
      });
    }
  );
}
