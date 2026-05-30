// ProClaw Cloud 云备份 Tauri 命令
// 封装 CloudBackupService 暴露给前端

use std::sync::Arc;
use tauri::State;
use std::sync::Mutex;
use crate::database::Database;
use crate::services::cloud_backup_service::CloudBackupService;
use serde_json::{json, Value};
use uuid::Uuid;
use chrono::Utc;

/// 获取备份历史
#[tauri::command]
pub fn get_backup_history_cmd(db: State<Mutex<Database>>, limit: Option<i64>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let limit = limit.unwrap_or(20);

    let mut stmt = conn.prepare(
        "SELECT id, user_id, status, started_at, completed_at, size_bytes, table_count, error_message
         FROM cloud_backup_jobs
         ORDER BY created_at DESC
         LIMIT ?"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows = stmt.query_map([limit], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "user_id": row.get::<_, String>(1)?,
            "status": row.get::<_, String>(2)?,
            "started_at": row.get::<_, Option<String>>(3)?,
            "completed_at": row.get::<_, Option<String>>(4)?,
            "size_bytes": row.get::<_, Option<i64>>(5)?,
            "table_count": row.get::<_, Option<i64>>(6)?,
            "error_message": row.get::<_, Option<String>>(7)?,
        }))
    }).map_err(|e| format!("Query failed: {}", e))?;

    let jobs: Vec<Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(json!({ "data": jobs }))
}

/// 获取云备份状态
#[tauri::command]
pub fn get_backup_status_cmd(cloud_backup: State<Arc<CloudBackupService>>) -> Result<Value, String> {
    Ok(json!({
        "available": cloud_backup.is_available(),
        "last_backup_at": Value::Null,
        "total_backups": 0,
    }))
}

/// 获取云备份配置
#[tauri::command]
pub fn get_backup_config_cmd(db: State<Mutex<Database>>, user_id: String) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let result = conn.query_row(
        "SELECT id, auto_backup, frequency, backup_time, encrypt_backup, retention_days, updated_at
         FROM cloud_backup_config WHERE user_id = ?",
        [&user_id],
        |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "auto_backup": row.get::<_, bool>(1)?,
                "frequency": row.get::<_, String>(2)?,
                "backup_time": row.get::<_, String>(3)?,
                "encrypt_backup": row.get::<_, bool>(4)?,
                "retention_days": row.get::<_, i64>(5)?,
                "updated_at": row.get::<_, Option<String>>(6)?,
            }))
        }
    );

    match result {
        Ok(config) => Ok(json!({ "data": config })),
        Err(_) => {
            // 返回默认配置
            Ok(json!({
                "data": {
                    "id": "default",
                    "auto_backup": false,
                    "frequency": "daily",
                    "backup_time": "02:00",
                    "encrypt_backup": true,
                    "retention_days": 30,
                    "updated_at": null,
                }
            }))
        }
    }
}

/// 触发手动云备份
#[tauri::command]
pub fn trigger_cloud_backup_cmd(
    db: State<Mutex<Database>>,
    cloud_backup: State<Arc<CloudBackupService>>,
    user_id: String,
) -> Result<Value, String> {
    let backup_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // 插入备份记录
    {
        let db = db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();
        conn.execute(
            "INSERT INTO cloud_backup_jobs (id, user_id, status, started_at) VALUES (?, ?, 'running', ?)",
            rusqlite::params![backup_id, user_id, now],
        ).map_err(|e| format!("Failed to create backup job: {}", e))?;
    }

    // 尝试执行备份
    let result = cloud_backup.backup_pending_changes();
    let completed_at = Utc::now().to_rfc3339();

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    match result {
        Ok(count) => {
            conn.execute(
                "UPDATE cloud_backup_jobs SET status = 'completed', completed_at = ?, size_bytes = ? WHERE id = ?",
                rusqlite::params![completed_at, count as i64 * 1024, backup_id],
            ).map_err(|e| format!("Failed to update backup job: {}", e))?;

            Ok(json!({ "data": {
                "backup_id": backup_id,
                "status": "completed",
                "record_count": count,
                "message": "备份完成"
            }}))
        }
        Err(e) => {
            conn.execute(
                "UPDATE cloud_backup_jobs SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?",
                rusqlite::params![completed_at, e.to_string(), backup_id],
            ).map_err(|_| "Failed to update backup job status".to_string())?;

            Err(format!("备份失败: {}", e))
        }
    }
}

/// 设置自动备份策略
#[tauri::command]
pub fn set_auto_backup_schedule_cmd(
    db: State<Mutex<Database>>,
    user_id: String,
    enabled: bool,
    frequency: String,
    backup_time: String,
    retention_days: i64,
    encrypt_backup: bool,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = Utc::now().to_rfc3339();

    let affected = conn.execute(
        "UPDATE cloud_backup_config SET auto_backup = ?, frequency = ?, backup_time = ?,
         encrypt_backup = ?, retention_days = ?, updated_at = ? WHERE user_id = ?",
        rusqlite::params![enabled, frequency, backup_time, encrypt_backup, retention_days, now, user_id],
    ).map_err(|e| format!("Failed to update config: {}", e))?;

    if affected == 0 {
        // 插入新配置
        conn.execute(
            "INSERT INTO cloud_backup_config (id, user_id, auto_backup, frequency, backup_time, encrypt_backup, retention_days, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            rusqlite::params!["default", user_id, enabled, frequency, backup_time, encrypt_backup, retention_days, now],
        ).map_err(|e| format!("Failed to insert config: {}", e))?;
    }

    Ok(json!({ "message": "备份策略已更新" }))
}

/// 从备份恢复
#[tauri::command]
pub fn restore_from_backup_cmd(
    cloud_backup: State<Arc<CloudBackupService>>,
    backup_id: String,
) -> Result<Value, String> {
    let result = cloud_backup.restore_data(&backup_id)?;
    Ok(json!({ "data": result, "message": "恢复完成" }))
}
