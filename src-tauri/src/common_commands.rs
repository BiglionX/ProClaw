use crate::database::Database;
use rusqlite::params;
use std::sync::Mutex;
use uuid::Uuid;

// ==================== 品牌管理命令 ====================

/// 创建品牌
#[tauri::command]
pub fn create_brand(db: tauri::State<Mutex<Database>>, brand: serde_json::Value) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = brand["name"].as_str().ok_or("Brand name is required")?;

    // 生成 slug
    let slug = name.to_lowercase()
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
pub fn get_brands(db: tauri::State<Mutex<Database>>, options: Option<serde_json::Value>) -> Result<Vec<serde_json::Value>, String> {
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
pub fn create_category(db: tauri::State<Mutex<Database>>, category: serde_json::Value) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let name = category["name"].as_str().ok_or("Category name is required")?;

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

    let mut stmt = conn.prepare(
        "SELECT id, name, description, parent_id, sort_order, is_active,
                created_at, updated_at
         FROM product_categories WHERE deleted_at IS NULL ORDER BY sort_order ASC, name ASC"
    ).map_err(|e| e.to_string())?;

    let categories: Vec<serde_json::Value> = stmt.query_map([], |row| {
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
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(categories)
}

// ==================== 文件上传命令 ====================

/// 上传图片并返回 Base64 编码
#[tauri::command]
pub fn upload_image(file_data: String) -> Result<String, String> {
    // file_data 已经是 base64 格式，直接返回
    // 在实际应用中，这里可以添加图片验证、压缩等逻辑
    Ok(file_data)
}
