use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

// ==================== 品牌管理命令 ====================

/// 创建品牌
#[tauri::command]
pub fn create_brand(
    db: tauri::State<Mutex<Database>>,
    brand: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = brand["name"].as_str().ok_or("Brand name is required")?;

    // 生成 slug
    let slug = name
        .to_lowercase()
        .replace(" ", "-")
        .replace(|c: char| !c.is_alphanumeric() && c != '-', "");

    conn.execute(
        "INSERT INTO brands (id, name, slug, logo_url, website_url, description, sort_order, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')",
        params![
            id,
            name,
            slug,
            brand.get("logo_url").and_then(|v| v.as_str()),
            brand.get("website_url").and_then(|v| v.as_str()),
            brand.get("description").and_then(|v| v.as_str()),
            brand.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            brand.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
        ],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "slug": slug,
        "message": "Brand created successfully"
    }))
}

/// 获取品牌列表
#[tauri::command]
pub fn get_brands(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let search = options
        .as_ref()
        .and_then(|o| o.get("search").and_then(|v| v.as_str()))
        .unwrap_or("");

    let sql = if search.is_empty() {
        "SELECT id, name, slug, logo_url, website_url, description, sort_order, is_active,
                created_at, updated_at
         FROM brands WHERE deleted_at IS NULL ORDER BY sort_order ASC, name ASC"
    } else {
        "SELECT id, name, slug, logo_url, website_url, description, sort_order, is_active,
                created_at, updated_at
         FROM brands WHERE deleted_at IS NULL AND name LIKE ?1
         ORDER BY sort_order ASC, name ASC"
    };

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;

    let brands: Vec<serde_json::Value> = if search.is_empty() {
        stmt.query_map([], row_to_brand_json)
    } else {
        let search_pattern = format!("%{}%", search);
        stmt.query_map(params![search_pattern], row_to_brand_json)
    }
    .map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(brands)
}

// 辅助函数：将行转换为品牌 JSON
fn row_to_brand_json(row: &rusqlite::Row) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
        "id": row.get::<_, String>(0)?,
        "name": row.get::<_, String>(1)?,
        "slug": row.get::<_, String>(2)?,
        "logo_url": row.get::<_, Option<String>>(3)?,
        "website_url": row.get::<_, Option<String>>(4)?,
        "description": row.get::<_, Option<String>>(5)?,
        "sort_order": row.get::<_, i32>(6)?,
        "is_active": row.get::<_, bool>(7)?,
        "created_at": row.get::<_, String>(8)?,
        "updated_at": row.get::<_, String>(9)?,
    }))
}

// ==================== 分类管理命令 ====================

/// 创建分类
#[tauri::command]
pub fn create_category(
    db: tauri::State<Mutex<Database>>,
    category: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = category["name"]
        .as_str()
        .ok_or("Category name is required")?;

    conn.execute(
        "INSERT INTO product_categories (id, name, description, parent_id, sort_order, is_active, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
        params![
            id,
            name,
            category.get("description").and_then(|v| v.as_str()),
            category.get("parent_id").and_then(|v| v.as_str()),
            category.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            category.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
        ],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "name": name,
        "message": "Category created successfully"
    }))
}

/// 获取分类列表
#[tauri::command]
pub fn get_categories(db: tauri::State<Mutex<Database>>) -> Result<Vec<serde_json::Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, parent_id, sort_order, is_active,
                created_at, updated_at
         FROM product_categories WHERE deleted_at IS NULL ORDER BY sort_order ASC, name ASC",
        )
        .map_err(|e| e.to_string())?;

    let categories: Vec<serde_json::Value> = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "description": row.get::<_, Option<String>>(2)?,
                "parent_id": row.get::<_, Option<String>>(3)?,
                "sort_order": row.get::<_, i32>(4)?,
                "is_active": row.get::<_, bool>(5)?,
                "created_at": row.get::<_, String>(6)?,
                "updated_at": row.get::<_, String>(7)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(categories)
}

// ==================== 文件上传命令 ====================

/// 上传图片并返回 Base64 编码
/// 审计修复 R6: 限制 base64 输入最大 10MB 防止炸弹攻击
#[tauri::command]
pub fn upload_image(file_data: String) -> Result<String, String> {
    const MAX_SIZE: usize = 10 * 1024 * 1024; // 10MB
    if file_data.len() > MAX_SIZE {
        return Err(format!(
            "Image too large: {} bytes (max {} bytes / 10MB)",
            file_data.len(),
            MAX_SIZE
        ));
    }
    Ok(file_data)
}

// ==================== 命令统计命令 ====================

use crate::COMMAND_STATS;

/// 获取命令执行统计
#[tauri::command]
pub fn get_command_stats(options: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let options = options.unwrap_or(serde_json::json!({"type": "all"}));
    let stat_type = options["type"].as_str().unwrap_or("all");
    let limit = options["limit"].as_u64().unwrap_or(10) as usize;

    let stats = match stat_type {
        "slowest" => {
            let slowest = COMMAND_STATS.get_slowest_commands(limit);
            serde_json::json!({
                "type": "slowest",
                "data": slowest.into_iter().map(|(name, avg_ms)| {
                    serde_json::json!({
                        "command": name,
                        "avg_duration_ms": avg_ms
                    })
                }).collect::<Vec<_>>()
            })
        }
        "most_called" => {
            let most_called = COMMAND_STATS.get_most_called_commands(limit);
            serde_json::json!({
                "type": "most_called",
                "data": most_called.into_iter().map(|(name, calls)| {
                    serde_json::json!({
                        "command": name,
                        "total_calls": calls
                    })
                }).collect::<Vec<_>>()
            })
        }
        "errors" => {
            let error_prone = COMMAND_STATS.get_error_prone_commands(limit);
            serde_json::json!({
                "type": "errors",
                "data": error_prone.into_iter().map(|(name, rate)| {
                    serde_json::json!({
                        "command": name,
                        "error_rate_percent": rate
                    })
                }).collect::<Vec<_>>()
            })
        }
        _ => {
            let all_stats = COMMAND_STATS.get_all_stats();
            serde_json::json!({
                "type": "all",
                "total_commands": all_stats.len(),
                "total_calls": all_stats.iter().map(|s| s.total_calls).sum::<u64>(),
                "data": all_stats.into_iter().map(|s| {
                    serde_json::json!({
                        "command": s.name,
                        "total_calls": s.total_calls,
                        "avg_duration_ms": s.avg_duration_ms(),
                        "errors": s.errors
                    })
                }).collect::<Vec<_>>()
            })
        }
    };

    Ok(stats)
}

/// Reset command stats
#[tauri::command]
pub fn reset_command_stats() -> Result<serde_json::Value, String> {
    COMMAND_STATS.reset();
    Ok(serde_json::json!({"message": "Command stats reset successfully"}))
}

// ==================== Foreign counter plugin ====================

#[tauri::command]
pub fn track_foreign_logistics(
    db: tauri::State<Mutex<Database>>,
    tracking_no: String,
    carrier: String,
) -> Result<serde_json::Value, String> {
    use chrono::Utc;
    use serde_json::json;

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let no = tracking_no.trim().to_string();
    if no.is_empty() {
        return Err("tracking number required".to_string());
    }

    if let Ok(track) = conn.query_row(
        "SELECT tracking_no, carrier, status, origin, destination, estimated_delivery, events_json
         FROM foreign_logistics_tracks WHERE tracking_no = ?1",
        params![no],
        |row| {
            Ok(json!({
                "tracking_no": row.get::<_, String>(0)?,
                "carrier": row.get::<_, String>(1)?,
                "status": row.get::<_, String>(2)?,
                "origin": row.get::<_, String>(3)?,
                "destination": row.get::<_, String>(4)?,
                "estimated_delivery": row.get::<_, String>(5)?,
                "events": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(6)?).unwrap_or(json!([])),
            }))
        },
    ) {
        return Ok(track);
    }

    let carrier_label = match carrier.as_str() {
        "fedex" => "FedEx",
        "ups" => "UPS",
        "ems" => "EMS",
        "sf" => "SF International",
        _ => "DHL",
    };
    let now = Utc::now();
    Ok(json!({
        "tracking_no": no,
        "carrier": carrier_label,
        "status": "in_transit",
        "origin": "Shenzhen (SZX)",
        "destination": "Overseas",
        "estimated_delivery": (now + chrono::Duration::days(5)).format("%Y-%m-%d").to_string(),
        "events": [{
            "time": now.format("%Y-%m-%d %H:%M").to_string(),
            "location": "Shenzhen",
            "description": "Picked up",
            "status": "picked_up"
        }],
    }))
}

#[tauri::command]
pub fn list_customs_declarations(
    db: tauri::State<Mutex<Database>>,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    use serde_json::json;

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let limit = limit.unwrap_or(50);
    let mut stmt = conn
        .prepare(
            "SELECT id, order_no, hs_code, product_name, quantity, unit_price, total_value,
                origin_country, destination_country, status, declared_at
         FROM foreign_customs_declarations ORDER BY declared_at DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![limit], |row| {
            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "order_no": row.get::<_, String>(1)?,
                "hs_code": row.get::<_, String>(2)?,
                "product_name": row.get::<_, String>(3)?,
                "quantity": row.get::<_, i64>(4)?,
                "unit_price": row.get::<_, f64>(5)?,
                "total_value": row.get::<_, f64>(6)?,
                "origin_country": row.get::<_, String>(7)?,
                "destination_country": row.get::<_, String>(8)?,
                "status": row.get::<_, String>(9)?,
                "declared_at": row.get::<_, String>(10)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(
        rows.filter_map(|r| r.ok()).collect(),
    ))
}

#[tauri::command]
pub fn search_hs_code(
    db: tauri::State<Mutex<Database>>,
    keyword: String,
) -> Result<serde_json::Value, String> {
    use serde_json::json;

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let pattern = format!("%{}%", keyword.trim());
    let mut stmt = conn
        .prepare(
            "SELECT code, description, duty_rate, category FROM foreign_hs_codes
         WHERE code LIKE ?1 OR description LIKE ?1 OR category LIKE ?1 ORDER BY code LIMIT 20",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![pattern], |row| {
            Ok(json!({
                "code": row.get::<_, String>(0)?,
                "description": row.get::<_, String>(1)?,
                "duty_rate": row.get::<_, String>(2)?,
                "category": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?;
    Ok(serde_json::Value::Array(
        rows.filter_map(|r| r.ok()).collect(),
    ))
}

#[tauri::command]
pub fn list_foreign_translations(
    db: tauri::State<Mutex<Database>>,
    language: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let sql = if language.is_some() {
        "SELECT id, spu_id, spu_name, language, translated_name, translated_description, updated_at
         FROM foreign_translations WHERE language = ?1 ORDER BY updated_at DESC"
    } else {
        "SELECT id, spu_id, spu_name, language, translated_name, translated_description, updated_at
         FROM foreign_translations ORDER BY updated_at DESC LIMIT 100"
    };
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows: Vec<serde_json::Value> = if let Some(ref lang) = language {
        stmt.query_map(params![lang], map_translation_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    } else {
        stmt.query_map([], map_translation_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect()
    };
    Ok(serde_json::Value::Array(rows))
}

// ==================== Device management (User Center) ====================

#[tauri::command]
pub fn get_devices_cmd(
    db: tauri::State<Mutex<Database>>,
    user_id: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let rows: Vec<serde_json::Value> = if let Some(ref uid) = user_id {
        let mut stmt = conn
            .prepare(
                "SELECT id, device_name, device_type, last_active_at, is_revoked, created_at
             FROM devices WHERE user_id = ?1 AND is_revoked = 0 ORDER BY last_active_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![uid], map_device_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, device_name, device_type, last_active_at, is_revoked, created_at
             FROM devices WHERE is_revoked = 0 ORDER BY last_active_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_device_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    };

    Ok(serde_json::json!({ "data": rows }))
}

#[tauri::command]
pub fn revoke_device_cmd(
    db: tauri::State<Mutex<Database>>,
    device_id: String,
    #[allow(unused_variables)] user_id: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let updated = conn
        .execute(
            "UPDATE devices SET is_revoked = 1 WHERE id = ?1",
            params![device_id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Device not found".to_string());
    }
    Ok(serde_json::json!({ "message": "Device revoked successfully" }))
}

#[tauri::command]
pub fn get_pairing_code_cmd(
    db: tauri::State<Mutex<Database>>,
    user_id: String,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let code = generate_pairing_code_digits();
    let expires_at = chrono::Utc::now().timestamp() + 300;
    let pairing_id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO pairing_codes (id, code, created_by, expires_at, is_used) VALUES (?1, ?2, ?3, ?4, 0)",
        params![pairing_id, code, user_id, expires_at],
    )
    .map_err(|e| e.to_string())?;

    let local_ips = get_local_ip_addresses();
    let ip = local_ips
        .first()
        .cloned()
        .unwrap_or_else(|| "127.0.0.1".to_string());
    let port = 8888;
    let qr_content = format!("proclaw://pair?host={}&port={}&code={}", ip, port, code);

    Ok(serde_json::json!({
        "pairing_code": code,
        "expires_at": expires_at,
        "expires_in": 300,
        "qr_content": qr_content,
        "local_ips": local_ips,
        "port": port,
    }))
}

fn generate_pairing_code_digits() -> String {
    use rand::Rng;
    format!("{:06}", rand::thread_rng().gen_range(0..1_000_000))
}

fn get_local_ip_addresses() -> Vec<String> {
    use std::net::TcpStream;
    if let Ok(stream) = TcpStream::connect("8.8.8.8:80") {
        if let Ok(local_addr) = stream.local_addr() {
            return vec![local_addr.ip().to_string()];
        }
    }
    vec!["127.0.0.1".to_string()]
}

fn map_device_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
        "id": row.get::<_, String>(0)?,
        "device_name": row.get::<_, String>(1)?,
        "device_type": row.get::<_, String>(2)?,
        "last_active_at": row.get::<_, Option<i64>>(3)?,
        "is_revoked": row.get::<_, bool>(4)?,
        "created_at": row.get::<_, Option<String>>(5)?.unwrap_or_default(),
    }))
}

// ==================== Operations center (local SQLite) ====================

fn sum_local_tokens(conn: &rusqlite::Connection, since: Option<&str>) -> Result<i64, String> {
    let token_sum: i64 = if let Some(s) = since {
        conn.query_row(
            "SELECT COALESCE(SUM(tokens_consumed), 0) FROM token_usage_logs WHERE created_at >= ?1",
            params![s],
            |row| row.get(0),
        )
        .unwrap_or(0)
    } else {
        conn.query_row(
            "SELECT COALESCE(SUM(tokens_consumed), 0) FROM token_usage_logs",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
    };
    let nvwax_sum: i64 = if let Some(s) = since {
        conn.query_row(
            "SELECT COALESCE(SUM(tokens_consumed), 0) FROM nvwax_usage_logs WHERE created_at >= ?1",
            params![s],
            |row| row.get(0),
        )
        .unwrap_or(0)
    } else {
        conn.query_row(
            "SELECT COALESCE(SUM(tokens_consumed), 0) FROM nvwax_usage_logs",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
    };
    Ok(token_sum + nvwax_sum)
}

#[tauri::command]
pub fn get_operations_overview_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = chrono::Utc::now();
    let today_start = format!("{}T00:00:00", now.format("%Y-%m-%d"));
    let week_start = (now - chrono::Duration::days(7)).to_rfc3339();

    let ai_usage_total = sum_local_tokens(&conn, None)?;
    let ai_usage_today = sum_local_tokens(&conn, Some(&today_start))?;
    let user_count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .unwrap_or(0);
    let enabled_agents: i64 = conn
        .query_row("SELECT COUNT(*) FROM agents WHERE enabled = 1", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);
    let pending_content: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM operations_content_queue WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let pending_approvals: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM approvals WHERE status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let week_posts: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM operations_content_queue WHERE status = 'approved' AND created_at >= ?1",
            params![week_start],
            |row| row.get(0),
        )
        .unwrap_or(0);
    let social_accounts: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM operations_social_accounts WHERE status = 'active'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(5);

    Ok(serde_json::json!({
        "ai_usage_total": ai_usage_total,
        "ai_usage_today": ai_usage_today,
        "user_count": user_count,
        "enabled_agents": enabled_agents,
        "pending_content": pending_content,
        "pending_approvals": pending_approvals,
        "week_posts": week_posts,
        "social_accounts": social_accounts,
    }))
}

#[tauri::command]
pub fn get_operations_usage_cmd(
    db: tauri::State<Mutex<Database>>,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let limit = limit.unwrap_or(20);
    let now = chrono::Utc::now();
    let today_start = format!("{}T00:00:00", now.format("%Y-%m-%d"));
    let week_start = (now - chrono::Duration::days(7)).to_rfc3339();
    let month_start = format!("{}-01T00:00:00", now.format("%Y-%m"));

    let today = sum_local_tokens(&conn, Some(&today_start))?;
    let week = sum_local_tokens(&conn, Some(&week_start))?;
    let month = sum_local_tokens(&conn, Some(&month_start))?;
    let total = sum_local_tokens(&conn, None)?;

    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, tokens_consumed, action_type, resource_path, created_at
         FROM token_usage_logs ORDER BY created_at DESC LIMIT ?1",
        )
        .map_err(|e| e.to_string())?;
    let token_rows = stmt
        .query_map(params![limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "resource_type": row.get::<_, String>(3)?,
                "tokens_used": row.get::<_, i64>(2)?,
                "endpoint": row.get::<_, Option<String>>(4)?,
                "created_at": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    let mut user_stats_stmt = conn
        .prepare(
            "SELECT u.id, COALESCE(u.name, u.email, u.id) as label,
                COALESCE(SUM(t.tokens_consumed), 0) as total
         FROM users u
         LEFT JOIN token_usage_logs t ON t.user_id = u.id
         GROUP BY u.id ORDER BY total DESC LIMIT 10",
        )
        .map_err(|e| e.to_string())?;
    let user_stats = user_stats_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "user_id": row.get::<_, String>(0)?,
                "user_name": row.get::<_, String>(1)?,
                "total_usage": row.get::<_, i64>(2)?,
                "today_usage": 0,
                "week_usage": 0,
                "month_usage": 0,
                "user_count": 1,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    Ok(serde_json::json!({
        "totals": { "today": today, "week": week, "month": month, "total": total },
        "recent_records": token_rows,
        "user_stats": user_stats,
    }))
}

#[tauri::command]
pub fn get_operations_content_queue_cmd(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let rows: Vec<serde_json::Value> = if let Some(ref s) = status {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, source, status, created_at FROM operations_content_queue
             WHERE status = ?1 ORDER BY created_at DESC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![s], map_content_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    } else {
        let mut stmt = conn
            .prepare(
                "SELECT id, title, source, status, created_at FROM operations_content_queue
             ORDER BY created_at DESC LIMIT 50",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], map_content_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();
        rows
    };
    Ok(serde_json::json!({ "data": rows }))
}

#[tauri::command]
pub fn update_operations_content_status_cmd(
    db: tauri::State<Mutex<Database>>,
    id: String,
    status: String,
) -> Result<serde_json::Value, String> {
    if !["pending", "approved", "rejected"].contains(&status.as_str()) {
        return Err("Invalid status".to_string());
    }
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let updated = conn
        .execute(
            "UPDATE operations_content_queue SET status = ?1 WHERE id = ?2",
            params![status, id],
        )
        .map_err(|e| e.to_string())?;
    if updated == 0 {
        return Err("Content item not found".to_string());
    }
    Ok(serde_json::json!({ "id": id, "status": status }))
}

#[tauri::command]
pub fn get_operations_seo_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut metrics_stmt = conn
        .prepare(
            "SELECT label, value, detail, trend FROM operations_seo_metrics ORDER BY sort_order, id",
        )
        .map_err(|e| e.to_string())?;
    let metrics = metrics_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "label": row.get::<_, String>(0)?,
                "value": row.get::<_, String>(1)?,
                "detail": row.get::<_, String>(2)?,
                "trend": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    let mut rec_stmt = conn
        .prepare(
            "SELECT priority, title, description FROM operations_seo_recommendations ORDER BY sort_order, id",
        )
        .map_err(|e| e.to_string())?;
    let recommendations = rec_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "priority": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "desc": row.get::<_, String>(2)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();

    Ok(serde_json::json!({ "metrics": metrics, "recommendations": recommendations }))
}

#[tauri::command]
pub fn get_operations_social_accounts_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let mut stmt = conn
        .prepare(
            "SELECT platform, region, followers, engagement, status
         FROM operations_social_accounts ORDER BY sort_order, id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "platform": row.get::<_, String>(0)?,
                "region": row.get::<_, String>(1)?,
                "followers": row.get::<_, String>(2)?,
                "engagement": row.get::<_, String>(3)?,
                "status": row.get::<_, String>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(serde_json::json!({ "data": rows }))
}

#[tauri::command]
pub fn get_operations_alerts_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let mut stmt = conn
        .prepare(
            "SELECT level, title, description, created_at FROM operations_alerts
         WHERE is_dismissed = 0 ORDER BY created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "level": row.get::<_, String>(0)?,
                "title": row.get::<_, String>(1)?,
                "desc": row.get::<_, String>(2)?,
                "created_at": row.get::<_, String>(3)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(serde_json::json!({ "data": rows }))
}

#[tauri::command]
pub fn get_operations_teams_cmd(
    db: tauri::State<Mutex<Database>>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let mut stmt = conn
        .prepare(
            "SELECT name, status, agents_json FROM operations_ai_teams ORDER BY sort_order, id",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let agents_raw: String = row.get(2)?;
            let agents: Vec<String> = serde_json::from_str(&agents_raw).unwrap_or_default();
            Ok(serde_json::json!({
                "name": row.get::<_, String>(0)?,
                "status": row.get::<_, String>(1)?,
                "agents": agents,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect::<Vec<_>>();
    Ok(serde_json::json!({ "data": rows }))
}

fn map_content_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    Ok(serde_json::json!({
        "id": row.get::<_, String>(0)?,
        "title": row.get::<_, String>(1)?,
        "source": row.get::<_, String>(2)?,
        "status": row.get::<_, String>(3)?,
        "created_at": row.get::<_, String>(4)?,
    }))
}

fn map_translation_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    use serde_json::json;
    Ok(json!({
        "id": row.get::<_, String>(0)?,
        "spu_id": row.get::<_, String>(1)?,
        "spu_name": row.get::<_, String>(2)?,
        "language": row.get::<_, String>(3)?,
        "translated_name": row.get::<_, String>(4)?,
        "translated_description": row.get::<_, Option<String>>(5)?,
        "updated_at": row.get::<_, String>(6)?,
    }))
}
