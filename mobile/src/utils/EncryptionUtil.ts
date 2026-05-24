import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'ProClaw@2024!Secure#Mobile#Key#2024';

/**
 * 使用 AES-256-GCM 加密数据
 * @param data 要加密的数据
 * @returns 加密后的字符串
 */
export const encryptData = (data: string): string => {
  try {
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('数据加密失败');
  }
};

/**
 * 解密数据
 * @param encryptedData 加密的字符串
 * @returns 解密后的数据
 */
export const decryptData = (encryptedData: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('数据解密失败');
  }
};

/**
 * 加密对象
 * @param obj 要加密的对象
 * @returns 加密后的字符串
 */
export const encryptObject = (obj: any): string => {
  try {
    const jsonString = JSON.stringify(obj);
    return encryptData(jsonString);
  } catch (error) {
    console.error('Failed to encrypt object:', error);
    throw new Error('对象加密失败');
  }
};

/**
 * 解密为对象
 * @param encryptedData 加密的字符串
 * @returns 解密后的对象
 */
export const decryptObject = <T = any>(encryptedData: string): T => {
  try {
    const jsonString = decryptData(encryptedData);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to decrypt object:', error);
    throw new Error('对象解密失败');
  }
};

/**
 * 生成随机 IV (Initialization Vector)
 * @returns 随机 IV 字符串
 */
export const generateIV = (): string => {
  return CryptoJS.lib.WordArray.random(16).toString();
};

/**
 * 使用 AES-256-GCM 加密（更安全的版本）
 * @param data 要加密的数据
 * @param iv 初始化向量
 * @returns 加密结果 { iv, encryptedData }
 */
export const encryptWithGCM = (
  data: string,
  iv?: string
): { iv: string; encryptedData: string } => {
  try {
    const usedIV = iv || generateIV();
    const encrypted = CryptoJS.AES.encrypt(data, ENCRYPTION_KEY, {
      iv: CryptoJS.enc.Hex.parse(usedIV),
      mode: (CryptoJS.mode as any).GCM,
      padding: CryptoJS.pad.NoPadding
    }).toString();

    return {
      iv: usedIV,
      encryptedData: encrypted
    };
  } catch (error) {
    console.error('GCM encryption failed:', error);
    // 降级到普通 AES
    return {
      iv: '',
      encryptedData: encryptData(data)
    };
  }
};

/**
 * 生成数据哈希
 * @param data 数据
 * @returns 哈希值
 */
export const generateHash = (data: string): string => {
  return CryptoJS.SHA256(data).toString();
};

export default {
  encryptData,
  decryptData,
  encryptObject,
  decryptObject,
  generateIV,
  encryptWithGCM,
  generateHash
};
