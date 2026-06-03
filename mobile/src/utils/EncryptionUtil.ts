import CryptoJS from 'crypto-js';

// 默认密钥（仅用于向后兼容，新实现应使用 PBKDF2 派生密钥）
const LEGACY_KEY = 'ProClaw@2024!Secure#Mobile#Key#2024';

/**
 * PBKDF2 密钥派生
 * 对应 PRD v11.0 第3.2节：AES-256-GCM，密钥 = PBKDF2(password, salt, 100000, SHA256)
 *
 * @param password 用户密码
 * @param salt 盐值（16字节 hex）
 * @returns 派生密钥（32字节 hex，即 256位）
 */
export const deriveKey = (password: string, salt: string): string => {
  const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,  // 256位
    iterations: 100000,
    hasher: CryptoJS.algo.SHA256,
  });
  return key.toString();
};

/**
 * 生成随机盐值（16字节）
 */
export const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

/**
 * 生成随机 IV (Initialization Vector, 12字节)
 */
export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(12).toString();
};

/**
 * 使用 AES 加密（兼容旧版）
 */
export const encryptData = (data: string, key?: string): string => {
  try {
    const useKey = key || LEGACY_KEY;
    const encrypted = CryptoJS.AES.encrypt(data, useKey).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('数据加密失败');
  }
};

/**
 * 使用 AES 解密（兼容旧版）
 */
export const decryptData = (encryptedData: string, key?: string): string => {
  try {
    const useKey = key || LEGACY_KEY;
    const bytes = CryptoJS.AES.decrypt(encryptedData, useKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('数据解密失败');
  }
};

/**
 * 端到端加密：对数据块进行独立加密 + 认证（Encrypt-then-MAC 模式）
 * 对应 PRD v11.0 第3.2节：AES-256-GCM 等效实现
 *
 * 使用 AES-256-CBC 加密数据 + HMAC-SHA256 认证标签，
 * 实现类似 GCM 的加密认证效果（机密性 + 完整性）。
 *
 * 输出格式（4段）: `salt:iv:ciphertext:authTag`
 * 旧格式（3段）: `salt:iv:ciphertext` （向后兼容）
 *
 * @param data 明文数据
 * @param password 用户备份密码
 * @returns 格式: `salt:iv:ciphertext:authTag`（均为 hex）
 */
export const encryptBlock = (data: string, password: string): string => {
  try {
    const salt = generateSalt();
    const iv = generateIV();
    const key = deriveKey(password, salt);

    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Encrypt-then-MAC: 对密文计算 HMAC-SHA256 认证标签
    const ciphertext = encrypted.toString();
    const authTag = CryptoJS.HmacSHA256(ciphertext, key).toString(CryptoJS.enc.Hex);

    return `${salt}:${iv}:${ciphertext}:${authTag}`;
  } catch (error) {
    console.error('Block encryption failed:', error);
    throw new Error('数据加密失败');
  }
};

/**
 * 端到端加密（Base64 格式）
 * 使用 Base64 编码整个加密块，便于网络传输和存储
 */
export const encryptBlockB64 = (data: string, password: string): string => {
  const hexResult = encryptBlock(data, password);
  return base64Encode(hexResult);
};

/**
 * 端到端解密
 * 支持两种格式：
 * - 4段格式（新）: `salt:iv:ciphertext:authTag` - 带认证标签，先验证后解密
 * - 3段格式（旧）: `salt:iv:ciphertext` - 无认证标签，直接解密（向后兼容）
 *
 * @param encryptedBlock `salt:iv:ciphertext` 或 `salt:iv:ciphertext:authTag` 格式
 * @param password 用户备份密码
 * @returns 明文数据
 */
export const decryptBlock = (encryptedBlock: string, password: string): string => {
  try {
    const parts = encryptedBlock.split(':');
    if (parts.length !== 3 && parts.length !== 4) {
      throw new Error('无效的加密块格式');
    }

    const [salt, iv, ciphertext] = parts;
    const authTag = parts.length === 4 ? parts[3] : null;
    const key = deriveKey(password, salt);

    // 4段格式：先验证认证标签（Encrypt-then-MAC）
    if (authTag) {
      const computedTag = CryptoJS.HmacSHA256(ciphertext, key).toString(CryptoJS.enc.Hex);
      // constant-time 比较防止时序攻击
      if (computedTag.length !== authTag.length) {
        throw new Error('认证标签不匹配：数据可能已被篡改');
      }
      let diff = 0;
      for (let i = 0; i < computedTag.length; i++) {
        diff |= computedTag.charCodeAt(i) ^ authTag.charCodeAt(i);
      }
      if (diff !== 0) {
        throw new Error('认证标签不匹配：数据可能已被篡改');
      }
    }

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    // 空字符串可能是加密空字符串的有效结果，null/undefined 表示解密失败
    if (result === null || result === undefined) {
      throw new Error('解密失败：密码错误或数据已损坏');
    }
    return result;
  } catch (error: any) {
    console.error('Block decryption failed:', error);
    throw new Error(error?.message || '数据解密失败');
  }
};

/**
 * 端到端解密（Base64 格式）
 */
export const decryptBlockB64 = (encryptedBlockB64: string, password: string): string => {
  const hexResult = base64Decode(encryptedBlockB64);
  return decryptBlock(hexResult, password);
};

/**
 * 验证加密块是否可以被正确解密（用于测试密码正确性）
 */
export const verifyEncryptedBlock = (encryptedBlock: string, password: string): boolean => {
  try {
    decryptBlock(encryptedBlock, password);
    return true;
  } catch {
    return false;
  }
};

/**
 * 验证加密块的完整性（仅验证认证标签，不执行完整解密）
 * 仅适用于4段格式 `salt:iv:ciphertext:authTag`
 * 3段旧格式无法验证完整性，返回 false
 *
 * @param encryptedBlock 加密块
 * @param password 用户备份密码
 * @returns 数据是否完整（未被篡改）
 */
export const verifyBlockIntegrity = (encryptedBlock: string, password: string): boolean => {
  try {
    const parts = encryptedBlock.split(':');
    if (parts.length !== 4) {
      // 3段旧格式无法验证完整性
      return false;
    }

    const [salt, , ciphertext, authTag] = parts;
    const key = deriveKey(password, salt);
    const computedTag = CryptoJS.HmacSHA256(ciphertext, key).toString(CryptoJS.enc.Hex);

    // constant-time 比较
    if (computedTag.length !== authTag.length) return false;
    let diff = 0;
    for (let i = 0; i < computedTag.length; i++) {
      diff |= computedTag.charCodeAt(i) ^ authTag.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
};

// 跨平台 Base64 辅助函数
const base64Encode = (str: string): string => {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    try {
      // React Native: use global btoa
      return btoa(str);
    } catch {
      // Fallback: manual implementation
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      const bytes = [];
      for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
      }
      for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i];
        const b2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const b3 = i + 2 < bytes.length ? bytes[i + 2] : 0;
        output += chars.charAt(b1 >> 2);
        output += chars.charAt(((b1 & 3) << 4) | (b2 >> 4));
        output += i + 1 < bytes.length ? chars.charAt(((b2 & 15) << 2) | (b3 >> 6)) : '=';
        output += i + 2 < bytes.length ? chars.charAt(b3 & 63) : '=';
      }
      return output;
    }
  }
};

const base64Decode = (str: string): string => {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    try {
      return atob(str);
    } catch {
      // Fallback
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      str = str.replace(/[^A-Za-z0-9+/=]/g, '');
      for (let i = 0; i < str.length; i += 4) {
        const b1 = chars.indexOf(str.charAt(i));
        const b2 = chars.indexOf(str.charAt(i + 1));
        const b3 = chars.indexOf(str.charAt(i + 2));
        const b4 = chars.indexOf(str.charAt(i + 3));
        output += String.fromCharCode((b1 << 2) | (b2 >> 4));
        if (b3 !== 64) {
          output += String.fromCharCode(((b2 & 15) << 4) | (b3 >> 2));
        }
        if (b4 !== 64) {
          output += String.fromCharCode(((b3 & 3) << 6) | b4);
        }
      }
      return output;
    }
  }
};



/**
 * 加密对象（兼容旧版）
 */
export const encryptObject = (obj: any, key?: string): string => {
  return encryptData(JSON.stringify(obj), key);
};

/**
 * 解密为对象（兼容旧版）
 */
export const decryptObject = <T = any>(encryptedData: string, key?: string): T => {
  const jsonString = decryptData(encryptedData, key);
  return JSON.parse(jsonString) as T;
};

/**
 * 生成数据哈希
 */
export const generateHash = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

/**
 * 验证备份密码强度
 */
export const validatePasswordStrength = (password: string): { valid: boolean; message: string } => {
  if (!password || password.length < 8) {
    return { valid: false, message: '密码长度至少8位' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: '密码需包含大写字母' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: '密码需包含小写字母' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码需包含数字' };
  }
  return { valid: true, message: '密码强度合格' };
};

/**
 * 生成恢复密钥（助记词列表）
 * 从密码哈希中派生一组助记词，用户可保存以恢复备份
 */
export const generateRecoveryKey = (password: string): string[] => {
  const hash = CryptoJS.SHA256(password).toString();
  // 从哈希中取前10个字符，生成10个简单助记词
  const words: string[] = [];
  const WORD_POOL = [
    'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel',
    'india','juliet','kilo','lima','mike','november','oscar','papa',
    'quebec','romeo','sierra','tango','uniform','victor','whiskey',
    'xray','yankee','zulu'
  ];

  for (let i = 0; i < 6; i++) {
    const idx = parseInt(hash.substring(i * 4, i * 4 + 4), 16) % WORD_POOL.length;
    words.push(WORD_POOL[idx]);
  }
  return words;
};

/**
 * 从恢复密钥还原备份密码
 * 注意：此函数仅用于验证恢复密钥格式是否正确
 * 实际的密码恢复需要用户在设置时自行保管密码
 */
export const recoveryKeyToPasswordHint = (words: string[]): string => {
  const WORD_POOL = [
    'alpha','bravo','charlie','delta','echo','foxtrot','golf','hotel',
    'india','juliet','kilo','lima','mike','november','oscar','papa',
    'quebec','romeo','sierra','tango','uniform','victor','whiskey',
    'xray','yankee','zulu'
  ];
  const invalidWords = words.filter(w => !WORD_POOL.includes(w));
  if (invalidWords.length > 0) {
    return `无效的恢复密钥: ${invalidWords.join(', ')} 不是有效助记词`;
  }
  return `恢复密钥有效 (${words.length} 个助记词)`;
};

export default {
  encryptData,
  decryptData,
  encryptObject,
  decryptObject,
  deriveKey,
  generateSalt,
  generateIV,
  encryptBlock,
  decryptBlock,
  encryptBlockB64,
  decryptBlockB64,
  verifyEncryptedBlock,
  verifyBlockIntegrity,
  generateHash,
  validatePasswordStrength,
  generateRecoveryKey,
  recoveryKeyToPasswordHint,
};
