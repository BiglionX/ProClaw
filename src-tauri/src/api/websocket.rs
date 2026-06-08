// WebSocket 聊天模块处理器
// Phase 3: 实现实时消息通信、消息路由、持久化、离线消息推送

use crate::api::AppState;
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        ConnectInfo, Query, State,
    },
    response::IntoResponse,
};
use chrono::Utc;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::mpsc;
use uuid::Uuid;

// ============================================================
// WebSocket 连接管理器
// ============================================================

type ConnId = String;

/// WebSocket 连接管理器
/// 追踪每个用户的活跃连接，支持多设备同时在线
#[derive(Clone)]
pub struct WebSocketManager {
    /// user_id -> Vec<(conn_id, sender)>
    connections: Arc<DashMap<String, Vec<(ConnId, mpsc::UnboundedSender<String>)>>>,
}

#[allow(dead_code)]
impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
        }
    }

    /// 添加连接
    pub fn add_connection(&self, user_id: &str, conn_id: &str, tx: mpsc::UnboundedSender<String>) {
        self.connections
            .entry(user_id.to_string())
            .or_default()
            .push((conn_id.to_string(), tx));
    }

    /// 移除指定连接
    pub fn remove_connection(&self, user_id: &str, conn_id: &str) {
        if let Some(mut entry) = self.connections.get_mut(user_id) {
            entry.retain(|(id, _)| id != conn_id);
            if entry.is_empty() {
                drop(entry);
                self.connections.remove(user_id);
            }
        }
    }

    /// 向指定用户的所有连接发送消息
    pub fn send_to_user(&self, user_id: &str, message: &str) -> bool {
        if let Some(senders) = self.connections.get(user_id) {
            let mut sent = false;
            for (_, tx) in senders.iter() {
                if tx.send(message.to_string()).is_ok() {
                    sent = true;
                }
            }
            sent
        } else {
            false
        }
    }

    /// 检查用户是否在线
    pub fn is_online(&self, user_id: &str) -> bool {
        self.connections.contains_key(user_id)
            && !self
                .connections
                .get(user_id)
                .map(|v| v.is_empty())
                .unwrap_or(true)
    }

    /// 获取所有在线用户
    pub fn get_online_users(&self) -> Vec<String> {
        self.connections
            .iter()
            .map(|entry| entry.key().clone())
            .collect()
    }

    /// 广播消息给所有在线用户
    pub fn broadcast(&self, message: &str) {
        for entry in self.connections.iter() {
            for (_, tx) in entry.value().iter() {
                let _ = tx.send(message.to_string());
            }
        }
    }
}

// ============================================================
// 消息数据结构
// ============================================================

/// 聊天消息结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(rename = "type", default = "default_msg_type")]
    pub message_type: String,
    pub from: String,
    pub to: String,
    pub content: String,
    #[serde(rename = "contentType", default = "default_content_type")]
    pub content_type: String,
    #[serde(default)]
    pub timestamp: i64,
}

fn default_msg_type() -> String {
    "message".to_string()
}
fn default_content_type() -> String {
    "text".to_string()
}

/// 订单通知消息
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct OrderNotification {
    #[serde(rename = "type")]
    pub notification_type: String,
    pub order_id: String,
    pub order_no: String,
    pub status: String,
    pub message: String,
    pub timestamp: i64,
}

/// WebSocket 请求结构（客户端发送）
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct WsRequest {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(default)]
    id: Option<String>,
    to: Option<String>,
    content: Option<String>,
    #[serde(rename = "contentType", default)]
    content_type: Option<String>,
    // v4.1 通话信令 payload，包含额外数据
    #[serde(default)]
    payload: Option<serde_json::Value>,
}

/// WebSocket 响应结构（服务端发送）
#[derive(Debug, Serialize)]
#[allow(dead_code)]
struct WsResponse {
    #[serde(rename = "type")]
    msg_type: String,
    #[serde(default)]
    id: Option<String>,
    #[serde(default)]
    from: Option<String>,
    #[serde(default)]
    to: Option<String>,
    #[serde(default)]
    content: Option<String>,
    #[serde(rename = "contentType", default)]
    content_type: Option<String>,
    #[serde(default)]
    timestamp: Option<i64>,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    data: Option<serde_json::Value>,
}

// ============================================================
// WebSocket HTTP 升级处理器
// ============================================================

/// WebSocket 升级处理
/// 从 query 参数提取 token 和 user_id
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
) -> impl IntoResponse {
    println!("[WS] Connection request from: {:?}", addr);

    let token = params.get("token").cloned();
    let user_id = params.get("user_id").cloned();

    ws.on_upgrade(move |socket| handle_websocket(socket, state, user_id, token))
}

/// 核心 WebSocket 连接处理
async fn handle_websocket(
    socket: WebSocket,
    state: AppState,
    user_id: Option<String>,
    _token: Option<String>,
) {
    use futures_util::{SinkExt, StreamExt};

    // ---- 认证: 从 query 参数获取 user_id ----
    let user_id = match user_id {
        Some(uid) if !uid.is_empty() => uid,
        _ => {
            println!("[WS] Connection rejected: no user_id");
            return;
        }
    };

    println!("[WS] User '{}' connected", user_id);

    let (ws_sender, mut ws_receiver) = socket.split();
    let conn_id = Uuid::new_v4().to_string();

    // 创建消息通道: outgoing_tx (多生产者) -> outgoing_rx (单消费者)
    let (outgoing_tx, outgoing_rx) = mpsc::unbounded_channel::<String>();

    // 将 sender 副本存入管理器，用于外部（其他用户）向此连接推送消息
    state
        .ws_manager
        .add_connection(&user_id, &conn_id, outgoing_tx.clone());

    // 保留一个 sender 副本给主循环自己使用（pong, heartbeat, error 响应等）
    let self_tx = outgoing_tx;

    // ---- Writer Task: 从 outgoing_rx 读取并写入 WebSocket ----
    // 审计修复 R4: 收集 JoinHandle 防止任务泄漏
    let writer_handle = tokio::spawn(async move {
        let mut sender = ws_sender;
        let mut rx = outgoing_rx;
        while let Some(msg) = rx.recv().await {
            if sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // ---- 推送离线消息 ----
    push_offline_messages(&state, &user_id);

    // ---- 通知上线 ----
    if self_tx
        .send(
            serde_json::json!({
                "type": "connection_status",
                "status": "connected",
                "user_id": user_id,
                "timestamp": Utc::now().timestamp_millis()
            })
            .to_string(),
        )
        .is_err()
    {
        eprintln!("[WS] Failed to send connected notification to {}", user_id);
    }

    // ---- 主消息循环 ----
    while let Some(msg_result) = ws_receiver.next().await {
        match msg_result {
            Ok(Message::Text(text)) => {
                let text_str = text.to_string();

                // 心跳处理
                if text_str.trim() == "ping" {
                    if self_tx.send("pong".to_string()).is_err() {
                        eprintln!("[WS] Failed to send pong to {}", user_id);
                    }
                    continue;
                }

                // 解析消息
                match serde_json::from_str::<WsRequest>(&text_str) {
                    Ok(req) => {
                        match req.msg_type.as_str() {
                            "message" | "chat" => {
                                // 审计修复 #9: 验证 to 字段非空，防止幽灵消息
                                let to_user = req.to.as_deref().unwrap_or("");
                                if to_user.is_empty() {
                                    if self_tx.send(
                                        serde_json::json!({"type": "error", "error": "Missing 'to' field for chat message"}).to_string()
                                    ).is_err() {
                                        eprintln!("[WS] Failed to send 'missing to' error to {}", user_id);
                                    }
                                    continue;
                                }
                                handle_chat_message(
                                    &state,
                                    &user_id,
                                    to_user,
                                    req.content.as_deref().unwrap_or(""),
                                    req.content_type.as_deref().unwrap_or("text"),
                                ).await;
                            }
                            "heartbeat" => {
                                if self_tx.send(
                                    serde_json::json!({"type": "heartbeat", "status": "ok"}).to_string()
                                ).is_err() {
                                    eprintln!("[WS] Failed to send heartbeat response to {}", user_id);
                                }
                            }
                            "typing" => {
                                if let Some(ref to) = req.to {
                                    let typing_msg = serde_json::json!({
                                        "type": "typing",
                                        "from": user_id,
                                        "to": to,
                                        "timestamp": Utc::now().timestamp_millis()
                                    });
                                    state.ws_manager.send_to_user(to, &typing_msg.to_string());
                                }
                            }
                            // ============================================================
                            // v4.1 音视频通话信令
                            // ============================================================
                            "call_offer" | "call_answer" | "call_ice_candidate" | "call_hangup" | "call_reject" | "call_busy" => {
                                handle_call_signaling(
                                    &state,
                                    &user_id,
                                    &req.msg_type,
                                    &req,
                                ).await;
                            }
                            _ => {
                                if self_tx.send(
                                    serde_json::json!({"type": "error", "error": format!("Unknown message type: {}", req.msg_type)}).to_string()
                                ).is_err() {
                                    eprintln!("[WS] Failed to send unknown msg type error to {}", user_id);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        if self_tx.send(
                            serde_json::json!({"type": "error", "error": format!("Invalid JSON: {}", e)}).to_string()
                        ).is_err() {
                            eprintln!("[WS] Failed to send JSON parse error to {}", user_id);
                        }
                    }
                }
            }
            Ok(Message::Close(_)) => {
                println!("[WS] User '{}' connection closed", user_id);
                break;
            }
            Ok(Message::Ping(data)) => {
                // Pong 必须直接用 ws_sender 发送...但我们没有 ws_sender 了。
                // WebSocket 协议层会自动处理 ping/pong，所以这里忽略
                let _ = data; // suppress unused warning
            }
            Ok(_) => {} // 忽略 Binary/Pong 等其他类型
            Err(e) => {
                println!("[WS] Error from user '{}': {}", user_id, e);
                break;
            }
        }
    }

    // ---- 清理 ----
    state.ws_manager.remove_connection(&user_id, &conn_id);
    // 审计修复 R4: 中止 writer task，防止任务泄漏
    writer_handle.abort();
    println!("[WS] User '{}' disconnected", user_id);
}

/// 处理聊天消息: 持久化 + 路由
async fn handle_chat_message(
    state: &AppState,
    from_user: &str,
    to_user: &str,
    content: &str,
    content_type: &str,
) {
    let msg_id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();

    let message = ChatMessage {
        id: Some(msg_id.clone()),
        message_type: "message".to_string(),
        from: from_user.to_string(),
        to: to_user.to_string(),
        content: content.to_string(),
        content_type: content_type.to_string(),
        timestamp: now,
    };

    // ---- 持久化到 messages 表 ----
    let to_online = {
        let db = match state.db.lock() {
            Ok(db) => db,
            Err(_) => return,
        };
        let conn = db.connection();

        let is_offline = !state.ws_manager.is_online(to_user);

        // 审计修复 #12: 消息持久化失败至少记录错误，不再静默忽略
        if let Err(e) = conn.execute(
            "INSERT INTO messages (id, from_user, to_user, content, content_type, is_offline, is_read, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
            rusqlite::params![msg_id, from_user, to_user, content, content_type, is_offline, now],
        ) {
            eprintln!("[WebSocket] Failed to persist message {}: {}", msg_id, e);
        }

        // 如果接收方离线，记录到 offline_messages
        if is_offline && !to_user.is_empty() {
            let offline_id = Uuid::new_v4().to_string();
            if let Err(e) = conn.execute(
                "INSERT INTO offline_messages (id, target_user, message_id, is_sent, retry_count, created_at)
                 VALUES (?1, ?2, ?3, 0, 0, datetime('now'))",
                rusqlite::params![offline_id, to_user, msg_id],
            ) {
                eprintln!("[WebSocket] Failed to store offline message {}: {}", msg_id, e);
            }
        }

        !is_offline
    }; // db lock released

    // ---- 路由消息 ----
    let msg_json = serde_json::to_string(&message).unwrap_or_else(|e| {
        eprintln!("[WebSocket] Failed to serialize outgoing message: {}", e);
        String::from("{\"type\":\"error\",\"error\":\"serialization_failed\"}")
    });

    if to_online {
        state.ws_manager.send_to_user(to_user, &msg_json);
    }

    // 也发一份给发送者（确认消息）
    let ack = serde_json::json!({
        "type": "message_sent",
        "id": msg_id,
        "to": to_user,
        "timestamp": now
    });
    state.ws_manager.send_to_user(from_user, &ack.to_string());
}

/// 推送离线消息给刚刚上线的用户
fn push_offline_messages(state: &AppState, user_id: &str) {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return,
    };
    let conn = db.connection();

    // 查询未推送的离线消息
    let mut stmt = match conn.prepare(
        "SELECT m.id, m.from_user, m.to_user, m.content, m.content_type, m.created_at
         FROM messages m
         INNER JOIN offline_messages om ON om.message_id = m.id
         WHERE om.target_user = ?1 AND om.is_sent = 0
         ORDER BY m.created_at ASC
         LIMIT 50",
    ) {
        Ok(stmt) => stmt,
        Err(e) => {
            eprintln!("[WS] Failed to prepare offline query: {}", e);
            return;
        }
    };

    let messages: Vec<ChatMessage> = match stmt.query_map(rusqlite::params![user_id], |row| {
        Ok(ChatMessage {
            id: Some(row.get(0)?),
            message_type: "message".to_string(),
            from: row.get(1)?,
            to: row.get(2)?,
            content: row.get(3)?,
            content_type: row.get(4)?,
            timestamp: row.get(5)?,
        })
    }) {
        Ok(rows) => rows.filter_map(|r| r.ok()).collect(),
        Err(e) => {
            eprintln!("[WS] Failed to query offline messages: {}", e);
            return;
        }
    };

    // 推送每条离线消息并标记为已发送
    for msg in &messages {
        let msg_json = match serde_json::to_string(msg) {
            Ok(s) => s,
            Err(_) => continue,
        };

        state.ws_manager.send_to_user(user_id, &msg_json);

        // 标记已发送
        if let Some(ref msg_id) = msg.id {
            if let Err(e) = conn.execute(
                "UPDATE offline_messages SET is_sent = 1, last_retry_at = ?2 WHERE message_id = ?1",
                rusqlite::params![msg_id, Utc::now().timestamp_millis()],
            ) {
                eprintln!(
                    "[WS] Failed to mark offline message {} as sent: {}",
                    msg_id, e
                );
            }
        }
    }

    if !messages.is_empty() {
        println!(
            "[WS] Pushed {} offline messages to user '{}'",
            messages.len(),
            user_id
        );
    }
}

// ============================================================
// v4.1 通话信令处理
// ============================================================

/// 处理通话信令消息，路由到目标用户并记录通话状态
async fn handle_call_signaling(state: &AppState, from_user: &str, msg_type: &str, req: &WsRequest) {
    let now = Utc::now().timestamp_millis();

    // 提取 payload 中的 session_id
    let session_id = req
        .payload
        .as_ref()
        .and_then(|p| p.get("sessionId").or_else(|| p.get("session_id")))
        .and_then(|v| v.as_str())
        .unwrap_or("");

    // 提取接收方
    let to_user = req.to.as_deref().unwrap_or("");

    match msg_type {
        "call_offer" => {
            // 记录通话发起
            let call_type = req
                .payload
                .as_ref()
                .and_then(|p| p.get("callType").or_else(|| p.get("call_type")))
                .and_then(|v| v.as_str())
                .unwrap_or("audio");

            // 持久化通话记录
            if let Ok(db) = state.db.lock() {
                let record_id = Uuid::new_v4().to_string();
                if let Err(e) = db.connection().execute(
                    "INSERT INTO call_records (id, session_id, caller_id, callee_id, call_type, direction, status, started_at, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, 'outgoing', 'ringing', ?6, datetime('now'))",
                    rusqlite::params![record_id, session_id, from_user, to_user, call_type, now],
                ) {
                    eprintln!("[Call] Failed to insert call record: {}", e);
                }
            }

            // 检查对方是否在线
            if !state.ws_manager.is_online(to_user) {
                // 对方不在线，更新记录并通知发起方
                if let Ok(db) = state.db.lock() {
                    if let Err(e) = db.connection().execute(
                        "UPDATE call_records SET status = 'missed', ended_at = ?1 WHERE session_id = ?2",
                        rusqlite::params![now, session_id],
                    ) {
                        eprintln!("[Call] Failed to update missed call: {}", e);
                    }
                }

                let offline_msg = serde_json::json!({
                    "type": "call_offline",
                    "payload": {
                        "sessionId": session_id,
                        "calleeId": to_user,
                        "message": "对方不在线，无法接通"
                    }
                });
                state
                    .ws_manager
                    .send_to_user(from_user, &offline_msg.to_string());
                return;
            }

            // 推送 call_offer 到目标用户的所有设备
            let offer_msg = serde_json::json!({
                "type": "call_offer",
                "payload": {
                    "sessionId": session_id,
                    "callerId": from_user,
                    "calleeId": to_user,
                    "callType": call_type,
                    "offer": req.payload.as_ref().and_then(|p| p.get("offer")),
                    "timestamp": now,
                }
            });
            state
                .ws_manager
                .send_to_user(to_user, &offer_msg.to_string());

            // 确认消息给发起方
            let ack_msg = serde_json::json!({
                "type": "call_offer_sent",
                "payload": {
                    "sessionId": session_id,
                    "callerId": from_user,
                    "calleeId": to_user,
                    "status": "ringing",
                    "timestamp": now,
                }
            });
            state
                .ws_manager
                .send_to_user(from_user, &ack_msg.to_string());
        }

        "call_answer" => {
            // 转接 answer 给发起方
            let answer_msg = serde_json::json!({
                "type": "call_answer",
                "payload": {
                    "sessionId": session_id,
                    "answer": req.payload.as_ref().and_then(|p| p.get("answer")),
                    "timestamp": now,
                }
            });
            state
                .ws_manager
                .send_to_user(to_user, &answer_msg.to_string());

            // 更新通话状态为已接听
            if let Ok(db) = state.db.lock() {
                if let Err(e) = db.connection().execute(
                    "UPDATE call_records SET status = 'answered', started_at = ?1 WHERE session_id = ?2",
                    rusqlite::params![now, session_id],
                ) {
                    eprintln!("[Call] Failed to update answered call: {}", e);
                }
            }

            // 通知其他设备：该通话已在某设备接听
            let mut notified_devices = String::new();
            if let Some(conns) = state.ws_manager.connections.get(from_user) {
                for (conn_id, tx) in conns.value().iter() {
                    let cancel_msg = serde_json::json!({
                        "type": "call_hangup",
                        "payload": {
                            "sessionId": session_id,
                            "reason": "answered_elsewhere",
                            "message": "已在其他设备接听"
                        }
                    });
                    let _ = tx.send(cancel_msg.to_string());
                    notified_devices.push_str(conn_id);
                    notified_devices.push_str(", ");
                }
            }
            if !notified_devices.is_empty() {
                println!(
                    "[Call] Notified other devices of {} about answered call {}",
                    from_user, session_id
                );
            }
        }

        "call_ice_candidate" => {
            // 转发 ICE 候选
            let ice_msg = serde_json::json!({
                "type": "call_ice_candidate",
                "payload": {
                    "sessionId": session_id,
                    "candidate": req.payload.as_ref().and_then(|p| p.get("candidate")),
                    "timestamp": now,
                }
            });
            state.ws_manager.send_to_user(to_user, &ice_msg.to_string());
        }

        "call_hangup" => {
            // 通知对方挂断
            let hangup_msg = serde_json::json!({
                "type": "call_hangup",
                "payload": {
                    "sessionId": session_id,
                    "fromUserId": from_user,
                    "timestamp": now,
                }
            });
            state
                .ws_manager
                .send_to_user(to_user, &hangup_msg.to_string());

            // 更新通话记录
            if let Ok(db) = state.db.lock() {
                if let Err(e) = db.connection().execute(
                    "UPDATE call_records SET status = 'ended', ended_at = ?1 WHERE session_id = ?2",
                    rusqlite::params![now, session_id],
                ) {
                    eprintln!("[Call] Failed to update ended call (hangup): {}", e);
                }
            }
        }

        "call_reject" => {
            // 通知主叫方拒接
            let reject_msg = serde_json::json!({
                "type": "call_reject",
                "payload": {
                    "sessionId": session_id,
                    "fromUserId": from_user,
                    "timestamp": now,
                }
            });
            state
                .ws_manager
                .send_to_user(to_user, &reject_msg.to_string());

            // 更新通话记录
            if let Ok(db) = state.db.lock() {
                if let Err(e) = db.connection().execute(
                    "UPDATE call_records SET status = 'rejected', ended_at = ?1 WHERE session_id = ?2",
                    rusqlite::params![now, session_id],
                ) {
                    eprintln!("[Call] Failed to update rejected call: {}", e);
                }
            }
        }

        "call_busy" => {
            // 通知主叫方正忙
            let busy_msg = serde_json::json!({
                "type": "call_busy",
                "payload": {
                    "sessionId": session_id,
                    "fromUserId": from_user,
                    "timestamp": now,
                }
            });
            state
                .ws_manager
                .send_to_user(to_user, &busy_msg.to_string());

            // 更新通话记录
            if let Ok(db) = state.db.lock() {
                if let Err(e) = db.connection().execute(
                    "UPDATE call_records SET status = 'busy', ended_at = ?1 WHERE session_id = ?2",
                    rusqlite::params![now, session_id],
                ) {
                    eprintln!("[Call] Failed to update busy call: {}", e);
                }
            }
        }

        _ => {
            eprintln!("[Call] Unknown call signal type: {}", msg_type);
        }
    }
}

/// 从 token 中提取 user_id（用于 HTTP 端点）
/// **安全警告：调用者必须传入有效的 jwt_secret，严禁使用空/零密钥。**
#[allow(dead_code)]
pub fn extract_user_id_from_token(token: &str, jwt_secret: &[u8]) -> Option<String> {
    use crate::api::auth::Claims;
    if jwt_secret.iter().all(|&b| b == 0) {
        eprintln!("[Security] extract_user_id_from_token called with all-zero secret key - rejected for safety");
        return None;
    }
    jsonwebtoken::decode::<Claims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(jwt_secret),
        &jsonwebtoken::Validation::default(),
    )
    .ok()
    .map(|data| data.claims.sub)
}
