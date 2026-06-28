/**
 * Fastify 应用构建（可独立测试）
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import path from 'node:path';
import { config } from './config.js';
import { logger } from './logger.js';
import { errorHandler } from './middleware/error.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerTemplateRoutes } from './routes/templates.js';
import { registerUploadRoutes } from './routes/upload.js';
import { registerScriptRoutes } from './routes/script.js';
import { registerMixRoutes } from './routes/mix.js';
import { registerVideoRoutes } from './routes/videos.js';
import { registerVoiceRoutes } from './routes/voice.js';
import { registerProfileRoutes } from './routes/profile.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // 用 pino 全局 logger 替代，避免重复
    disableRequestLogging: false,
    bodyLimit: 110 * 1024 * 1024, // 比单文件略大
    trustProxy: true,
  });

  // 注入自定义 logger
  app.log = logger as unknown as typeof app.log;

  // 错误处理
  app.setErrorHandler(errorHandler);

  // CORS
  const origins = config.CORS_ORIGINS === '*'
    ? true
    : config.CORS_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  await app.register(cors, {
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // multipart（文件上传）
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024,
      files: 5,
    },
  });

  // 限流
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_PER_MINUTE,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.headers.authorization ?? req.ip,
  });

  // 静态文件（uploads / results）
  await app.register(staticPlugin, {
    root: config.UPLOAD_DIR,
    prefix: '/static/uploads/',
    decorateReply: false,
  });
  await app.register(staticPlugin, {
    root: config.RESULT_DIR,
    prefix: '/static/results/',
    decorateReply: false,
  });

  // 请求日志钩子
  app.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        status: reply.statusCode,
        ms: Math.round(reply.elapsedTime),
        merchantId: request.user?.sub,
      },
      'request'
    );
  });

  // 注册路由
  await registerHealthRoutes(app);
  await registerTemplateRoutes(app);
  await registerUploadRoutes(app);
  await registerScriptRoutes(app);
  await registerMixRoutes(app);
  await registerVideoRoutes(app);
  await registerVoiceRoutes(app);
  await registerProfileRoutes(app);

  return app;
}
