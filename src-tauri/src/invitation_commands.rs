// 外部伙伴邀请 Tauri 命令 (PRD v4.2)
// 提供邀请创建、接受、撤销、查询的 Tauri 命令接口
// 接受邀请命令无需预先认证（新用户尚无 token）
// v4.2.1: 添加 HMAC-SHA256 签名防伪 + 速率限制

use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use std::collections::HashMap;
use std::time::{Instant, Duration};
use uuid::Uuid;
use chrono::Utc;
use serde::Serialize;
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

// ============================================================
// 速率限制 (Tauri 命令层)
// ============================================================
type RateLimitMap = HashMap<String, (u32, Instant)>;

lazy_static::lazy_static! {
    /// 接受邀请速率限制: 每 IP/设备标识 每分钟最多 10 次
    static ref ACCEPT_RATE_LIMIT: Mutex<RateLimitMap> = Mutex::new(HashMap::new());
}

fn check_rate_limit(key: &str, max_req: u32) -> bool {
    let mut map = match ACCEPT_RATE_LIMIT.lock() {
        Ok(m) => m,
        Err(poisoned) => {
            eprintln!("[RateLimit] Tauri ACCEPT_RATE_LIMIT Mutex poisoned, recovering");
            ACCEPT_RATE_LIMIT.clear_poison();
            poisoned.into_inner()
        }
    };
    let now = Instant::now();
    let window = Duration::from_secs(60);

    let entry = map.entry(key.to_string()).or_insert((0, now));
    if now.duration_since(entry.1) > window {
        *entry = (1, now);
        return true;
    }
    if entry.0 >= max_req {
        false
    } else {
        entry.0 += 1;
        true
    }
}

// ============================================================
// HMAC 签名
// ============================================================

/// 获取邀请签名密钥（从环境变量或生成固定密钥）
/// 注意：此固定回退仅用于 Tauri 命令层本地开发环境
fn get_invite_secret() -> Vec<u8> {
    std::env::var("INVITE_SECRET_KEY")
        .map(|s| s.into_bytes())
        .unwrap_or_else(|_| {
            eprintln!("[Invitation] WARNING: INVITE_SECRET_KEY not set, using hardcoded fallback (insecure for production)");
            b"ProClaw-Invite-Secret-Key-2026".to_vec()
        })
}

/// 为邀请码生成 HMAC-SHA256 签名
/// 输入: code_body (uuid) + inviter_id + expires_at (秒级时间戳)
/// 返回: 16 字符的 base64url 签名
fn sign_invite_code(body: &str, inviter_id: &str, expires_at: i64) -> String {
    let secret = get_invite_secret();
    let mut mac = HmacSha256::new_from_slice(&secret)
        .expect("HMAC can take key of any size");

    let payload = format!("{}|{}|{}", body, inviter_id, expires_at);
    mac.update(payload.as_bytes());

    let result = mac.finalize();
    let code_bytes = result.into_bytes();
    // 使用 hex 编码前 8 字节 (16 个 hex 字符)
    hex::encode(&code_bytes[..8])
}

/// 验证邀请码签名
fn verify_invite_signature(invite_code: &str, inviter_id: &str, expires_at: i64) -> bool {
    // invite_code 格式: {32位hex.uuid}.{16位hex.sig}
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
/// 返回: {uuid_without_dashes}.{hmac_signature}
fn generate_signed_invite_code(inviter_id: &str, expires_at: i64) -> String {
    let body = Uuid::new_v4().to_string().replace('-', "");
    let sig = sign_invite_code(&body, inviter_id, expires_at);
    format!("{}.{}", body, sig)
}

// ============================================================
// 请求/响应结构体
// ============================================================

#[derive(Debug, serde::Deserialize)]
pub struct CreateInvitationInput {
    pub invitation_type: String,  // "order_share" | "price_update"
    pub business_ref_id: String,  // 订单号或商品ID列表(JSON)
    pub target_phone: Option<String>,
    pub inviter_id: String,  // 当前用户 ID（由前端从登录态获取）
}

#[derive(Debug, serde::Deserialize)]
pub struct AcceptInvitationInput {
    pub invite_code: String,
    pub new_user_name: String,
    pub new_user_phone: Option<String>,
    pub new_user_password: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
pub struct RevokeInvitationInput {
    pub invite_code: String,
    pub inviter_id: String,
}

#[derive(Debug, serde::Deserialize)]
pub struct ListInvitationsInput {
    pub inviter_id: String,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InvitationData {
    pub id: String,
    pub invite_code: String,
    pub inviter_id: String,
    pub inviter_name: Option<String>,
    pub target_phone: Option<String>,
    pub invitation_type: String,
    pub business_ref_id: String,
    pub status: String,
    pub expires_at: i64,
    pub created_at: i64,
    pub used_at: Option<i64>,
    pub used_by: Option<String>,
}

// ============================================================
// Tauri 命令
// ============================================================

/// 创建邀请（需要前端已认证，inviter_id 由前端传入）
#[tauri::command]
pub fn create_invitation_cmd(
    db: tauri::State<Mutex<Database>>,
    input: CreateInvitationInput,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 验证邀请类型
    if input.invitation_type != "order_share" && input.invitation_type != "price_update" {
        return Err("Invalid invitation_type".to_string());
    }

    // 验证 inviter 存在且活跃
    let inviter_exists: Result<String, _> = conn.query_row(
        "SELECT id FROM users WHERE id = ?1 AND is_active = 1",
        rusqlite::params![input.inviter_id],
        |row| row.get(0),
    );
    if inviter_exists.is_err() {
        return Err("Inviter not found or inactive".to_string());
    }

    let id = Uuid::new_v4().to_string();

    // 计算过期时间（7天后）
    let now = Utc::now().timestamp_millis();
    let expires_at = now + 7 * 24 * 60 * 60 * 1000;

    // 生成带 HMAC 签名的邀请码
    let invite_code = generate_signed_invite_code(&input.inviter_id, expires_at);

    // 插入邀请记录
    conn.execute(
        "INSERT INTO invitations (id, invite_code, inviter_id, target_phone, type, business_ref_id, status, expires_at, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'active', ?7, ?8)",
        params![id, invite_code, input.inviter_id, input.target_phone, input.invitation_type, input.business_ref_id, expires_at, now],
    ).map_err(|e| e.to_string())?;

    // 获取服务器 host
    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "localhost:8888".to_string());

    // 生成二维码数据
    let qr_data = format!("proclaw://invite?code={}&host={}", invite_code, host);

    Ok(serde_json::json!({
        "invite_code": invite_code,
        "qr_data": qr_data,
        "expires_at": expires_at
    }))
}

/// 接受邀请（无需预先认证，含签名验证和速率限制）
#[tauri::command]
pub fn accept_invitation_cmd(
    db: tauri::State<Mutex<Database>>,
    input: AcceptInvitationInput,
) -> Result<serde_json::Value, String> {
    // 速率限制（用邀请码前缀作为 key）
    let rate_key = format!("accept:{}", &input.invite_code.chars().take(16).collect::<String>());
    if !check_rate_limit(&rate_key, 10) {
        return Err("Too many requests, please try again later".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 1. 查找邀请码
    let invitation = conn.query_row(
        "SELECT id, inviter_id, target_phone, type, business_ref_id, status, expires_at \
         FROM invitations WHERE invite_code = ?1",
        params![input.invite_code],
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
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => "Invitation not found".to_string(),
        _ => e.to_string(),
    })?;

    let (inv_id, inviter_id, target_phone, inv_type, _business_ref_id, status, expires_at) = invitation;

    // 2. 验证 HMAC 签名（防伪造）
    if !verify_invite_signature(&input.invite_code, &inviter_id, expires_at) {
        return Err("Invalid invitation signature".to_string());
    }

    // 3. 检查邀请状态
    if status != "active" {
        return Err(format!("Invitation is {}", status));
    }

    // 4. 检查是否过期
    let now_ms = Utc::now().timestamp_millis();
    if now_ms > expires_at {
        if let Err(e) = conn.execute("UPDATE invitations SET status = 'expired' WHERE id = ?1", params![inv_id]) {
            eprintln!("[InvitationCmd] Failed to mark invitation expired: {}", e);
        }
        return Err("Invitation has expired".to_string());
    }

    // 5. 检查手机号匹配
    if let Some(ref tp) = target_phone {
        if let Some(ref phone) = input.new_user_phone {
            if phone != tp {
                return Err("Phone number does not match".to_string());
            }
        } else {
            return Err("Phone number required for this invitation".to_string());
        }
    }

    // 6. 创建或查找用户（与原逻辑相同）
    let new_user_id = match &input.new_user_phone {
        Some(phone) => {
            let existing: Result<String, _> = conn.query_row(
                "SELECT id FROM users WHERE phone = ?1",
                params![phone],
                |row| row.get(0),
            );
            match existing {
                Ok(uid) => uid,
                Err(_) => {
                    let uid = Uuid::new_v4().to_string();
                    let user_type = "external";
                    let external_type = if inv_type == "order_share" { "supplier" } else { "customer" };
                    let password_hash = match &input.new_user_password {
                        Some(pwd) if !pwd.is_empty() => {
                            match crate::api::auth::hash_password(pwd) {
                                Ok(h) => Some(h),
                                Err(e) => return Err(e),
                            }
                        }
                        _ => None,
                    };
                    let now_sec = Utc::now().timestamp();
                    conn.execute(
                        "INSERT INTO users (id, name, phone, user_type, external_type, password_hash, is_active, created_at) \
                         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)",
                        params![uid, input.new_user_name, phone, user_type, external_type, password_hash, now_sec],
                    ).map_err(|e| e.to_string())?;
                    uid
                }
            }
        }
        None => {
            let uid = Uuid::new_v4().to_string();
            let user_type = "external";
            let external_type = if inv_type == "order_share" { "supplier" } else { "customer" };
            let now_sec = Utc::now().timestamp();
            conn.execute(
                "INSERT INTO users (id, name, user_type, external_type, is_active, created_at) \
                 VALUES (?1, ?2, ?3, ?4, 1, ?5)",
                params![uid, input.new_user_name, user_type, external_type, now_sec],
            ).map_err(|e| e.to_string())?;
            uid
        }
    };

    // 7. 建立双向联系人关系
    let contact_type = if inv_type == "order_share" { "supplier" } else { "customer" };
    if let Err(e) = conn.execute(
        "INSERT OR IGNORE INTO user_contacts (id, user_id, contact_id, contact_type, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![Uuid::new_v4().to_string(), inviter_id, new_user_id, contact_type, now_ms],
    ) {
        eprintln!("[InvitationCmd] Failed to create inviter contact: {}", e);
    }
    let inviter_contact_type = if contact_type == "supplier" { "customer" } else { "supplier" };
    if let Err(e) = conn.execute(
        "INSERT OR IGNORE INTO user_contacts (id, user_id, contact_id, contact_type, created_at) \
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![Uuid::new_v4().to_string(), new_user_id, inviter_id, inviter_contact_type, now_ms],
    ) {
        eprintln!("[InvitationCmd] Failed to create invitee contact: {}", e);
    }

    // 8. 生成系统消息
    let message_content = if inv_type == "order_share" {
        format!("{} 通过邀请加入了 ProClaw，现已关联订单", input.new_user_name)
    } else {
        format!("{} 通过邀请加入了 ProClaw，可接收价格更新", input.new_user_name)
    };
    let message_id = Uuid::new_v4().to_string();
    let now_sec = Utc::now().timestamp();
    if let Err(e) = conn.execute(
        "INSERT INTO messages (id, from_user, to_user, content, content_type, is_offline, is_read, created_at) \
         VALUES (?1, ?2, ?3, ?4, 'text', 0, 0, ?5)",
        params![message_id, new_user_id, inviter_id, message_content, now_sec],
    ) {
        eprintln!("[InvitationCmd] Failed to insert system message: {}", e);
    }

    // 9. 标记邀请码为已使用
    if let Err(e) = conn.execute(
        "UPDATE invitations SET status = 'used', used_at = ?1, used_by = ?2 WHERE id = ?3",
        params![now_sec, new_user_id, inv_id],
    ) {
        eprintln!("[InvitationCmd] Failed to mark invitation as used: {}", e);
    }

    Ok(serde_json::json!({
        "success": true,
        "message": "Invitation accepted successfully",
        "user_id": new_user_id
    }))
}

/// 撤销邀请
#[tauri::command]
pub fn revoke_invitation_cmd(
    db: tauri::State<Mutex<Database>>,
    input: RevokeInvitationInput,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let result = conn.execute(
        "UPDATE invitations SET status = 'revoked' \
         WHERE invite_code = ?1 AND inviter_id = ?2 AND status = 'active'",
        params![input.invite_code, input.inviter_id],
    ).map_err(|e| e.to_string())?;

    if result == 0 {
        Err("Invitation not found or already used".to_string())
    } else {
        Ok(serde_json::json!({"message": "Invitation revoked successfully"}))
    }
}

/// 查询邀请记录
#[tauri::command]
pub fn get_invitations_cmd(
    db: tauri::State<Mutex<Database>>,
    input: ListInvitationsInput,
) -> Result<Vec<InvitationData>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT i.id, i.invite_code, i.inviter_id, u.name, i.target_phone, i.type, \
         i.business_ref_id, i.status, i.expires_at, i.created_at, i.used_at, i.used_by \
         FROM invitations i \
         LEFT JOIN users u ON i.inviter_id = u.id \
         WHERE i.inviter_id = ?1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    params_vec.push(Box::new(input.inviter_id.clone()));

    if let Some(ref status) = input.status {
        sql.push_str(" AND i.status = ?");
        sql.push_str(&(params_vec.len() + 1).to_string());
        params_vec.push(Box::new(status.clone()));
    }

    sql.push_str(" ORDER BY i.created_at DESC LIMIT 100");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(InvitationData {
            id: row.get(0)?,
            invite_code: row.get(1)?,
            inviter_id: row.get(2)?,
            inviter_name: row.get(3)?,
            target_phone: row.get(4)?,
            invitation_type: row.get(5)?,
            business_ref_id: row.get(6)?,
            status: row.get(7)?,
            expires_at: row.get(8)?,
            created_at: row.get(9)?,
            used_at: row.get(10)?,
            used_by: row.get(11)?,
        })
    }).map_err(|e| e.to_string())?;

    let invitations: Vec<InvitationData> = rows.filter_map(|r| r.ok()).collect();
    Ok(invitations)
}

// ============================================================
// 员工邀请请求/响应结构体 (PRD v4.3)
// ============================================================

#[derive(Debug, serde::Deserialize)]
pub struct CreateEmployeeInvitationInput {
    pub role_ids: Vec<i32>,         // 如 [1, 3] 表示采购+销售
    pub target_phone: Option<String>,
    pub inviter_id: String,      // 当前用户 ID
}

#[derive(Debug, serde::Deserialize)]
pub struct AcceptEmployeeInvitationInput {
    pub invite_code: String,
    pub phone: String,
    pub name: String,
    pub password: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct InvitationDataEx {
    pub id: String,
    pub invite_code: String,
    pub inviter_id: String,
    pub inviter_name: Option<String>,
    pub target_phone: Option<String>,
    pub invitation_type: String,
    pub business_ref_id: String,
    pub status: String,
    pub expires_at: i64,
    pub created_at: i64,
    pub used_at: Option<i64>,
    pub used_by: Option<String>,
    pub invite_type: Option<String>,
    pub role_ids: Option<String>,
}

// ============================================================
// 员工邀请 Tauri 命令 (PRD v4.3)
// ============================================================

/// 创建员工邀请（需要前端已认证，inviter_id 由前端传入）
#[tauri::command]
pub fn create_employee_invitation_cmd(
    db: tauri::State<Mutex<Database>>,
    input: CreateEmployeeInvitationInput,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 验证 inviter 存在且活跃
    let inviter_exists: Result<String, _> = conn.query_row(
        "SELECT id FROM users WHERE id = ?1 AND is_active = 1",
        rusqlite::params![input.inviter_id],
        |row| row.get(0),
    );
    if inviter_exists.is_err() {
        return Err("Inviter not found or inactive".to_string());
    }

    // 验证 role_ids 非空
    if input.role_ids.is_empty() {
        return Err("role_ids cannot be empty".to_string());
    }

    // 验证 role_ids 是否都存在于 roles 表
    for &role_id in &input.role_ids {
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM roles WHERE id = ?1",
            rusqlite::params![role_id],
            |row| row.get(0),
        ).unwrap_or(0);
        if count == 0 {
            return Err(format!("Invalid role_id: {}", role_id));
        }
    }

    let id = Uuid::new_v4().to_string();

    // 计算过期时间（7天后）
    let now = Utc::now().timestamp_millis();
    let expires_at = now + 7 * 24 * 60 * 60 * 1000;

    // 生成带 HMAC 签名的邀请码
    let invite_code = generate_signed_invite_code(&input.inviter_id, expires_at);

    // role_ids 存储为 JSON 数组字符串
    let role_ids_json = serde_json::to_string(&input.role_ids).map_err(|e| e.to_string())?;

    // 插入邀请记录
    conn.execute(
        "INSERT INTO invitations (id, invite_code, inviter_id, target_phone, type, business_ref_id, status, expires_at, created_at, invite_type, role_ids) \
         VALUES (?1, ?2, ?3, ?4, 'order_share', '', 'active', ?5, ?6, 'employee', ?7)",
        rusqlite::params![id, invite_code, input.inviter_id, input.target_phone, expires_at, now, role_ids_json],
    ).map_err(|e| e.to_string())?;

    // 获取服务器 host
    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "localhost:8888".to_string());

    // 生成二维码数据（包含 type=employee 参数）
    let qr_data = format!("proclaw://invite?code={}&host={}&type=employee", invite_code, host);

    Ok(serde_json::json!({
        "invite_code": invite_code,
        "qr_data": qr_data,
        "expires_at": expires_at,
        "role_ids": input.role_ids,
    }))
}

/// 接受员工邀请（无需预先认证，含签名验证和速率限制）
#[tauri::command]
pub fn accept_employee_invitation_cmd(
    db: tauri::State<Mutex<Database>>,
    input: AcceptEmployeeInvitationInput,
) -> Result<serde_json::Value, String> {
    // 速率限制（用邀请码前缀作为 key）
    let rate_key = format!("accept_emp:{}", &input.invite_code.chars().take(16).collect::<String>());
    if !check_rate_limit(&rate_key, 10) {
        return Err("Too many requests, please try again later".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 1. 查找邀请码
    let invitation = conn.query_row(
        "SELECT id, inviter_id, target_phone, status, expires_at, role_ids \
         FROM invitations WHERE invite_code = ?1",
        rusqlite::params![input.invite_code],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
                row.get::<_, Option<String>>(5)?,
            ))
        },
    ).map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => "Invitation not found".to_string(),
        _ => e.to_string(),
    })?;

    let (inv_id, inviter_id, target_phone, status, expires_at, role_ids_json) = invitation;

    // 2. 验证 HMAC 签名（防伪造）
    if !verify_invite_signature(&input.invite_code, &inviter_id, expires_at) {
        return Err("Invalid invitation signature".to_string());
    }

    // 3. 检查邀请状态
    if status != "active" {
        return Err(format!("Invitation is {}", status));
    }

    // 4. 检查是否过期
    let now_ms = Utc::now().timestamp_millis();
    if now_ms > expires_at {
        if let Err(e) = conn.execute("UPDATE invitations SET status = 'expired' WHERE id = ?1", rusqlite::params![inv_id]) {
            eprintln!("[InvitationCmd] Failed to mark invite expired (internal): {}", e);
        }
        return Err("Invitation has expired".to_string());
    }

    // 5. 检查手机号匹配（如果指定了 target_phone）
    if let Some(ref tp) = target_phone {
        if &input.phone != tp {
            return Err("Phone number does not match".to_string());
        }
    }

    // 6. 解析 role_ids
    let role_ids: Vec<i32> = match role_ids_json {
        Some(ref json_str) => serde_json::from_str(json_str).unwrap_or_default(),
        None => vec![],
    };

    if role_ids.is_empty() {
        return Err("No roles assigned to this invitation".to_string());
    }

    // 7. 创建或查找用户（类型为 internal）
    let new_user_id = {
        // 检查是否已存在（按手机号查找）
        let existing: Result<String, _> = conn.query_row(
            "SELECT id FROM users WHERE phone = ?1",
            rusqlite::params![input.phone],
            |row| row.get(0),
        );

        match existing {
            Ok(found_uid) => {
                // 用户已存在，更新为 internal 类型
                if let Err(e) = conn.execute(
                    "UPDATE users SET user_type = 'internal', name = ?1, last_login_at = ?2 WHERE id = ?3",
                    rusqlite::params![input.name, now_ms, found_uid],
                ) {
                    eprintln!("[InvitationCmd] Failed to update user to internal: {}", e);
                }
                found_uid
            }
            Err(_) => {
                // 创建新用户
                let uid = Uuid::new_v4().to_string();
                let user_type = "internal";
                let now_sec = Utc::now().timestamp();

                let password_hash = match &input.password {
                    Some(pwd) if !pwd.is_empty() => {
                        match crate::api::auth::hash_password(pwd) {
                            Ok(h) => Some(h),
                            Err(e) => return Err(e),
                        }
                    }
                    _ => None,
                };

                conn.execute(
                    "INSERT INTO users (id, name, phone, user_type, is_active, password_hash, created_at) \
                     VALUES (?1, ?2, ?3, ?4, 1, ?5, ?6)",
                    rusqlite::params![uid, input.name, input.phone, user_type, password_hash, now_sec],
                ).map_err(|e| e.to_string())?;

                uid
            }
        }
    };

    // 8. 分配角色（写入 user_roles 表）
    for &role_id in &role_ids {
        if let Err(e) = conn.execute(
            "INSERT OR IGNORE INTO user_roles (user_id, role_id, assigned_at) \
             VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            rusqlite::params![new_user_id, role_id],
        ) {
            eprintln!("[InvitationCmd] Failed to assign role {} to {}: {}", role_id, new_user_id, e);
        }
    }

    // 9. 建立双向联系人关系（colleague 类型）
    let now_ms_ts = Utc::now().timestamp_millis();

    // 邀请方 -> 新员工
    if let Err(e) = conn.execute(
        "INSERT OR IGNORE INTO user_contacts (id, user_id, contact_id, contact_type, created_at) \
         VALUES (?1, ?2, ?3, 'colleague', ?4)",
        rusqlite::params![Uuid::new_v4().to_string(), inviter_id, new_user_id, now_ms_ts],
    ) {
        eprintln!("[InvitationCmd] Failed to create inviter colleague contact: {}", e);
    }

    // 新员工 -> 邀请方
    if let Err(e) = conn.execute(
        "INSERT OR IGNORE INTO user_contacts (id, user_id, contact_id, contact_type, created_at) \
         VALUES (?1, ?2, ?3, 'colleague', ?4)",
        rusqlite::params![Uuid::new_v4().to_string(), new_user_id, inviter_id, now_ms_ts],
    ) {
        eprintln!("[InvitationCmd] Failed to create employee colleague contact: {}", e);
    }

    // 10. 生成系统消息（欢迎消息）
    let role_names: Vec<String> = role_ids.iter().filter_map(|&rid| {
        conn.query_row("SELECT name FROM roles WHERE id = ?1", rusqlite::params![rid], |row| row.get(0)).ok()
    }).collect();

    let role_names_str = role_names.join("、");
    let message_content = format!("欢迎加入团队！你已被授予 {} 角色。", role_names_str);

    let message_id = Uuid::new_v4().to_string();
    let now_sec = Utc::now().timestamp();

    if let Err(e) = conn.execute(
        "INSERT INTO messages (id, from_user, to_user, content, content_type, is_offline, is_read, created_at) \
         VALUES (?1, ?2, ?3, ?4, 'text', 0, 0, ?5)",
        rusqlite::params![message_id, inviter_id, new_user_id, message_content, now_sec],
    ) {
        eprintln!("[InvitationCmd] Failed to insert welcome message: {}", e);
    }

    // 11. 标记邀请码为已使用
    if let Err(e) = conn.execute(
        "UPDATE invitations SET status = 'used', used_at = ?1, used_by = ?2 WHERE id = ?3",
        rusqlite::params![now_sec, new_user_id, inv_id],
    ) {
        eprintln!("[InvitationCmd] Failed to mark invite as used: {}", e);
    }

    Ok(serde_json::json!({
        "success": true,
        "user_id": new_user_id,
        "message": format!("您已成功加入团队，角色：{}", role_names_str),
        "roles": role_names,
    }))
}
