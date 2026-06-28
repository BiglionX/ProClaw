/**
 * 路由：模板 + 选择模板
 * GET  /api/proclips/templates
 * POST /api/proclips/select-template
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { logger } from '../logger.js';
import type { ProClipsTemplate } from '../types/index.js';

interface TemplateRow {
  id: string;
  title: string;
  description: string;
  scenes_json: string;
  duration: string;
  sample: string | null;
  industry: string | null;
  badge: string | null;
  cover_color: string | null;
}

function rowToTemplate(r: TemplateRow): ProClipsTemplate {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    scenes: JSON.parse(r.scenes_json),
    duration: r.duration,
    sample: r.sample ?? '',
    industry: r.industry ?? undefined,
    badge: r.badge ?? undefined,
    coverColor: r.cover_color ?? undefined,
  };
}

export async function registerTemplateRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/proclips/templates
  app.get(
    '/api/proclips/templates',
    { preHandler: requireAuth },
    async (request) => {
      const q = z
        .object({
          industry: z.string().optional(),
          keyword: z.string().optional(),
          activeOnly: z.coerce.boolean().optional().default(true),
        })
        .parse(request.query);

      const db = getDb();
      let sql = 'SELECT * FROM video_templates WHERE 1=1';
      const params: unknown[] = [];
      if (q.activeOnly) sql += ' AND is_active = 1';
      if (q.industry) {
        sql += ' AND industry = ?';
        params.push(q.industry);
      }
      if (q.keyword) {
        sql += ' AND (title LIKE ? OR description LIKE ?)';
        const kw = `%${q.keyword}%`;
        params.push(kw, kw);
      }
      sql += ' ORDER BY sort_order ASC, id ASC';

      const rows = db.prepare(sql).all(...params) as TemplateRow[];
      const templates = rows.map(rowToTemplate);
      return ok({ templates });
    }
  );

  // POST /api/proclips/select-template
  const SelectTemplateBody = z.object({
    templateId: z.string().min(1),
  });
  app.post(
    '/api/proclips/select-template',
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = SelectTemplateBody.parse(request.body);
      const merchantId = request.user!.sub;

      const db = getDb();
      const row = db
        .prepare('SELECT id, title FROM video_templates WHERE id = ? AND is_active = 1')
        .get(body.templateId) as { id: string; title: string } | undefined;
      if (!row) {
        reply.code(404);
        return fail('TEMPLATE_NOT_FOUND', '模板不存在或已下架');
      }

      // UPSERT merchant profile.default_template_id
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO video_merchant_profiles (merchant_id, display_name, default_template_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(merchant_id) DO UPDATE SET
           default_template_id = excluded.default_template_id,
           updated_at = excluded.updated_at`
      ).run(merchantId, `Merchant-${merchantId.slice(-6)}`, body.templateId, now, now);

      logger.info({ merchantId, templateId: body.templateId }, 'template selected');
      return ok({ templateId: row.id, title: row.title });
    }
  );
}
