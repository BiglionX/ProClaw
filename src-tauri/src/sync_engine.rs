use crate::database::Database;
use rusqlite::params;
use serde_json;
use std::sync::Mutex;
use uuid::Uuid;

/// 离线队列管理器
pub struct SyncEngine {
    db: Mutex<Database>,
}

impl SyncEngine {
    pub fn new(db: Database) -> Self {
        Self {
            db: Mutex::new(db),
        }
    }

    /// 添加操作到离线队列
    pub fn enqueue_operation(
        &self,
        table_name: &str,
        record_id: &str,
        operation: &str,
        payload: &serde_json::Value,
    ) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        let id = Uuid::new_v4().to_string();
        let payload_str = serde_json::to_string(payload).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO offline_queue (id, table_name, record_id, operation, payload, status)
             VALUES (?1, ?2, ?3, ?4, ?5, 'pending')",
            params![id, table_name, record_id, operation, payload_str],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    /// 处理离线队列中的所有待处理操作
    pub fn process_offline_queue(&self) -> Result<usize, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        // 获取所有待处理的操作
        let mut stmt = conn.prepare(
            "SELECT id, table_name, record_id, operation, payload, retry_count
             FROM offline_queue
             WHERE status = 'pending' AND retry_count < max_retries
             ORDER BY priority DESC, created_at ASC"
        ).map_err(|e| e.to_string())?;

        let operations: Vec<(String, String, String, String, String, i32)> = stmt
            .query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        let mut processed_count = 0;

        for (id, table_name, record_id, operation, payload, retry_count) in operations {
            // 标记为处理中
            conn.execute(
                "UPDATE offline_queue SET status = 'processing' WHERE id = ?1",
                params![id],
            ).map_err(|e| e.to_string())?;

            // 这里应该调用 Supabase API 进行同步
            // 简化实现:直接标记为完成
            // TODO: 在实际应用中需要异步处理
            let sync_result: Result<(), String> = Ok(()); // 暂时跳过实际的同步

            match sync_result {
                Ok(_) => {
                    // 同步成功
                    conn.execute(
                        "UPDATE offline_queue SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?1",
                        params![id],
                    ).map_err(|e| e.to_string())?;

                    // 更新本地记录的同步状态
                    self.mark_record_synced(&table_name, &record_id).ok();

                    processed_count += 1;
                }
                Err(e) => {
                    // 同步失败,增加重试次数
                    let new_retry_count = retry_count + 1;
                    conn.execute(
                        "UPDATE offline_queue SET status = 'pending', retry_count = ?1, error_message = ?2 WHERE id = ?3",
                        params![new_retry_count, e, id],
                    ).map_err(|e| e.to_string())?;
                }
            }
        }

        Ok(processed_count)
    }

    /// 同步到 Supabase (简化实现)
    async fn sync_to_supabase(
        &self,
        table_name: &str,
        record_id: &str,
        operation: &str,
        payload: &str,
    ) -> Result<(), String> {
        // TODO: 实际实现应该调用 Supabase REST API
        // 这里只是模拟成功
        println!(
            "Syncing {} {} to Supabase (operation: {})",
            table_name, record_id, operation
        );

        // 模拟网络延迟
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        Ok(())
    }

    /// 标记记录为已同步
    fn mark_record_synced(&self, table_name: &str, record_id: &str) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        let sql = match table_name {
            "products" => "UPDATE products SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
            "product_categories" => "UPDATE product_categories SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
            "inventory_transactions" => "UPDATE inventory_transactions SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
            _ => return Err(format!("Unknown table: {}", table_name)),
        };

        conn.execute(sql, params![record_id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    /// 从 Supabase 下载变更
    pub async fn download_from_supabase(&self) -> Result<usize, String> {
        // TODO: 实现从 Supabase 拉取远程变更
        // 1. 获取最后同步时间
        // 2. 查询 Supabase 获取之后的变更
        // 3. 检测冲突
        // 4. 应用变更到本地数据库

        println!("Downloading changes from Supabase...");

        // 模拟实现
        tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;

        Ok(0) // 返回应用的记录数
    }

    /// 检测并解决冲突
    pub fn resolve_conflicts(&self) -> Result<usize, String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        // 查找冲突记录
        let mut stmt = conn.prepare(
            "SELECT COUNT(*) FROM products WHERE sync_status = 'conflict'"
        ).map_err(|e| e.to_string())?;

        let conflict_count: i32 = stmt.query_row([], |row| row.get(0))
            .map_err(|e| e.to_string())?;

        if conflict_count > 0 {
            println!("Found {} conflicts to resolve", conflict_count);

            // 冲突解决策略: Last-Write-Wins
            // 实际实现应该比较时间戳或让用户选择
            conn.execute(
                "UPDATE products SET sync_status = 'synced' WHERE sync_status = 'conflict'",
                [],
            ).map_err(|e| e.to_string())?;
        }

        Ok(conflict_count as usize)
    }

    /// 执行完整同步流程
    pub async fn full_sync(&self) -> Result<String, String> {
        println!("Starting full sync...");

        // 1. 上传本地变更
        let uploaded = self.process_offline_queue()?;
        println!("Uploaded {} records", uploaded);

        // 2. 下载远程变更
        let downloaded = self.download_from_supabase().await?;
        println!("Downloaded {} records", downloaded);

        // 3. 解决冲突
        let conflicts_resolved = self.resolve_conflicts()?;
        println!("Resolved {} conflicts", conflicts_resolved);

        // 4. 记录同步日志
        self.log_sync("full", "success", uploaded + downloaded, 0, conflicts_resolved)?;

        Ok(format!(
            "Sync completed: {} uploaded, {} downloaded, {} conflicts resolved",
            uploaded, downloaded, conflicts_resolved
        ))
    }

    /// 记录同步日志
    fn log_sync(
        &self,
        sync_type: &str,
        status: &str,
        records_processed: usize,
        records_failed: usize,
        conflict_count: usize,
    ) -> Result<(), String> {
        let db = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        let id = Uuid::new_v4().to_string();

        conn.execute(
            "INSERT INTO sync_log (id, sync_type, status, records_processed, records_failed, conflict_count)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, sync_type, status, records_processed as i32, records_failed as i32, conflict_count as i32],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }
}

// Tauri Commands for Sync Engine

#[tauri::command]
pub async fn start_sync(sync_engine: tauri::State<'_, SyncEngine>) -> Result<String, String> {
    sync_engine.full_sync().await
}

#[tauri::command]
pub fn get_sync_status(sync_engine: tauri::State<'_, SyncEngine>) -> Result<serde_json::Value, String> {
    let db = sync_engine.db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let pending: i32 = conn.query_row(
        "SELECT COUNT(*) FROM offline_queue WHERE status = 'pending'",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let conflicts: i32 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE sync_status = 'conflict'",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    let last_sync: Option<String> = conn.query_row(
        "SELECT completed_at FROM sync_log ORDER BY started_at DESC LIMIT 1",
        [],
        |row| row.get(0)
    ).ok();

    Ok(serde_json::json!({
        "pending_operations": pending,
        "conflicts": conflicts,
        "last_sync": last_sync,
        "status": if pending > 0 { "syncing" } else { "synced" }
    }))
}
