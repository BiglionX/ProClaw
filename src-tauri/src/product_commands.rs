use crate::database::Database;
use crate::types::{Product, DatabaseStats};
use rusqlite::{params, OptionalExtension};
use std::sync::Mutex;
use uuid::Uuid;

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

pub fn get_product_by_id_inner(conn: &rusqlite::Connection, id: &str) -> Option<Product> {
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

// ==================== SPU-SKU 电商架构命令 ====================

use crate::types::{ProductSPU, ProductSKU, ProductImage};

/// 创建SPU（含SKU和图片）
#[tauri::command]
pub fn create_product_spu(
    db: tauri::State<Mutex<Database>>,
    spu_data: serde_json::Value,
    skus_data: Vec<serde_json::Value>,
    images_data: Vec<String>,
) -> Result<ProductSPU, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let spu_code = spu_data["spu_code"]
        .as_str()
        .ok_or("SPU code is required")?
        .to_string();
    let name = spu_data["name"].as_str().ok_or("Name is required")?.to_string();

    // 开启事务
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 插入SPU主表
    tx.execute(
        "INSERT INTO product_spus (id, spu_code, name, description, category_id, brand_id, unit, is_on_sale, status, metadata, sync_status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'pending')",
        params![
            id,
            spu_code,
            name,
            spu_data.get("description").and_then(|v| v.as_str()),
            spu_data.get("category_id").and_then(|v| v.as_str()),
            spu_data.get("brand_id").and_then(|v| v.as_str()),
            spu_data.get("unit").and_then(|v| v.as_str()).unwrap_or("件"),
            spu_data.get("is_on_sale").and_then(|v| v.as_bool()).unwrap_or(true),
            spu_data.get("status").and_then(|v| v.as_str()).unwrap_or("on_sale"),
            spu_data.get("metadata").and_then(|v| v.as_str()),
        ],
    ).map_err(|e| e.to_string())?;

    // 插入SKU列表
    let mut sku_objects = Vec::new();
    for sku_item in &skus_data {
        let sku_id = Uuid::new_v4().to_string();
        let sku_code = sku_item["sku_code"].as_str().ok_or("SKU code is required")?;
        let specifications = sku_item["specifications"].as_str().ok_or("Specifications is required")?;

        tx.execute(
            "INSERT INTO product_skus (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price, current_stock, min_stock, max_stock, barcode, weight, volume, is_default, sort_order, is_active, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, 'pending')",
            params![
                sku_id,
                id,
                sku_code,
                specifications,
                sku_item.get("spec_text").and_then(|v| v.as_str()),
                sku_item.get("cost_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
                sku_item.get("sell_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
                sku_item.get("current_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                sku_item.get("min_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                sku_item.get("max_stock").and_then(|v| v.as_i64()).unwrap_or(999999) as i32,
                sku_item.get("barcode").and_then(|v| v.as_str()),
                sku_item.get("weight").and_then(|v| v.as_f64()),
                sku_item.get("volume").and_then(|v| v.as_f64()),
                sku_item.get("is_default").and_then(|v| v.as_bool()).unwrap_or(false),
                sku_item.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                sku_item.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
            ],
        ).map_err(|e| e.to_string())?;

        sku_objects.push(ProductSKU {
            id: sku_id,
            spu_id: id.clone(),
            sku_code: sku_code.to_string(),
            specifications: specifications.to_string(),
            spec_text: sku_item.get("spec_text").and_then(|v| v.as_str()).map(|s| s.to_string()),
            cost_price: sku_item.get("cost_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            sell_price: sku_item.get("sell_price").and_then(|v| v.as_f64()).unwrap_or(0.0),
            current_stock: sku_item.get("current_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            min_stock: sku_item.get("min_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            max_stock: sku_item.get("max_stock").and_then(|v| v.as_i64()).unwrap_or(999999) as i32,
            barcode: sku_item.get("barcode").and_then(|v| v.as_str()).map(|s| s.to_string()),
            weight: sku_item.get("weight").and_then(|v| v.as_f64()),
            volume: sku_item.get("volume").and_then(|v| v.as_f64()),
            is_default: sku_item.get("is_default").and_then(|v| v.as_bool()).unwrap_or(false),
            sort_order: sku_item.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            is_active: sku_item.get("is_active").and_then(|v| v.as_bool()).unwrap_or(true),
            created_at: "".to_string(),  // 将由数据库填充
            updated_at: "".to_string(),  // 将由数据库填充
        });
    }

    // 插入图片列表
    let mut image_objects = Vec::new();
    for (index, image_url) in images_data.iter().enumerate() {
        let image_id = Uuid::new_v4().to_string();
        let is_primary = index == 0; // 第一张图设为主图

        tx.execute(
            "INSERT INTO product_images (id, spu_id, image_url, image_type, sort_order, is_primary, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
            params![
                image_id,
                id,
                image_url,
                if is_primary { "main" } else { "gallery" },
                index as i32,
                is_primary,
            ],
        ).map_err(|e| e.to_string())?;

        image_objects.push(ProductImage {
            id: image_id,
            spu_id: id.clone(),
            image_url: image_url.clone(),
            image_type: if is_primary { "main".to_string() } else { "gallery".to_string() },
            sort_order: index as i32,
            is_primary,
            created_at: "".to_string(),  // 将由数据库填充
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    // 在移动之前先计算汇总数据
    let sku_count = skus_data.len() as i32;
    let total_stock: i32 = sku_objects.iter().map(|s| s.current_stock).sum();
    let min_price = if sku_objects.is_empty() { 0.0 } else { sku_objects.iter().map(|s| s.sell_price).fold(f64::MAX, f64::min) };
    let max_price = if sku_objects.is_empty() { 0.0 } else { sku_objects.iter().map(|s| s.sell_price).fold(f64::MIN, f64::max) };

    // 构建返回的SPU对象
    let now = ""; // SQLite会自动填充时间戳
    Ok(ProductSPU {
        id,
        spu_code,
        name,
        description: spu_data.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        category_id: spu_data.get("category_id").and_then(|v| v.as_str()).map(|s| s.to_string()),
        brand_id: spu_data.get("brand_id").and_then(|v| v.as_str()).map(|s| s.to_string()),
        unit: spu_data.get("unit").and_then(|v| v.as_str()).unwrap_or("件").to_string(),
        is_on_sale: spu_data.get("is_on_sale").and_then(|v| v.as_bool()).unwrap_or(true),
        status: spu_data.get("status").and_then(|v| v.as_str()).unwrap_or("on_sale").to_string(),
        metadata: spu_data.get("metadata").and_then(|v| v.as_str()).map(|s| s.to_string()),
        skus: sku_objects,
        images: image_objects,
        sku_count,
        total_stock,
        min_price,
        max_price,
        created_at: now.to_string(),
        updated_at: now.to_string(),
    })
}

/// 获取SPU列表（支持搜索和筛选）
#[tauri::command]
pub fn get_product_spus(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<ProductSPU>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 使用视图查询SPU汇总信息
    let mut sql = String::from(
        "SELECT id, spu_code, name, description, category_id, brand_id, unit,
                is_on_sale, status, metadata, sku_count, total_stock, min_price, max_price,
                created_at, updated_at
         FROM v_spu_inventory WHERE 1=1"
    );

    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(opts) = &options {
        // 搜索条件
        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            sql.push_str(" AND (spu_code LIKE ? OR name LIKE ?)");
            let pattern = format!("%{}%", search);
            params_vec.push(Box::new(pattern.clone()));
            params_vec.push(Box::new(pattern));
        }

        // 状态筛选
        if let Some(status) = opts.get("status").and_then(|v| v.as_str()) {
            if !status.is_empty() {
                sql.push_str(" AND status = ?");
                params_vec.push(Box::new(status.to_string()));
            }
        }

        // 分类筛选
        if let Some(category_id) = opts.get("category_id").and_then(|v| v.as_str()) {
            if !category_id.is_empty() {
                sql.push_str(" AND category_id = ?");
                params_vec.push(Box::new(category_id.to_string()));
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

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let spus = stmt.query_map(params_refs.as_slice(), |row| {
        let id: String = row.get(0)?;
        
        // 查询该SPU的SKU列表
        let skus = get_skus_by_spu_id(conn, &id).unwrap_or_default();
        
        // 查询该SPU的图片列表
        let images = get_images_by_spu_id(conn, &id).unwrap_or_default();

        Ok(ProductSPU {
            id,
            spu_code: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            is_on_sale: row.get(7)?,
            status: row.get(8)?,
            metadata: row.get(9)?,
            skus: skus.clone(),
            images: images.clone(),
            sku_count: row.get(10)?,
            total_stock: row.get(11)?,
            min_price: row.get(12)?,
            max_price: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).map_err(|e| e.to_string())?;

    spus.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// 根据ID获取SPU详情
#[tauri::command]
pub fn get_product_spu_by_id(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<Option<ProductSPU>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn.prepare(
        "SELECT id, spu_code, name, description, category_id, brand_id, unit,
                is_on_sale, status, metadata, sku_count, total_stock, min_price, max_price,
                created_at, updated_at
         FROM v_spu_inventory WHERE id = ?1"
    ).map_err(|e| e.to_string())?;

    let spu = stmt.query_row(params![id], |row| {
        let spu_id: String = row.get(0)?;
        
        // 查询SKU列表
        let skus = get_skus_by_spu_id(conn, &spu_id).unwrap_or_default();
        
        // 查询图片列表
        let images = get_images_by_spu_id(conn, &spu_id).unwrap_or_default();

        Ok(ProductSPU {
            id: spu_id,
            spu_code: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            is_on_sale: row.get(7)?,
            status: row.get(8)?,
            metadata: row.get(9)?,
            skus,
            images,
            sku_count: row.get(10)?,
            total_stock: row.get(11)?,
            min_price: row.get(12)?,
            max_price: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).optional().map_err(|e| e.to_string())?;

    Ok(spu)
}

/// 更新SPU
#[tauri::command]
pub fn update_product_spu(
    db: tauri::State<Mutex<Database>>,
    id: String,
    updates: serde_json::Value,
) -> Result<ProductSPU, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 检查SPU是否存在
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM product_spus WHERE id = ?1)",
        params![id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if !exists {
        return Err("SPU not found".to_string());
    }

    // 构建动态UPDATE语句
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
    if let Some(unit) = updates.get("unit").and_then(|v| v.as_str()) {
        set_clauses.push("unit = ?");
        values.push(Box::new(unit.to_string()));
    }
    if let Some(status) = updates.get("status").and_then(|v| v.as_str()) {
        set_clauses.push("status = ?");
        values.push(Box::new(status.to_string()));
    }
    if let Some(is_on_sale) = updates.get("is_on_sale").and_then(|v| v.as_bool()) {
        set_clauses.push("is_on_sale = ?");
        values.push(Box::new(is_on_sale));
    }

    if set_clauses.is_empty() {
        return get_product_spu_by_id_inner(conn, &id).ok_or_else(|| "SPU not found".to_string());
    }

    // 添加更新时间
    set_clauses.push("updated_at = CURRENT_TIMESTAMP");

    let sql = format!("UPDATE product_spus SET {} WHERE id = ?", set_clauses.join(", "));
    values.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice()).map_err(|e| e.to_string())?;

    get_product_spu_by_id_inner(conn, &id).ok_or_else(|| "SPU not found after update".to_string())
}

/// 删除SPU（软删除）
#[tauri::command]
pub fn delete_product_spu(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 软删除SPU（级联删除SKU和图片）
    conn.execute(
        "UPDATE product_spus SET deleted_at = CURRENT_TIMESTAMP, sync_status = 'pending' WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== 辅助函数 ====================

/// 根据SPU ID获取SKU列表
fn get_skus_by_spu_id(conn: &rusqlite::Connection, spu_id: &str) -> Result<Vec<ProductSKU>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price,
                current_stock, min_stock, max_stock, barcode, weight, volume,
                is_default, sort_order, is_active, created_at, updated_at
         FROM product_skus WHERE spu_id = ?1 AND deleted_at IS NULL ORDER BY sort_order ASC"
    ).map_err(|e| e.to_string())?;

    let skus = stmt.query_map(params![spu_id], |row| {
        Ok(ProductSKU {
            id: row.get(0)?,
            spu_id: row.get(1)?,
            sku_code: row.get(2)?,
            specifications: row.get(3)?,
            spec_text: row.get(4)?,
            cost_price: row.get(5)?,
            sell_price: row.get(6)?,
            current_stock: row.get(7)?,
            min_stock: row.get(8)?,
            max_stock: row.get(9)?,
            barcode: row.get(10)?,
            weight: row.get(11)?,
            volume: row.get(12)?,
            is_default: row.get(13)?,
            sort_order: row.get(14)?,
            is_active: row.get(15)?,
            created_at: row.get(16)?,
            updated_at: row.get(17)?,
        })
    }).map_err(|e| e.to_string())?;

    skus.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// 根据SPU ID获取图片列表
fn get_images_by_spu_id(conn: &rusqlite::Connection, spu_id: &str) -> Result<Vec<ProductImage>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, spu_id, image_url, image_type, sort_order, is_primary, created_at
         FROM product_images WHERE spu_id = ?1 ORDER BY sort_order ASC"
    ).map_err(|e| e.to_string())?;

    let images = stmt.query_map(params![spu_id], |row| {
        Ok(ProductImage {
            id: row.get(0)?,
            spu_id: row.get(1)?,
            image_url: row.get(2)?,
            image_type: row.get(3)?,
            sort_order: row.get(4)?,
            is_primary: row.get(5)?,
            created_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    images.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())
}

/// 内部函数：根据ID获取SPU（不含SKU和图片）
fn get_product_spu_by_id_inner(conn: &rusqlite::Connection, id: &str) -> Option<ProductSPU> {
    let mut stmt = conn.prepare(
        "SELECT id, spu_code, name, description, category_id, brand_id, unit,
                is_on_sale, status, metadata, sku_count, total_stock, min_price, max_price,
                created_at, updated_at
         FROM v_spu_inventory WHERE id = ?1"
    ).ok()?;

    let spu = stmt.query_row(params![id], |row| {
        let spu_id: String = row.get(0)?;
        let skus = get_skus_by_spu_id(conn, &spu_id).unwrap_or_default();
        let images = get_images_by_spu_id(conn, &spu_id).unwrap_or_default();

        Ok(ProductSPU {
            id: spu_id,
            spu_code: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            category_id: row.get(4)?,
            brand_id: row.get(5)?,
            unit: row.get(6)?,
            is_on_sale: row.get(7)?,
            status: row.get(8)?,
            metadata: row.get(9)?,
            skus,
            images,
            sku_count: row.get(10)?,
            total_stock: row.get(11)?,
            min_price: row.get(12)?,
            max_price: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }).ok();

    spu
}

// ==================== 商品库模式迁移命令 ====================

use crate::types::MigrationResult;
use std::time::Instant;

/// 获取当前商品库模式
#[tauri::command]
pub fn get_library_mode(db: tauri::State<Mutex<Database>>) -> Result<String, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 检查是否有SPU数据，如果有则认为是电商模式
    let has_spus: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM product_spus LIMIT 1)",
        [],
        |row| row.get(0)
    ).unwrap_or(false);

    if has_spus {
        Ok("ecommerce".to_string())
    } else {
        Ok("simple".to_string())
    }
}

/// 从简单商品库迁移到电商商品库
#[tauri::command]
pub fn migrate_to_ecommerce_mode(
    db: tauri::State<Mutex<Database>>
) -> Result<MigrationResult, String> {
    let start_time = Instant::now();
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 1. 检查是否已迁移
    let has_spus: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM product_spus LIMIT 1)",
        [],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if has_spus {
        return Err("已经升级到电商商品库，无需重复迁移".to_string());
    }

    // 2. 开启事务
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    let mut migrated_products = 0i32;
    let mut created_spus = 0i32;
    let mut created_skus = 0i32;
    let mut migrated_images = 0i32;

    // 3. 遍历所有未删除的products
    let products: Vec<(String, String, String, Option<String>, Option<String>, Option<String>, String, f64, f64, i32, i32, i32, Option<String>, Option<String>, Option<String>, String)>;
    
    {
        let mut stmt = tx.prepare(
            "SELECT id, sku, name, description, category_id, brand_id, unit,
                    cost_price, sell_price, min_stock, max_stock, current_stock,
                    image_url, barcode, metadata, created_at
             FROM products WHERE deleted_at IS NULL"
        ).map_err(|e| e.to_string())?;

        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, String>(0)?,  // id
                row.get::<_, String>(1)?,  // sku
                row.get::<_, String>(2)?,  // name
                row.get::<_, Option<String>>(3)?,  // description
                row.get::<_, Option<String>>(4)?,  // category_id
                row.get::<_, Option<String>>(5)?,  // brand_id
                row.get::<_, String>(6)?,  // unit
                row.get::<_, f64>(7)?,     // cost_price
                row.get::<_, f64>(8)?,     // sell_price
                row.get::<_, i32>(9)?,     // min_stock
                row.get::<_, i32>(10)?,    // max_stock
                row.get::<_, i32>(11)?,    // current_stock
                row.get::<_, Option<String>>(12)?, // image_url
                row.get::<_, Option<String>>(13)?, // barcode
                row.get::<_, Option<String>>(14)?, // metadata
                row.get::<_, String>(15)?, // created_at
            ))
        }).map_err(|e| e.to_string())?;
        
        products = rows.filter_map(|r| r.ok()).collect();
    } // stmt和rows在这里被drop

    for product in products {
        let (id, _sku, name, description, category_id, brand_id, unit,
             cost_price, sell_price, min_stock, max_stock, current_stock,
             image_url, barcode, metadata, _) = product;

        // 4. 为每个product创建对应的SPU
        let spu_id = Uuid::new_v4().to_string();
        let spu_code = format!("SPU-{}", &id[..8]); // 使用原ID生成SPU code

        tx.execute(
            "INSERT INTO product_spus (id, spu_code, name, description, category_id, brand_id, unit, is_on_sale, status, metadata, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'synced')",
            params![
                spu_id,
                spu_code,
                name,
                description,
                category_id,
                brand_id,
                unit,
                true,  // is_on_sale
                "on_sale",  // status
                metadata,
            ],
        ).map_err(|e| e.to_string())?;

        created_spus += 1;

        // 5. 为每个product创建默认SKU
        let sku_id = Uuid::new_v4().to_string();
        let sku_code = format!("SKU-{}", &spu_id[..8]);
        let specifications = serde_json::json!({"默认": "标准"}).to_string();

        tx.execute(
            "INSERT INTO product_skus (id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price, current_stock, min_stock, max_stock, barcode, is_default, sort_order, is_active, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 'synced')",
            params![
                sku_id,
                spu_id,
                sku_code,
                specifications,
                "标准",
                cost_price,
                sell_price,
                current_stock,
                min_stock,
                max_stock,
                barcode,
                true,  // is_default
                0,     // sort_order
                true,  // is_active
            ],
        ).map_err(|e| e.to_string())?;

        created_skus += 1;

        // 6. 迁移图片（如果有image_url）
        if let Some(img_url) = image_url {
            if !img_url.is_empty() {
                let image_id = Uuid::new_v4().to_string();
                tx.execute(
                    "INSERT INTO product_images (id, spu_id, image_url, image_type, sort_order, is_primary, sync_status)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'synced')",
                    params![
                        image_id,
                        spu_id,
                        img_url,
                        "main",
                        0,
                        true,
                    ],
                ).map_err(|e| e.to_string())?;

                migrated_images += 1;
            }
        }

        // 7. 标记原product为“已迁移”状态（不删除，保留历史）
        tx.execute(
            "UPDATE products SET metadata = json_insert(COALESCE(metadata, '{}'), '$.migrated_to_spu', ?1, '$.migrated_at', datetime('now')) WHERE id = ?2",
            params![spu_id, id],
        ).map_err(|e| e.to_string())?;

        migrated_products += 1;
    }

    // 8. 提交事务
    tx.commit().map_err(|e| e.to_string())?;

    let duration_ms = start_time.elapsed().as_millis() as u64;

    // 9. 返回迁移统计
    Ok(MigrationResult {
        migrated_products,
        created_spus,
        created_skus,
        migrated_images,
        duration_ms,
    })
}

/// 降级回简单商品库
#[tauri::command]
pub fn downgrade_to_simple_mode(
    db: tauri::State<Mutex<Database>>
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 警告：这个操作会删除所有SPU/SKU/Image数据
    // 在实际应用中，应该有更复杂的逻辑来保留重要数据
    
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 删除所有图片
    tx.execute("DELETE FROM product_images", []).map_err(|e| e.to_string())?;
    
    // 删除所有SKU
    tx.execute("DELETE FROM product_skus", []).map_err(|e| e.to_string())?;
    
    // 删除所有SPU
    tx.execute("DELETE FROM product_spus", []).map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}
