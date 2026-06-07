// 消息管理 HTTP API
// Phase 3: 提供离线消息拉取、已读确认、历史查询等 REST 端点

use axum::{
    extract::{State, Json, Path, Query},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use super::AppState;
use serde_json::json;
use uuid::Uuid;
use chrono::Utc;

/// 消息查询参数
#[derive(Debug, Deserialize)]
pub struct MessageQueryParams {
    pub user_id: String,
    /// 与哪个用户的对话
    pub with: Option<String>,
    /// 分页: 此时间戳之前的消息
    pub before: Option<i64>,
    /// 每页数量
    pub limit: Option<i64>,
}

/// 离线消息查询参数
#[derive(Debug, Deserialize)]
pub struct OfflineMessageParams {
    pub user_id: String,
}

/// 发送消息请求
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub from: String,
    pub to: String,
    pub content: String,
    #[serde(default = "default_content_type")]
    pub content_type: String,
}

fn default_content_type() -> String { "text".to_string() }

/// 标记已读请求
#[derive(Debug, Deserialize)]
pub struct MarkReadParams {
    pub user_id: String,
}

/// 消息响应结构
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub id: String,
    pub from_user: String,
    pub to_user: String,
    pub content: String,
    pub content_type: String,
    pub is_offline: bool,
    pub is_read: bool,
    pub created_at: i64,
}

// ============================================================
// 端点实现
// ============================================================

/// GET /api/messages?user_id=xxx&with=yyy&before=timestamp&limit=n
/// 获取两个用户之间的聊天历史
pub async fn get_messages(
    State(state): State<AppState>,
    Query(params): Query<MessageQueryParams>,
) -> impl IntoResponse {
    let limit = params.limit.unwrap_or(50).min(200);
    let before = params.before.unwrap_or(i64::MAX);

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    let messages: Vec<MessageResponse> = if let Some(ref with_user) = params.with {
        // 两个用户之间的对话（双向）
        let mut stmt = match conn.prepare(
            "SELECT id, from_user, to_user, content, content_type, is_offline, is_read, created_at
             FROM messages
             WHERE ((from_user = ?1 AND to_user = ?2) OR (from_user = ?2 AND to_user = ?1))
               AND created_at < ?3
             ORDER BY created_at DESC
             LIMIT ?4"
        ) {
            Ok(stmt) => stmt,
            Err(e) => return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Query prepare error: {}", e)})),
            ),
        };

        let rows = match stmt.query_map(
            rusqlite::params![params.user_id, with_user, before, limit],
            |row| {
                Ok(MessageResponse {
                    id: row.get(0)?,
                    from_user: row.get(1)?,
                    to_user: row.get(2)?,
                    content: row.get(3)?,
                    content_type: row.get(4)?,
                    is_offline: row.get(5)?,
                    is_read: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        ) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(e) => return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Query error: {}", e)})),
            ),
        };
        rows
    } else {
        // 该用户的所有消息（收发双向）
        let mut stmt = match conn.prepare(
            "SELECT id, from_user, to_user, content, content_type, is_offline, is_read, created_at
             FROM messages
             WHERE (from_user = ?1 OR to_user = ?1)
               AND created_at < ?2
             ORDER BY created_at DESC
             LIMIT ?3"
        ) {
            Ok(stmt) => stmt,
            Err(e) => return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Query prepare error: {}", e)})),
            ),
        };

        let rows = match stmt.query_map(
            rusqlite::params![params.user_id, before, limit],
            |row| {
                Ok(MessageResponse {
                    id: row.get(0)?,
                    from_user: row.get(1)?,
                    to_user: row.get(2)?,
                    content: row.get(3)?,
                    content_type: row.get(4)?,
                    is_offline: row.get(5)?,
                    is_read: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        ) {
            Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
            Err(e) => return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": format!("Query error: {}", e)})),
            ),
        };
        rows
    };

    (StatusCode::OK, Json(json!({ "messages": messages })))
}

/// GET /api/messages/offline?user_id=xxx
/// 获取指定用户的离线消息
pub async fn get_offline_messages(
    State(state): State<AppState>,
    Query(params): Query<OfflineMessageParams>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    let mut stmt = match conn.prepare(
        "SELECT m.id, m.from_user, m.to_user, m.content, m.content_type, m.is_offline, m.is_read, m.created_at
         FROM messages m
         INNER JOIN offline_messages om ON om.message_id = m.id
         WHERE om.target_user = ?1 AND om.is_sent = 0
         ORDER BY m.created_at ASC
         LIMIT 100"
    ) {
        Ok(stmt) => stmt,
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Query prepare error: {}", e)})),
        ),
    };

    let messages: Vec<MessageResponse> = match stmt.query_map(
        rusqlite::params![params.user_id],
        |row| {
            Ok(MessageResponse {
                id: row.get(0)?,
                from_user: row.get(1)?,
                to_user: row.get(2)?,
                content: row.get(3)?,
                content_type: row.get(4)?,
                is_offline: row.get(5)?,
                is_read: row.get(6)?,
                created_at: row.get(7)?,
            })
        },
    ) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Query error: {}", e)})),
        ),
    };

    (
        StatusCode::OK,
        Json(json!({
            "messages": messages,
            "count": messages.len(),
            "user_id": params.user_id,
        }))
    )
}

/// POST /api/messages/send
/// 通过 HTTP 发送消息（非 WebSocket 回退）
pub async fn send_message(
    State(state): State<AppState>,
    Json(payload): Json<SendMessageRequest>,
) -> impl IntoResponse {
    if payload.content.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "Content cannot be empty"})),
        );
    }

    let msg_id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    let is_offline = !state.ws_manager.is_online(&payload.to);

    // 插入消息
    if let Err(e) = conn.execute(
        "INSERT INTO messages (id, from_user, to_user, content, content_type, is_offline, is_read, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        rusqlite::params![
            msg_id,
            payload.from,
            payload.to,
            payload.content,
            payload.content_type,
            is_offline,
            now,
        ],
    ) {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Insert error: {}", e)})),
        );
    }

    // 如果对方离线，写入离线消息队列
    if is_offline && !payload.to.is_empty() {
        let offline_id = Uuid::new_v4().to_string();
        if let Err(e) = conn.execute(
            "INSERT INTO offline_messages (id, target_user, message_id, is_sent, retry_count, created_at)
             VALUES (?1, ?2, ?3, 0, 0, datetime('now'))",
            rusqlite::params![offline_id, payload.to, msg_id],
        ) {
            eprintln!("[Messages] Failed to store offline message {}: {}", msg_id, e);
        }
    }

    // conn and db are dropped implicitly when they go out of scope

    // 如果对方在线，通过 WebSocket 推送
    if !is_offline {
        let ws_msg = json!({
            "type": "message",
            "id": msg_id,
            "from": payload.from,
            "to": payload.to,
            "content": payload.content,
            "contentType": payload.content_type,
            "timestamp": now,
        });
        state.ws_manager.send_to_user(&payload.to, &ws_msg.to_string());
    }

    (
        StatusCode::OK,
        Json(json!({
            "id": msg_id,
            "status": "sent",
            "timestamp": now,
        }))
    )
}

/// POST /api/messages/:id/read?user_id=xxx
/// 标记消息为已读
pub async fn mark_message_read(
    State(state): State<AppState>,
    Path(msg_id): Path<String>,
    Query(params): Query<MarkReadParams>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": "Database lock error"})),
        ),
    };
    let conn = db.connection();

    let now = Utc::now().timestamp_millis();

    let affected = match conn.execute(
        "UPDATE messages SET is_read = 1, updated_at = ?1
         WHERE id = ?2 AND to_user = ?3 AND is_read = 0",
        rusqlite::params![now, msg_id, params.user_id],
    ) {
        Ok(n) => n,
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": format!("Update error: {}", e)})),
        ),
    };

    // 也更新 offline_messages 表
    if let Err(e) = conn.execute(
        "UPDATE offline_messages SET is_sent = 1 WHERE message_id = ?1",
        rusqlite::params![msg_id],
    ) {
        eprintln!("[Messages] Failed to mark offline message as sent: {}", e);
    }

    (
        StatusCode::OK,
        Json(json!({
            "status": "ok",
            "affected": affected,
        }))
    )
}
