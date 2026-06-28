/**
 * 路由：健康检查 + 开发辅助
 */
import type { FastifyInstance } from 'fastify';
import { ok } from '../utils/response.js';
import { devToken } from '../utils/jwt.js';
import { config } from '../config.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return ok({
      service: 'proclips-backend',
      version: '1.0.0',
      env: config.NODE_ENV,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 开发模式：颁发一个测试 token（生产环境禁用）
  app.get('/dev/token', async (request, reply) => {
    if (config.NODE_ENV === 'production') {
      reply.code(404);
      return;
    }
    const q = request.query as { merchantId?: string; role?: 'merchant' | 'creator' };
    return ok({
      token: devToken(q.merchantId),
      expiresInSec: 60 * 60 * 24,
    });
  });
}
