/**
 * 统一错误处理（Fastify setErrorHandler）
 * - 把 Zod 错误、未捕获异常转化为统一 ApiResponse 格式
 */
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { fail } from '../utils/response.js';
import { logger } from '../logger.js';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Zod 校验失败
  if (error instanceof ZodError) {
    reply.code(400).send(fail('VALIDATION_ERROR', error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')));
    return;
  }

  // Fastify 内置 4xx
  if (error.statusCode && error.statusCode < 500) {
    reply.code(error.statusCode).send(fail(error.code ?? 'CLIENT_ERROR', error.message));
    return;
  }

  // 5xx 兜底
  logger.error({ err: error, url: request.url, method: request.method }, 'unhandled error');
  reply.code(500).send(fail('INTERNAL_ERROR', '服务器内部错误'));
}
