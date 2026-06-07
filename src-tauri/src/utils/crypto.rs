use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use rand::RngCore;

/// AES-256-GCM 加密器
#[derive(Clone)]
pub struct Aes256GcmCipher {
    key: Key<Aes256Gcm>,
}

#[allow(dead_code)]
impl Aes256GcmCipher {
    /// 使用 32 字节密钥初始化
    /// 审计修复 #7: 将 assert_eq! 改为 Result 以在 release 构建中仍有效
    pub fn new(key: &[u8]) -> Result<Self, String> {
        if key.len() != 32 {
            return Err(format!("Key must be 32 bytes, got {}", key.len()));
        }
        let key = Key::<Aes256Gcm>::from_slice(key);
        Ok(Self { key: *key })
    }

    /// 从密码派生密钥（使用 PBKDF2）
    pub fn from_password(password: &str, salt: &[u8]) -> Result<Self, String> {
        use pbkdf2::pbkdf2_hmac;
        use sha2::Sha256;

        let mut key = [0u8; 32];
        pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, 100_000, &mut key);

        Self::new(&key)
    }

    /// 加密数据
    /// 返回: nonce (12 bytes) + ciphertext + tag (16 bytes)
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new(&self.key);

        // 生成随机 nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // 加密
        let ciphertext = cipher
            .encrypt(nonce, plaintext)
            .map_err(|e| format!("Encryption failed: {:?}", e))?;

        // 组合 nonce + ciphertext
        let mut result = Vec::with_capacity(12 + ciphertext.len());
        result.extend_from_slice(&nonce_bytes);
        result.extend_from_slice(&ciphertext);

        Ok(result)
    }

    /// 解密数据
    /// 输入: nonce (12 bytes) + ciphertext + tag (16 bytes)
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<Vec<u8>, String> {
        let cipher = Aes256Gcm::new(&self.key);

        if ciphertext.len() < 12 {
            return Err("Ciphertext too short".to_string());
        }

        // 分离 nonce 和密文
        let (nonce_bytes, actual_ciphertext) = ciphertext.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // 解密
        let plaintext = cipher
            .decrypt(nonce, actual_ciphertext)
            .map_err(|e| format!("Decryption failed: {:?}", e))?;

        Ok(plaintext)
    }

    /// 加密字符串（便捷方法）
    pub fn encrypt_string(&self, plaintext: &str) -> Result<String, String> {
        let ciphertext = self.encrypt(plaintext.as_bytes())?;
        Ok(hex::encode(ciphertext))
    }

    /// 解密字符串（便捷方法）
    pub fn decrypt_string(&self, hex_ciphertext: &str) -> Result<String, String> {
        let ciphertext = hex::decode(hex_ciphertext).map_err(|e| e.to_string())?;
        let plaintext = self.decrypt(&ciphertext)?;
        String::from_utf8(plaintext).map_err(|e| e.to_string())
    }
}

/// 生成随机 salt
#[allow(dead_code)]
pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    OsRng.fill_bytes(&mut salt);
    salt
}

/// 从密码生成密钥（带 salt）
#[allow(dead_code)]
pub fn derive_key_from_password(password: &str, salt: &[u8]) -> [u8; 32] {
    use pbkdf2::pbkdf2_hmac;
    use sha2::Sha256;

    let mut key = [0u8; 32];
    pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, 100_000, &mut key);
    key
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = [0u8; 32]; // 全零密钥（仅用于测试）
        let cipher = Aes256GcmCipher::new(&key).expect("create cipher");

        let plaintext = b"Hello, ProClaw! This is a test.";
        let encrypted = cipher.encrypt(plaintext).unwrap();
        let decrypted = cipher.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);
    }

    #[test]
    fn test_encrypt_decrypt_string() {
        let key = [0u8; 32];
        let cipher = Aes256GcmCipher::new(&key).expect("create cipher");

        let plaintext = "测试消息 123";
        let encrypted = cipher.encrypt_string(plaintext).unwrap();
        let decrypted = cipher.decrypt_string(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_new_rejects_invalid_key_length() {
        let short_key = [0u8; 16];
        let result = Aes256GcmCipher::new(&short_key);
        assert!(result.is_err());
    }

    #[test]
    fn test_derive_key_from_password() {
        let password = "ProClaw@2024!";
        let salt = generate_salt();

        let key1 = derive_key_from_password(password, &salt);
        let key2 = derive_key_from_password(password, &salt);

        assert_eq!(key1, key2); // 相同密码和 salt 应生成相同密钥
    }
}
