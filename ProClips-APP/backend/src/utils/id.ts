/**
 * ID 生成工具
 */
import crypto from 'node:crypto';

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

export function uuid(): string {
  return crypto.randomUUID();
}
