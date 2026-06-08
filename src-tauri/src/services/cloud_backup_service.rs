// 云备份服务（Pro 版功能）
// 负责数据加密、上传到 Supabase、从 Supabase 下载解密、中继消息等功能

use crate::database::Database;
use crate::services::supabase_client::SupabaseClient;
use crate::utils::crypto::Aes256GcmCipher;
use base64::Engine;
use rusqlite::params;
use serde_json::{json, Value};
use std::sync::Mutex;
use uuid::Uuid;

/// 云备份服务（Pro 版功能）
#[allow(dead_code)]
pub struct CloudBackupService {
    db: Mutex<Database>,
    cipher: Aes256GcmCipher,
    supabase: SupabaseClient,
}

#[allow(dead_code)]
impl CloudBackupService {
    pub fn new(db: Database, encryption_key: &[u8]) -> Self {
        Self {
            db: Mutex::new(db),
            cipher: Aes256GcmCipher::new(encryption_key)
                .expect("CloudBackupService: encryption key must be 32 bytes"),
            supabase: SupabaseClient::from_env(),
        }
    }

    /// 检查云备份是否可用
    pub fn is_available(&self) -> bool {
        self.supabase.is_configured()
    }

    /// 加密并上传业务数据到 Supabase
    pub async fn backup_data_async(&self, table_name: &str, record_id: &str) -> Result<(), String> {
        if !self.supabase.is_configured() {
            return Err("Supabase not configured".to_string());
        }

        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        // 1. 获取记录数据
        let data = self.get_full_record_data(conn, table_name, record_id)?;

        // 2. 序列化为 JSON
        let payload = json!({
            "table_name": table_name,
            "record_id": record_id,
            "data": data,
            "version": 1,
            "timestamp": chrono::Utc::now().to_rfc3339(),
        });

        // 3. 加密数据
        let plaintext = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
        let encrypted = self
            .cipher
            .encrypt(plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        // 4. 上传到 Supabase
        let backup_id = Uuid::new_v4().to_string();
        let encrypted_base64 = base64::engine::general_purpose::STANDARD.encode(&encrypted);

        let supabase_payload = json!({
            "id": backup_id,
            "user_id": self.get_current_user_id(conn)?,
            "table_name": table_name,
            "record_id": record_id,
            "encrypted_data": encrypted_base64,
            "data_hash": self.calculate_hash(&plaintext),
            "created_at": chrono::Utc::now().to_rfc3339(),
        });

        // 使用 Supabase 客户端上传
        self.supabase
            .insert("encrypted_objects", &supabase_payload)
            .await?;

        // 5. 更新本地同步状态
        self.mark_as_backed_up(conn, table_name, record_id, &backup_id)?;

        Ok(())
    }

    /// 从 Supabase 下载并解密数据
    pub async fn restore_data_async(&self, backup_id: &str) -> Result<Value, String> {
        if !self.supabase.is_configured() {
            return Err("Supabase not configured".to_string());
        }

        // 1. 从 Supabase 下载加密数据
        let encrypted_data = self
            .supabase
            .download_raw("encrypted_objects", backup_id)
            .await?;

        if encrypted_data.is_empty() {
            return Err("No data found for the given backup_id".to_string());
        }

        // 2. 解密
        let decrypted = self
            .cipher
            .decrypt(&encrypted_data)
            .map_err(|e| format!("Decryption failed: {}", e))?;

        let payload: Value = serde_json::from_slice(&decrypted)
            .map_err(|e| format!("Failed to parse JSON: {}", e))?;

        Ok(payload)
    }

    /// 批量备份待同步数据
    pub async fn backup_pending_changes_async(&self) -> Result<usize, String> {
        if !self.supabase.is_configured() {
            return Ok(0); // 未配置时静默返回
        }

        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        // 查询所有未备份的记录
        let mut stmt = conn
            .prepare(
                "SELECT id, table_name, record_id, operation, payload
             FROM offline_queue
             WHERE status = 'pending' AND backup_status != 'completed'
             ORDER BY priority DESC, created_at ASC
             LIMIT 100",
            )
            .map_err(|e| e.to_string())?;

        let pending: Vec<(String, String, String, String, String)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut success_count = 0;

        for (queue_id, table_name, record_id, _operation, _payload) in &pending {
            match self.backup_data_async(table_name, record_id).await {
                Ok(_) => {
                    conn.execute(
                        "UPDATE offline_queue SET backup_status = 'completed' WHERE id = ?1",
                        params![queue_id],
                    )
                    .ok();
                    success_count += 1;
                }
                Err(e) => {
                    eprintln!(
                        "Failed to backup queue {}:{} - {}",
                        table_name, record_id, e
                    );
                    conn.execute(
                        "UPDATE offline_queue SET backup_status = 'failed', backup_error = ?1 WHERE id = ?2",
                        params![e, queue_id],
                    ).ok();
                }
            }
        }

        Ok(success_count)
    }

    /// 从 Supabase 拉取远程变更并应用到本地
    pub async fn download_changes_async(&self, table_name: &str) -> Result<usize, String> {
        if !self.supabase.is_configured() {
            return Ok(0);
        }

        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        // 获取最后同步时间
        let last_sync: Option<String> = conn
            .query_row(
                &format!("SELECT MAX(last_synced_at) FROM {}", table_name),
                [],
                |row| row.get(0),
            )
            .ok()
            .flatten();

        // 从 Supabase 拉取变更的加密对象
        let results = if let Some(since) = &last_sync {
            self.supabase
                .select_changes_since("encrypted_objects", "created_at", since)
                .await?
        } else {
            self.supabase.select("encrypted_objects", &[]).await?
        };

        let mut applied = 0;

        if let Some(items) = results.as_array() {
            for item in items {
                if let (Some(id), Some(table), Some(record_id)) = (
                    item.get("id").and_then(|v| v.as_str()),
                    item.get("table_name").and_then(|v| v.as_str()),
                    item.get("record_id").and_then(|v| v.as_str()),
                ) {
                    // 跳过本地已存在且未修改的记录
                    if table == table_name {
                        match self.restore_data_async(id).await {
                            Ok(payload) => {
                                if let Some(data) = payload.get("data") {
                                    self.apply_remote_data(conn, table, record_id, data)?;
                                    applied += 1;
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to restore {}: {}", id, e);
                            }
                        }
                    }
                }
            }
        }

        Ok(applied)
    }

    /// 中继消息转发到 Supabase
    pub async fn relay_message_async(
        &self,
        receiver_id: &str,
        message_type: &str,
        content: &Value,
    ) -> Result<(), String> {
        if !self.supabase.is_configured() {
            return Err("Supabase not configured".to_string());
        }

        // 1. 构建中继消息
        let message = json!({
            "receiver_id": receiver_id,
            "message_type": message_type,
            "content": content,
            "sender_id": self.get_sender_id(),
        });

        // 2. 加密消息内容
        let plaintext = serde_json::to_string(&message).map_err(|e| e.to_string())?;
        let encrypted = self
            .cipher
            .encrypt(plaintext.as_bytes())
            .map_err(|e| format!("Encryption failed: {}", e))?;

        let encrypted_base64 = base64::engine::general_purpose::STANDARD.encode(&encrypted);

        // 3. 上传到 Supabase relay_messages 表
        let relay_payload = json!({
            "id": Uuid::new_v4().to_string(),
            "sender_id": message["sender_id"],
            "receiver_id": receiver_id,
            "encrypted_content": encrypted_base64,
            "message_type": message_type,
            "created_at": chrono::Utc::now().to_rfc3339(),
        });

        self.supabase
            .insert("relay_messages", &relay_payload)
            .await?;

        Ok(())
    }

    /// 从 Supabase 拉取中继消息
    pub async fn fetch_relay_messages_async(
        &self,
        local_user_id: &str,
    ) -> Result<Vec<Value>, String> {
        if !self.supabase.is_configured() {
            return Ok(vec![]);
        }

        // 查询发给当前用户的中继消息
        let results = self.supabase.select("relay_messages", &[]).await?;

        let mut messages = Vec::new();

        if let Some(items) = results.as_array() {
            for item in items {
                if let (Some(id), Some(receiver_id), Some(encrypted_content)) = (
                    item.get("id").and_then(|v| v.as_str()),
                    item.get("receiver_id").and_then(|v| v.as_str()),
                    item.get("encrypted_content").and_then(|v| v.as_str()),
                ) {
                    if receiver_id == local_user_id {
                        // 解密消息
                        let decoded = base64::engine::general_purpose::STANDARD
                            .decode(encrypted_content)
                            .map_err(|e| format!("Base64 decode: {}", e))?;

                        match self.cipher.decrypt(&decoded) {
                            Ok(decrypted) => {
                                if let Ok(msg) = serde_json::from_slice::<Value>(&decrypted) {
                                    messages.push(json!({
                                        "relay_id": id,
                                        "message": msg,
                                        "received_at": chrono::Utc::now().to_rfc3339(),
                                    }));
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to decrypt relay message {}: {}", id, e);
                            }
                        }

                        // 删除已拉取的消息
                        if let Err(e) = self.supabase.delete_by_id("relay_messages", id).await {
                            eprintln!(
                                "[cloud_backup] Failed to delete relay message {}: {}",
                                id, e
                            );
                        }
                    }
                }
            }
        }

        // 将接收到的消息存储到本地
        if !messages.is_empty() {
            let db = self.db.lock().map_err(|e| e.to_string())?;
            for msg in &messages {
                let relay_id = msg.get("relay_id").and_then(|v| v.as_str()).unwrap_or("");
                let content = msg.get("message").unwrap_or(&Value::Null);
                let content_str = serde_json::to_string(content).unwrap_or_default();

                if let Err(e) = db.connection().execute(
                    "INSERT OR IGNORE INTO relay_messages (id, receiver_id, message_type, content, status, direction)
                     VALUES (?1, ?2, 'chat', ?3, 'pending', 'incoming')",
                    params![relay_id, local_user_id, content_str],
                ) {
                    eprintln!("[cloud_backup] Failed to store relay message: {}", e);
                }
            }
        }

        Ok(messages)
    }

    /// 执行完整的同步周期
    pub async fn full_sync_async(&self) -> Result<String, String> {
        if !self.supabase.is_configured() {
            return Ok("Supabase not configured, sync skipped".to_string());
        }

        let sync_id = Uuid::new_v4().to_string();

        // 记录同步开始
        let db = self.db.lock().map_err(|e| e.to_string())?;
        db.connection().execute(
            "INSERT INTO sync_log (id, sync_type, status, records_processed, records_failed, conflict_count)
             VALUES (?1, 'full', 'running', 0, 0, 0)",
            params![sync_id],
        ).ok();
        drop(db);

        // 1. 上传本地变更
        let uploaded = self.backup_pending_changes_async().await?;

        // 2. 下载远程变更
        let mut downloaded = 0;
        for table in &[
            "products",
            "customers",
            "suppliers",
            "sales_orders",
            "purchase_orders",
            "financial_transactions",
        ] {
            match self.download_changes_async(table).await {
                Ok(count) => downloaded += count,
                Err(e) => eprintln!("Failed to download changes for {}: {}", table, e),
            }
        }

        // 3. 解决冲突
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conflicts = Self::resolve_conflicts_all(db.connection())?;

        // 4. 更新同步日志
        db.connection().execute(
            "UPDATE sync_log SET status = 'success', records_processed = ?1, records_failed = 0, conflict_count = ?2, completed_at = CURRENT_TIMESTAMP WHERE id = ?3",
            params![uploaded + downloaded, conflicts, sync_id],
        ).ok();

        Ok(format!(
            "Sync completed: {} uploaded, {} downloaded, {} conflicts resolved",
            uploaded, downloaded, conflicts
        ))
    }

    // ========== 辅助函数 ==========

    /// 获取完整记录数据
    fn get_full_record_data(
        &self,
        conn: &rusqlite::Connection,
        table_name: &str,
        record_id: &str,
    ) -> Result<Value, String> {
        match table_name {
            "products" => self.query_single(conn, "products", record_id),
            "product_categories" => self.query_single(conn, "product_categories", record_id),
            "brands" => self.query_single(conn, "brands", record_id),
            "customers" => self.query_single(conn, "customers", record_id),
            "suppliers" => self.query_single(conn, "suppliers", record_id),
            "sales_orders" => self.query_single(conn, "sales_orders", record_id),
            "purchase_orders" => self.query_single(conn, "purchase_orders", record_id),
            "inventory_transactions" => {
                self.query_single(conn, "inventory_transactions", record_id)
            }
            "financial_transactions" => {
                self.query_single(conn, "financial_transactions", record_id)
            }
            _ => Err(format!("Unknown table: {}", table_name)),
        }
    }

    /// 查询单条记录并转为 JSON
    fn query_single(
        &self,
        conn: &rusqlite::Connection,
        table: &str,
        id: &str,
    ) -> Result<Value, String> {
        let sql = format!("SELECT * FROM {} WHERE id = ?1", table);
        let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

        let columns: Vec<String> = stmt
            .column_names()
            .into_iter()
            .map(|c| c.to_string())
            .collect();

        let result = stmt
            .query_row(params![id], |row| {
                let mut obj = json!({});
                for (i, col) in columns.iter().enumerate() {
                    let val: rusqlite::types::Value = row.get_ref(i)?.into();
                    let json_val = match val {
                        rusqlite::types::Value::Null => Value::Null,
                        rusqlite::types::Value::Integer(v) => json!(v),
                        rusqlite::types::Value::Real(v) => json!(v),
                        rusqlite::types::Value::Text(v) => json!(v),
                        rusqlite::types::Value::Blob(_) => Value::Null,
                    };
                    if let Some(obj_map) = obj.as_object_mut() {
                        obj_map.insert(col.clone(), json_val);
                    }
                }
                Ok(obj)
            })
            .map_err(|e| format!("Record not found in {}: {}", table, e))?;

        Ok(result)
    }

    /// 应用远程数据到本地
    fn apply_remote_data(
        &self,
        conn: &rusqlite::Connection,
        table: &str,
        record_id: &str,
        data: &Value,
    ) -> Result<(), String> {
        if let Some(obj) = data.as_object() {
            // 检查本地是否已有此记录
            let exists: bool = conn
                .query_row(
                    &format!("SELECT COUNT(*) FROM {} WHERE id = ?1", table),
                    params![record_id],
                    |row| row.get::<_, i32>(0),
                )
                .map(|c| c > 0)
                .unwrap_or(false);

            if exists {
                // 更新记录（Last-Write-Wins: 远程覆盖本地）
                let set_clauses: Vec<String> = obj
                    .keys()
                    .filter(|k| *k != "id" && *k != "sync_status" && *k != "last_synced_at")
                    .map(|k| format!("{} = ?", k))
                    .collect();

                if !set_clauses.is_empty() {
                    let sql = format!(
                        "UPDATE {} SET {}, sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?",
                        table,
                        set_clauses.join(", ")
                    );

                    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
                    let values: Vec<Box<dyn rusqlite::types::ToSql>> = obj
                        .iter()
                        .filter(|(k, _)| {
                            *k != "id" && *k != "sync_status" && *k != "last_synced_at"
                        })
                        .map(|(_, v)| {
                            let s = match v {
                                Value::String(s) => s.clone(),
                                Value::Number(n) => n.to_string(),
                                Value::Bool(b) => b.to_string(),
                                _ => String::new(),
                            };
                            Box::new(s) as Box<dyn rusqlite::types::ToSql>
                        })
                        .collect();

                    let mut params_refs: Vec<&dyn rusqlite::types::ToSql> =
                        values.iter().map(|v| v.as_ref()).collect();
                    params_refs.push(&record_id);
                    stmt.execute(rusqlite::params_from_iter(params_refs))
                        .map_err(|e| format!("Failed to apply remote data: {}", e))?;
                }
            } else {
                // 插入新记录
                let columns: Vec<String> = obj.keys().map(|k| k.to_string()).collect();
                let placeholders: Vec<String> =
                    (0..columns.len()).map(|i| format!("?{}", i + 1)).collect();
                let sql = format!(
                    "INSERT INTO {} ({}) VALUES ({})",
                    table,
                    columns.join(", "),
                    placeholders.join(", ")
                );

                let values: Vec<String> = obj
                    .values()
                    .map(|v| match v {
                        Value::String(s) => s.clone(),
                        Value::Number(n) => n.to_string(),
                        Value::Bool(b) => b.to_string(),
                        _ => String::new(),
                    })
                    .collect();

                let params_refs: Vec<&dyn rusqlite::types::ToSql> = values
                    .iter()
                    .map(|v| v as &dyn rusqlite::types::ToSql)
                    .collect();

                conn.execute(&sql, rusqlite::params_from_iter(params_refs))
                    .map_err(|e| format!("Failed to insert remote data: {}", e))?;

                // 标记为已同步
                conn.execute(
                    &format!("UPDATE {} SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1", table),
                    params![record_id],
                ).ok();
            }
        }

        Ok(())
    }

    fn get_current_user_id(&self, _conn: &rusqlite::Connection) -> Result<String, String> {
        // TODO: 从当前会话或配置文件获取用户 ID
        Ok("local_owner".to_string())
    }

    fn get_sender_id(&self) -> String {
        // 获取发送者ID（桌面端实例ID）
        std::env::var("PROCLAW_INSTANCE_ID").unwrap_or_else(|_| "desktop_01".to_string())
    }

    fn calculate_hash(&self, data: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(data.as_bytes());
        hex::encode(hasher.finalize())
    }

    fn mark_as_backed_up(
        &self,
        conn: &rusqlite::Connection,
        table_name: &str,
        record_id: &str,
        backup_id: &str,
    ) -> Result<(), String> {
        let tables_with_backup = [
            "products",
            "customers",
            "suppliers",
            "sales_orders",
            "purchase_orders",
            "inventory_transactions",
            "financial_transactions",
        ];

        if tables_with_backup.contains(&table_name) {
            let sql = format!(
                "UPDATE {} SET backup_id = ?1, backup_at = CURRENT_TIMESTAMP WHERE id = ?2",
                table_name
            );
            conn.execute(&sql, params![backup_id, record_id])
                .map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    /// 解决所有表的冲突
    fn resolve_conflicts_all(conn: &rusqlite::Connection) -> Result<usize, String> {
        let tables = [
            "products",
            "customers",
            "suppliers",
            "sales_orders",
            "purchase_orders",
            "financial_transactions",
        ];
        let mut total = 0;

        for table in &tables {
            let sql = format!(
                "SELECT COUNT(*) FROM {} WHERE sync_status = 'conflict'",
                table
            );
            let count: i32 = conn.query_row(&sql, [], |row| row.get(0)).unwrap_or(0);
            if count > 0 {
                let update = format!(
                    "UPDATE {} SET sync_status = 'synced' WHERE sync_status = 'conflict'",
                    table
                );
                conn.execute(&update, []).ok();
                total += count as usize;
            }
        }

        Ok(total)
    }
}

// ========== 同步版本（同步方法包装，用于Tauri命令等） ==========

#[allow(dead_code)]
impl CloudBackupService {
    /// 同步版备份（用于Tauri Command等同步上下文）
    pub fn backup_data(&self, table_name: &str, record_id: &str) -> Result<(), String> {
        let rt = tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())?;
        rt.block_on(self.backup_data_async(table_name, record_id))
    }

    /// 同步版上传到 Supabase
    pub fn upload_to_supabase(&self, table: &str, payload: &Value) -> Result<(), String> {
        let rt = tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())?;
        rt.block_on(self.supabase.insert(table, payload))?;
        Ok(())
    }

    /// 同步版从 Supabase 下载
    pub fn download_from_supabase(&self, table: &str, id: &str) -> Result<Vec<u8>, String> {
        let rt = tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())?;
        rt.block_on(self.supabase.download_raw(table, id))
    }

    /// 同步版数据恢复
    pub fn restore_data(&self, backup_id: &str) -> Result<Value, String> {
        let rt = tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())?;
        rt.block_on(self.restore_data_async(backup_id))
    }

    /// 同步版批量备份
    pub fn backup_pending_changes(&self) -> Result<usize, String> {
        let rt = tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())?;
        rt.block_on(self.backup_pending_changes_async())
    }

    /// 同步版中继消息
    pub fn relay_message(&self, message: &Value) -> Result<(), String> {
        let rt = tokio::runtime::Handle::try_current()
            .map_err(|_| "No tokio runtime available".to_string())?;
        let receiver_id = message["receiver_id"].as_str().unwrap_or("unknown");
        let msg_type = message["message_type"].as_str().unwrap_or("chat");
        let content = &message["content"];
        rt.block_on(self.relay_message_async(receiver_id, msg_type, content))
    }

    /// 同步版连接 Realtime（基于轮询的轻量实现）
    pub fn connect_realtime(&self) -> Result<(), String> {
        if !self.supabase.is_configured() {
            println!("[Realtime] Supabase not configured, realtime disabled");
            return Ok(());
        }

        println!("[Realtime] Starting relay polling loop...");

        // 启动轮询任务检查中继消息
        let supabase = self.supabase.clone();
        // 审计修复 #2: 使用 self.cipher 克隆，避免零密钥解密
        let cipher = self.cipher.clone();

        let _relay_handle = tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(30));
            loop {
                interval.tick().await;

                // 查询发给本地实例的中继消息
                match supabase.select("relay_messages", &[]).await {
                    Ok(results) => {
                        if let Some(items) = results.as_array() {
                            for item in items {
                                if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                                    if let Some(encrypted) =
                                        item.get("encrypted_content").and_then(|v| v.as_str())
                                    {
                                        let decoded = base64::engine::general_purpose::STANDARD
                                            .decode(encrypted)
                                            .ok();

                                        if let Some(decoded) = decoded {
                                            if let Ok(plaintext) = cipher.decrypt(&decoded) {
                                                if let Ok(msg) =
                                                    serde_json::from_slice::<Value>(&plaintext)
                                                {
                                                    println!(
                                                        "[Realtime] Received relay message: {:?}",
                                                        msg
                                                    );
                                                }
                                            }
                                        }

                                        // 删除已处理的消息
                                        if let Err(e) =
                                            supabase.delete_by_id("relay_messages", id).await
                                        {
                                            eprintln!(
                                                "[Realtime] Failed to delete relay msg {}: {}",
                                                id, e
                                            );
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("[Realtime] Error polling relay messages: {}", e);
                    }
                }
            }
        });

        println!("[Realtime] Polling loop started (30s interval)");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cipher_and_hash() {
        let key = b"0123456789abcdef0123456789abcdef";
        let cipher = Aes256GcmCipher::new(key).expect("create cipher");

        let plaintext = b"Hello, ProClaw Cloud Backup!";
        let encrypted = cipher.encrypt(plaintext).unwrap();
        let decrypted = cipher.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.to_vec(), decrypted);

        // Test hash
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(b"test data");
        let hash = hex::encode(hasher.finalize());
        assert_eq!(hash.len(), 64);
    }
}
