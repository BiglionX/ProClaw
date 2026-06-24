// 局域网直连同步 WebSocket 服务端
// PRD v11.0 第4节：局域网直连同步
//
// 移动端 LanSyncProvider 连接 ws://${device.ip}:${device.port}/proclaw/sync，
// 本模块提供桌面端对应的 WebSocket 服务端，处理配对、push、pull 三种消息。

use crate::api::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        ConnectInfo, State,
    },
    response::IntoResponse,
};
use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;

// ============================================================
// 消息协议（与移动端 LanSyncProvider.ts 对齐）
// ============================================================

/// 移动端发送的配对请求
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct PairRequest {
    #[serde(rename = "type")]
    msg_type: String, // "pair"
    #[serde(default)]
    #[serde(rename = "pairingCode")]
    pairing_code: String,
    #[serde(default)]
    #[serde(rename = "deviceId")]
    device_id: String,
    #[serde(default)]
    #[serde(rename = "deviceType")]
    device_type: String,
}

/// 配对确认响应
#[derive(Debug, Serialize)]
struct PairAck {
    #[serde(rename = "type")]
    msg_type: String, // "pair_ack"
    success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

/// 移动端推送变更
#[derive(Debug, Deserialize)]
struct SyncPush {
    #[allow(dead_code)]
    #[serde(rename = "type")]
    msg_type: String, // "sync_push"
    #[serde(default)]
    seq: Option<u64>,
    #[serde(default)]
    changes: Vec<ChangeEntry>,
    #[allow(dead_code)]
    #[serde(default)]
    #[serde(rename = "deviceId")]
    device_id: String,
    #[allow(dead_code)]
    #[serde(default)]
    timestamp: i64,
}

/// 推送确认
#[derive(Debug, Serialize)]
struct SyncPushAck {
    #[serde(rename = "type")]
    msg_type: String, // "sync_push_ack"
    #[serde(skip_serializing_if = "Option::is_none")]
    seq: Option<u64>,
    success: bool,
}

/// 移动端拉取请求
#[derive(Debug, Deserialize)]
struct SyncPull {
    #[allow(dead_code)]
    #[serde(rename = "type")]
    msg_type: String, // "sync_pull"
    #[allow(dead_code)]
    #[serde(default)]
    #[serde(rename = "deviceId")]
    device_id: String,
    #[serde(default)]
    timestamp: i64,
}

/// 拉取响应
#[derive(Debug, Serialize)]
struct SyncData {
    #[serde(rename = "type")]
    msg_type: String, // "sync_data"
    #[serde(rename = "deviceId")]
    device_id: String,
    #[serde(rename = "profileId")]
    profile_id: String,
    timestamp: i64,
    changes: Vec<ChangeEntry>,
}

/// 变更条目（与移动端 ChangeLogEntry 对齐）
#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChangeEntry {
    #[serde(default)]
    id: Option<i64>,
    #[serde(default)]
    table_name: String,
    #[serde(default)]
    row_id: String,
    #[serde(default)]
    operation: String, // "insert" | "update" | "delete"
    #[serde(default)]
    old_value: Option<String>,
    #[serde(default)]
    new_value: Option<String>,
    #[serde(default)]
    timestamp: i64,
    #[serde(default)]
    sync_status: Option<String>,
}

/// 进度通知
#[derive(Debug, Serialize)]
struct SyncProgress {
    #[serde(rename = "type")]
    msg_type: String, // "sync_progress"
    current: usize,
    total: usize,
}

// ============================================================
// 允许的同步表白名单（与移动端 SyncEngine ALLOWED_TABLES 对齐）
// ============================================================

const ALLOWED_SYNC_TABLES: &[&str] = &[
    "products",
    "product_spus",
    "product_skus",
    "product_spu",
    "product_sku",
    "product_images",
    "product_categories",
    "brands",
    "customers",
    "suppliers",
    "sales_orders",
    "sales_order_items",
    "purchase_orders",
    "purchase_order_items",
    "inventory_transactions",
    "chat_sessions",
    "chat_messages",
    "product_attributes",
    "product_spu_attributes",
];

fn is_allowed_table(table_name: &str) -> bool {
    ALLOWED_SYNC_TABLES.contains(&table_name)
}

// ============================================================
// change_log 表初始化
// ============================================================

/// 确保桌面端存在 change_log 表（用于 LAN 同步数据交换）
fn ensure_change_log_table(state: &AppState) {
    let db = state.db.lock().unwrap();
    let conn = db.connection();
    let sql = "CREATE TABLE IF NOT EXISTS change_log (\
        id INTEGER PRIMARY KEY AUTOINCREMENT,\
        table_name TEXT NOT NULL,\
        row_id TEXT NOT NULL,\
        operation TEXT NOT NULL CHECK(operation IN ('insert','update','delete')),\
        old_value TEXT,\
        new_value TEXT,\
        timestamp INTEGER NOT NULL,\
        sync_status TEXT NOT NULL DEFAULT 'pending',\
        source_device_id TEXT\
    );\
    CREATE INDEX IF NOT EXISTS idx_change_log_sync ON change_log(sync_status, timestamp);";
    if let Err(e) = conn.execute_batch(sql) {
        eprintln!("[SyncWS] Failed to ensure change_log table: {}", e);
    }
}

// ============================================================
// WebSocket 升级处理器（公开路由，使用配对码鉴权）
// ============================================================

/// 局域网同步 WebSocket 端点
/// 路由: GET /proclaw/sync（无需 JWT，使用配对码鉴权）
pub async fn sync_websocket_handler(
    ws: WebSocketUpgrade,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    State(state): State<AppState>,
) -> impl IntoResponse {
    println!("[SyncWS] Connection request from: {:?}", addr);
    ws.on_upgrade(move |socket| handle_sync_connection(socket, addr, state))
}

/// 处理同步 WebSocket 连接
async fn handle_sync_connection(mut socket: WebSocket, addr: SocketAddr, state: AppState) {
    println!("[SyncWS] Connected: {:?}", addr);

    // 确保 change_log 表存在
    ensure_change_log_table(&state);

    // 获取桌面端设备标识
    let desktop_device_id = {
        let db = state.db.lock().unwrap();
        let conn = db.connection();
        conn.query_row(
            "SELECT value FROM system_config WHERE key = 'device_id'",
            [],
            |row| row.get::<_, String>(0),
        )
        .unwrap_or_else(|_| "desktop-main".to_string())
    };

    // 获取当前用户 profile_id
    let desktop_profile_id = {
        let db = state.db.lock().unwrap();
        let conn = db.connection();
        conn.query_row("SELECT id FROM users LIMIT 1", [], |row| {
            row.get::<_, String>(0)
        })
        .unwrap_or_default()
    };

    let mut paired = false;
    let mut paired_device_id = String::new();

    // 消息循环
    loop {
        let msg = match tokio::time::timeout(
            tokio::time::Duration::from_secs(300), // 5 分钟空闲超时
            socket.recv(),
        )
        .await
        {
            Ok(Some(Ok(msg))) => msg,
            Ok(Some(Err(e))) => {
                eprintln!("[SyncWS] Receive error: {}", e);
                break;
            }
            Ok(None) => {
                println!("[SyncWS] Connection closed: {:?}", addr);
                break;
            }
            Err(_) => {
                println!("[SyncWS] Idle timeout, closing: {:?}", addr);
                break;
            }
        };

        let text = match msg {
            Message::Text(t) => t.to_string(),
            Message::Binary(b) => match String::from_utf8(b) {
                Ok(s) => s,
                Err(_) => continue,
            },
            Message::Ping(_) | Message::Pong(_) => continue,
            Message::Close(_) => {
                println!("[SyncWS] Close frame received: {:?}", addr);
                break;
            }
        };

        // 解析消息类型
        let json: serde_json::Value = match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(_) => {
                eprintln!("[SyncWS] Invalid JSON from {:?}", addr);
                continue;
            }
        };

        let msg_type = json.get("type").and_then(|v| v.as_str()).unwrap_or("");

        match msg_type {
            // ========== 配对请求 ==========
            "pair" => {
                let pairing_code = json
                    .get("pairingCode")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let device_id = json
                    .get("deviceId")
                    .and_then(|v| v.as_str())
                    .unwrap_or("unknown");
                let _device_type = json
                    .get("deviceType")
                    .and_then(|v| v.as_str())
                    .unwrap_or("mobile");

                println!(
                    "[SyncWS] Pair request from device={}, code={}",
                    device_id, pairing_code
                );

                // 验证配对码
                let valid = validate_pairing_code(&state, pairing_code);

                if valid {
                    paired = true;
                    paired_device_id = device_id.to_string();

                    let ack = PairAck {
                        msg_type: "pair_ack".to_string(),
                        success: true,
                        error: None,
                    };
                    let _ = socket
                        .send(Message::Text(serde_json::to_string(&ack).unwrap().into()))
                        .await;
                    println!("[SyncWS] Device paired: {}", device_id);
                } else {
                    let ack = PairAck {
                        msg_type: "pair_ack".to_string(),
                        success: false,
                        error: Some("Invalid or expired pairing code".to_string()),
                    };
                    let _ = socket
                        .send(Message::Text(serde_json::to_string(&ack).unwrap().into()))
                        .await;
                    println!("[SyncWS] Pairing rejected for device: {}", device_id);
                    break; // 配对失败后断开
                }
            }

            // ========== 接收移动端推送变更 ==========
            "sync_push" => {
                if !paired {
                    eprintln!("[SyncWS] sync_push before pairing, ignoring");
                    continue;
                }

                let push_msg: SyncPush = match serde_json::from_value(json) {
                    Ok(m) => m,
                    Err(e) => {
                        eprintln!("[SyncWS] Failed to parse sync_push: {}", e);
                        continue;
                    }
                };

                let total = push_msg.changes.len();
                println!(
                    "[SyncWS] Receiving {} changes from device {}",
                    total, paired_device_id
                );

                // 逐条处理变更
                let mut applied = 0usize;
                for (i, change) in push_msg.changes.iter().enumerate() {
                    if !is_allowed_table(&change.table_name) {
                        eprintln!(
                            "[SyncWS] Rejected change for non-allowed table: {}",
                            change.table_name
                        );
                        continue;
                    }

                    // 写入 change_log（幂等：基于 row_id + operation + timestamp 去重）
                    match store_change(&state, change, &paired_device_id) {
                        Ok(true) => {
                            applied += 1;
                            // 发送进度
                            if total > 10 && (i + 1) % 10 == 0 {
                                let progress = SyncProgress {
                                    msg_type: "sync_progress".to_string(),
                                    current: i + 1,
                                    total,
                                };
                                let _ = socket
                                    .send(Message::Text(
                                        serde_json::to_string(&progress).unwrap().into(),
                                    ))
                                    .await;
                            }
                        }
                        Ok(false) => {
                            // 重复条目，跳过
                        }
                        Err(e) => {
                            eprintln!("[SyncWS] Failed to store change: {}", e);
                        }
                    }
                }

                println!(
                    "[SyncWS] Applied {}/{} changes from device {}",
                    applied, total, paired_device_id
                );

                // 发送 push ack
                let ack = SyncPushAck {
                    msg_type: "sync_push_ack".to_string(),
                    seq: push_msg.seq,
                    success: true,
                };
                let _ = socket
                    .send(Message::Text(serde_json::to_string(&ack).unwrap().into()))
                    .await;
            }

            // ========== 响应移动端拉取请求 ==========
            "sync_pull" => {
                if !paired {
                    eprintln!("[SyncWS] sync_pull before pairing, ignoring");
                    continue;
                }

                let pull_msg: SyncPull = match serde_json::from_value(json) {
                    Ok(m) => m,
                    Err(e) => {
                        eprintln!("[SyncWS] Failed to parse sync_pull: {}", e);
                        continue;
                    }
                };

                println!(
                    "[SyncWS] Pull request from device={}, since={}",
                    paired_device_id, pull_msg.timestamp
                );

                // 查询桌面端待同步变更
                let changes = get_pending_changes(&state, &paired_device_id);

                let response = SyncData {
                    msg_type: "sync_data".to_string(),
                    device_id: desktop_device_id.clone(),
                    profile_id: desktop_profile_id.clone(),
                    timestamp: Utc::now().timestamp_millis(),
                    changes,
                };

                let _ = socket
                    .send(Message::Text(
                        serde_json::to_string(&response).unwrap().into(),
                    ))
                    .await;

                // 标记已发送的变更为 synced
                mark_changes_synced(&state, &paired_device_id);

                println!(
                    "[SyncWS] Sent pending changes to device {}",
                    paired_device_id
                );
            }

            other => {
                eprintln!("[SyncWS] Unknown message type: {}", other);
            }
        }
    }

    println!("[SyncWS] Disconnected: {:?}", addr);
}

// ============================================================
// 数据库操作
// ============================================================

/// 验证配对码（查询 pairing_codes 表）
fn validate_pairing_code(state: &AppState, code: &str) -> bool {
    if code.is_empty() {
        return false;
    }

    let db = state.db.lock().unwrap();
    let conn = db.connection();
    let now = Utc::now().timestamp();

    // 检查 pairing_codes 表
    let result = conn.query_row(
        "SELECT id FROM pairing_codes WHERE code = ?1 AND expires_at > ?2 AND is_used = 0",
        params![code, now],
        |row| row.get::<_, String>(0),
    );

    match result {
        Ok(pairing_id) => {
            // 标记为已使用
            let _ = conn.execute(
                "UPDATE pairing_codes SET is_used = 1 WHERE id = ?1",
                params![pairing_id],
            );
            true
        }
        Err(_) => {
            // 也接受 system_config 中的快速配对码（演示/开发用）
            let quick_code = conn.query_row(
                "SELECT value FROM system_config WHERE key = 'quick_pair_code'",
                [],
                |row| row.get::<_, String>(0),
            );
            match quick_code {
                Ok(qc) if qc == code => true,
                _ => false,
            }
        }
    }
}

/// 存储来自移动端的变更记录（幂等写入 change_log）
fn store_change(
    state: &AppState,
    change: &ChangeEntry,
    source_device_id: &str,
) -> Result<bool, String> {
    let db = state.db.lock().unwrap();
    let conn = db.connection();

    // 幂等检查：同一设备、同一表、同一行、同一操作、同一时间戳不重复写入
    let exists: bool = conn
        .query_row(
            "SELECT COUNT(*) > 0 FROM change_log \
             WHERE table_name = ?1 AND row_id = ?2 AND operation = ?3 \
             AND timestamp = ?4 AND source_device_id = ?5",
            params![
                change.table_name,
                change.row_id,
                change.operation,
                change.timestamp,
                source_device_id,
            ],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if exists {
        return Ok(false); // 重复，跳过
    }

    conn.execute(
        "INSERT INTO change_log (table_name, row_id, operation, old_value, new_value, timestamp, sync_status, source_device_id) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7)",
        params![
            change.table_name,
            change.row_id,
            change.operation,
            change.old_value,
            change.new_value,
            change.timestamp,
            source_device_id,
        ],
    )
    .map_err(|e| format!("Insert change_log failed: {}", e))?;

    Ok(true)
}

/// 获取桌面端待同步变更（排除来自请求设备的变更，避免回环）
fn get_pending_changes(state: &AppState, exclude_device_id: &str) -> Vec<ChangeEntry> {
    let db = state.db.lock().unwrap();
    let conn = db.connection();

    let mut stmt = match conn.prepare(
        "SELECT id, table_name, row_id, operation, old_value, new_value, timestamp, sync_status \
         FROM change_log \
         WHERE sync_status = 'pending' \
         AND (source_device_id IS NULL OR source_device_id != ?1) \
         ORDER BY timestamp ASC \
         LIMIT 1000",
    ) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("[SyncWS] Failed to prepare pending changes query: {}", e);
            return vec![];
        }
    };

    let rows = stmt.query_map(params![exclude_device_id], |row| {
        Ok(ChangeEntry {
            id: row.get(0).ok(),
            table_name: row.get(1)?,
            row_id: row.get(2)?,
            operation: row.get(3)?,
            old_value: row.get(4)?,
            new_value: row.get(5)?,
            timestamp: row.get(6)?,
            sync_status: row.get(7).ok(),
        })
    });

    match rows {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            eprintln!("[SyncWS] Failed to query pending changes: {}", e);
            vec![]
        }
    }
}

/// 标记桌面端变更已发送给指定设备
fn mark_changes_synced(state: &AppState, _device_id: &str) {
    let db = state.db.lock().unwrap();
    let conn = db.connection();

    // 标记所有非来自该设备的 pending 变更为 synced
    if let Err(e) = conn.execute(
        "UPDATE change_log SET sync_status = 'synced' \
         WHERE sync_status = 'pending' \
         AND (source_device_id IS NULL OR source_device_id != ?1)",
        params![_device_id],
    ) {
        eprintln!("[SyncWS] Failed to mark changes synced: {}", e);
    }
}
