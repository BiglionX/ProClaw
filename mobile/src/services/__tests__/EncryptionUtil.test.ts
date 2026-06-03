/// <reference types="jest" />

/**
 * EncryptionUtil 单元测试
 * 测试 PBKDF2 密钥派生、AES 加解密、密码强度验证、恢复密钥生成
 */

import {
  deriveKey,
  generateSalt,
  encryptBlock,
  decryptBlock,
  encryptData,
  decryptData,
  validatePasswordStrength,
  generateRecoveryKey,
  generateHash,
} from '../../utils/EncryptionUtil';

describe('deriveKey', () => {
  it('should produce a consistent key for same password and salt', () => {
    const salt = '0123456789abcdef';
    const key1 = deriveKey('testPassword123', salt);
    const key2 = deriveKey('testPassword123', salt);
    expect(key1).toBe(key2);
  });

  it('should produce different keys for different passwords', () => {
    const salt = '0123456789abcdef';
    const key1 = deriveKey('passwordA', salt);
    const key2 = deriveKey('passwordB', salt);
    expect(key1).not.toBe(key2);
  });

  it('should produce different keys for different salts', () => {
    const key1 = deriveKey('password', 'salt1_16_bytes_xx');
    const key2 = deriveKey('password', 'salt2_16_bytes_xx');
    expect(key1).not.toBe(key2);
  });

  it('should return a hex string', () => {
    const key = deriveKey('password', '0123456789abcdef');
    expect(key).toMatch(/^[0-9a-f]+$/i);
    expect(key.length).toBeGreaterThan(32);
  });
});

describe('generateSalt', () => {
  it('should return a hex string of at least 16 characters', () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^[0-9a-f]+$/i);
    expect(salt.length).toBeGreaterThanOrEqual(16);
  });

  it('should produce different values on successive calls', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).not.toBe(salt2);
  });
});

describe('encryptBlock / decryptBlock', () => {
  it('should encrypt and decrypt data correctly', () => {
    const original = '{"name":"商品","price":100,"stock":50}';
    const password = 'MyBackupP@ss1';

    const encrypted = encryptBlock(original, password);
    const decrypted = decryptBlock(encrypted, password);

    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertext for same plaintext (different IV/salt)', () => {
    const data = 'test data';
    const password = 'MyBackupP@ss1';

    const encrypted1 = encryptBlock(data, password);
    const encrypted2 = encryptBlock(data, password);

    expect(encrypted1).not.toBe(encrypted2);
  });

  it('should throw error on wrong password', () => {
    const original = '敏感数据';
    const encrypted = encryptBlock(original, 'CorrectP@ss1');

    expect(() => decryptBlock(encrypted, 'WrongP@ss1')).toThrow();
  });

  it('should throw error on invalid encrypted block format', () => {
    expect(() => decryptBlock('invalid-format', 'password')).toThrow();
    expect(() => decryptBlock('short', 'password')).toThrow();
  });

  it('should handle empty string', () => {
    const encrypted = encryptBlock('', 'Password123');
    const decrypted = decryptBlock(encrypted, 'Password123');
    expect(decrypted).toBe('');
  });

  it('should handle special characters', () => {
    const original = '中文+English!@#$%^&*()_+{}:"><';
    const encrypted = encryptBlock(original, 'MyP@ssword99');
    const decrypted = decryptBlock(encrypted, 'MyP@ssword99');
    expect(decrypted).toBe(original);
  });
});

describe('encryptData / decryptData (legacy compat)', () => {
  it('should encrypt and decrypt with default key', () => {
    const original = 'legacy data';
    const encrypted = encryptData(original);
    const decrypted = decryptData(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should encrypt and decrypt with custom key', () => {
    const original = 'custom key data';
    const customKey = 'CustomKey123456!';
    const encrypted = encryptData(original, customKey);
    const decrypted = decryptData(encrypted, customKey);
    expect(decrypted).toBe(original);
  });

  it('should fail decryption with wrong key', () => {
    const original = 'secret data';
    const encrypted = encryptData(original, 'KeyA');
    const decrypted = decryptData(encrypted, 'KeyB');
    expect(decrypted).not.toBe(original);
  });
});

describe('validatePasswordStrength', () => {
  it('should reject password shorter than 8 characters', () => {
    const result = validatePasswordStrength('Ab1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('8');
  });

  it('should reject password without uppercase letter', () => {
    const result = validatePasswordStrength('abcdefg1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('大写');
  });

  it('should reject password without lowercase letter', () => {
    const result = validatePasswordStrength('ABCDEFG1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('小写');
  });

  it('should reject password without digit', () => {
    const result = validatePasswordStrength('Abcdefgh');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('数字');
  });

  it('should accept valid password', () => {
    const result = validatePasswordStrength('MyBackupP@ss1');
    expect(result.valid).toBe(true);
    expect(result.message).toContain('合格');
  });
});

describe('generateRecoveryKey', () => {
  it('should generate 6 recovery words', () => {
    const words = generateRecoveryKey('MyBackupP@ss1');
    expect(words).toHaveLength(6);
  });

  it('should generate consistent words for same password', () => {
    const words1 = generateRecoveryKey('SamePassword1');
    const words2 = generateRecoveryKey('SamePassword1');
    expect(words1).toEqual(words2);
  });

  it('should generate different words for different passwords', () => {
    const words1 = generateRecoveryKey('PasswordOne1');
    const words2 = generateRecoveryKey('PasswordTwo2');
    expect(words1).not.toEqual(words2);
  });
});

describe('generateHash', () => {
  it('should return a consistent hash for same input', () => {
    const hash1 = generateHash('proclaw-test-data');
    const hash2 = generateHash('proclaw-test-data');
    expect(hash1).toBe(hash2);
  });

  it('should return different hashes for different inputs', () => {
    const hash1 = generateHash('input-a');
    const hash2 = generateHash('input-b');
    expect(hash1).not.toBe(hash2);
  });

  it('should return a hex string', () => {
    const hash = generateHash('test');
    expect(hash).toMatch(/^[0-9a-f]+$/i);
    expect(hash.length).toBe(64);
  });
});
