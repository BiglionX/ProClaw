// Tauri 通话记录命令
// v4.1: 音视频通话 - 桌面端桥接命令

use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

/// 获取通话记录列表
#[tauri::command]
pub fn get_call_records_cmd(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let user_id = params.get("user_id").and_then(|v| v.as_str()).unwrap_or("");
    let contact_id = params.get("contact_id").and_then(|v| v.as_str());
    let call_type = params.get("call_type").and_then(|v| v.as_str());
    let status = params.get("status").and_then(|v| v.as_str());
    let limit = params.get("limit").and_then(|v| v.as_i64()).unwrap_or(50);

    let mut sql = String::from(
        "SELECT cr.id, cr.session_id, cr.caller_id, cr.callee_id, cr.call_type, cr.direction,
                cr.status, cr.duration_seconds, cr.started_at, cr.ended_at, cr.created_at,
                u1.name AS caller_name, u2.name AS callee_name
         FROM call_records cr
         LEFT JOIN users u1 ON cr.caller_id = u1.id
         LEFT JOIN users u2 ON cr.callee_id = u2.id
         WHERE 1=1",
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut param_idx = 1;

    if let Some(ct) = contact_id {
        if !user_id.is_empty() {
            sql.push_str(&format!(
                " AND ((cr.caller_id = ?{} AND cr.callee_id = ?{0}) OR (cr.caller_id = ?{1} AND cr.callee_id = ?{0}))",
                param_idx, param_idx + 1
            ));
            param_values.push(Box::new(user_id.to_string()));
            param_values.push(Box::new(ct.to_string()));
            param_idx += 2;
        }
    } else if !user_id.is_empty() {
        sql.push_str(&format!(
            " AND (cr.caller_id = ?{} OR cr.callee_id = ?{})",
            param_idx, param_idx + 1
        ));
        param_values.push(Box::new(user_id.to_string()));
        param_values.push(Box::new(user_id.to_string()));
        param_idx += 2;
    }

    if let Some(ct) = call_type {
        sql.push_str(&format!(" AND cr.call_type = ?{}", param_idx));
        param_values.push(Box::new(ct.to_string()));
        param_idx += 1;
    }

    if let Some(st) = status {
        sql.push_str(&format!(" AND cr.status = ?{}", param_idx));
        param_values.push(Box::new(st.to_string()));
        // Last param, no further use
    }

    sql.push_str(" ORDER BY cr.created_at DESC");
    param_values.push(Box::new(limit));
    sql.push_str(&format!(" LIMIT ?{}", param_values.len()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let records: Vec<serde_json::Value> = stmt
        .query_map(rusqlite::params_from_iter(param_refs), |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "session_id": row.get::<_, String>(1)?,
                "caller_id": row.get::<_, String>(2)?,
                "callee_id": row.get::<_, String>(3)?,
                "call_type": row.get::<_, String>(4)?,
                "direction": row.get::<_, String>(5)?,
                "status": row.get::<_, String>(6)?,
                "duration_seconds": row.get::<_, i64>(7)?,
                "started_at": row.get::<_, Option<i64>>(8)?,
                "ended_at": row.get::<_, Option<i64>>(9)?,
                "created_at": row.get::<_, String>(10)?,
                "caller_name": row.get::<_, Option<String>>(11)?,
                "callee_name": row.get::<_, Option<String>>(12)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({ "data": records }))
}

/// 创建通话记录
#[tauri::command]
pub fn create_call_record_cmd(
    db: tauri::State<Mutex<Database>>,
    record: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let session_id = record.get("session_id").and_then(|v| v.as_str()).ok_or("缺少 session_id")?;
    let caller_id = record.get("caller_id").and_then(|v| v.as_str()).ok_or("缺少 caller_id")?;
    let callee_id = record.get("callee_id").and_then(|v| v.as_str()).ok_or("缺少 callee_id")?;
    let call_type = record.get("call_type").and_then(|v| v.as_str()).unwrap_or("audio");
    let direction = record.get("direction").and_then(|v| v.as_str()).unwrap_or("outgoing");
    let status = record.get("status").and_then(|v| v.as_str()).unwrap_or("ringing");
    let started_at = record.get("started_at").and_then(|v| v.as_i64());

    conn.execute(
        "INSERT INTO call_records (id, session_id, caller_id, callee_id, call_type, direction, status, started_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))",
        params![id, session_id, caller_id, callee_id, call_type, direction, status, started_at],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "session_id": session_id,
        "status": status,
    }))
}

/// 更新通话记录（通过 session_id）
#[tauri::command]
pub fn update_call_record_cmd(
    db: tauri::State<Mutex<Database>>,
    params: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let session_id = params.get("session_id").and_then(|v| v.as_str()).ok_or("缺少 session_id")?;

    let mut sets = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(s) = params.get("status").and_then(|v| v.as_str()) {
        sets.push(format!("status = ?{}", idx));
        param_values.push(Box::new(s.to_string()));
        idx += 1;
    }
    if let Some(d) = params.get("duration_seconds").and_then(|v| v.as_i64()) {
        sets.push(format!("duration_seconds = ?{}", idx));
        param_values.push(Box::new(d));
        idx += 1;
    }
    if let Some(sa) = params.get("started_at").and_then(|v| v.as_i64()) {
        sets.push(format!("started_at = ?{}", idx));
        param_values.push(Box::new(sa));
        idx += 1;
    }
    if let Some(ea) = params.get("ended_at").and_then(|v| v.as_i64()) {
        sets.push(format!("ended_at = ?{}", idx));
        param_values.push(Box::new(ea));
        idx += 1;
    }

    if sets.is_empty() {
        return Ok(serde_json::json!({ "message": "Nothing to update" }));
    }

    param_values.push(Box::new(session_id.to_string()));
    let sql = format!(
        "UPDATE call_records SET {} WHERE session_id = ?{}",
        sets.join(", "),
        idx
    );

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, rusqlite::params_from_iter(param_refs)).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({ "success": true }))
}

/// 检查用户是否在线
#[tauri::command]
pub fn check_user_online_cmd(
    ws_manager: tauri::State<'_, crate::api::websocket::WebSocketManager>,
    user_id: String,
) -> Result<serde_json::Value, String> {
    let online = ws_manager.is_online(&user_id);
    Ok(serde_json::json!({
        "user_id": user_id,
        "online": online,
    }))
}
