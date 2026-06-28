/**
 * 路由：音色录制（multipart 上传）
 * POST /api/proclips/record-voice
 */
import type { FastifyInstance } from 'fastify';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { saveUpload } from '../services/uploadService.js';
import { logger } from '../logger.js';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 音色限制 50MB

export async function registerVoiceRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/proclips/record-voice',
    { preHandler: requireAuth },
    async (request, reply) => {
      const merchantId = request.user!.sub;
      const parts = request.parts();

      let savedResult: ReturnType<typeof saveUpload> | null = null;
      let sceneName = 'voice';

      for await (const part of parts) {
        if (part.type === 'file' && part.fieldname === 'file') {
          if (part.file.truncated) {
            reply.code(413);
            return fail('FILE_TOO_LARGE', `单文件不能超过 ${MAX_FILE_SIZE} 字节`);
          }
          const buf = await part.toBuffer();
          try {
            savedResult = saveUpload(merchantId, 'voice', part.filename, buf, part.mimetype);
          } catch (e) {
            reply.code(400);
            return fail('UPLOAD_REJECTED', (e as Error).message);
          }
        } else if (part.type === 'field' && part.fieldname === 'name') {
          sceneName = String(part.value ?? 'voice');
        }
      }

      if (!savedResult) {
        reply.code(400);
        return fail('MISSING_FILE', '未上传音色文件');
      }

      const db = getDb();
      // UPSERT merchant profile.voice_sample_uri
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO video_merchant_profiles
           (merchant_id, display_name, voice_sample_uri, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(merchant_id) DO UPDATE SET
           voice_sample_uri = excluded.voice_sample_uri,
           updated_at = excluded.updated_at`
      ).run(merchantId, `Merchant-${merchantId.slice(-6)}`, savedResult.fileKey, now, now);

      logger.info({ merchantId, fileKey: savedResult.fileKey }, 'voice sample uploaded');
      return ok({
        fileKey: savedResult.fileKey,
        remoteUrl: savedResult.remoteUrl,
        fileSize: savedResult.fileSize,
        name: sceneName,
      });
    }
  );
}
