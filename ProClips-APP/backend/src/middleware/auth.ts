/**
 * JWT 鉴权中间件（Fastify preHandler）
 * - 解析 Authorization: Bearer <token>
 * - 校验签名/iss/exp
 * - 注入到 request.user
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken } from '../utils/jwt.js';
import { fail } from '../utils/response.js';
import { logger } from '../logger.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      sub: string;
      role: 'merchant' | 'creator';
    };
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    reply.code(401).send(fail('MISSING_TOKEN', '缺少 Authorization Bearer 头'));
    return;
  }
  const token = auth.slice(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    reply.code(401).send(fail('INVALID_TOKEN', 'Token 无效或已过期'));
    return;
  }
  request.user = { sub: payload.sub, role: payload.role };
  logger.debug({ merchantId: payload.sub, role: payload.role, url: request.url }, 'auth ok');
}

/**
 * 可选鉴权：有 token 就解析，没有不报错
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const auth = request.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return;
  const token = auth.slice(7).trim();
  const payload = verifyToken(token);
  if (payload) {
    request.user = { sub: payload.sub, role: payload.role };
  }
}

/**
 * 商家角色校验（在 requireAuth 之后使用）
 */
export async function requireMerchant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user || request.user.role !== 'merchant') {
    reply.code(403).send(fail('FORBIDDEN', '需要商家权限'));
    return;
  }
}
