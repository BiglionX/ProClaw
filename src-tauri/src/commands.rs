use crate::database::Database;
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
    pub brand_id: Option<String>,
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

    get_product_by_id_inner(conn, &id).ok_or_else(|| "Product not found".to_string())
}

/// 获取产品列表(支持搜索和分页)
#[tauri::command]
pub fn get_products(db: tauri::State<Mutex<Database>>, options: Option<serde_json::Value>) -> Result<Vec<Product>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 构建查询
    let mut sql = String::from(
        "SELECT id, sku, name, description, category_id, brand_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, created_at, updated_at,
         sync_status, last_synced_at
         FROM products WHERE deleted_at IS NULL"
    );

    // 添加搜索和筛选条件
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    if let Some(opts) = &options {
        // 搜索条件
        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (sku LIKE ? OR name LIKE ?)");
            let search_pattern = format!("%{}%", search);
            params_vec.push(Box::new(search_pattern.clone()));
            params_vec.push(Box::new(search_pattern));
        }

        // 分类筛选
        if let Some(category_id) = opts.get("category_id").and_then(|v| v.as_str()) {
            if !category_id.is_empty() {
                sql.push_str(" AND category_id = ?");
                params_vec.push(Box::new(category_id.to_string()));
            }
        }

        // 品牌筛选
        if let Some(brand_id) = opts.get("brand_id").and_then(|v| v.as_str()) {
            if !brand_id.is_empty() {
                sql.push_str(" AND brand_id = ?");
                params_vec.push(Box::new(brand_id.to_string()));
            }
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
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            cost_price: row.get(7)?,
            sell_price: row.get(8)?,
            min_stock: row.get(9)?,
            max_stock: row.get(10)?,
            current_stock: row.get(11)?,
            image_url: row.get(12)?,
            barcode: row.get(13)?,
            is_active: row.get(14)?,
            metadata: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
            sync_status: row.get(18)?,
            last_synced_at: row.get(19)?,
        })
    }).map_err(|e| e.to_string())?;

    products.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// 根据 ID 获取产品
#[tauri::command]
pub fn get_product_by_id(db: tauri::State<Mutex<Database>>, id: String) -> Result<Option<Product>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    Ok(get_product_by_id_inner(conn, &id))
}

fn get_product_by_id_inner(conn: &rusqlite::Connection, id: &str) -> Option<Product> {
    let mut stmt = conn.prepare(
        "SELECT id, sku, name, description, category_id, brand_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, created_at, updated_at,
         sync_status, last_synced_at
         FROM products WHERE id = ?1 AND deleted_at IS NULL"
    ).ok()?;

    let product = stmt.query_row(params![id], |row| {
        Ok(Product {
            id: row.get(0)?,
            sku: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            cost_price: row.get(7)?,
            sell_price: row.get(8)?,
            min_stock: row.get(9)?,
            max_stock: row.get(10)?,
            current_stock: row.get(11)?,
            image_url: row.get(12)?,
            barcode: row.get(13)?,
            is_active: row.get(14)?,
            metadata: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
            sync_status: row.get(18)?,
            last_synced_at: row.get(19)?,
        })
    }).ok();

    product
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
        return get_product_by_id_inner(conn, &id).ok_or_else(|| "Product not found".to_string());

    }

    // 添加更新时间和同步状态
    set_clauses.push("updated_at = CURRENT_TIMESTAMP");
    set_clauses.push("sync_status = 'pending'");

    let sql = format!("UPDATE products SET {} WHERE id = ?", set_clauses.join(", "));
    values.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice()).map_err(|e| e.to_string())?;

    get_product_by_id_inner(conn, &id).ok_or_else(|| "Product not found after update".to_string())
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

// ==================== 库存管理命令 ====================

/// 创建库存交易 (入库/出库/调整/调拨)
#[tauri::command]
pub fn create_inventory_transaction(
    db: tauri::State<Mutex<Database>>,
    transaction: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let product_id = transaction["product_id"]
        .as_str()
        .ok_or("Product ID is required")?
        .to_string();
    let transaction_type = transaction["transaction_type"]
        .as_str()
        .ok_or("Transaction type is required")?
        .to_string();
    let quantity = transaction["quantity"]
        .as_i64()
        .ok_or("Quantity is required")? as i32;

    // 验证交易类型
    if !["inbound", "outbound", "adjustment", "transfer"].contains(&transaction_type.as_str()) {
        return Err("Invalid transaction type".to_string());
    }

    // 检查产品是否存在
    let product_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
            params![product_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !product_exists {
        return Err("Product not found".to_string());
    }

    // 如果是出库，检查库存是否充足
    if transaction_type == "outbound" {
        let current_stock: i32 = conn
            .query_row(
                "SELECT current_stock FROM products WHERE id = ?1",
                params![product_id],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;

        if current_stock < quantity {
            return Err(format!(
                "Insufficient stock. Current: {}, Requested: {}",
                current_stock, quantity
            ));
        }
    }

    // 插入交易记录
    conn.execute(
        "INSERT INTO inventory_transactions 
         (id, product_id, transaction_type, quantity, reference_no, reason, performed_by, notes, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending')",
        params![
            id,
            product_id,
            transaction_type,
            quantity,
            transaction.get("reference_no").and_then(|v| v.as_str()),
            transaction.get("reason").and_then(|v| v.as_str()),
            transaction.get("performed_by").and_then(|v| v.as_str()),
            transaction.get("notes").and_then(|v| v.as_str()),
        ],
    )
    .map_err(|e| e.to_string())?;

    // 更新产品库存
    let stock_change = match transaction_type.as_str() {
        "inbound" => quantity,
        "outbound" => -quantity,
        "adjustment" => quantity, // 调整可以是正数或负数
        "transfer" => -quantity,  // 调出减少库存
        _ => 0,
    };

    conn.execute(
        "UPDATE products SET current_stock = current_stock + ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![stock_change, product_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "product_id": product_id,
        "transaction_type": transaction_type,
        "quantity": quantity,
        "message": "Transaction created successfully"
    }))
}

/// 获取库存交易列表
#[tauri::command]
pub fn get_inventory_transactions(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<InventoryTransaction>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut sql = String::from(
        "SELECT id, product_id, transaction_type, quantity, reference_no, 
                reason, performed_by, notes, created_at, sync_status
         FROM inventory_transactions WHERE 1=1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        // 按产品筛选
        if let Some(product_id) = opts.get("product_id").and_then(|v| v.as_str()) {
            if !product_id.is_empty() {
                sql.push_str(" AND product_id = ?");
                params_vec.push(Box::new(product_id.to_string()));
            }
        }

        // 按交易类型筛选
        if let Some(transaction_type) = opts.get("transaction_type").and_then(|v| v.as_str()) {
            if !transaction_type.is_empty() {
                sql.push_str(" AND transaction_type = ?");
                params_vec.push(Box::new(transaction_type.to_string()));
            }
        }

        // 日期范围筛选
        if let Some(start_date) = opts.get("start_date").and_then(|v| v.as_str()) {
            sql.push_str(" AND created_at >= ?");
            params_vec.push(Box::new(start_date.to_string()));
        }
        if let Some(end_date) = opts.get("end_date").and_then(|v| v.as_str()) {
            sql.push_str(" AND created_at <= ?");
            params_vec.push(Box::new(end_date.to_string()));
        }
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT 100");

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let transactions = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok(InventoryTransaction {
                id: row.get(0)?,
                product_id: row.get(1)?,
                transaction_type: row.get(2)?,
                quantity: row.get(3)?,
                reference_no: row.get(4)?,
                reason: row.get(5)?,
                performed_by: row.get(6)?,
                notes: row.get(7)?,
                created_at: row.get(8)?,
                sync_status: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(transactions)
}

/// 获取库存统计信息
#[tauri::command]
pub fn get_inventory_stats(db: tauri::State<Mutex<Database>>) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 总产品数
    let total_products: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 低库存产品数 (current_stock < min_stock)
    let low_stock_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 零库存产品数
    let zero_stock_count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND current_stock = 0",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 今日交易数
    let today_transactions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM inventory_transactions WHERE DATE(created_at) = DATE('now')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 库存总价值 (按成本价计算)
    let total_value: f64 = conn
        .query_row(
            "SELECT COALESCE(SUM(current_stock * cost_price), 0) FROM products WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // 低库存产品列表
    let mut low_stock_stmt = conn.prepare(
        "SELECT id, name, sku, current_stock, min_stock 
         FROM products 
         WHERE deleted_at IS NULL AND current_stock < min_stock AND min_stock > 0
         ORDER BY (current_stock * 1.0 / min_stock) ASC
         LIMIT 10"
    ).map_err(|e| e.to_string())?;

    let low_stock_products: Vec<serde_json::Value> = low_stock_stmt
        .query_map([], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "name": row.get::<_, String>(1)?,
                "sku": row.get::<_, String>(2)?,
                "current_stock": row.get::<_, i32>(3)?,
                "min_stock": row.get::<_, i32>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({
        "total_products": total_products,
        "low_stock_count": low_stock_count,
        "zero_stock_count": zero_stock_count,
        "today_transactions": today_transactions,
        "total_value": total_value,
        "low_stock_products": low_stock_products
    }))
}
