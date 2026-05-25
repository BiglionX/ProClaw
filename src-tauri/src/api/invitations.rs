// 外部伙伴邀请 API (PRD v4.2)
// 提供邀请创建、接受、撤销、查询功能
// 接受邀请接口无需预先认证（新用户尚无 token），使用 IP 限流防滥用
// v4.2.1: 添加 HMAC-SHA256 签名防伪

use axum::{
    extract::{State, Json, Path, ConnectInfo},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Mutex;
use rusqlite::params;
use uuid::Uuid;
use chrono::Utc;
use std::time::{Instant, Duration};
use hmac::{Hmac, Mac};
use sha2::Sha256;

use super::AppState;
use super::auth::hash_password;

type HmacSha256 = Hmac<Sha256>;

// ============================================================
// IP 限流（内存）
// Key: IP 地址, Value: (请求次数, 窗口开始时间)
// ============================================================
type RateLimitMap = HashMap<String, (u32, Instant)>;

lazy_static::lazy_static! {
    static ref IP_RATE_LIMIT: Mutex<RateLimitMap> =
        Mutex::new(HashMap::new());
}

/// 检查 IP 限流（同一 IP 每分钟最多 5 次）
/// 返回 true 表示允许请求，false 表示被限流
fn check_ip_rate_limit(ip: &str) -> bool {
    let mut map = IP_RATE_LIMIT.lock().unwrap();
    let now = Instant::now();
    let window = Duration::from_secs(60);

    let entry = map.entry(ip.to_string()).or_insert((0, now));

    // 如果窗口已过期，重置
    if now.duration_since(entry.1) > window {
        *entry = (1, now);
        return true;
    }

    // 在窗口内，检查次数
    if entry.0 >= 5 {
        false
    } else {
        entry.0 += 1;
        true
    }
}

/// 定期清理过期条目
fn cleanup_rate_limit_map() {
    let mut map = IP_RATE_LIMIT.lock().unwrap();
    let now = Instant::now();
    let window = Duration::from_secs(120); // 保留 2 分钟的窗口数据
    map.retain(|_, (_, start)| now.duration_since(*start) < window);
}

// ============================================================
// HMAC 签名
// ============================================================

/// 获取邀请签名密钥
fn get_invite_secret() -> Vec<u8> {
    std::env::var("INVITE_SECRET_KEY")
        .map(|s| s.into_bytes())
        .unwrap_or_else(|_| b"ProClaw-Invite-Secret-Key-2026".to_vec())
}

/// 为邀请码生成 HMAC-SHA256 签名
fn sign_invite_code(body: &str, inviter_id: &str, expires_at: i64) -> String {
    let secret = get_invite_secret();
    let mut mac = HmacSha256::new_from_slice(&secret)
        .expect("HMAC can take key of any size");

    let payload = format!("{}|{}|{}", body, inviter_id, expires_at);
    mac.update(payload.as_bytes());

    let result = mac.finalize();
    let code_bytes = result.into_bytes();
    hex::encode(&code_bytes[..8])
}

/// 验证邀请码签名
fn verify_invite_signature(invite_code: &str, inviter_id: &str, expires_at: i64) -> bool {
    if let Some(pos) = invite_code.rfind('.') {
        let body = &invite_code[..pos];
        let sig = &invite_code[pos+1..];
        let expected = sign_invite_code(body, inviter_id, expires_at);
        sig == expected
    } else {
        false
    }
}

/// 生成带签名的邀请码
fn generate_signed_invite_code(inviter_id: &str, expires_at: i64) -> String {
    let body = Uuid::new_v4().to_string().replace('-', "");
    let sig = sign_invite_code(&body, inviter_id, expires_at);
    format!("{}.{}", body, sig)
}

// ============================================================
// 请求/响应结构体
// ============================================================

/// 创建邀请请求
#[derive(Debug, Deserialize)]
pub struct CreateInvitationRequest {
    pub invitation_type: String,  // "order_share" | "price_update"
    pub business_ref_id: String,  // 订单号或商品ID列表(JSON)
    pub target_phone: Option<String>,
}

/// 接受邀请请求
#[derive(Debug, Deserialize)]
pub struct AcceptInvitationRequest {
    pub invite_code: String,
    pub new_user: NewUserInfo,
}

/// 新用户信息
#[derive(Debug, Deserialize)]
pub struct NewUserInfo {
    pub phone: Option<String>,
    pub name: String,
    pub password: Option<String>,
}

/// 查询邀请参数
#[derive(Debug, Deserialize)]
pub struct InvitationQuery {
    pub status: Option<String>,
    #[allow(dead_code)]
    pub page: Option<i64>,
    #[allow(dead_code)]
    pub limit: Option<i64>,
}

// ============================================================
// API 处理器
// ============================================================

/// 创建邀请（需要认证 + 权限检查）
/// 用户 ID 通过 rbac_middleware 注入到 request.extensions() 的 Claims 中获取
pub async fn create_invitation(
    State(state): State<AppState>,
    Json(payload): Json<CreateInvitationRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 验证邀请类型
    if payload.invitation_type != "order_share" && payload.invitation_type != "price_update" {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invalid invitation_type"})));
    }

    // 从数据库查询当前用户（简化实现，正式环境应从 JWT Claims 获取）
    let inviter_id = match conn.query_row(
        "SELECT id FROM users WHERE is_active = 1 LIMIT 1",
        [],
        |row| row.get::<_, String>(0),
    ) {
        Ok(uid) => uid,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))),
    };

    // 获取服务器 host 地址
    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "localhost:8888".to_string());

    let id = Uuid::new_v4().to_string();

    // 计算过期时间（7天后）
    let now = Utc::now().timestamp_millis();
    let expires_at = now + 7 * 24 * 60 * 60 * 1000;

    // 生成带 HMAC 签名的邀请码
    let invite_code = generate_signed_invite_code(&inviter_id, expires_at);

    // 插入邀请记录
    if let Err(e) = conn.execute(
        "INSERT INTO invitations (id, invite_code, inviter_id, target_phone, type, business_ref_id, status, expires_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8)",
        params![id, invite_code, inviter_id, payload.target_phone, payload.invitation_type, payload.business_ref_id, expires_at, now],
    ) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
    }

    // 生成二维码数据（签名已经在 invite_code 中）
    let qr_data = format!("proclaw://invite?code={}&host={}", invite_code, host);

    (StatusCode::OK, Json(serde_json::json!({
        "invite_code": invite_code,
        "qr_data": qr_data,
        "expires_at": expires_at
    })))
}

/// 接受邀请（无需预先认证，使用 IP 限流 + HMAC 签名验证）
pub async fn accept_invitation(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(payload): Json<AcceptInvitationRequest>,
) -> impl IntoResponse {
    // IP 限流检查
    let client_ip = addr.ip().to_string();
    if !check_ip_rate_limit(&client_ip) {
        return (StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({
            "error": "Too many requests, please try again later"
        })));
    }

    // 定期清理限流记录
    cleanup_rate_limit_map();

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 1. 查找邀请码
    let invitation = match conn.query_row(
        "SELECT id, inviter_id, target_phone, type, business_ref_id, status, expires_at \
         FROM invitations WHERE invite_code = ?1",
        params![payload.invite_code],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, String>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, i64>(6)?,
            ))
        },
    ) {
        Ok(inv) => inv,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Invitation not found"})));
        }
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let (inv_id, inviter_id, target_phone, inv_type, business_ref_id, status, expires_at) = invitation;

    // 2. 验证 HMAC 签名（防伪造）
    if !verify_invite_signature(&payload.invite_code, &inviter_id, expires_at) {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "Invalid invitation signature"
        })));
    }

    // 3. 检查邀请状态
    if status != "active" {
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": format!("Invitation is {}", status)})));
    }

    // 4. 检查是否过期
    let now_ms = Utc::now().timestamp_millis();
    if now_ms > expires_at {
        // 标记为过期
        let _ = conn.execute("UPDATE invitations SET status = 'expired' WHERE id = ?1", params![inv_id]);
        return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invitation has expired"})));
    }

    // 5. 检查手机号匹配（如果指定了 target_phone）
    if let Some(ref tp) = target_phone {
        if let Some(ref phone) = payload.new_user.phone {
            if phone != tp {
                return (StatusCode::FORBIDDEN, Json(serde_json::json!({"error": "Phone number does not match"})));
            }
        } else {
            return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Phone number required for this invitation"})));
        }
    }

    // 6. 创建或查找用户
    let new_user_id = match &payload.new_user.phone {
        Some(phone) => {
            // 检查是否已存在
            let existing: Result<String, _> = conn.query_row(
                "SELECT id FROM users WHERE phone = ?1",
                params![phone],
                |row| row.get(0),
            );

            match existing {
                Ok(uid) => {
                    // 用户已存在
                    uid
                }
                Err(_) => {
                    // 创建新用户
                    let uid = Uuid::new_v4().to_string();
                    let user_type = "external";
                    let external_type = if inv_type == "order_share" { "supplier" } else { "customer" };

                    let password_hash = match &payload.new_user.password {
                        Some(pwd) if !pwd.is_empty() => {
                            match hash_password(pwd) {
                                Ok(h) => Some(h),
                                Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
                            }
                        }
                        _ => None,
                    };

                    let now_sec = Utc::now().timestamp();
                    if let Err(e) = conn.execute(
                        "INSERT INTO users (id, name, phone, user_type, external_type, password_hash, is_active, created_at) \
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)",
                        params![uid, payload.new_user.name, phone, user_type, external_type, password_hash, now_sec],
                    ) {
                        return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
                    }

                    uid
                }
            }
        }
        None => {
            // 没有手机号，创建匿名用户
            let uid = Uuid::new_v4().to_string();
            let user_type = "external";
            let external_type = if inv_type == "order_share" { "supplier" } else { "customer" };

            let now_sec = Utc::now().timestamp();
            if let Err(e) = conn.execute(
                "INSERT INTO users (id, name, user_type, external_type, is_active, created_at) \
                 VALUES (?1, ?2, ?3, ?4, 1, ?5)",
                params![uid, payload.new_user.name, user_type, external_type, now_sec],
            ) {
                return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()})));
            }

            uid
        }
    };

    // 7. 建立双向联系人关系
    let contact_type = if inv_type == "order_share" { "supplier" } else { "customer" };

    // 邀请方 -> 被邀请方
    let _ = conn.execute(
        "INSERT OR IGNORE INTO user_contacts (id, user_id, contact_id, contact_type, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![Uuid::new_v4().to_string(), inviter_id, new_user_id, contact_type, now_ms],
    );

    // 被邀请方 -> 邀请方（反向）
    let inviter_contact_type = if contact_type == "supplier" { "customer" } else { "supplier" };
    let _ = conn.execute(
        "INSERT OR IGNORE INTO user_contacts (id, user_id, contact_id, contact_type, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![Uuid::new_v4().to_string(), new_user_id, inviter_id, inviter_contact_type, now_ms],
    );

    // 8. 生成系统消息
    let message_content = if inv_type == "order_share" {
        format!("{} 分享了订单 {}", payload.new_user.name, business_ref_id)
    } else {
        format!("{} 更新了价格信息", payload.new_user.name)
    };

    let message_id = Uuid::new_v4().to_string();
    let content_type = if inv_type == "order_share" { "order_card" } else { "text" };

    let now_sec = Utc::now().timestamp();
    let _ = conn.execute(
        "INSERT INTO messages (id, from_user, to_user, content, content_type, is_offline, is_read, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, 0, 0, ?6)",
        params![message_id, new_user_id, inviter_id, message_content, content_type, now_sec],
    );

    // 9. 标记邀请码为已使用
    let _ = conn.execute(
        "UPDATE invitations SET status = 'used', used_at = ?1, used_by = ?2 WHERE id = ?3",
        params![now_sec, new_user_id, inv_id],
    );

    // 10. 通过 WebSocket 推送通知给邀请方
    let notification = serde_json::json!({
        "type": "invitation_accepted",
        "invitation_id": inv_id,
        "user_id": new_user_id,
        "user_name": payload.new_user.name,
        "invitation_type": inv_type,
        "timestamp": now_sec
    });

    let _ = state.ws_manager.send_to_user(&inviter_id, &notification.to_string());

    (StatusCode::OK, Json(serde_json::json!({
        "success": true,
        "message": "Invitation accepted successfully",
        "user_id": new_user_id
    })))
}

/// 撤销邀请（需要认证）
pub async fn revoke_invitation(
    State(state): State<AppState>,
    Path(code): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 简化实现：从数据库查询当前用户
    let inviter_id = match conn.query_row(
        "SELECT id FROM users WHERE is_active = 1 LIMIT 1",
        [],
        |row| row.get::<_, String>(0),
    ) {
        Ok(uid) => uid,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))),
    };

    let result = conn.execute(
        "UPDATE invitations SET status = 'revoked' \
         WHERE invite_code = ?1 AND inviter_id = ?2 AND status = 'active'",
        params![code, inviter_id],
    );

    match result {
        Ok(0) => (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Invitation not found or already used"}))),
        Ok(_) => (StatusCode::OK, Json(serde_json::json!({"message": "Invitation revoked successfully"}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    }
}

/// 查询邀请记录（需要认证）
pub async fn list_invitations(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<InvitationQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    // 简化实现：从数据库查询当前用户
    let inviter_id = match conn.query_row(
        "SELECT id FROM users WHERE is_active = 1 LIMIT 1",
        [],
        |row| row.get::<_, String>(0),
    ) {
        Ok(uid) => uid,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Unauthorized"}))),
    };

    let mut sql = String::from(
        "SELECT i.id, i.invite_code, i.inviter_id, u.name, i.target_phone, i.type, \
         i.business_ref_id, i.status, i.expires_at, i.created_at, i.used_at, i.used_by \
         FROM invitations i \
         LEFT JOIN users u ON i.inviter_id = u.id \
         WHERE i.inviter_id = ?1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    params_vec.push(Box::new(inviter_id));

    if let Some(ref status) = query.status {
        sql.push_str(" AND i.status = ?");
        sql.push_str(&(params_vec.len() + 1).to_string());
        params_vec.push(Box::new(status.clone()));
    }

    sql.push_str(" ORDER BY i.created_at DESC LIMIT 100");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let rows = match stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "invite_code": row.get::<_, String>(1)?,
            "inviter_id": row.get::<_, String>(2)?,
            "inviter_name": row.get::<_, Option<String>>(3)?,
            "target_phone": row.get::<_, Option<String>>(4)?,
            "invitation_type": row.get::<_, String>(5)?,
            "business_ref_id": row.get::<_, String>(6)?,
            "status": row.get::<_, String>(7)?,
            "expires_at": row.get::<_, i64>(8)?,
            "created_at": row.get::<_, i64>(9)?,
            "used_at": row.get::<_, Option<i64>>(10)?,
            "used_by": row.get::<_, Option<String>>(11)?,
        }))
    }) {
        Ok(r) => r,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e.to_string()}))),
    };

    let invitations: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();

    (StatusCode::OK, Json(serde_json::json!({ "data": invitations })))
}
