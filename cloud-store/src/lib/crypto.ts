// ProClaw Cloud 托管版 - AES-256-GCM 应用层加密工具
// 用于对敏感字段（手机号、地址、邮箱等）进行加密存储

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * 获取加密密钥
 * 从环境变量 ENCRYPTION_KEY 读取，要求为 64 字符 hex 字符串（32 字节）
 * 生产环境必须设置此变量
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    // 生产环境必须设置密钥
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境必须设置 ENCRYPTION_KEY 环境变量');
    }
    // 开发环境：生成随机密钥而非固定密钥
    console.warn('[安全警告] 使用随机生成的开发密钥，请设置 ENCRYPTION_KEY');
    return crypto.randomBytes(KEY_LENGTH);
  }

  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY 必须是 ${KEY_LENGTH * 2} 字符的 hex 字符串（当前 ${keyHex.length} 字符）`);
  }
  return key;
}

/**
 * 加密文本
 * @param text 明文
 * @param key 密钥 buffer（可选，默认从环境变量读取）
 * @returns 格式: "iv:authTag:ciphertext" (hex 编码)
 */
export function encrypt(text: string, key?: Buffer): string {
  if (!text) return '';

  const encryptionKey = key || getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * 解密文本
 * @param encryptedText 格式: "iv:authTag:ciphertext" (hex 编码)
 * @param key 密钥 buffer（可选，默认从环境变量读取）
 * @returns 明文
 */
export function decrypt(encryptedText: string, key?: Buffer): string {
  if (!encryptedText) return '';

  // 检查是否为未加密的原始文本（不包含冒号分隔符）
  if (!encryptedText.includes(':')) {
    return encryptedText;
  }

  try {
    const encryptionKey = key || getEncryptionKey();
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      // 格式不匹配，返回原文（可能是未加密数据）
      return encryptedText;
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // 解密失败（可能是密钥轮换或数据损坏），记录警告并返回原文
    console.warn('[crypto] 解密失败，返回原文:', error instanceof Error ? error.message : 'unknown error');
    return encryptedText;
  }
}

/**
 * 检查字符串是否为加密格式
 */
export function isEncrypted(text: string): boolean {
  if (!text) return false;
  // 加密格式: hex:hex:hex
  return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(text);
}

/**
 * 生成新的加密密钥（用于初始化设置）
 * @returns 64 字符 hex 字符串
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}
