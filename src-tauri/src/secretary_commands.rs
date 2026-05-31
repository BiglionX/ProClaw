use crate::database::Database;
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

// ==================== 数据结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BapRecord {
    pub id: String,
    pub profile_type: String,
    pub key: String,
    pub value: String,  // JSON string
    pub confidence: f64,
    pub source: String,
    pub last_matched_at: Option<i64>,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BapRecordInput {
    pub profile_type: String,
    pub key: String,
    pub value: String,  // JSON string
    pub confidence: Option<f64>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BapDeleteResult {
    pub deleted: i64,
}

// ==================== 内部辅助函数 ====================

fn now_timestamp() -> i64 {
    Utc::now().timestamp()
}

fn bap_record_from_row(row: &rusqlite::Row) -> rusqlite::Result<BapRecord> {
    Ok(BapRecord {
        id: row.get("id")?,
        profile_type: row.get("profile_type")?,
        key: row.get("key")?,
        value: row.get("value")?,
        confidence: row.get("confidence")?,
        source: row.get("source")?,
        last_matched_at: row.get("last_matched_at")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

// ==================== Tauri 命令 ====================

/// 获取全部 BAP 记录
#[tauri::command]
pub fn bap_get_all(
    db: tauri::State<Mutex<Database>>,
    profile_type: Option<String>,
) -> Result<Vec<BapRecord>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, profile_type, key, value, confidence, source, last_matched_at, created_at, updated_at
         FROM secretary_bap WHERE 1=1",
    );
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref pt) = profile_type {
        sql.push_str(" AND profile_type = ?");
        param_values.push(Box::new(pt.clone()));
    }

    sql.push_str(" ORDER BY confidence DESC, updated_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> =
        param_values.iter().map(|p| p.as_ref()).collect();

    let rows = stmt
        .query_map(param_refs.as_slice(), bap_record_from_row)
        .map_err(|e| e.to_string())?;

    let results: Vec<BapRecord> = rows.filter_map(|r| r.ok()).collect();
    Ok(results)
}

/// 创建或更新 BAP 记录（按 profile_type + key 唯一）
#[tauri::command]
pub fn bap_upsert(
    db: tauri::State<Mutex<Database>>,
    record: BapRecordInput,
) -> Result<BapRecord, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let id = Uuid::new_v4().to_string();
    let now = now_timestamp();
    let confidence = record.confidence.unwrap_or(0.5);
    let source = record.source.unwrap_or_else(|| "observed".to_string());

    // 尝试更新现有记录
    let updated = conn
        .execute(
            "UPDATE secretary_bap SET value = ?1, confidence = ?2, source = ?3, last_matched_at = ?4, updated_at = ?5
             WHERE profile_type = ?6 AND key = ?7",
            params![
                record.value,
                confidence,
                source,
                now,
                now,
                record.profile_type,
                record.key,
            ],
        )
        .map_err(|e| format!("Failed to update BAP record: {}", e))?;

    if updated == 0 {
        // 不存在则插入新记录
        conn.execute(
            "INSERT INTO secretary_bap (id, profile_type, key, value, confidence, source, last_matched_at, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
            params![
                id,
                record.profile_type,
                record.key,
                record.value,
                confidence,
                source,
                now,
                now,
            ],
        )
        .map_err(|e| format!("Failed to insert BAP record: {}", e))?;

        Ok(BapRecord {
            id,
            profile_type: record.profile_type,
            key: record.key,
            value: record.value,
            confidence,
            source,
            last_matched_at: Some(now),
            created_at: now,
            updated_at: now,
        })
    } else {
        // 返回更新后的记录
        let mut stmt = conn
            .prepare(
                "SELECT id, profile_type, key, value, confidence, source, last_matched_at, created_at, updated_at
                 FROM secretary_bap WHERE profile_type = ?1 AND key = ?2",
            )
            .map_err(|e| e.to_string())?;

        let updated_record = stmt
            .query_row(params![record.profile_type, record.key], bap_record_from_row)
            .map_err(|e| format!("Failed to fetch updated BAP record: {}", e))?;

        Ok(updated_record)
    }
}

/// 按类型删除 BAP 记录
#[tauri::command]
pub fn bap_delete_by_type(
    db: tauri::State<Mutex<Database>>,
    profile_type: String,
) -> Result<BapDeleteResult, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let deleted = conn
        .execute(
            "DELETE FROM secretary_bap WHERE profile_type = ?1",
            params![profile_type],
        )
        .map_err(|e| format!("Failed to delete BAP records: {}", e))?;

    Ok(BapDeleteResult { deleted: deleted as i64 })
}

/// 重置学习数据（清空所有 observed 来源的记录）
#[tauri::command]
pub fn bap_reset_learning(
    db: tauri::State<Mutex<Database>>,
) -> Result<BapDeleteResult, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let deleted = conn
        .execute(
            "DELETE FROM secretary_bap WHERE source = 'observed'",
            [],
        )
        .map_err(|e| format!("Failed to reset BAP learning data: {}", e))?;

    Ok(BapDeleteResult { deleted: deleted as i64 })
}
