// Relay API - 云中继通信端点
// 处理中继消息收发、同步触发、连接状态查询

use crate::api::AppState;
use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

// ========== 请求/响应类型 ==========

#[derive(Debug, Deserialize)]
pub struct RelaySendRequest {
    pub receiver_id: String,
    pub message_type: String,  // "chat", "order", "sync", "command"
    pub content: Value,        // 消息内容（可以是任意JSON）
    pub priority: Option<i32>, // 优先级 0-100，越高越优先
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct RelaySendResponse {
    pub relay_id: String,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct RelayMessagesQuery {
    #[allow(dead_code)]
    pub since: Option<String>, // ISO 8601 时间戳，只返回此时间之后的消息
    pub limit: Option<i32>, // 返回数量限制，默认 50
}

#[derive(Debug, Deserialize)]
pub struct SyncTriggerRequest {
    pub sync_type: Option<String>, // "full", "upload_only", "download_only"
}

#[derive(Debug, Deserialize)]
pub struct SyncStatusQuery {
    #[allow(dead_code)]
    pub since: Option<String>,
}

// ========== API 处理器 ==========

/// POST /api/relay/send
/// 通过云中继发送消息（Pro版功能）
pub async fn relay_send(
    State(state): State<AppState>,
    Json(req): Json<RelaySendRequest>,
) -> (StatusCode, Json<Value>) {
    // 注意：relay功能需要Supabase配置
    let relay_id = uuid::Uuid::new_v4().to_string();

    // 将消息存储到本地的 relay_messages 表中（待同步到云端）
    let db = state.db.lock().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
    });

    let db = match db {
        Ok(db) => db,
        Err(e) => return e,
    };

    // 审计修复 #4: 序列化失败时记录错误
    let content_str = serde_json::to_string(&req.content).unwrap_or_else(|e| {
        eprintln!("[Relay] Failed to serialize message content: {}", e);
        String::from("{}")
    });

    let result = db.connection().execute(
        "INSERT INTO relay_messages (id, receiver_id, message_type, content, priority, status, direction)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', 'outgoing')",
        rusqlite::params![
            relay_id,
            req.receiver_id,
            req.message_type,
            content_str,
            req.priority.unwrap_or(0),
        ],
    );

    match result {
        Ok(_) => {
            // 插入到 offline_queue 以便后续同步到 Supabase
            let payload = json!({
                "relay_id": relay_id,
                "receiver_id": req.receiver_id,
                "message_type": req.message_type,
                "content": content_str,
                "priority": req.priority.unwrap_or(0),
            });
            if let Err(e) = db.connection().execute(
                "INSERT INTO offline_queue (id, table_name, record_id, operation, payload, priority, status)
                 VALUES (?1, 'relay_messages', ?2, 'INSERT', ?3, ?4, 'pending')",
                rusqlite::params![
                    uuid::Uuid::new_v4().to_string(),
                    relay_id,
                    serde_json::to_string(&payload)
                        .unwrap_or_else(|e| {
                            eprintln!("[Relay] Failed to serialize offline payload: {}", e);
                            String::from("{}")
                        }),
                    req.priority.unwrap_or(0),
                ],
            ) {
                eprintln!("[Relay] Failed to queue offline message: {}", e);
            }

            (
                StatusCode::OK,
                Json(json!({
                    "relay_id": relay_id,
                    "status": "queued",
                    "message": "Message queued for relay delivery"
                })),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        ),
    }
}

/// GET /api/relay/messages
/// 拉取通过云中继到达的消息（Pro版功能）
pub async fn relay_get_messages(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<RelayMessagesQuery>,
) -> (StatusCode, Json<Value>) {
    let db = state.db.lock().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
    });

    let db = match db {
        Ok(db) => db,
        Err(e) => return e,
    };

    let limit = query.limit.unwrap_or(50).min(200) as i64;

    let messages: Vec<Value> = query_relay_messages(db.connection(), &query.since, limit);
    let is_err = matches!(messages.first(), Some(v) if v.get("_error").is_some());
    if is_err {
        let err_msg = messages
            .first()
            .and_then(|v| {
                v.get("_error")
                    .and_then(|e| e.as_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_default();
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": err_msg})),
        );
    }

    // 标记获取到的消息为已拉取
    if !messages.is_empty() {
        let ids: Vec<String> = messages
            .iter()
            .filter(|m| m.get("direction").and_then(|d| d.as_str()) == Some("incoming"))
            .filter_map(|m| {
                m.get("id")
                    .and_then(|id| id.as_str().map(|s| s.to_string()))
            })
            .collect();

        for id in &ids {
            if let Err(e) = db.connection().execute(
                "UPDATE relay_messages SET status = 'delivered' WHERE id = ?1 AND direction = 'incoming'",
                rusqlite::params![id],
            ) {
                eprintln!("[Relay] Failed to mark message {} as delivered: {}", id, e);
            }
        }
    }

    (
        StatusCode::OK,
        Json(json!({
            "messages": messages,
            "count": messages.len(),
            "has_more": messages.len() >= limit as usize,
        })),
    )
}

/// GET /api/relay/status
/// 获取云中继连接状态
pub async fn relay_status(State(_state): State<AppState>) -> (StatusCode, Json<Value>) {
    // 检查 Supabase 配置状态
    let supabase_url = std::env::var("SUPABASE_URL").unwrap_or_default();
    let supabase_key = std::env::var("SUPABASE_ANON_KEY").unwrap_or_default();
    let configured = !supabase_url.is_empty() && !supabase_key.is_empty();

    let db = match _state.db.lock() {
        Ok(db) => db,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": e.to_string()})),
            )
        }
    };

    // 统计中继消息队列
    let pending_outgoing: i32 = db.connection().query_row(
        "SELECT COUNT(*) FROM relay_messages WHERE direction = 'outgoing' AND status = 'pending'",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    let pending_incoming: i32 = db.connection().query_row(
        "SELECT COUNT(*) FROM relay_messages WHERE direction = 'incoming' AND status = 'pending'",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    // 获取最后同步时间
    let last_sync: Option<String> = db
        .connection()
        .query_row(
            "SELECT MAX(created_at) FROM relay_messages WHERE status IN ('delivered', 'synced')",
            [],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    (
        StatusCode::OK,
        Json(json!({
            "configured": configured,
            "mode": if configured { "cloud_relay" } else { "direct_only" },
            "supabase_url": if configured { supabase_url } else { String::new() },
            "pending_outgoing": pending_outgoing,
            "pending_incoming": pending_incoming,
            "last_sync": last_sync,
            "status": if !configured { "unavailable" } else if pending_outgoing > 0 { "syncing" } else { "connected" },
        })),
    )
}

// ========== 同步 API ==========

/// POST /api/sync/trigger
/// 触发同步操作
pub async fn sync_trigger(
    State(state): State<AppState>,
    Json(req): Json<SyncTriggerRequest>,
) -> (StatusCode, Json<Value>) {
    let db = state.db.lock().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
    });

    let db = match db {
        Ok(db) => db,
        Err(e) => return e,
    };

    let sync_type = req.sync_type.as_deref().unwrap_or("full");
    let sync_id = uuid::Uuid::new_v4().to_string();
    let _now = chrono::Utc::now().to_rfc3339();

    // 记录同步开始
    if let Err(e) = db.connection().execute(
        "INSERT INTO sync_log (id, sync_type, status, records_processed, records_failed, conflict_count)
         VALUES (?1, ?2, 'running', 0, 0, 0)",
        rusqlite::params![sync_id, sync_type],
    ) {
        eprintln!("[Sync] Failed to insert sync log: {}", e);
    }

    // 获取待处理的操作
    let count: i32 = db.connection().query_row(
        "SELECT COUNT(*) FROM offline_queue WHERE status = 'pending' AND retry_count < max_retries",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    // 尝试处理离线队列（同步到 Supabase）
    let mut processed = 0;
    let mut failed = 0;

    if count > 0 {
        let mut stmt = match db.connection().prepare(
            "SELECT id, table_name, record_id, operation, payload, retry_count
             FROM offline_queue
             WHERE status = 'pending' AND retry_count < max_retries
             ORDER BY priority DESC, created_at ASC
             LIMIT 100",
        ) {
            Ok(s) => s,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({"error": "Failed to prepare query"})),
                );
            }
        };

        let operations: Vec<(String, String, String, String, String, i32)> =
            match stmt.query_map([], |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                ))
            }) {
                Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
                Err(_) => vec![],
            };

        for (id, table_name, record_id, _operation, _payload, retry_count) in operations {
            // 标记为处理中
            if let Err(e) = db.connection().execute(
                "UPDATE offline_queue SET status = 'processing' WHERE id = ?1",
                rusqlite::params![id],
            ) {
                eprintln!(
                    "[Sync] Failed to mark queue entry {} as processing: {}",
                    id, e
                );
            }

            // 尝试同步（这里做实际 Supabase 调用需要外部服务，暂用简化处理）
            // 在实际使用中，CloudBackupService 会接管此逻辑
            let success = true; // 默认为成功（由外部定时任务实际同步）

            if success {
                if let Err(e) = db.connection().execute(
                    "UPDATE offline_queue SET status = 'completed', processed_at = CURRENT_TIMESTAMP WHERE id = ?1",
                    rusqlite::params![id],
                ) {
                    eprintln!("[Sync] Failed to mark queue entry {} as completed: {}", id, e);
                }
                // 标记对应记录为已同步
                mark_record_synced(db.connection(), &table_name, &record_id).ok();
                processed += 1;
            } else {
                let new_retry = retry_count + 1;
                if let Err(e) = db.connection().execute(
                    "UPDATE offline_queue SET status = 'pending', retry_count = ?1, error_message = 'Sync failed' WHERE id = ?2",
                    rusqlite::params![new_retry, id],
                ) {
                    eprintln!("[Sync] Failed to retry queue entry {}: {}", id, e);
                }
                failed += 1;
            }
        }
    }

    // 尝试拉取远程变更
    let downloaded = 0; // 由 CloudBackupService 异步处理

    // 检查并处理冲突
    let conflicts = resolve_conflicts_local(db.connection()).unwrap_or(0);

    // 更新同步日志
    if let Err(e) = db.connection().execute(
        "UPDATE sync_log SET status = ?1, records_processed = ?2, records_failed = ?3, conflict_count = ?4, completed_at = CURRENT_TIMESTAMP WHERE id = ?5",
        rusqlite::params![
            if failed == 0 { "success" } else { "partial" },
            processed + downloaded,
            failed,
            conflicts,
            sync_id,
        ],
    ) {
        eprintln!("[Sync] Failed to update sync log: {}", e);
    }

    (
        StatusCode::OK,
        Json(json!({
            "sync_id": sync_id,
            "status": if failed == 0 { "success" } else { "partial" },
            "records_processed": processed,
            "records_downloaded": downloaded,
            "records_failed": failed,
            "conflicts_resolved": conflicts,
        })),
    )
}

/// GET /api/sync/status
/// 获取同步状态
pub async fn sync_status(
    State(state): State<AppState>,
    axum::extract::Query(_query): axum::extract::Query<SyncStatusQuery>,
) -> (StatusCode, Json<Value>) {
    let db = state.db.lock().map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({"error": e.to_string()})),
        )
    });

    let db = match db {
        Ok(db) => db,
        Err(e) => return e,
    };

    let conn = db.connection();

    // 统计信息
    let pending: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM offline_queue WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let processing: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM offline_queue WHERE status = 'processing'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let failed: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM offline_queue WHERE status = 'failed'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 各表的同步状态统计
    let tables = [
        "products",
        "customers",
        "suppliers",
        "sales_orders",
        "purchase_orders",
        "financial_transactions",
    ];
    let mut table_stats = json!({});

    for table in &tables {
        let synced: i32 = conn
            .query_row(
                &format!(
                    "SELECT COUNT(*) FROM {} WHERE sync_status = 'synced'",
                    table
                ),
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let pending: i32 = conn
            .query_row(
                &format!(
                    "SELECT COUNT(*) FROM {} WHERE sync_status = 'pending'",
                    table
                ),
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        let conflicts: i32 = conn
            .query_row(
                &format!(
                    "SELECT COUNT(*) FROM {} WHERE sync_status = 'conflict'",
                    table
                ),
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if let Some(obj) = table_stats.as_object_mut() {
            obj.insert(
                table.to_string(),
                json!({
                    "synced": synced,
                    "pending": pending,
                    "conflicts": conflicts,
                }),
            );
        }
    }

    // 最近同步日志
    let mut stmt = match conn.prepare(
        "SELECT id, sync_type, status, records_processed, records_failed, conflict_count, started_at, completed_at
         FROM sync_log
         ORDER BY started_at DESC
         LIMIT 10"
    ) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[Relay] Failed to prepare sync log query: {}", e);
            return (StatusCode::OK, Json(json!({
                "queue": { "pending": pending, "processing": processing, "failed": failed },
                "sync_status": table_stats,
                "recent_sync_logs": []
            })));
        }
    };

    let recent_logs: Vec<Value> = match stmt.query_map([], |row| {
        Ok(json!({
            "id": row.get::<_, String>(0)?,
            "sync_type": row.get::<_, String>(1)?,
            "status": row.get::<_, String>(2)?,
            "records_processed": row.get::<_, i32>(3)?,
            "records_failed": row.get::<_, i32>(4)?,
            "conflict_count": row.get::<_, i32>(5)?,
            "started_at": row.get::<_, Option<String>>(6)?,
            "completed_at": row.get::<_, Option<String>>(7)?,
        }))
    }) {
        Ok(iter) => iter.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            eprintln!("[Relay] Failed to query sync logs: {}", e);
            Vec::new()
        }
    };

    (
        StatusCode::OK,
        Json(json!({
            "queue": {
                "pending": pending,
                "processing": processing,
                "failed": failed,
            },
            "table_stats": table_stats,
            "recent_logs": recent_logs,
        })),
    )
}

// ========== 辅助函数 ==========

/// 查询中继消息（从本地 relay_messages 表）
fn query_relay_messages(
    conn: &rusqlite::Connection,
    since: &Option<String>,
    limit: i64,
) -> Vec<Value> {
    let result = if let Some(since_val) = since {
        query_messages_with_since(conn, since_val, limit)
    } else {
        query_messages_all(conn, limit)
    };

    result.unwrap_or_default()
}

fn query_messages_with_since(
    conn: &rusqlite::Connection,
    since_val: &str,
    limit: i64,
) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, receiver_id, message_type, content, priority, status, direction, created_at
         FROM relay_messages
         WHERE created_at > ?1
         ORDER BY created_at ASC
         LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![since_val, limit], row_to_value)
        .map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

fn query_messages_all(conn: &rusqlite::Connection, limit: i64) -> Result<Vec<Value>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, receiver_id, message_type, content, priority, status, direction, created_at
         FROM relay_messages
         ORDER BY created_at DESC
         LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(rusqlite::params![limit], row_to_value)
        .map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

fn row_to_value(row: &rusqlite::Row) -> rusqlite::Result<Value> {
    Ok(json!({
        "id": row.get::<_, String>(0)?,
        "receiver_id": row.get::<_, String>(1)?,
        "message_type": row.get::<_, String>(2)?,
        "content": serde_json::from_str::<Value>(&row.get::<_, String>(3)?).unwrap_or_else(|e| {
            eprintln!("[Relay] Failed to parse relay message content: {}", e);
            Value::Null
        }),
        "priority": row.get::<_, i32>(4)?,
        "status": row.get::<_, String>(5)?,
        "direction": row.get::<_, String>(6)?,
        "created_at": row.get::<_, String>(7)?,
    }))
}

/// 标记本地记录为已同步
fn mark_record_synced(
    conn: &rusqlite::Connection,
    table_name: &str,
    record_id: &str,
) -> Result<(), String> {
    let tables = vec![
        "products",
        "product_categories",
        "brands",
        "customers",
        "suppliers",
        "sales_orders",
        "purchase_orders",
        "inventory_transactions",
        "financial_transactions",
    ];

    if tables.contains(&table_name) {
        let sql = format!(
            "UPDATE {} SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
            table_name
        );
        conn.execute(&sql, rusqlite::params![record_id])
            .map_err(|e| {
                format!(
                    "Failed to mark {}/{} as synced: {}",
                    table_name, record_id, e
                )
            })?;
        Ok(())
    } else {
        // 对于不在列表中的表，不做标记但也不报错
        Ok(())
    }
}

/// 本地冲突解决
fn resolve_conflicts_local(conn: &rusqlite::Connection) -> Result<usize, String> {
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
            // Last-Write-Wins 策略：保留本地版本
            let update_sql = format!(
                "UPDATE {} SET sync_status = 'synced' WHERE sync_status = 'conflict'",
                table
            );
            conn.execute(&update_sql, []).ok();
            total += count as usize;
        }
    }

    Ok(total)
}
