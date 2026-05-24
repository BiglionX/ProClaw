use axum::{
    extract::{State, Request},
    middleware::Next,
    body::Body,
    response::Response,
};
use crate::utils::crypto::Aes256GcmCipher;
use crate::api::AppState;
use std::convert::Infallible;

/// 加密响应中间件
/// 对响应数据进行 AES-256-GCM 加密
#[allow(dead_code)]
pub async fn encrypt_response(
    _state: State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, Infallible> {
    // 执行请求
    let response = next.run(request).await;

    // TODO: 检查请求是否需要加密
    // 目前简化实现，直接返回原始响应

    Ok(response)
}

/// 解密请求中间件
/// 对请求数据进行 AES-256-GCM 解密
#[allow(dead_code)]
pub async fn decrypt_request(
    _state: State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response, Infallible> {
    // TODO: 检查请求是否加密
    // 目前简化实现，直接传递请求

    let response = next.run(request).await;
    Ok(response)
}

/// 加密 JSON 响应
#[allow(dead_code)]
pub fn encrypt_json_response(data: &serde_json::Value, cipher: &Aes256GcmCipher) -> Result<(String, String), String> {
    // 1. 序列化 JSON
    let plaintext = serde_json::to_string(data).map_err(|e| e.to_string())?;

    // 2. 加密
    let encrypted = cipher.encrypt(plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // 3. 转成 hex 字符串
    let encrypted_hex = hex::encode(encrypted);

    // 4. 计算哈希
    let hash = generate_hash(&plaintext);

    Ok((encrypted_hex, hash))
}

/// 解密 JSON 请求
#[allow(dead_code)]
pub fn decrypt_json_request(encrypted_hex: &str, cipher: &Aes256GcmCipher) -> Result<serde_json::Value, String> {
    // 1. hex 解码
    let ciphertext = hex::decode(encrypted_hex).map_err(|e| e.to_string())?;

    // 2. 解密
    let decrypted = cipher.decrypt(&ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))?;

    // 3. 解析 JSON
    let data: serde_json::Value = serde_json::from_slice(&decrypted)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

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
        let cipher = Aes256GcmCipher::new(&key);

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
