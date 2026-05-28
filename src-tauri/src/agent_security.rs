use hmac::{Hmac, Mac};
use sha2::{Digest, Sha256};
use std::path::Path;
use std::fs::File;
use std::io::{BufReader, Read};

/// Agent 安全模块 - 签名验证和包完整性校验

/// HMAC-SHA256 签名验证
/// 验证 manifest JSON 的签名是否与预期的公钥匹配
pub fn verify_manifest_signature(
    manifest_json: &str,
    signature_hex: &str,
    secret_key_hex: &str,
) -> Result<bool, String> {
    let secret_key = hex::decode(secret_key_hex)
        .map_err(|e| format!("Invalid secret key hex: {}", e))?;

    let signature = hex::decode(signature_hex)
        .map_err(|e| format!("Invalid signature hex: {}", e))?;

    let mut mac = Hmac::<Sha256>::new_from_slice(&secret_key)
        .map_err(|e| format!("HMAC initialization error: {}", e))?;

    mac.update(manifest_json.as_bytes());

    let expected = mac.finalize().into_bytes();
    Ok(expected.as_slice() == signature.as_slice())
}

/// 计算文件的 SHA-256 校验和
pub fn compute_file_checksum(file_path: &Path) -> Result<String, String> {
    let file = File::open(file_path)
        .map_err(|e| format!("Cannot open file {:?}: {}", file_path, e))?;

    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = reader
            .read(&mut buffer)
            .map_err(|e| format!("Error reading file: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

/// 验证包完整性：比较文件校验和与期望值
pub fn verify_checksum(file_path: &Path, expected_checksum: &str) -> Result<bool, String> {
    let actual = compute_file_checksum(file_path)?;
    Ok(actual == expected_checksum)
}

/// 计算字节数据的 SHA-256 哈希
pub fn hash_bytes(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hex::encode(hasher.finalize())
}

/// 检查权限是否在允许列表中
pub fn is_permission_allowed(
    permission: &str,
    allowed_permissions: &[&str],
) -> bool {
    allowed_permissions.contains(&permission)
}

/// 检查一组权限是否全部在允许列表中
pub fn validate_permissions(
    requested: &[String],
    allowed: &[&str],
) -> Result<(), Vec<String>> {
    let mut denied: Vec<String> = Vec::new();
    for perm in requested {
        if !is_permission_allowed(perm, allowed) {
            denied.push(perm.clone());
        }
    }
    if denied.is_empty() {
        Ok(())
    } else {
        Err(denied)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[test]
    fn test_compute_checksum() {
        let temp_dir = env::temp_dir().join("proclaw_security_test");
        std::fs::create_dir_all(&temp_dir).ok();
        let test_file = temp_dir.join("test.txt");
        std::fs::write(&test_file, "Hello, ProClaw Agent Security!").ok();

        let checksum = compute_file_checksum(&test_file).expect("Should compute checksum");
        assert_eq!(checksum.len(), 64); // SHA-256 hex is 64 chars

        // 验证相同的文件生成相同的 checksum
        let checksum2 = compute_file_checksum(&test_file).expect("Should compute checksum again");
        assert_eq!(checksum, checksum2);

        std::fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_hash_bytes() {
        let hash = hash_bytes(b"hello");
        assert_eq!(hash.len(), 64);
        // SHA-256 of "hello" (known value)
        assert_eq!(
            hash,
            "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        );
    }

    #[test]
    fn test_is_permission_allowed() {
        let allowed = &["read_user", "read_finance", "write_finance", "send_message"];
        assert!(is_permission_allowed("read_user", allowed));
        assert!(is_permission_allowed("write_finance", allowed));
        assert!(!is_permission_allowed("admin", allowed));
        assert!(!is_permission_allowed("delete_all", allowed));
    }

    #[test]
    fn test_validate_permissions() {
        let allowed = &["read_user", "read_finance", "write_finance"];

        // 全部允许
        let req = vec!["read_user".to_string(), "read_finance".to_string()];
        assert!(validate_permissions(&req, allowed).is_ok());

        // 包含不允许的权限
        let req = vec!["read_user".to_string(), "admin".to_string()];
        let result = validate_permissions(&req, allowed);
        assert!(result.is_err());
        assert_eq!(result.unwrap_err(), vec!["admin".to_string()]);
    }

    #[test]
    fn test_verify_checksum() {
        let temp_dir = env::temp_dir().join("proclaw_checksum_test");
        std::fs::create_dir_all(&temp_dir).ok();
        let test_file = temp_dir.join("checksum_test.txt");
        std::fs::write(&test_file, "Verify me!").ok();

        let checksum = compute_file_checksum(&test_file).expect("Should compute");
        assert!(verify_checksum(&test_file, &checksum).expect("Should verify"));

        // 错误 checksum 应该返回 false
        let wrong = "0000000000000000000000000000000000000000000000000000000000000000";
        assert!(!verify_checksum(&test_file, wrong).expect("Should not match"));

        std::fs::remove_dir_all(&temp_dir).ok();
    }

    #[test]
    fn test_manifest_signature() {
        let manifest = r#"{"id":"test-agent","name":"Test","version":"1.0.0","permissions":["read_user"]}"#;
        let secret_key = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

        // 计算签名
        let key_bytes = hex::decode(secret_key).unwrap();
        let mut mac = Hmac::<Sha256>::new_from_slice(&key_bytes).unwrap();
        mac.update(manifest.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        // 验证签名
        let result = verify_manifest_signature(manifest, &signature, secret_key).expect("Should verify");
        assert!(result);

        // 错误的密钥应导致验证失败
        let wrong_key = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        let result = verify_manifest_signature(manifest, &signature, wrong_key).expect("Should verify");
        assert!(!result);
    }
}
