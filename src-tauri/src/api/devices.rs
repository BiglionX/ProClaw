// 设备授权管理 API 处理器

use axum::{
    extract::{State, Json, Path},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use super::AppState;
use rusqlite::params;
use chrono::Utc;

/// 生成配对码请求
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub struct GeneratePairingCodeRequest {
    pub user_id: String,
}

/// 设备信息响应
#[derive(Debug, Serialize)]
pub struct DeviceResponse {
    pub id: String,
    pub device_name: String,
    pub device_type: String,
    pub last_active_at: Option<i64>,
    pub is_revoked: bool,
}

/// 生成配对码
#[allow(dead_code)]
pub async fn generate_pairing_code(
    State(state): State<AppState>,
    Json(payload): Json<GeneratePairingCodeRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Database lock error"}))),
    };
    
    let conn = db.connection();
    
    // 生成6位数字配对码
    let code = generate_random_code();
    let now = Utc::now().timestamp();
    let expires_at = now + 300; // 5分钟有效期
    let pairing_id = uuid::Uuid::new_v4().to_string();
    
    // 保存配对码到数据库
    let result = conn.execute(
        "INSERT INTO pairing_codes (id, code, created_by, expires_at, is_used) VALUES (?1, ?2, ?3, ?4, 0)",
        params![pairing_id, code, payload.user_id, expires_at],
    );
    
    match result {
        Ok(_) => {
            // 获取本机IP
            let local_ips = get_local_ip();
            let ip = local_ips.first().unwrap_or(&"127.0.0.1".to_string()).clone();
            let port = 8888;
            
            // 生成二维码内容
            let qr_content = format!("proclaw://pair?host={}&port={}&code={}", ip, port, code);
            
            (
                StatusCode::OK,
                Json(serde_json::json!({
                    "code": code,
                    "qr_content": qr_content,
                    "expires_in": 300,
                    "local_ips": local_ips,
                    "port": port
                }))
            )
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to generate pairing code: {}", e)}))
        ),
    }
}

/// 获取已授权设备列表
pub async fn list_devices(
    State(state): State<AppState>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Database lock error"}))),
    };
    
    let conn = db.connection();
    
    let mut stmt = match conn.prepare(
        "SELECT id, device_name, device_type, last_active_at, is_revoked 
         FROM devices 
         WHERE is_revoked = 0 
         ORDER BY last_active_at DESC"
    ) {
        Ok(stmt) => stmt,
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to prepare statement: {}", e)}))
        ),
    };
    
    let devices_iter = stmt.query_map([], |row| {
        Ok(DeviceResponse {
            id: row.get(0)?,
            device_name: row.get(1)?,
            device_type: row.get(2)?,
            last_active_at: row.get(3)?,
            is_revoked: row.get(4)?,
        })
    });
    
    let devices = match devices_iter {
        Ok(iter) => {
            let mut devices = Vec::new();
            for device in iter {
                devices.push(device.unwrap());
            }
            devices
        },
        Err(e) => return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to query devices: {}", e)}))
        ),
    };
    
    (StatusCode::OK, Json(serde_json::json!({"devices": devices})))
}

/// 踢除设备
pub async fn revoke_device(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Database lock error"}))),
    };
    
    let conn = db.connection();
    
    let result = conn.execute(
        "UPDATE devices SET is_revoked = 1 WHERE id = ?1",
        params![id],
    );
    
    match result {
        Ok(count) => {
            if count > 0 {
                (StatusCode::OK, Json(serde_json::json!({"message": "Device revoked successfully"})))
            } else {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Device not found"})))
            }
        },
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": format!("Failed to revoke device: {}", e)}))
        ),
    }
}

/// 生成随机6位数字码
#[allow(dead_code)]
fn generate_random_code() -> String {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    format!("{:06}", rng.gen_range(0..1000000))
}

/// 获取本机IP地址
#[allow(dead_code)]
fn get_local_ip() -> Vec<String> {
    use std::net::TcpStream;
    
    // 尝试连接到外部地址以获取本机IP
    if let Ok(stream) = TcpStream::connect("8.8.8.8:80") {
        if let Ok(local_addr) = stream.local_addr() {
            return vec![local_addr.ip().to_string()];
        }
    }
    
    // 回退到 localhost
    vec!["127.0.0.1".to_string()]
}
