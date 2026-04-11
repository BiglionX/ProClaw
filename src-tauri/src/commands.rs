use crate::database::{Database, DbResult};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use uuid::Uuid;

// ==================== 数据类型定义 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub unit: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub min_stock: i32,
    pub max_stock: i32,
    pub current_stock: i32,
    pub image_url: Option<String>,
    pub barcode: Option<String>,
    pub is_active: bool,
    pub metadata: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductCategory {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub sync_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryTransaction {
    pub id: String,
    pub product_id: String,
    pub transaction_type: String,
    pub quantity: i32,
    pub reference_no: Option<String>,
    pub reason: Option<String>,
    pub performed_by: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub sync_status: String,
}

#[derive(Debug, Serialize)]
pub struct DatabaseStats {
    pub products: i64,
    pub categories: i64,
    pub transactions: i64,
    pub pending_sync: i64,
}

// ==================== Tauri Commands ====================

/// 创建产品
#[tauri::command]
pub fn create_product(db: tauri::State<Mutex<Database>>, product: serde_json::Value) -> Result<Product, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let sku = product["sku"].as_str().ok_or("SKU is required")?;
    let name = product["name"].as_str().ok_or("Name is required")?;

    conn.execute(
        "INSERT INTO products (id, sku, name, description, category_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'pending')",
        params![
            id,
            sku,
            name,
            product.get("description").and_then(|v| v.as_str()),
            product.get("category_id").and_then(|v| v.as_str()),
            product.get("unit").and_then(|v| v.as_str()).unwrap_or("件"),
            product.get("cost_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            product.get("sell_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            product.get("min_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            product.get("max_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            product.get("current_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            product.get("image_url").and_then(|v| v.as_str()),
            product.get("barcode").and_then(|v| v.as_str()),
            product.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
            product.get("metadata").and_then(|v| v.as_str()),
        ],
    ).map_err(|e| e.to_string())?;

    get_product_by_id_inner(conn, &id)
}

/// 获取产品列表(支持搜索和分页)
#[tauri::command]
pub fn get_products(db: tauri::State<Mutex<Database>>, options: Option<serde_json::Value>) -> Result<Vec<Product>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 构建查询
    let mut sql = String::from(
        "SELECT id, sku, name, description, category_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, created_at, updated_at,
         sync_status, last_synced_at
         FROM products WHERE deleted_at IS NULL"
    );

    // 添加搜索条件
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(opts) = &options {
        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (sku LIKE ? OR name LIKE ?)");
            let search_pattern = format!("%{}%", search);
            params_vec.push(Box::new(search_pattern.clone()));
            params_vec.push(Box::new(search_pattern));
        }
    }

    sql.push_str(" ORDER BY created_at DESC");

    // 添加分页
    if let Some(opts) = &options {
        if let Some(limit) = opts.get("limit").and_then(|v| v.as_u64()) {
            sql.push_str(&format!(" LIMIT {}", limit));
            if let Some(offset) = opts.get("offset").and_then(|v| v.as_u64()) {
                sql.push_str(&format!(" OFFSET {}", offset));
            }
        }
    }

    // 执行查询
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let products = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(Product {
            id: row.get(0)?,
            sku: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            unit: row.get(5)?,
            cost_price: row.get(6)?,
            sell_price: row.get(7)?,
            min_stock: row.get(8)?,
            max_stock: row.get(9)?,
            current_stock: row.get(10)?,
            image_url: row.get(11)?,
            barcode: row.get(12)?,
            is_active: row.get(13)?,
            metadata: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
            sync_status: row.get(17)?,
            last_synced_at: row.get(18)?,
        })
    }).map_err(|e| e.to_string())?;

    products.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// 根据 ID 获取产品
#[tauri::command]
pub fn get_product_by_id(db: tauri::State<Mutex<Database>>, id: String) -> Result<Option<Product>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    get_product_by_id_inner(conn, &id)
}

fn get_product_by_id_inner(conn: &rusqlite::Connection, id: &str) -> Result<Product, String> {
    let mut stmt = conn.prepare(
        "SELECT id, sku, name, description, category_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, created_at, updated_at,
         sync_status, last_synced_at
         FROM products WHERE id = ?1 AND deleted_at IS NULL"
    ).map_err(|e| e.to_string())?;

    let product = stmt.query_row(params![id], |row| {
        Ok(Product {
            id: row.get(0)?,
            sku: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            unit: row.get(5)?,
            cost_price: row.get(6)?,
            sell_price: row.get(7)?,
            min_stock: row.get(8)?,
            max_stock: row.get(9)?,
            current_stock: row.get(10)?,
            image_url: row.get(11)?,
            barcode: row.get(12)?,
            is_active: row.get(13)?,
            metadata: row.get(14)?,
            created_at: row.get(15)?,
            updated_at: row.get(16)?,
            sync_status: row.get(17)?,
            last_synced_at: row.get(18)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(product)
}

/// 更新产品
#[tauri::command]
pub fn update_product(db: tauri::State<Mutex<Database>>, id: String, updates: serde_json::Value) -> Result<Product, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 检查产品是否存在
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
        params![id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if !exists {
        return Err("Product not found".to_string());
    }

    // 构建动态 UPDATE 语句
    let mut set_clauses = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
        set_clauses.push("name = ?");
        values.push(Box::new(name.to_string()));
    }
    if let Some(desc) = updates.get("description").and_then(|v| v.as_str()) {
        set_clauses.push("description = ?");
        values.push(Box::new(desc.to_string()));
    }
    if let Some(cost) = updates.get("cost_price").and_then(|v| v.as_f64()) {
        set_clauses.push("cost_price = ?");
        values.push(Box::new(cost));
    }
    if let Some(price) = updates.get("sell_price").and_then(|v| v.as_f64()) {
        set_clauses.push("sell_price = ?");
        values.push(Box::new(price));
    }
    if let Some(stock) = updates.get("current_stock").and_then(|v| v.as_i64()) {
        set_clauses.push("current_stock = ?");
        values.push(Box::new(stock as i32));
    }
    if let Some(min) = updates.get("min_stock").and_then(|v| v.as_i64()) {
        set_clauses.push("min_stock = ?");
        values.push(Box::new(min as i32));
    }
    if let Some(max) = updates.get("max_stock").and_then(|v| v.as_i64()) {
        set_clauses.push("max_stock = ?");
        values.push(Box::new(max as i32));
    }
    if let Some(unit) = updates.get("unit").and_then(|v| v.as_str()) {
        set_clauses.push("unit = ?");
        values.push(Box::new(unit.to_string()));
    }
    if let Some(status) = updates.get("status").and_then(|v| v.as_str()) {
        set_clauses.push("is_active = ?");
        values.push(Box::new(status == "active"));
    }

    if set_clauses.is_empty() {
        return get_product_by_id_inner(conn, &id);
    }

    // 添加更新时间和同步状态
    set_clauses.push("updated_at = CURRENT_TIMESTAMP");
    set_clauses.push("sync_status = 'pending'");

    let sql = format!("UPDATE products SET {} WHERE id = ?", set_clauses.join(", "));
    values.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice()).map_err(|e| e.to_string())?;

    get_product_by_id_inner(conn, &id)
}

/// 删除产品(软删除)
#[tauri::command]
pub fn delete_product(db: tauri::State<Mutex<Database>>, id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE products SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending' WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取数据库统计信息
#[tauri::command]
pub fn get_database_stats(db: tauri::State<Mutex<Database>>) -> Result<DatabaseStats, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let products: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let categories: i64 = conn.query_row(
        "SELECT COUNT(*) FROM product_categories WHERE deleted_at IS NULL",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let transactions: i64 = conn.query_row(
        "SELECT COUNT(*) FROM inventory_transactions",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    let pending_sync: i64 = conn.query_row(
        "SELECT COUNT(*) FROM products WHERE sync_status = 'pending'
         UNION ALL SELECT COUNT(*) FROM product_categories WHERE sync_status = 'pending'
         UNION ALL SELECT COUNT(*) FROM inventory_transactions WHERE sync_status = 'pending'",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    Ok(DatabaseStats {
        products,
        categories,
        transactions,
        pending_sync,
    })
}

/// 获取待同步记录
#[tauri::command]
pub fn get_pending_sync_records(db: tauri::State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 简化实现:返回待同步的产品
    let mut stmt = conn.prepare(
        "SELECT id, sku, name, sync_status FROM products WHERE sync_status = 'pending'"
    ).map_err(|e| e.to_string())?;

    let records: Vec<serde_json::Value> = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "sku": row.get::<_, String>(1)?,
            "name": row.get::<_, String>(2)?,
            "sync_status": row.get::<_, String>(3)?,
        }))
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    Ok(serde_json::json!({
        "products": records,
        "total": records.len()
    }))
}

/// 标记为已同步
#[tauri::command]
pub fn mark_as_synced(db: tauri::State<Mutex<Database>>, table: String, record_id: String) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let sql = match table.as_str() {
        "products" => "UPDATE products SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
        "product_categories" => "UPDATE product_categories SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
        "inventory_transactions" => "UPDATE inventory_transactions SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP WHERE id = ?1",
        _ => return Err(format!("Unknown table: {}", table)),
    };

    conn.execute(sql, params![record_id]).map_err(|e| e.to_string())?;
    Ok(())
}
