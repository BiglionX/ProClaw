/**
 * 路由：素材上传 + 确认上传
 * POST /api/proclips/generate-upload-url   （V1：直传占位，返回 uploadUrl 指向本服务 upload-scene）
 * POST /api/proclips/upload-scene          （multipart，video/mp4）
 * POST /api/proclips/confirm-scene-upload
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getDb } from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { ok, fail } from '../utils/response.js';
import { saveUpload } from '../services/uploadService.js';
import { logger } from '../logger.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function registerUploadRoutes(app: FastifyInstance): Promise<void> {
  // 1) 颁发"预签名"上传 URL（V1 mock：直接指向本服务的 upload-scene）
  const UploadUrlBody = z.object({
    templateId: z.string().min(1),
    sceneIndex: z.number().int().min(0),
    fileName: z.string().min(1).max(255),
  });
  app.post(
    '/api/proclips/generate-upload-url',
    { preHandler: requireAuth },
    async (request) => {
      const body = UploadUrlBody.parse(request.body);
      return ok({
        uploadUrl: '/api/proclips/upload-scene',
        method: 'POST',
        fields: {
          templateId: body.templateId,
          sceneIndex: body.sceneIndex,
        },
        fileKeyHint: `merchants/${request.user!.sub}/clips/pending`,
        expiresInSec: 3600,
      });
    }
  );

  // 2) 实际上传（multipart）
  app.post(
    '/api/proclips/upload-scene',
    { preHandler: requireAuth },
    async (request, reply) => {
      const merchantId = request.user!.sub;
      const parts = request.parts();
      let templateId = '';
      let sceneIndex = -1;
      let savedResult: ReturnType<typeof saveUpload> | null = null;

      for await (const part of parts) {
        if (part.type === 'field') {
          if (part.fieldname === 'templateId') templateId = String(part.value ?? '');
          else if (part.fieldname === 'sceneIndex') sceneIndex = Number(part.value ?? -1);
        } else if (part.type === 'file' && part.fieldname === 'file') {
          if (part.file.truncated) {
            reply.code(413);
            return fail('FILE_TOO_LARGE', `单文件不能超过 ${MAX_FILE_SIZE} 字节`);
          }
          const buf = await part.toBuffer();
          try {
            savedResult = saveUpload(
              merchantId,
              'clips',
              part.filename,
              buf,
              part.mimetype
            );
          } catch (e) {
            const msg = (e as Error).message;
            logger.warn({ merchantId, err: msg }, 'upload rejected');
            reply.code(400);
            return fail('UPLOAD_REJECTED', msg);
          }
        }
      }

      if (!savedResult) {
        reply.code(400);
        return fail('MISSING_FILE', '未上传文件');
      }
      if (!templateId || sceneIndex < 0) {
        reply.code(400);
        return fail('MISSING_FIELDS', 'templateId / sceneIndex 必填');
      }

      // 写库（V1：uploaded 状态，由 confirm 接口升级为 confirmed）
      const clipId = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const db = getDb();
      db.prepare(
        `INSERT INTO video_raw_clips
         (id, merchant_id, template_id, scene_index, file_key, file_name, file_size, mime_type, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')`
      ).run(
        clipId,
        merchantId,
        templateId,
        sceneIndex,
        savedResult.fileKey,
        savedResult.fileName,
        savedResult.fileSize,
        savedResult.mimeType
      );

      logger.info({ merchantId, clipId, fileKey: savedResult.fileKey }, 'scene uploaded');
      return ok({
        clipId,
        fileKey: savedResult.fileKey,
        remoteUrl: savedResult.remoteUrl,
        fileSize: savedResult.fileSize,
      });
    }
  );

  // 3) 确认上传（把 status 升级为 confirmed 并返回 sceneIndex 索引）
  const ConfirmBody = z.object({
    templateId: z.string().min(1),
    sceneIndex: z.number().int().min(0),
    fileKey: z.string().min(1),
  });
  app.post(
    '/api/proclips/confirm-scene-upload',
    { preHandler: requireAuth },
    async (request, reply) => {
      const body = ConfirmBody.parse(request.body);
      const merchantId = request.user!.sub;

      const db = getDb();
      const result = db
        .prepare(
          `UPDATE video_raw_clips
           SET status = 'confirmed'
           WHERE merchant_id = ? AND template_id = ? AND scene_index = ? AND file_key = ?`
        )
        .run(merchantId, body.templateId, body.sceneIndex, body.fileKey);

      if (result.changes === 0) {
        reply.code(404);
        return fail('CLIP_NOT_FOUND', '未找到匹配的素材记录');
      }
      return ok({ confirmed: true, sceneIndex: body.sceneIndex });
    }
  );
}
