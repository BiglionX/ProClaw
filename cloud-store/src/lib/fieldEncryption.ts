// ProClaw Cloud 托管版 - 字段加密辅助函数
// 封装敏感字段的加密/解密，自动处理空值和批量处理

import { encrypt, decrypt, isEncrypted } from './crypto';

/**
 * 加密单个字段值（空值跳过）
 */
export function encryptField(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return encrypt(value);
}

/**
 * 解密单个字段值（空值跳过）
 */
export function decryptField(value: string | null | undefined): string | null {
  if (!value) return value ?? null;
  return decrypt(value);
}

/**
 * 批量加密对象中的指定字段
 * @param obj 源对象
 * @param fields 需要加密的字段名数组
 * @returns 新对象（不修改原对象）
 */
export function encryptFields(
  obj: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value && !isEncrypted(value)) {
      result[field] = encrypt(value);
    }
  }
  return result;
}

/**
 * 批量解密对象中的指定字段
 * @param obj 源对象
 * @param fields 需要解密的字段名数组
 * @returns 新对象（不修改原对象）
 */
export function decryptFields(
  obj: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> {
  const result = { ...obj };
  for (const field of fields) {
    const value = result[field];
    if (typeof value === 'string' && value && isEncrypted(value)) {
      result[field] = decrypt(value);
    }
  }
  return result;
}

/**
 * 批量解密数组中的每个对象的指定字段
 */
export function decryptFieldsInArray(
  items: Record<string, unknown>[],
  fields: string[]
): Record<string, unknown>[] {
  return items.map(item => decryptFields(item, fields));
}

/**
 * 从请求体中提取并加密敏感字段，返回更新后的 body
 * 用于 POST/PUT 请求处理
 */
export function encryptRequestBody(
  body: Record<string, unknown>,
  sensitiveFields: string[]
): Record<string, unknown> {
  return encryptFields(body, sensitiveFields);
}
