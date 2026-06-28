/**
 * 路由：商家档案 + 商家统计
 * POST /api/proclips/merchant-profile
 * GET  /api/proclips/merchant-profile
 * GET  /api/proclips/merchant-stats
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok } from '../utils/response.js';

const ProfileBody = z.object({
  displayName: z.string().min(1).max(100),
  industry: z.string().optional(),
  region: z.string().optional(),
  storeAddress: z.string().optional(),
  contactPhone: z.string().optional(),
  defaultTemplateId: z.string().optional(),
  voiceSampleUri: z.string().optional(),
  preferences: z.record(z.unknown()).optional(),
});

export async function registerProfileRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/proclips/merchant-profile
  app.post(
    '/api/proclips/merchant-profile',
    { preHandler: requireAuth },
    async (request) => {
      const body = ProfileBody.parse(request.body);
      const merchantId = request.user!.sub;
      const now = new Date().toISOString();

      const db = getDb();
      db.prepare(
        `INSERT INTO video_merchant_profiles
           (merchant_id, display_name, industry, region, store_address, contact_phone,
            default_template_id, voice_sample_uri, preferences_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(merchant_id) DO UPDATE SET
           display_name = excluded.display_name,
           industry = excluded.industry,
           region = excluded.region,
           store_address = excluded.store_address,
           contact_phone = excluded.contact_phone,
           default_template_id = excluded.default_template_id,
           voice_sample_uri = excluded.voice_sample_uri,
           preferences_json = excluded.preferences_json,
           updated_at = excluded.updated_at`
      ).run(
        merchantId,
        body.displayName,
        body.industry ?? null,
        body.region ?? null,
        body.storeAddress ?? null,
        body.contactPhone ?? null,
        body.defaultTemplateId ?? null,
        body.voiceSampleUri ?? null,
        body.preferences ? JSON.stringify(body.preferences) : null,
        now,
        now
      );

      return ok({ merchantId, updatedAt: now });
    }
  );

  // GET /api/proclips/merchant-profile
  app.get(
    '/api/proclips/merchant-profile',
    { preHandler: requireAuth },
    async (request) => {
      const merchantId = request.user!.sub;
      const db = getDb();
      const row = db
        .prepare('SELECT * FROM video_merchant_profiles WHERE merchant_id = ?')
        .get(merchantId) as
        | {
            merchant_id: string;
            display_name: string;
            industry: string | null;
            region: string | null;
            store_address: string | null;
            contact_phone: string | null;
            default_template_id: string | null;
            voice_sample_uri: string | null;
            preferences_json: string | null;
            created_at: string;
            updated_at: string;
          }
        | undefined;
      if (!row) {
        return ok({ merchantId, exists: false });
      }
      return ok({
        merchantId: row.merchant_id,
        displayName: row.display_name,
        industry: row.industry,
        region: row.region,
        storeAddress: row.store_address,
        contactPhone: row.contact_phone,
        defaultTemplateId: row.default_template_id,
        voiceSampleUri: row.voice_sample_uri,
        preferences: row.preferences_json ? JSON.parse(row.preferences_json) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      });
    }
  );

  // GET /api/proclips/merchant-stats
  app.get(
    '/api/proclips/merchant-stats',
    { preHandler: requireAuth },
    async (request) => {
      const merchantId = request.user!.sub;
      const db = getDb();

      const videoAgg = db
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN is_public = 1 THEN 1 ELSE 0 END) AS public_count,
                  COALESCE(SUM(view_count), 0) AS total_views,
                  COALESCE(SUM(share_count), 0) AS total_shares
           FROM video_final_products
           WHERE merchant_id = ?`
        )
        .get(merchantId) as { total: number; public_count: number; total_views: number; total_shares: number };

      const taskAgg = db
        .prepare(
          `SELECT COUNT(*) AS total,
                  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
                  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
                  SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
                  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
           FROM video_mix_tasks
           WHERE merchant_id = ?`
        )
        .get(merchantId) as {
          total: number;
          completed: number;
          failed: number;
          processing: number;
          pending: number;
        };

      const clipAgg = db
        .prepare(`SELECT COUNT(*) AS total FROM video_raw_clips WHERE merchant_id = ?`)
        .get(merchantId) as { total: number };

      return ok({
        videos: {
          total: videoAgg.total,
          publicCount: videoAgg.public_count,
          totalViews: videoAgg.total_views,
          totalShares: videoAgg.total_shares,
        },
        tasks: {
          total: taskAgg.total,
          completed: taskAgg.completed,
          failed: taskAgg.failed,
          processing: taskAgg.processing,
          pending: taskAgg.pending,
        },
        clips: {
          total: clipAgg.total,
        },
      });
    }
  );
}
