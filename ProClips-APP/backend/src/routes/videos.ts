/**
 * 路由：商家视频库 + 公开/激励 + 下载 + 分享
 * GET  /api/proclips/merchant-videos
 * POST /api/proclips/set-video-public
 * GET  /api/proclips/video-download/:videoId
 * GET  /api/proclips/share-info/:videoId
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { buildShareInfo } from '../services/shareService.js';

interface VideoRow {
  id: string;
  merchant_id: string;
  task_id: string | null;
  title: string;
  cover_color: string | null;
  duration: string | null;
  file_key: string;
  file_size: number | null;
  is_public: number;
  view_count: number;
  share_count: number;
  incentive_json: string | null;
  created_at: string;
  updated_at: string;
}

function rowToVideo(r: VideoRow) {
  return {
    id: r.id,
    merchantId: r.merchant_id,
    taskId: r.task_id ?? undefined,
    title: r.title,
    coverColor: r.cover_color ?? '#888',
    duration: r.duration ?? '30s',
    fileKey: r.file_key,
    fileSize: r.file_size ?? undefined,
    isPublic: r.is_public === 1,
    viewCount: r.view_count,
    shareCount: r.share_count,
    incentive: r.incentive_json ? JSON.parse(r.incentive_json) : undefined,
    downloadUrl: `${config.PUBLIC_BASE_URL}/static/results/${r.file_key}`,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function registerVideoRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/proclips/merchant-videos
  app.get(
    '/api/proclips/merchant-videos',
    { preHandler: requireAuth },
    async (request) => {
      const q = z
        .object({
          onlyPublic: z.coerce.boolean().optional().default(false),
          limit: z.coerce.number().int().positive().max(200).default(50),
        })
        .parse(request.query);

      const merchantId = request.user!.sub;
      const db = getDb();
      const sql = `SELECT * FROM video_final_products
                   WHERE merchant_id = ?
                   ${q.onlyPublic ? 'AND is_public = 1' : ''}
                   ORDER BY created_at DESC
                   LIMIT ?`;
      const rows = db.prepare(sql).all(merchantId, q.limit) as VideoRow[];
      const videos = rows.map(rowToVideo);
      return ok({ videos, total: videos.length });
    }
  );

  // POST /api/proclips/set-video-public
  const SetPublicBody = z.object({
    videoId: z.string().min(1),
    isPublic: z.boolean(),
    incentive: z
      .object({
        cps: z.object({ rate: z.number(), minGuarantee: z.number().optional() }).optional(),
        fixed: z.number().optional(),
        tiered: z.array(z.object({ from: z.number(), to: z.number().optional(), rate: z.number() })).optional(),
        cpm: z.object({ perThousand: z.number(), cap: z.number().optional() }).optional(),
        bonus: z.object({ target: z.number(), type: z.enum(['orders', 'views']), amount: z.number() }).optional(),
      })
      .optional(),
  });
  app.post(
    '/api/proclips/set-video-public',
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = SetPublicBody.parse(request.body);
      const merchantId = request.user!.sub;

      const db = getDb();
      const result = db
        .prepare(
          `UPDATE video_final_products
           SET is_public = ?, incentive_json = ?, updated_at = ?
           WHERE id = ? AND merchant_id = ?`
        )
        .run(
          body.isPublic ? 1 : 0,
          body.incentive ? JSON.stringify(body.incentive) : null,
          new Date().toISOString(),
          body.videoId,
          merchantId
        );

      if (result.changes === 0) {
        reply.code(404);
        return fail('VIDEO_NOT_FOUND', '视频不存在或无权修改');
      }
      logger.info({ merchantId, videoId: body.videoId, isPublic: body.isPublic }, 'video visibility updated');
      return ok({ videoId: body.videoId, isPublic: body.isPublic });
    }
  );

  // GET /api/proclips/video-download/:videoId
  app.get<{ Params: { videoId: string } }>(
    '/api/proclips/video-download/:videoId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { videoId } = request.params;
      const merchantId = request.user!.sub;

      const db = getDb();
      const row = db
        .prepare('SELECT merchant_id, file_key FROM video_final_products WHERE id = ?')
        .get(videoId) as { merchant_id: string; file_key: string } | undefined;

      if (!row) {
        reply.code(404);
        return fail('VIDEO_NOT_FOUND', '视频不存在');
      }
      if (row.merchant_id !== merchantId) {
        reply.code(403);
        return fail('FORBIDDEN', '无权访问该视频');
      }

      const downloadUrl = `${config.PUBLIC_BASE_URL}/static/results/${row.file_key}`;
      return ok({
        videoId,
        downloadUrl,
        expiresInSec: 3600,
      });
    }
  );

  // GET /api/proclips/share-info/:videoId
  app.get<{ Params: { videoId: string } }>(
    '/api/proclips/share-info/:videoId',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { videoId } = request.params;
      const merchantId = request.user!.sub;

      // 校验归属
      const db = getDb();
      const own = db
        .prepare('SELECT 1 FROM video_final_products WHERE id = ? AND merchant_id = ?')
        .get(videoId, merchantId);
      if (!own) {
        reply.code(404);
        return fail('VIDEO_NOT_FOUND', '视频不存在或无权访问');
      }

      const info = await buildShareInfo(videoId, merchantId);
      if (!info) {
        reply.code(404);
        return fail('VIDEO_NOT_FOUND', '视频不存在');
      }
      return ok(info);
    }
  );
}
