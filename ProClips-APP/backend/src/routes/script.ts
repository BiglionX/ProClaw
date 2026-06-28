/**
 * 路由：文案生成
 * POST /api/proclips/generate-script
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { generateScript } from '../services/scriptGenerator.js';
import type { ProClipsTemplate } from '../types/index.js';

const GenerateScriptBody = z.object({
  templateId: z.string().min(1),
  product: z.object({
    name: z.string().min(1).max(100),
    features: z.array(z.string()).default([]),
    promo: z.string().optional(),
    activeTime: z.string().optional(),
    storeAddress: z.string().optional(),
  }),
});

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

export async function registerScriptRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/proclips/generate-script',
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = GenerateScriptBody.parse(request.body);

      const db = getDb();
      const row = db
        .prepare('SELECT * FROM video_templates WHERE id = ? AND is_active = 1')
        .get(body.templateId) as TemplateRow | undefined;
      if (!row) {
        reply.code(404);
        return fail('TEMPLATE_NOT_FOUND', '模板不存在');
      }

      const template: ProClipsTemplate = {
        id: row.id,
        title: row.title,
        description: row.description,
        scenes: JSON.parse(row.scenes_json),
        duration: row.duration,
        sample: row.sample ?? '',
        industry: row.industry ?? undefined,
        badge: row.badge ?? undefined,
        coverColor: row.cover_color ?? undefined,
      };

      const candidates = await generateScript(template, body.product);
      return ok({ candidates });
    }
  );
}
