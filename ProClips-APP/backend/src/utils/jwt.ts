/**
 * JWT 签发与校验
 * 与移动端 ApiService.ts 共用密钥
 */
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import type { JwtPayload } from '../types/index.js';
import { generateId } from './id.js';

/**
 * 签发 JWT（用于开发/测试 + 后端独立签发的场景）
 */
export function signToken(opts: {
  sub: string;
  role?: 'merchant' | 'creator';
  expiresInSec?: number;
}): string {
  const payload: JwtPayload = {
    sub: opts.sub,
    role: opts.role ?? 'merchant',
    iss: config.JWT_ISSUER,
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: opts.expiresInSec ?? 60 * 60 * 24, // 默认 24h
  });
}

/**
 * 校验 JWT，返回 payload 或 null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: config.JWT_ISSUER,
    }) as JwtPayload;
    if (!decoded.sub) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 开发模式：生成一个测试 token（仅当 NODE_ENV=development 时可用）
 */
export function devToken(merchantId?: string): string {
  if (config.NODE_ENV === 'production') {
    throw new Error('devToken() is not allowed in production');
  }
  return signToken({ sub: merchantId ?? generateId('merchant') });
}
