use crate::utils::crypto::Aes256GcmCipher;

// ====================================================================
// 注意（v1.0.0+tray+db+sync+sec 补丁，修复审计 SEC-P1-06）：
// 之前定义的 `encrypt_response` / `decrypt_request` 中间件是透传占位实现，
// 并没有真正加密响应 / 解密请求，却挂载在路由上给人"已加密"的错误安全感。
// 桌面端通过 Tauri 自身的 IPC + 局域网 TLS 通道提供传输安全，
// 不应使用全局 HTTP 中间件做透明加密（会破坏 axum 响应流、拖慢性能，
// 且与 RESTful API 语义冲突）。已从 mod.rs 路由中全部移除。
// 如需对特定端点加密，请使用下面的 `encrypt_json_response` / `decrypt_json_request` 工具函数。
// ====================================================================

/// 加密 JSON 响应
#[allow(dead_code)]
pub fn encrypt_json_response(
    data: &serde_json::Value,
    cipher: &Aes256GcmCipher,
) -> Result<(String, String), String> {
    // 1. 序列化 JSON
    let plaintext = serde_json::to_string(data).map_err(|e| e.to_string())?;

    // 2. 加密
    let encrypted = cipher
        .encrypt(plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // 3. 转成 hex 字符串
    let encrypted_hex = hex::encode(encrypted);

    // 4. 计算哈希
    let hash = generate_hash(&plaintext);

    Ok((encrypted_hex, hash))
}

/// 解密 JSON 请求
#[allow(dead_code)]
pub fn decrypt_json_request(
    encrypted_hex: &str,
    cipher: &Aes256GcmCipher,
) -> Result<serde_json::Value, String> {
    // 1. hex 解码
    let ciphertext = hex::decode(encrypted_hex).map_err(|e| e.to_string())?;

    // 2. 解密
    let decrypted = cipher
        .decrypt(&ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // 3. 解析 JSON
    let data: serde_json::Value =
        serde_json::from_slice(&decrypted).map_err(|e| format!("Failed to parse JSON: {}", e))?;

    Ok(data)
}

/// 生成哈希
#[allow(dead_code)]
fn generate_hash(data: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(data.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_encrypt_decrypt_json() {
        let key = [0u8; 32];
        let cipher = Aes256GcmCipher::new(&key).expect("test key must be 32 bytes");

        let data = json!({
            "message": "Hello, ProClaw!",
            "number": 12345,
            "array": [1, 2, 3]
        });

        // 加密
        let (encrypted, hash) = encrypt_json_response(&data, &cipher).unwrap();
        assert!(!encrypted.is_empty());
        assert!(!hash.is_empty());

        // 解密
        let decrypted = decrypt_json_request(&encrypted, &cipher).unwrap();
        assert_eq!(data, decrypted);

        println!("Hash: {}", hash);
    }
}
