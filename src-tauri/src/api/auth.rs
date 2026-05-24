// 认证和授权模块
// Phase 6 增强: argon2 密码哈希, JWT 密钥管理, 设备配对, 用户登录

use axum::{
    extract::{State, Json, ConnectInfo},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use super::AppState;
use jsonwebtoken::{encode, decode, Header, Validation};
use chrono::{Utc, Duration};
use rusqlite::params;
use rand::Rng;
use std::net::SocketAddr;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};

/// JWT Claims
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,  // 用户ID
    pub exp: usize,   // 过期时间
    pub iat: usize,   // 签发时间
    pub device_id: String,
    pub role: String,
    pub permissions: Vec<String>, // Phase 6: 嵌入权限列表
}

/// 配对请求
#[derive(Debug, Deserialize)]
pub struct PairRequest {
    pub code: String,
}

/// 配对响应
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct PairResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
}

/// Token刷新请求
#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

/// 登录请求（内部用户）
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

/// 登录响应
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserResponse,
}

/// 用户响应
#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct UserResponse {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub role: String,
    pub permissions: Vec<String>,
}

/// 设备配对端点
pub async fn pair_device(
    State(state): State<AppState>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    Json(payload): Json<PairRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Database lock error"}))),
    };

    let conn = db.connection();

    // 1. 验证配对码
    let now = chrono::Utc::now().timestamp();
    let result = conn.query_row(
        "SELECT id, created_by FROM pairing_codes WHERE code = ?1 AND expires_at > ?2 AND is_used = 0",
        params![payload.code, now],
        |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        },
    );

    let (pairing_id, user_id) = match result {
        Ok(data) => data,
        Err(_) => return (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Invalid or expired pairing code"}))),
    };

    // 2. 标记配对码为已使用
    let _ = conn.execute(
        "UPDATE pairing_codes SET is_used = 1, used_by_device_id = ?1 WHERE id = ?2",
        params!["temp_device".to_string(), pairing_id.clone()],
    );

    // 3. 获取用户角色和权限
    let (role, permissions) = get_user_role_and_permissions(&conn, &user_id);

    // 4. 生成设备ID和token
    let device_id = uuid::Uuid::new_v4().to_string();
    let access_token = match generate_token(&user_id, &device_id, &role, &permissions, &state.jwt_secret, 3600) {
        Ok(token) => token,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    };

    let refresh_token = match generate_token(&user_id, &device_id, &role, &permissions, &state.jwt_secret, 86400 * 30) {
        Ok(token) => token,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    };

    // 5. 存储设备信息
    let _ = conn.execute(
        "INSERT OR REPLACE INTO devices (id, user_id, device_name, device_type, access_token, refresh_token, token_expires_at, is_revoked)
         VALUES (?1, ?2, ?3, 'mobile', ?4, ?5, ?6, 0)",
        params![device_id, user_id, format!("Device from {}", addr.ip()), access_token, refresh_token, now + 3600],
    );

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600,
        })),
    )
}

/// 刷新Token端点
pub async fn refresh_token(
    State(state): State<AppState>,
    Json(payload): Json<RefreshTokenRequest>,
) -> impl IntoResponse {
    // 验证refresh token
    let claims = match verify_token(&payload.refresh_token, &state.jwt_secret) {
        Ok(claims) => claims,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Invalid refresh token"}))),
    };

    // 生成新的access token
    let access_token = match generate_token(&claims.sub, &claims.device_id, &claims.role, &claims.permissions, &state.jwt_secret, 3600) {
        Ok(token) => token,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    };

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "access_token": access_token,
            "refresh_token": payload.refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600,
        })),
    )
}

/// 用户登录端点 (Phase 6: 使用 argon2 密码验证)
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Database lock error"}))),
    };

    let conn = db.connection();

    // 1. 查询用户
    let result = conn.query_row(
        "SELECT id, name, email, password_hash FROM users WHERE (name = ?1 OR email = ?1) AND is_active = 1 AND deleted_at IS NULL",
        params![payload.username],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, Option<String>>(3)?,
            ))
        },
    );

    let (user_id, name, email, password_hash) = match result {
        Ok(data) => data,
        Err(_) => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Invalid username or password"}))),
    };

    // 2. 使用 argon2 验证密码
    if !verify_password(&payload.password, password_hash.as_deref()) {
        return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Invalid username or password"})));
    }

    // 3. 获取用户角色和权限
    let (role, permissions) = get_user_role_and_permissions(&conn, &user_id);

    // 4. 更新最后登录时间
    let _ = conn.execute(
        "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![user_id],
    );

    // 5. 生成JWT token
    let device_id = "web".to_string();
    let access_token = match generate_token(&user_id, &device_id, &role, &permissions, &state.jwt_secret, 3600) {
        Ok(token) => token,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    };

    let refresh_token = match generate_token(&user_id, &device_id, &role, &permissions, &state.jwt_secret, 86400 * 30) {
        Ok(token) => token,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": e}))),
    };

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 3600,
            "user": {
                "id": user_id,
                "name": name,
                "email": email,
                "role": role,
                "permissions": permissions,
            },
        })),
    )
}

/// 生成JWT token (Phase 6: 使用实际 JWT 密钥，内嵌权限)
pub fn generate_token(
    user_id: &str,
    device_id: &str,
    role: &str,
    permissions: &[String],
    jwt_secret: &[u8],
    expires_in: i64,
) -> Result<String, String> {
    let now = Utc::now();
    let expires_at = now + Duration::seconds(expires_in);

    let claims = Claims {
        sub: user_id.to_string(),
        exp: expires_at.timestamp() as usize,
        iat: now.timestamp() as usize,
        device_id: device_id.to_string(),
        role: role.to_string(),
        permissions: permissions.to_vec(),
    };

    let key = jsonwebtoken::EncodingKey::from_secret(jwt_secret);
    encode(&Header::default(), &claims, &key)
        .map_err(|e| format!("Failed to generate token: {}", e))
}

/// 验证JWT token (Phase 6: 使用实际 JWT 密钥)
pub fn verify_token(token: &str, jwt_secret: &[u8]) -> Result<Claims, String> {
    let key = jsonwebtoken::DecodingKey::from_secret(jwt_secret);
    let validation = Validation::default();

    decode::<Claims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|e| format!("Failed to verify token: {}", e))
}

/// 生成配对码
#[allow(dead_code)]
pub fn generate_pairing_code() -> String {
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..1000000))
}

/// 获取本机IP地址
#[allow(dead_code)]
pub fn get_local_ip() -> Vec<String> {
    vec!["127.0.0.1".to_string()]
}

/// 生成配对二维码内容
#[allow(dead_code)]
pub fn generate_qr_content(ip: &str, port: u16, code: &str) -> String {
    format!("proclaw://pair?host={}&port={}&code={}", ip, port, code)
}

// ========== 密码哈希 (argon2) ==========

/// 使用 argon2 哈希密码
pub fn hash_password(password: &str) -> Result<String, String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| format!("Password hashing failed: {}", e))?;
    Ok(hash.to_string())
}

/// 验证密码与 argon2 哈希
pub fn verify_password(password: &str, hash: Option<&str>) -> bool {
    let Some(hash_str) = hash else {
        return false;
    };
    if hash_str.is_empty() {
        return false;
    }

    let parsed_hash = match PasswordHash::new(hash_str) {
        Ok(h) => h,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}

/// 获取当前登录用户信息 (GET /api/auth/me)
pub async fn get_current_user(
    State(state): State<AppState>,
    request: axum::extract::Request,
) -> impl IntoResponse {
    let claims = match super::extract_claims(&request) {
        Some(c) => c,
        None => return (StatusCode::UNAUTHORIZED, Json(serde_json::json!({"error": "Not authenticated"}))),
    };

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "DB lock"}))),
    };
    let conn = db.connection();

    let user_info = conn.query_row(
        "SELECT id, name, email, phone FROM users WHERE id = ?1",
        params![claims.sub],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "email": row.get::<_, Option<String>>(2)?,
                "phone": row.get::<_, Option<String>>(3)?,
                "role": claims.role,
                "permissions": claims.permissions,
            }))
        },
    ).unwrap_or(serde_json::json!({
        "id": claims.sub,
        "role": claims.role,
        "permissions": claims.permissions,
    }));

    (StatusCode::OK, Json(serde_json::json!({ "data": user_info })))
}

// ========== 角色/权限查询 ==========

/// 获取用户的角色名和权限列表
fn get_user_role_and_permissions(conn: &rusqlite::Connection, user_id: &str) -> (String, Vec<String>) {
    // 查询用户角色
    let role = conn.query_row(
        "SELECT r.name, r.permissions FROM user_roles ur \
         JOIN roles r ON ur.role_id = r.id \
         WHERE ur.user_id = ?1 LIMIT 1",
        params![user_id],
        |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
            ))
        },
    );

    match role {
        Ok((role_name, perms_json)) => {
            let perms: Vec<String> = perms_json
                .and_then(|p| serde_json::from_str(&p).ok())
                .unwrap_or_default();
            (role_name, perms)
        }
        Err(_) => {
            // 检查是否外部用户
            let user_type: String = conn.query_row(
                "SELECT user_type FROM users WHERE id = ?1",
                params![user_id],
                |row| row.get(0),
            ).unwrap_or_else(|_| "external".to_string());

            if user_type == "external" {
                ("customer".to_string(), vec!["view_own_orders".to_string(), "view_own_products".to_string()])
            } else {
                ("customer".to_string(), vec![])
            }
        }
    }
}
