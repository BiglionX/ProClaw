//! Supabase 中继链路 Rust 端命令（任务 #9）
//!
//! 提供 `relay_publish` 与 `relay_replay_offline` 两个 Tauri 命令
//! 桌面端通过这些命令把消息推送到 Supabase Realtime

use crate::database::Database;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayPayload {
    pub channel: String,
    pub sender_id: String,
    pub receiver_id: Option<String>,
    pub payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayResult {
    pub success: bool,
    pub message: String,
    pub timestamp: i64,
    pub retry_count: i64,
}

/// 发布消息到 Supabase 中继
#[tauri::command]
pub async fn relay_publish(
    relay: RelayPayload,
) -> Result<RelayResult, String> {
    let client = reqwest::Client::new();
    let supabase_url = std::env::var("VITE_SUPABASE_URL")
        .unwrap_or_else(|_| "https://your-project.supabase.co".to_string());
    let supabase_key = std::env::var("VITE_SUPABASE_ANON_KEY")
        .unwrap_or_default();

    if supabase_key.is_empty() {
        return Err("Supabase 未配置（VITE_SUPABASE_ANON_KEY 缺失）".to_string());
    }

    let url = format!(
        "{}/rest/v1/relay_messages",
        supabase_url.trim_end_matches('/')
    );

    let body = serde_json::json!({
        "channel": relay.channel,
        "sender_id": relay.sender_id,
        "receiver_id": relay.receiver_id,
        "payload": relay.payload,
        "created_at": chrono::Utc::now().to_rfc3339(),
    });

    let response = client
        .post(&url)
        .header("apikey", &supabase_key)
        .header("Authorization", format!("Bearer {}", supabase_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Supabase 请求失败: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("Supabase 返回 {}: {}", status, text));
    }

    Ok(RelayResult {
        success: true,
        message: "中继发布成功".to_string(),
        timestamp: chrono::Utc::now().timestamp(),
        retry_count: 0,
    })
}

/// 列出本地离线任务
#[tauri::command]
pub fn relay_list_offline_tasks(
    db: tauri::State<'_, Mutex<Database>>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 确保表存在
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS offline_tasks (
            id TEXT PRIMARY KEY,
            target_device_id TEXT NOT NULL,
            task_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            retry_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            next_retry_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        );",
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT id, target_device_id, task_type, payload, retry_count, status, next_retry_at, created_at
             FROM offline_tasks
             WHERE status IN ('pending', 'in_flight')
             ORDER BY next_retry_at ASC
             LIMIT 100",
        )
        .map_err(|e| e.to_string())?;

    let rows: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "target_device_id": row.get::<_, String>(1)?,
                "task_type": row.get::<_, String>(2)?,
                "payload": row.get::<_, String>(3)?,
                "retry_count": row.get::<_, i64>(4)?,
                "status": row.get::<_, String>(5)?,
                "next_retry_at": row.get::<_, i64>(6)?,
                "created_at": row.get::<_, i64>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(rows)
}

/// 重放所有待处理离线任务
#[tauri::command]
pub async fn relay_replay_offline(
    db: tauri::State<'_, Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    use serde_json::json;

    // 1. 读取所有待处理任务
    let tasks = {
        let db = db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();

        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS offline_tasks (
                id TEXT PRIMARY KEY,
                target_device_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                payload TEXT NOT NULL,
                retry_count INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                next_retry_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );",
        )
        .map_err(|e| e.to_string())?;

        let mut stmt = conn
            .prepare(
                "SELECT id, target_device_id, task_type, payload
                 FROM offline_tasks
                 WHERE status = 'pending' AND next_retry_at <= ?1
                 LIMIT 50",
            )
            .map_err(|e| e.to_string())?;

        let now = chrono::Utc::now().timestamp();
        stmt.query_map(rusqlite::params![now], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>()
    };

    let total = tasks.len();
    let mut success = 0;
    let mut failed = 0;

    // 2. 逐个重放
    for (id, target_device_id, _task_type, payload_json) in tasks {
        let payload: serde_json::Value = match serde_json::from_str(&payload_json) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let result = relay_publish(RelayPayload {
            channel: format!("device.{}", target_device_id),
            sender_id: "desktop".to_string(),
            receiver_id: Some(target_device_id.clone()),
            payload,
        })
        .await;

        let success_flag = result.is_ok();
        if success_flag {
            success += 1;
        } else {
            failed += 1;
        }

        // 更新任务状态
        let db = db.lock().map_err(|e| e.to_string())?;
        let conn = db.connection();
        if success_flag {
            conn.execute(
                "UPDATE offline_tasks SET status = 'completed' WHERE id = ?1",
                rusqlite::params![id],
            )
            .ok();
        } else {
            conn.execute(
                "UPDATE offline_tasks
                 SET retry_count = retry_count + 1,
                     next_retry_at = ?2
                 WHERE id = ?1",
                rusqlite::params![id, chrono::Utc::now().timestamp() + 60],
            )
            .ok();
        }
    }

    Ok(json!({
        "total": total,
        "success": success,
        "failed": failed,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_relay_payload_serialization() {
        let payload = RelayPayload {
            channel: "device.test".to_string(),
            sender_id: "desktop".to_string(),
            receiver_id: Some("mobile-001".to_string()),
            payload: serde_json::json!({"type": "test", "data": "hello"}),
        };
        let json = serde_json::to_string(&payload).unwrap();
        assert!(json.contains("\"channel\":\"device.test\""));
        assert!(json.contains("\"sender_id\":\"desktop\""));
    }

    #[test]
    fn test_relay_result_serialization() {
        let result = RelayResult {
            success: true,
            message: "ok".to_string(),
            timestamp: 1234567890,
            retry_count: 0,
        };
        let json = serde_json::to_string(&result).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"timestamp\":1234567890"));
    }
}
