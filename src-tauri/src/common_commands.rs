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

/// 重置命令统计
#[tauri::command]
pub fn reset_command_stats() -> Result<serde_json::Value, String> {
    COMMAND_STATS.reset();
    Ok(serde_json::json!({"message": "Command stats reset successfully"}))
}
