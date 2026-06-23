"use strict";
// ProClaw Cloud 托管版 - AES-256-GCM 应用层加密工具
// 用于对敏感字段（手机号、地址、邮箱等）进行加密存储
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
exports.isEncrypted = isEncrypted;
exports.generateEncryptionKey = generateEncryptionKey;
var crypto_1 = require("crypto");
var ALGORITHM = 'aes-256-gcm';
var IV_LENGTH = 16; // 128 bits
var KEY_LENGTH = 32; // 256 bits
/**
 * 获取加密密钥
 * 从环境变量 ENCRYPTION_KEY 读取，要求为 64 字符 hex 字符串（32 字节）
 * 生产环境必须设置此变量
 */
function getEncryptionKey() {
    var keyHex = process.env.ENCRYPTION_KEY;
    if (!keyHex) {
        // 生产环境必须设置密钥
        if (process.env.NODE_ENV === 'production') {
            throw new Error('生产环境必须设置 ENCRYPTION_KEY 环境变量');
        }
        // 开发环境：生成随机密钥而非固定密钥
        console.warn('[安全警告] 使用随机生成的开发密钥，请设置 ENCRYPTION_KEY');
        return crypto_1.default.randomBytes(KEY_LENGTH);
    }
    var key = Buffer.from(keyHex, 'hex');
    if (key.length !== KEY_LENGTH) {
        throw new Error("ENCRYPTION_KEY \u5FC5\u987B\u662F ".concat(KEY_LENGTH * 2, " \u5B57\u7B26\u7684 hex \u5B57\u7B26\u4E32\uFF08\u5F53\u524D ").concat(keyHex.length, " \u5B57\u7B26\uFF09"));
    }
    return key;
}
/**
 * 加密文本
 * @param text 明文
 * @param key 密钥 buffer（可选，默认从环境变量读取）
 * @returns 格式: "iv:authTag:ciphertext" (hex 编码)
 */
function encrypt(text, key) {
    if (!text)
        return '';
    var encryptionKey = key || getEncryptionKey();
    var iv = crypto_1.default.randomBytes(IV_LENGTH);
    var cipher = crypto_1.default.createCipheriv(ALGORITHM, encryptionKey, iv);
    var encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    var authTag = cipher.getAuthTag().toString('hex');
    return "".concat(iv.toString('hex'), ":").concat(authTag, ":").concat(encrypted);
}
/**
 * 解密文本
 * @param encryptedText 格式: "iv:authTag:ciphertext" (hex 编码)
 * @param key 密钥 buffer（可选，默认从环境变量读取）
 * @returns 明文
 */
function decrypt(encryptedText, key) {
    if (!encryptedText)
        return '';
    // 检查是否为未加密的原始文本（不包含冒号分隔符）
    if (!encryptedText.includes(':')) {
        return encryptedText;
    }
    try {
        var encryptionKey = key || getEncryptionKey();
        var parts = encryptedText.split(':');
        if (parts.length !== 3) {
            // 格式不匹配，返回原文（可能是未加密数据）
            return encryptedText;
        }
        var iv = Buffer.from(parts[0], 'hex');
        var authTag = Buffer.from(parts[1], 'hex');
        var encrypted = parts[2];
        var decipher = crypto_1.default.createDecipheriv(ALGORITHM, encryptionKey, iv);
        decipher.setAuthTag(authTag);
        var decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (_a) {
        // 解密失败，返回原文
        return encryptedText;
    }
}
/**
 * 检查字符串是否为加密格式
 */
function isEncrypted(text) {
    if (!text)
        return false;
    // 加密格式: hex:hex:hex
    return /^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/i.test(text);
}
/**
 * 生成新的加密密钥（用于初始化设置）
 * @returns 64 字符 hex 字符串
 */
function generateEncryptionKey() {
    return crypto_1.default.randomBytes(KEY_LENGTH).toString('hex');
}
