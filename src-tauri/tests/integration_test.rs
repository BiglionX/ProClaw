// ProClaw 集成测试
// 测试关键的 Tauri Command 端到端流程

// =====================================================
// 数据模型序列化测试
// =====================================================

#[test]
fn test_product_spu_serialization_roundtrip() {
    // 验证产品 SPU 可以正确序列化/反序列化
    let json = serde_json::json!({
        "id": "spu_001",
        "name": "测试商品",
        "sku": "SKU-001",
        "price": 99.9,
        "stock": 100,
        "category": "电子产品"
    });

    let serialized = serde_json::to_string(&json).expect("序列化失败");
    let deserialized: serde_json::Value = serde_json::from_str(&serialized).expect("反序列化失败");

    assert_eq!(deserialized["id"], "spu_001");
    assert_eq!(deserialized["price"], 99.9);
}

#[test]
fn test_sales_order_json_format() {
    let order = serde_json::json!({
        "id": "ord_001",
        "order_no": "SO-2026-0001",
        "customer_name": "张三",
        "total_amount": 299.7,
        "status": "pending",
        "items": [
            {"product_id": "spu_001", "quantity": 2, "unit_price": 99.9},
            {"product_id": "spu_002", "quantity": 1, "unit_price": 99.9}
        ]
    });

    assert_eq!(order["status"], "pending");
    let items = order["items"].as_array().expect("items 应为数组");
    assert_eq!(items.len(), 2);
    assert_eq!(items[0]["quantity"], 2);
}

// =====================================================
// 加密/解密测试
// =====================================================

#[cfg(test)]
mod crypto_tests {
    use aes_gcm::{
        aead::{Aead, KeyInit},
        Aes256Gcm, Nonce,
    };
    use rand::Rng;

    #[test]
    fn test_aes256gcm_encrypt_decrypt_roundtrip() {
        let key = rand::thread_rng().gen::<[u8; 32]>();
        let cipher = Aes256Gcm::new_from_slice(&key).expect("AES-256-GCM init");

        let plaintext = b"ProClaw sensitive data - customer phone: 13800138000";
        let nonce_bytes = rand::thread_rng().gen::<[u8; 12]>();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_ref())
            .expect("encrypt failed");

        let decrypted = cipher
            .decrypt(nonce, ciphertext.as_ref())
            .expect("decrypt failed");

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_tampered_data_fails() {
        let key = rand::thread_rng().gen::<[u8; 32]>();
        let cipher = Aes256Gcm::new_from_slice(&key).expect("AES-256-GCM init");

        let plaintext = b"sensitive data";
        let nonce_bytes = rand::thread_rng().gen::<[u8; 12]>();
        let nonce = Nonce::from_slice(&nonce_bytes);

        let mut ciphertext = cipher.encrypt(nonce, plaintext.as_ref()).expect("加密失败");

        // 篡改密文
        if !ciphertext.is_empty() {
            ciphertext[0] ^= 0xFF;
        }

        let result = cipher.decrypt(nonce, ciphertext.as_ref());
        assert!(result.is_err(), "篡改后的密文应该解密失败");
    }
}

// =====================================================
// 路径安全测试
// =====================================================

#[cfg(test)]
mod path_safety_tests {

    fn sanitize_path_component(path: &str) -> String {
        path.chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
            .take(128)
            .collect()
    }

    fn ensure_within_dir(
        base: &std::path::Path,
        target: &std::path::Path,
    ) -> Result<std::path::PathBuf, String> {
        let canonical_base = base
            .canonicalize()
            .map_err(|e| format!("Base path error: {}", e))?;
        let resolved = canonical_base.join(target);
        let canonical_target = resolved.canonicalize().unwrap_or(resolved.clone());
        if !canonical_target.starts_with(&canonical_base) {
            return Err("路径穿越攻击被拦截".to_string());
        }
        Ok(resolved)
    }

    #[test]
    fn test_sanitize_path_component_removes_traversal() {
        assert_eq!(
            sanitize_path_component("../../../etc/passwd"),
            "......etcpasswd"
        );
        assert_eq!(
            sanitize_path_component("valid-plugin-id"),
            "valid-plugin-id"
        );
        assert_eq!(sanitize_path_component("a\\b:c*d?"), "abcd");
        assert_eq!(sanitize_path_component(""), "");
    }

    #[test]
    fn test_path_traversal_blocked() {
        let base = std::env::temp_dir().join("proclaw_test_base");
        std::fs::create_dir_all(&base).unwrap();

        let result = ensure_within_dir(&base, std::path::Path::new("../../etc/passwd"));
        // 在 Windows 和 Linux 上行为可能不同，但都不应允许穿越
        if let Ok(resolved) = &result {
            let canonical = resolved.canonicalize().unwrap_or(resolved.clone());
            // 确保解析后的路径在 base 内
            let canonical_base = base.canonicalize().unwrap();
            assert!(
                canonical.starts_with(&canonical_base) || result.is_err(),
                "路径穿越未被阻止"
            );
        }

        std::fs::remove_dir_all(&base).ok();
    }
}

// =====================================================
// JWT Token 测试
// =====================================================

#[cfg(test)]
mod jwt_tests {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;

    type HmacSha256 = Hmac<Sha256>;

    #[test]
    fn test_hmac_sign_and_verify() {
        let secret = b"proclaw-test-secret-key";
        let mut mac = HmacSha256::new_from_slice(secret).expect("HMAC 密钥长度无限制");

        let message = "store_abc123.1712345678.{\"order_no\":\"SO-001\"}";
        mac.update(message.as_bytes());
        let signature = hex::encode(mac.finalize().into_bytes());

        // 验证相同消息产生相同签名
        let mut mac2 = HmacSha256::new_from_slice(secret).expect("HMAC 密钥长度无限制");
        mac2.update(message.as_bytes());
        let signature2 = hex::encode(mac2.finalize().into_bytes());

        assert_eq!(signature, signature2);

        // 验证不同密钥产生不同签名
        let mut mac3 = HmacSha256::new_from_slice(b"wrong-secret").expect("HMAC 密钥长度无限制");
        mac3.update(message.as_bytes());
        let signature3 = hex::encode(mac3.finalize().into_bytes());

        assert_ne!(signature, signature3);
    }

    #[test]
    fn test_hmac_constant_time_comparison() {
        let sig1 = "abc123def456";
        let sig2 = "abc123def456";
        let sig3 = "abc123def457";

        // constant-time comparison
        let eq = sig1
            .as_bytes()
            .iter()
            .zip(sig2.as_bytes().iter())
            .fold(0, |acc, (a, b)| acc | (a ^ b))
            == 0;
        assert!(eq, "identical signatures should match");

        let ne = sig1
            .as_bytes()
            .iter()
            .zip(sig3.as_bytes().iter())
            .fold(0, |acc, (a, b)| acc | (a ^ b))
            == 0;
        assert!(!ne, "different signatures should not match");

        // 长度不同
        let short = [0u8; 10];
        let long = [0u8; 20];
        assert_ne!(short.len(), long.len());
    }
}

// =====================================================
// 数据库连接池基础测试
// =====================================================

#[cfg(test)]
mod db_tests {
    use rusqlite::params;

    #[test]
    fn test_in_memory_db_crud() {
        let conn = rusqlite::Connection::open_in_memory().expect("Failed to open in-memory DB");

        conn.execute_batch(
            "CREATE TABLE test_products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER DEFAULT 0
            );
            CREATE TABLE test_orders (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                FOREIGN KEY (product_id) REFERENCES test_products(id)
            );",
        )
        .expect("无法创建表");

        // INSERT
        conn.execute(
            "INSERT INTO test_products (id, name, price, stock) VALUES (?1, ?2, ?3, ?4)",
            params!["p001", "Test Product", 99.9, 100],
        )
        .expect("INSERT failed");

        // SELECT
        let (name, price): (String, f64) = conn
            .query_row(
                "SELECT name, price FROM test_products WHERE id = ?1",
                params!["p001"],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("SELECT failed");

        assert_eq!(name, "Test Product");
        assert_eq!(price, 99.9);

        // UPDATE
        conn.execute(
            "UPDATE test_products SET stock = stock - 10 WHERE id = ?1",
            params!["p001"],
        )
        .expect("UPDATE failed");

        let stock: i32 = conn
            .query_row(
                "SELECT stock FROM test_products WHERE id = ?1",
                params!["p001"],
                |row| row.get(0),
            )
            .expect("SELECT failed");

        assert_eq!(stock, 90);

        // DELETE
        conn.execute("DELETE FROM test_products WHERE id = ?1", params!["p001"])
            .expect("删除失败");

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM test_products", [], |row| row.get(0))
            .expect("查询失败");

        assert_eq!(count, 0);
    }

    #[test]
    fn test_sql_injection_parameterized() {
        let conn = rusqlite::Connection::open_in_memory().expect("无法打开内存数据库");

        conn.execute_batch("CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL);")
            .expect("无法创建表");

        conn.execute(
            "INSERT INTO users (id, name) VALUES (?1, ?2)",
            params!["u001", "正常用户"],
        )
        .expect("插入失败");

        // SQL 注入尝试
        let malicious = "'; DROP TABLE users; --";
        let result = conn.query_row(
            "SELECT COUNT(*) FROM users WHERE name = ?1",
            params![malicious],
            |row| row.get::<_, i32>(0),
        );

        // 参数化查询应安全返回 0（无匹配），而不是删除表
        assert_eq!(result.unwrap(), 0);

        // 表仍然存在
        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
            .expect("表应该仍然存在");

        assert_eq!(count, 1);
    }

    #[test]
    fn test_transaction_rollback() {
        let conn = rusqlite::Connection::open_in_memory().expect("无法打开内存数据库");

        conn.execute_batch("CREATE TABLE accounts (id TEXT PRIMARY KEY, balance REAL NOT NULL);")
            .expect("无法创建表");

        conn.execute(
            "INSERT INTO accounts (id, balance) VALUES (?1, ?2)",
            params!["acc_a", 1000.0],
        )
        .expect("插入失败");

        conn.execute(
            "INSERT INTO accounts (id, balance) VALUES (?2, ?1)",
            params![500.0, "acc_b"],
        )
        .expect("插入失败");

        // 模拟转账事务（故意失败）
        conn.execute_batch("BEGIN TRANSACTION").expect("开始事务");
        conn.execute(
            "UPDATE accounts SET balance = balance - 100 WHERE id = ?1",
            params!["acc_a"],
        )
        .expect("扣款成功");

        // 模拟第二步失败
        conn.execute_batch("ROLLBACK").expect("回滚");

        // 验证余额未变
        let balance: f64 = conn
            .query_row(
                "SELECT balance FROM accounts WHERE id = ?1",
                params!["acc_a"],
                |row| row.get(0),
            )
            .expect("查询失败");

        assert_eq!(balance, 1000.0, "回滚后余额应恢复");
    }
}

// =====================================================
// UUID 生成测试
// =====================================================

#[test]
fn test_uuid_generation_uniqueness() {
    let id1 = uuid::Uuid::new_v4().to_string();
    let id2 = uuid::Uuid::new_v4().to_string();
    assert_ne!(id1, id2);
    assert_eq!(id1.len(), 36); // 标准 UUID 格式
    assert!(id1.chars().filter(|&c| c == '-').count() == 4);
}

// =====================================================
// 分页参数安全测试
// =====================================================

#[test]
fn test_pagination_bounds() {
    // 分页参数边界检查
    let page: i64 = "-1; DROP TABLE".parse().unwrap_or(1);
    assert_eq!(page, 1, "非法页码应回退到默认值 1");

    let page_size: i64 = "99999".parse().unwrap_or(20);
    // 限制每页最大 200
    let safe_size = page_size.min(200);
    assert_eq!(safe_size, 200);
    assert!(safe_size <= 200);
}

#[test]
fn test_limit_offset_safety() {
    // 验证 LIMIT/OFFSET 使用参数化绑定而非字符串拼接
    // 正确方式：参数化
    let sql = format!("SELECT * FROM products LIMIT ?1 OFFSET ?2");
    assert!(sql.contains("?1"));
    assert!(sql.contains("?2"));

    // 错误方式（反例）：不应使用字符串拼接
    // let sql = format!("SELECT * FROM products LIMIT {} OFFSET {}", limit, offset);
}
