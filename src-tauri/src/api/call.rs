// 通话记录 API 处理器
// v4.1: 音视频通话功能 - 通话记录查询、创建、更新

use axum::{
    extract::{State, Path, Query},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::Utc;
use crate::api::AppState;

// ============================================================
// 数据结构
// ============================================================

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct CallRecord {
    pub id: String,
    pub session_id: String,
    pub caller_id: String,
    pub callee_id: String,
    pub call_type: String,
    pub direction: String,
    pub status: String,
    pub duration_seconds: i64,
    pub started_at: Option<i64>,
    pub ended_at: Option<i64>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub caller_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub callee_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CallHistoryQuery {
    pub user_id: Option<String>,
    pub contact_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub call_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCallRecordRequest {
    pub status: Option<String>,
    pub duration_seconds: Option<i64>,
    pub ended_at: Option<i64>,
    pub started_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCallRecordRequest {
    pub session_id: String,
    pub caller_id: String,
    pub callee_id: String,
    pub call_type: String,       // "audio" | "video"
    pub direction: String,       // "outgoing" | "incoming"
    pub status: Option<String>,  // default "ringing"
    pub started_at: Option<i64>,
}

// ============================================================
// 创建通话记录
// ============================================================
pub async fn create_call_record(
    State(state): State<AppState>,
    Json(req): Json<CreateCallRecordRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let db = state.db.lock().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    let status = req.status.unwrap_or_else(|| "ringing".to_string());

    conn.execute(
        "INSERT INTO call_records (id, session_id, caller_id, callee_id, call_type, direction, status, started_at, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, datetime('now'))",
        rusqlite::params![
            id,
            req.session_id,
            req.caller_id,
            req.callee_id,
            req.call_type,
            req.direction,
            status,
            req.started_at.unwrap_or(now),
        ],
    ).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;

    Ok(Json(serde_json::json!({
        "id": id,
        "session_id": req.session_id,
        "status": status,
        "created_at": now,
    })))
}

// ============================================================
// 获取通话记录列表
// ============================================================
pub async fn get_call_records(
    State(state): State<AppState>,
    Query(params): Query<CallHistoryQuery>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let db = state.db.lock().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;
    let conn = db.connection();

    let limit = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);

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

    if let Some(ref user_id) = params.user_id {
        sql.push_str(&format!(" AND (cr.caller_id = ?{} OR cr.callee_id = ?{})", param_idx, param_idx + 1));
        param_values.push(Box::new(user_id.clone()));
        param_values.push(Box::new(user_id.clone()));
        param_idx += 2;
    }

    if let Some(ref contact_id) = params.contact_id {
        sql.push_str(&format!(" AND (cr.caller_id = ?{} OR cr.callee_id = ?{})", param_idx, param_idx + 1));
        // Filter to only calls between the caller and this specific contact
        sql.push_str(&format!(" AND ((cr.caller_id = ?{0} AND cr.callee_id = ?{1}) OR (cr.caller_id = ?{1} AND cr.callee_id = ?{0}))", 
            param_idx, param_idx + 1));
        // Actually redo this more simply
        sql.pop(); // remove last char and rebuild
        // simpler approach: both caller and callee must be in {user_id, contact_id}
        if let Some(ref uid) = params.user_id {
            sql.push_str(&format!(
                " AND ((cr.caller_id = ?{0} AND cr.callee_id = ?{1}) OR (cr.caller_id = ?{1} AND cr.callee_id = ?{0}))",
                param_idx, param_idx + 1
            ));
            param_values.push(Box::new(uid.clone()));
            param_values.push(Box::new(contact_id.clone()));
            param_idx += 2;
        }
    }

    if let Some(ref ct) = params.call_type {
        sql.push_str(&format!(" AND cr.call_type = ?{}", param_idx));
        param_values.push(Box::new(ct.clone()));
        param_idx += 1;
    }

    if let Some(ref st) = params.status {
        sql.push_str(&format!(" AND cr.status = ?{}", param_idx));
        param_values.push(Box::new(st.clone()));
        // Last param, no further use for param_idx
    }

    sql.push_str(" ORDER BY cr.created_at DESC");
    param_values.push(Box::new(limit));
    param_values.push(Box::new(offset));
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", param_values.len() - 1, param_values.len()));

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let mut stmt = conn.prepare(&sql).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;

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
        .map_err(|e| {
            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
        })?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Json(serde_json::json!({ "data": records, "total": records.len() })))
}

// ============================================================
// 获取单条通话记录
// ============================================================
pub async fn get_call_record(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let db = state.db.lock().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;
    let conn = db.connection();

    let record = conn.query_row(
        "SELECT cr.id, cr.session_id, cr.caller_id, cr.callee_id, cr.call_type, cr.direction,
                cr.status, cr.duration_seconds, cr.started_at, cr.ended_at, cr.created_at,
                u1.name AS caller_name, u2.name AS callee_name
         FROM call_records cr
         LEFT JOIN users u1 ON cr.caller_id = u1.id
         LEFT JOIN users u2 ON cr.callee_id = u2.id
         WHERE cr.id = ?1",
        rusqlite::params![id],
        |row| {
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
        },
    ).map_err(|e| {
        (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": format!("Call record not found: {}", e)})))
    })?;

    Ok(Json(serde_json::json!({ "data": record })))
}

// ============================================================
// 更新通话记录（状态、时长等）
// ============================================================
pub async fn update_call_record(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
    Json(req): Json<UpdateCallRecordRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let db = state.db.lock().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;
    let conn = db.connection();

    // Build dynamic update
    let mut sets = Vec::new();
    let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    let mut idx = 1;

    if let Some(ref status) = req.status {
        sets.push(format!("status = ?{}", idx));
        params.push(Box::new(status.clone()));
        idx += 1;
    }

    if let Some(duration) = req.duration_seconds {
        sets.push(format!("duration_seconds = ?{}", idx));
        params.push(Box::new(duration));
        idx += 1;
    }

    if let Some(started_at) = req.started_at {
        sets.push(format!("started_at = ?{}", idx));
        params.push(Box::new(started_at));
        idx += 1;
    }

    if let Some(ended_at) = req.ended_at {
        sets.push(format!("ended_at = ?{}", idx));
        params.push(Box::new(ended_at));
        idx += 1;
    }

    if sets.is_empty() {
        return Ok(Json(serde_json::json!({"message": "Nothing to update"})));
    }

    params.push(Box::new(session_id.clone()));
    let sql = format!(
        "UPDATE call_records SET {} WHERE session_id = ?{}",
        sets.join(", "),
        idx
    );

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();

    let updated = conn.execute(&sql, rusqlite::params_from_iter(param_refs)).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "rows_updated": updated,
    })))
}

// ============================================================
// 通过 session_id 结束通话
// ============================================================
pub async fn end_call(
    State(state): State<AppState>,
    Path(session_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let db = state.db.lock().map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;
    let conn = db.connection();

    let now = Utc::now().timestamp_millis();

    // 计算通话时长
    let duration: i64 = conn
        .query_row(
            "SELECT COALESCE((?1 - started_at) / 1000, 0) FROM call_records WHERE session_id = ?2",
            rusqlite::params![now, session_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "UPDATE call_records SET status = 'ended', ended_at = ?1, duration_seconds = ?2 WHERE session_id = ?3",
        rusqlite::params![now, duration.max(0), session_id],
    ).map_err(|e| {
        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})))
    })?;

    Ok(Json(serde_json::json!({
        "success": true,
        "session_id": session_id,
        "duration_seconds": duration.max(0),
    })))
}

// ============================================================
// 检查用户是否在线（供移动端发起通话前检查）
// ============================================================
pub async fn check_user_online(
    State(state): State<AppState>,
    Path(user_id): Path<String>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let online = state.ws_manager.is_online(&user_id);
    Ok(Json(serde_json::json!({
        "user_id": user_id,
        "online": online,
    })))
}
