use crate::database::Database;
use crate::types::{DatabaseStats, Product};
use rusqlite::{params, OptionalExtension};
use std::sync::Mutex;
use uuid::Uuid;

/// 创建产品
#[tauri::command]
pub fn create_product(
    db: tauri::State<Mutex<Database>>,
    product: serde_json::Value,
) -> Result<Product, String> {
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
            product
                .get("cost_price")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            product
                .get("sell_price")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            product
                .get("min_stock")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            product
                .get("max_stock")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            product
                .get("current_stock")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            product.get("image_url").and_then(|v| v.as_str()),
            product.get("barcode").and_then(|v| v.as_str()),
            product
                .get("is_active")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
            product.get("metadata").and_then(|v| v.as_str()),
        ],
    )
    .map_err(|e| e.to_string())?;

    get_product_by_id_inner(conn, &id).ok_or_else(|| "Product not found".to_string())
}

/// 获取产品列表(支持搜索和分页)
#[tauri::command]
pub fn get_products(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<Product>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 构建查询
    let mut sql = String::from(
        "SELECT id, sku, name, description, category_id, brand_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, created_at, updated_at,
         sync_status, last_synced_at
         FROM products WHERE deleted_at IS NULL",
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

    // 添加分页（R7 修复：参数化绑定）
    if let Some(opts) = &options {
        if let Some(limit) = opts.get("limit").and_then(|v| v.as_u64()) {
            params_vec.push(Box::new(limit as i64));
            sql.push_str(&format!(" LIMIT ?{}", params_vec.len()));
            if let Some(offset) = opts.get("offset").and_then(|v| v.as_u64()) {
                params_vec.push(Box::new(offset as i64));
                sql.push_str(&format!(" OFFSET ?{}", params_vec.len()));
            }
        }
    }

    // 执行查询
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let products = stmt
        .query_map(params_refs.as_slice(), |row| {
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
                // 列表查询不加载 images（避免 N+1），详情/编辑页按需加载
                images: vec![],
            })
        })
        .map_err(|e| e.to_string())?;

    products
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// Keyword search for POS barcode scan (ConveniencePosPage)
#[tauri::command]
pub fn filter_products(
    db: tauri::State<Mutex<Database>>,
    keyword: Option<String>,
    limit: Option<i64>,
) -> Result<serde_json::Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let kw = keyword.unwrap_or_default();
    let limit = limit.unwrap_or(10);
    let pattern = format!("%{}%", kw.trim());

    let mut stmt = conn
        .prepare(
            "SELECT id, sku, name, sell_price, barcode FROM products
         WHERE deleted_at IS NULL AND is_active = 1
           AND (sku LIKE ?1 OR name LIKE ?1 OR barcode LIKE ?1)
         ORDER BY name LIMIT ?2",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map(params![pattern, limit], |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "code": row.get::<_, String>(1)?,
                "name": row.get::<_, String>(2)?,
                "price": row.get::<_, f64>(3)?,
                "sale_price": row.get::<_, f64>(3)?,
                "barcode": row.get::<_, Option<String>>(4)?,
            }))
        })
        .map_err(|e| e.to_string())?;

    let data: Vec<serde_json::Value> = rows.filter_map(|r| r.ok()).collect();
    Ok(serde_json::json!({ "data": data }))
}

/// 根据 ID 获取产品
#[tauri::command]
pub fn get_product_by_id(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<Option<Product>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    Ok(get_product_by_id_inner(conn, &id))
}

pub fn get_product_by_id_inner(conn: &rusqlite::Connection, id: &str) -> Option<Product> {
    let mut stmt = conn
        .prepare(
            "SELECT id, sku, name, description, category_id, brand_id, unit,
         cost_price, sell_price, min_stock, max_stock, current_stock,
         image_url, barcode, is_active, metadata, created_at, updated_at,
         sync_status, last_synced_at
         FROM products WHERE id = ?1 AND deleted_at IS NULL",
        )
        .ok()?;

    let product = stmt
        .query_row(params![id], |row| {
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
                // 先占位，函数末尾会覆盖
                images: vec![],
            })
        })
        .ok()?;

    // 加载多图（中等优先级 TODO #1 治理）
    let images = get_images_by_product_id(conn, id).unwrap_or_default();
    Some(Product { images, ..product })
}

/// 更新产品
#[tauri::command]
pub fn update_product(
    db: tauri::State<Mutex<Database>>,
    id: String,
    updates: serde_json::Value,
) -> Result<Product, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 检查产品是否存在
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

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

    let sql = format!(
        "UPDATE products SET {} WHERE id = ?",
        set_clauses.join(", ")
    );
    values.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| e.to_string())?;

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
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// 获取数据库统计信息
#[tauri::command]
pub fn get_database_stats(db: tauri::State<Mutex<Database>>) -> Result<DatabaseStats, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let products: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let categories: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM product_categories WHERE deleted_at IS NULL",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let transactions: i64 = conn
        .query_row("SELECT COUNT(*) FROM inventory_transactions", [], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

    let pending_sync: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM products WHERE sync_status = 'pending'
         UNION ALL SELECT COUNT(*) FROM product_categories WHERE sync_status = 'pending'
         UNION ALL SELECT COUNT(*) FROM inventory_transactions WHERE sync_status = 'pending'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(DatabaseStats {
        products,
        categories,
        transactions,
        pending_sync,
    })
}

// get_pending_sync_records 和 mark_as_synced 已移至 sync_engine.rs (Phase 5)

// ==================== SPU-SKU 电商架构命令 ====================

use crate::types::{ProductImage, ProductSKU, ProductSPU};

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
    let name = spu_data["name"]
        .as_str()
        .ok_or("Name is required")?
        .to_string();

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
        let sku_code = sku_item["sku_code"]
            .as_str()
            .ok_or("SKU code is required")?;
        let specifications = sku_item["specifications"]
            .as_str()
            .ok_or("Specifications is required")?;

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
            spec_text: sku_item
                .get("spec_text")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            cost_price: sku_item
                .get("cost_price")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            sell_price: sku_item
                .get("sell_price")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0),
            current_stock: sku_item
                .get("current_stock")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            min_stock: sku_item
                .get("min_stock")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            max_stock: sku_item
                .get("max_stock")
                .and_then(|v| v.as_i64())
                .unwrap_or(999999) as i32,
            barcode: sku_item
                .get("barcode")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            weight: sku_item.get("weight").and_then(|v| v.as_f64()),
            volume: sku_item.get("volume").and_then(|v| v.as_f64()),
            is_default: sku_item
                .get("is_default")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            sort_order: sku_item
                .get("sort_order")
                .and_then(|v| v.as_i64())
                .unwrap_or(0) as i32,
            is_active: sku_item
                .get("is_active")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
            created_at: "".to_string(), // 将由数据库填充
            updated_at: "".to_string(), // 将由数据库填充
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
            image_type: if is_primary {
                "main".to_string()
            } else {
                "gallery".to_string()
            },
            sort_order: index as i32,
            is_primary,
            created_at: "".to_string(), // 将由数据库填充
        });
    }

    tx.commit().map_err(|e| e.to_string())?;

    // 在移动之前先计算汇总数据
    let sku_count = skus_data.len() as i32;
    let total_stock: i32 = sku_objects.iter().map(|s| s.current_stock).sum();
    let min_price = if sku_objects.is_empty() {
        0.0
    } else {
        sku_objects
            .iter()
            .map(|s| s.sell_price)
            .fold(f64::MAX, f64::min)
    };
    let max_price = if sku_objects.is_empty() {
        0.0
    } else {
        sku_objects
            .iter()
            .map(|s| s.sell_price)
            .fold(f64::MIN, f64::max)
    };

    // 构建返回的SPU对象
    let now = ""; // SQLite会自动填充时间戳
    Ok(ProductSPU {
        id,
        spu_code,
        name,
        description: spu_data
            .get("description")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        category_id: spu_data
            .get("category_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        brand_id: spu_data
            .get("brand_id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
        unit: spu_data
            .get("unit")
            .and_then(|v| v.as_str())
            .unwrap_or("件")
            .to_string(),
        is_on_sale: spu_data
            .get("is_on_sale")
            .and_then(|v| v.as_bool())
            .unwrap_or(true),
        status: spu_data
            .get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("on_sale")
            .to_string(),
        metadata: spu_data
            .get("metadata")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
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
         FROM v_spu_inventory WHERE 1=1",
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

    // 添加分页（R7 修复：参数化绑定）
    if let Some(opts) = &options {
        if let Some(limit) = opts.get("limit").and_then(|v| v.as_u64()) {
            params_vec.push(Box::new(limit as i64));
            sql.push_str(&format!(" LIMIT ?{}", params_vec.len()));
            if let Some(offset) = opts.get("offset").and_then(|v| v.as_u64()) {
                params_vec.push(Box::new(offset as i64));
                sql.push_str(&format!(" OFFSET ?{}", params_vec.len()));
            }
        }
    }

    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    // 两阶段查询：避免在 query_map 回调中嵌套查询同一连接（SQLite 会报错）
    let rows: Vec<(
        String,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        bool,
        String,
        Option<String>,
        i32,
        i32,
        f64,
        f64,
        String,
        String,
    )> = stmt
        .query_map(params_refs.as_slice(), |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
                row.get(11)?,
                row.get(12)?,
                row.get(13)?,
                row.get(14)?,
                row.get(15)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut spus = Vec::with_capacity(rows.len());
    for (
        id,
        spu_code,
        name,
        description,
        category_id,
        brand_id,
        unit,
        is_on_sale,
        status,
        metadata,
        sku_count,
        total_stock,
        min_price,
        max_price,
        created_at,
        updated_at,
    ) in rows
    {
        let skus = get_skus_by_spu_id(conn, &id).unwrap_or_default();
        let images = get_images_by_spu_id(conn, &id).unwrap_or_default();
        spus.push(ProductSPU {
            id,
            spu_code,
            name,
            description,
            category_id,
            brand_id,
            unit,
            is_on_sale,
            status,
            metadata,
            skus,
            images,
            sku_count,
            total_stock,
            min_price,
            max_price,
            created_at,
            updated_at,
        });
    }

    Ok(spus)
}

/// 根据ID获取SPU详情
#[tauri::command]
pub fn get_product_spu_by_id(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<Option<ProductSPU>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let mut stmt = conn
        .prepare(
            "SELECT id, spu_code, name, description, category_id, brand_id, unit,
                is_on_sale, status, metadata, sku_count, total_stock, min_price, max_price,
                created_at, updated_at
         FROM v_spu_inventory WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let spu = stmt
        .query_row(params![id], |row| {
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
        })
        .optional()
        .map_err(|e| e.to_string())?;

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
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM product_spus WHERE id = ?1)",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

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

    let sql = format!(
        "UPDATE product_spus SET {} WHERE id = ?",
        set_clauses.join(", ")
    );
    values.push(Box::new(id.clone()));

    let params_refs: Vec<&dyn rusqlite::ToSql> = values.iter().map(|v| v.as_ref()).collect();
    conn.execute(&sql, params_refs.as_slice())
        .map_err(|e| e.to_string())?;

    get_product_spu_by_id_inner(conn, &id).ok_or_else(|| "SPU not found after update".to_string())
}

/// 删除SPU（软删除）
#[tauri::command]
pub fn delete_product_spu(db: tauri::State<Mutex<Database>>, id: String) -> Result<(), String> {
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
fn get_skus_by_spu_id(
    conn: &rusqlite::Connection,
    spu_id: &str,
) -> Result<Vec<ProductSKU>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, spu_id, sku_code, specifications, spec_text, cost_price, sell_price,
                current_stock, min_stock, max_stock, barcode, weight, volume,
                is_default, sort_order, is_active, created_at, updated_at
         FROM product_skus WHERE spu_id = ?1 AND deleted_at IS NULL ORDER BY sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let skus = stmt
        .query_map(params![spu_id], |row| {
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
        })
        .map_err(|e| e.to_string())?;

    skus.collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 根据SPU ID获取图片列表
fn get_images_by_spu_id(
    conn: &rusqlite::Connection,
    spu_id: &str,
) -> Result<Vec<ProductImage>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, spu_id, image_url, image_type, sort_order, is_primary, created_at
         FROM product_images WHERE spu_id = ?1 ORDER BY sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let images = stmt
        .query_map(params![spu_id], |row| {
            Ok(ProductImage {
                id: row.get(0)?,
                spu_id: row.get(1)?,
                image_url: row.get(2)?,
                image_type: row.get(3)?,
                sort_order: row.get(4)?,
                is_primary: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    images
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 根据 product_id 获取图片列表（中等优先级 TODO #1 治理）
/// 复用了现有的 product_images 表（product_id 列为单 product 模式关联）
fn get_images_by_product_id(
    conn: &rusqlite::Connection,
    product_id: &str,
) -> Result<Vec<ProductImage>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, spu_id, image_url, image_type, sort_order, is_primary, created_at
             FROM product_images WHERE product_id = ?1 ORDER BY sort_order ASC",
        )
        .map_err(|e| e.to_string())?;

    let images = stmt
        .query_map(params![product_id], |row| {
            Ok(ProductImage {
                id: row.get(0)?,
                // 单 product 模式下 spu_id 为空字符串
                spu_id: row.get::<_, Option<String>>(1)?.unwrap_or_default(),
                image_url: row.get(2)?,
                image_type: row.get(3)?,
                sort_order: row.get(4)?,
                is_primary: row.get(5)?,
                created_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;

    images
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())
}

/// 原子地替换某个产品的多图列表（中等优先级 TODO #1 治理）
///
/// 流程：事务内先删旧图（按 product_id），再批量插入新图。
/// 同时更新 products.image_url 主图为第一张（向后兼容旧渲染逻辑）。
#[tauri::command]
pub fn set_product_gallery(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    image_urls: Vec<String>,
) -> Result<Vec<ProductImage>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 验证产品存在
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
            params![product_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if !exists {
        return Err(format!("Product {} not found", product_id));
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 删除该产品的旧图
    tx.execute(
        "DELETE FROM product_images WHERE product_id = ?1",
        params![product_id],
    )
    .map_err(|e| e.to_string())?;

    // 插入新图（第一张主图，后续 gallery）
    let mut result = Vec::new();
    for (index, url) in image_urls.iter().enumerate() {
        if url.is_empty() {
            continue;
        }
        let image_id = Uuid::new_v4().to_string();
        let is_primary = index == 0;

        tx.execute(
            "INSERT INTO product_images (id, product_id, image_url, image_type, sort_order, is_primary, sync_status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending')",
            params![
                image_id,
                product_id,
                url,
                if is_primary { "main" } else { "gallery" },
                index as i32,
                is_primary,
            ],
        )
        .map_err(|e| e.to_string())?;

        result.push(ProductImage {
            id: image_id,
            spu_id: String::new(),
            image_url: url.clone(),
            image_type: if is_primary {
                "main".to_string()
            } else {
                "gallery".to_string()
            },
            sort_order: index as i32,
            is_primary,
            created_at: String::new(),
        });
    }

    // 同步 products.image_url 主图为第一张（向后兼容旧渲染逻辑）
    let main_url = image_urls.first().cloned().filter(|s| !s.is_empty());
    tx.execute(
        "UPDATE products SET image_url = ?1, sync_status = 'pending' WHERE id = ?2",
        params![main_url, product_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(result)
}

/// 内部函数：根据ID获取SPU（不含SKU和图片）
fn get_product_spu_by_id_inner(conn: &rusqlite::Connection, id: &str) -> Option<ProductSPU> {
    let mut stmt = conn
        .prepare(
            "SELECT id, spu_code, name, description, category_id, brand_id, unit,
                is_on_sale, status, metadata, sku_count, total_stock, min_price, max_price,
                created_at, updated_at
         FROM v_spu_inventory WHERE id = ?1",
        )
        .ok()?;

    let spu = stmt
        .query_row(params![id], |row| {
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
        })
        .ok();

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
    let has_spus: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM product_spus LIMIT 1)",
            [],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if has_spus {
        Ok("ecommerce".to_string())
    } else {
        Ok("simple".to_string())
    }
}

/// 从简单商品库迁移到电商商品库
#[tauri::command]
pub fn migrate_to_ecommerce_mode(
    db: tauri::State<Mutex<Database>>,
) -> Result<MigrationResult, String> {
    let start_time = Instant::now();
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 1. 检查是否已迁移
    let has_spus: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM product_spus LIMIT 1)",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

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
    let products: Vec<(
        String,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        f64,
        f64,
        i32,
        i32,
        i32,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
    )>;

    {
        let mut stmt = tx
            .prepare(
                "SELECT id, sku, name, description, category_id, brand_id, unit,
                    cost_price, sell_price, min_stock, max_stock, current_stock,
                    image_url, barcode, metadata, created_at
             FROM products WHERE deleted_at IS NULL",
            )
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,          // id
                    row.get::<_, String>(1)?,          // sku
                    row.get::<_, String>(2)?,          // name
                    row.get::<_, Option<String>>(3)?,  // description
                    row.get::<_, Option<String>>(4)?,  // category_id
                    row.get::<_, Option<String>>(5)?,  // brand_id
                    row.get::<_, String>(6)?,          // unit
                    row.get::<_, f64>(7)?,             // cost_price
                    row.get::<_, f64>(8)?,             // sell_price
                    row.get::<_, i32>(9)?,             // min_stock
                    row.get::<_, i32>(10)?,            // max_stock
                    row.get::<_, i32>(11)?,            // current_stock
                    row.get::<_, Option<String>>(12)?, // image_url
                    row.get::<_, Option<String>>(13)?, // barcode
                    row.get::<_, Option<String>>(14)?, // metadata
                    row.get::<_, String>(15)?,         // created_at
                ))
            })
            .map_err(|e| e.to_string())?;

        products = rows.filter_map(|r| r.ok()).collect();
    } // stmt和rows在这里被drop

    for product in products {
        let (
            id,
            _sku,
            name,
            description,
            category_id,
            brand_id,
            unit,
            cost_price,
            sell_price,
            min_stock,
            max_stock,
            current_stock,
            image_url,
            barcode,
            metadata,
            _,
        ) = product;

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
pub fn downgrade_to_simple_mode(db: tauri::State<Mutex<Database>>) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 警告：这个操作会删除所有SPU/SKU/Image数据
    // 在实际应用中，应该有更复杂的逻辑来保留重要数据

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 删除所有图片
    tx.execute("DELETE FROM product_images", [])
        .map_err(|e| e.to_string())?;

    // 删除所有SKU
    tx.execute("DELETE FROM product_skus", [])
        .map_err(|e| e.to_string())?;

    // 删除所有SPU
    tx.execute("DELETE FROM product_spus", [])
        .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    Ok(())
}

// ==================== 演示数据 Seed 命令（ProClaw 1.0.0）====================
// 演示账号 `boss / IamBigBoss` 首次登录时自动注入 20 个 iPhone 电池 SPU。
// 同时写入简单模式 products 表与电商模式 product_spus / product_skus 表，保持一致。

/// 单条演示产品定义
struct DemoSeedItem {
    id: &'static str,
    spu_code: &'static str,
    name: &'static str,
    category_id: &'static str,
    brand_id: &'static str,
    unit: &'static str,
    cost_price: f64,
    sell_price: f64,
    current_stock: i32,
    min_stock: i32,
    max_stock: i32,
    barcode: &'static str,
    sort_order: i32,
    created_at: &'static str,
}

const DEMO_SEED_ITEMS: &[DemoSeedItem] = &[
    DemoSeedItem {
        id: "spu_iphone15pm_bat",
        spu_code: "SPU-2026-001",
        name: "iPhone 15 Pro Max 电池",
        category_id: "cat_iphone15",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 80.0,
        sell_price: 199.0,
        current_stock: 50,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560001",
        sort_order: 1,
        created_at: "2025-01-15T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone15pro_bat",
        spu_code: "SPU-2026-002",
        name: "iPhone 15 Pro 电池",
        category_id: "cat_iphone15",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 70.0,
        sell_price: 179.0,
        current_stock: 50,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560002",
        sort_order: 2,
        created_at: "2025-01-16T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone15_bat",
        spu_code: "SPU-2026-003",
        name: "iPhone 15 电池",
        category_id: "cat_iphone15",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 60.0,
        sell_price: 159.0,
        current_stock: 60,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560003",
        sort_order: 3,
        created_at: "2025-01-17T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone15plus_bat",
        spu_code: "SPU-2026-004",
        name: "iPhone 15 Plus 电池",
        category_id: "cat_iphone15",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 85.0,
        sell_price: 189.0,
        current_stock: 45,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560004",
        sort_order: 4,
        created_at: "2025-01-18T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone14pm_bat",
        spu_code: "SPU-2026-005",
        name: "iPhone 14 Pro Max 电池",
        category_id: "cat_iphone14",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 75.0,
        sell_price: 179.0,
        current_stock: 45,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560005",
        sort_order: 5,
        created_at: "2025-02-01T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone14pro_bat",
        spu_code: "SPU-2026-006",
        name: "iPhone 14 Pro 电池",
        category_id: "cat_iphone14",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 65.0,
        sell_price: 159.0,
        current_stock: 55,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560006",
        sort_order: 6,
        created_at: "2025-02-02T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone14_bat",
        spu_code: "SPU-2026-007",
        name: "iPhone 14 电池",
        category_id: "cat_iphone14",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 60.0,
        sell_price: 149.0,
        current_stock: 60,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560007",
        sort_order: 7,
        created_at: "2025-02-03T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone14plus_bat",
        spu_code: "SPU-2026-008",
        name: "iPhone 14 Plus 电池",
        category_id: "cat_iphone14",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 80.0,
        sell_price: 169.0,
        current_stock: 40,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560008",
        sort_order: 8,
        created_at: "2025-02-04T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone13pm_bat",
        spu_code: "SPU-2026-009",
        name: "iPhone 13 Pro Max 电池",
        category_id: "cat_iphone13",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 70.0,
        sell_price: 169.0,
        current_stock: 50,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560009",
        sort_order: 9,
        created_at: "2025-03-01T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone13pro_bat",
        spu_code: "SPU-2026-010",
        name: "iPhone 13 Pro 电池",
        category_id: "cat_iphone13",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 60.0,
        sell_price: 149.0,
        current_stock: 55,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560010",
        sort_order: 10,
        created_at: "2025-03-02T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone13_bat",
        spu_code: "SPU-2026-011",
        name: "iPhone 13 电池",
        category_id: "cat_iphone13",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 55.0,
        sell_price: 139.0,
        current_stock: 60,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560011",
        sort_order: 11,
        created_at: "2025-03-03T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone13mini_bat",
        spu_code: "SPU-2026-012",
        name: "iPhone 13 mini 电池",
        category_id: "cat_iphone13",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 45.0,
        sell_price: 119.0,
        current_stock: 35,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560012",
        sort_order: 12,
        created_at: "2025-03-04T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone12pm_bat",
        spu_code: "SPU-2026-013",
        name: "iPhone 12 Pro Max 电池",
        category_id: "cat_iphone12",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 65.0,
        sell_price: 159.0,
        current_stock: 45,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560013",
        sort_order: 13,
        created_at: "2025-04-01T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone12pro_bat",
        spu_code: "SPU-2026-014",
        name: "iPhone 12 Pro 电池",
        category_id: "cat_iphone12",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 55.0,
        sell_price: 139.0,
        current_stock: 55,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560014",
        sort_order: 14,
        created_at: "2025-04-02T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone12_bat",
        spu_code: "SPU-2026-015",
        name: "iPhone 12 电池",
        category_id: "cat_iphone12",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 55.0,
        sell_price: 129.0,
        current_stock: 60,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560015",
        sort_order: 15,
        created_at: "2025-04-03T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone12mini_bat",
        spu_code: "SPU-2026-016",
        name: "iPhone 12 mini 电池",
        category_id: "cat_iphone12",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 40.0,
        sell_price: 109.0,
        current_stock: 40,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560016",
        sort_order: 16,
        created_at: "2025-04-04T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone11pm_bat",
        spu_code: "SPU-2026-017",
        name: "iPhone 11 Pro Max 电池",
        category_id: "cat_iphone11",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 60.0,
        sell_price: 149.0,
        current_stock: 40,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560017",
        sort_order: 17,
        created_at: "2025-05-01T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone11pro_bat",
        spu_code: "SPU-2026-018",
        name: "iPhone 11 Pro 电池",
        category_id: "cat_iphone11",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 50.0,
        sell_price: 129.0,
        current_stock: 50,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560018",
        sort_order: 18,
        created_at: "2025-05-02T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphone11_bat",
        spu_code: "SPU-2026-019",
        name: "iPhone 11 电池",
        category_id: "cat_iphone11",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 50.0,
        sell_price: 119.0,
        current_stock: 60,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560019",
        sort_order: 19,
        created_at: "2025-05-03T00:00:00Z",
    },
    DemoSeedItem {
        id: "spu_iphonese3_bat",
        spu_code: "SPU-2026-020",
        name: "iPhone SE (第三代) 电池",
        category_id: "cat_iphonese",
        brand_id: "brand_apple",
        unit: "块",
        cost_price: 25.0,
        sell_price: 59.0,
        current_stock: 45,
        min_stock: 5,
        max_stock: 100,
        barcode: "6931234560020",
        sort_order: 20,
        created_at: "2025-06-01T00:00:00Z",
    },
];

/// 幂等插入 20 个演示产品（同时写入 simple / ecommerce 两套表）
/// 返回实际新增的数量（已存在则不计数）。
#[tauri::command]
pub fn seed_demo_products(
    db: tauri::State<Mutex<Database>>,
    force: Option<bool>,
) -> Result<i32, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let force = force.unwrap_or(false);

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    // 外键约束：先确保分类与品牌存在（与 seed_iphone_batteries.sql 对齐）
    tx.execute_batch(
        "INSERT OR IGNORE INTO product_categories (id, name, parent_id, sort_order, is_active, created_at, updated_at)
         VALUES
           ('cat_iphone15', 'iPhone 15 系列', NULL, 10, 1, datetime('now'), datetime('now')),
           ('cat_iphone14', 'iPhone 14 系列', NULL, 20, 1, datetime('now'), datetime('now')),
           ('cat_iphone13', 'iPhone 13 系列', NULL, 30, 1, datetime('now'), datetime('now')),
           ('cat_iphone12', 'iPhone 12 系列', NULL, 40, 1, datetime('now'), datetime('now')),
           ('cat_iphone11', 'iPhone 11 系列', NULL, 50, 1, datetime('now'), datetime('now')),
           ('cat_iphonese', 'iPhone SE 系列', NULL, 60, 1, datetime('now'), datetime('now'));
         INSERT OR IGNORE INTO brands (id, name, is_active, created_at, updated_at)
         VALUES ('brand_apple', 'Apple', 1, datetime('now'), datetime('now'));",
    )
    .map_err(|e| format!("seed 分类/品牌失败: {}", e))?;

    let mut inserted = 0i32;

    for item in DEMO_SEED_ITEMS {
        // 幂等检查：products 表
        let exists_simple: bool = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 OR sku = ?2)",
                params![item.id, item.spu_code],
                |row| row.get(0),
            )
            .unwrap_or(false);
        // 幂等检查：product_spus 表
        let exists_spu: bool = tx
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM product_spus WHERE id = ?1 OR spu_code = ?2)",
                params![item.id, item.spu_code],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !force && (exists_simple || exists_spu) {
            continue;
        }

        // 1) 插入 simple 模式 products 表（库存管理页可见）
        if force || !exists_simple {
            tx.execute(
                "INSERT OR REPLACE INTO products (id, sku, name, description, category_id, brand_id, unit,
                 cost_price, sell_price, min_stock, max_stock, current_stock,
                 image_url, barcode, is_active, metadata, sync_status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, 1, ?15, 'synced',
                         COALESCE(NULLIF(?16, ''), datetime('now')),
                         COALESCE(NULLIF(?16, ''), datetime('now')))",
                params![
                    item.id,
                    item.spu_code,
                    item.name,
                    Option::<String>::None,                                     // description
                    item.category_id,
                    item.brand_id,
                    item.unit,
                    item.cost_price,
                    item.sell_price,
                    item.min_stock,
                    item.max_stock,
                    item.current_stock,
                    Option::<String>::None,                                     // image_url（由 fetch_demo 从网上下载后写入）
                    item.barcode,
                    Some(format!("{{\"demo_seed\":true,\"spu_code\":\"{}\"}}", item.spu_code)), // metadata
                    item.created_at,
                ],
            ).map_err(|e| format!("seed products 失败 ({}): {}", item.spu_code, e))?;
        }

        // 2) 插入电商模式 product_spus
        if force || !exists_spu {
            tx.execute(
                "INSERT OR REPLACE INTO product_spus (id, spu_code, name, description, category_id, brand_id, unit,
                 is_on_sale, status, metadata, sync_status, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'on_sale', ?8, 'synced',
                         COALESCE(NULLIF(?9, ''), datetime('now')),
                         COALESCE(NULLIF(?9, ''), datetime('now')))",
                params![
                    item.id,
                    item.spu_code,
                    item.name,
                    Option::<String>::None,
                    item.category_id,
                    item.brand_id,
                    item.unit,
                    Some(format!("{{\"demo_seed\":true}}")),
                    item.created_at,
                ],
            ).map_err(|e| format!("seed product_spus 失败 ({}): {}", item.spu_code, e))?;

            // 3) 插入默认 SKU（标准版）
            let sku_id = format!("{}_sku", item.id);
            let sku_code = item.spu_code.replace("SPU-", "SKU-");
            let specifications = "{\"标准\": \"标准版\"}";
            tx.execute(
                "INSERT OR REPLACE INTO product_skus (id, spu_id, sku_code, specifications, spec_text,
                 cost_price, sell_price, current_stock, min_stock, max_stock, barcode,
                 is_default, sort_order, is_active, sync_status)
                 VALUES (?1, ?2, ?3, ?4, '标准版', ?5, ?6, ?7, ?8, ?9, ?10, 1, ?11, 1, 'synced')",
                params![
                    sku_id,
                    item.id,
                    sku_code,
                    specifications,
                    item.cost_price,
                    item.sell_price,
                    item.current_stock,
                    item.min_stock,
                    item.max_stock,
                    item.barcode,
                    item.sort_order,
                ],
            ).map_err(|e| format!("seed product_skus 失败 ({}): {}", item.spu_code, e))?;
        }

        inserted += 1;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(inserted)
}

/// 设置 SPU 主图（演示自动配图 / AI 找图结果写入）
#[tauri::command]
pub fn set_spu_main_image(
    db: tauri::State<Mutex<Database>>,
    spu_id: String,
    image_id: String,
    image_url: String,
) -> Result<(), String> {
    if image_url.trim().is_empty() {
        return Err("image_url 不能为空".to_string());
    }

    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "INSERT OR REPLACE INTO product_images (id, spu_id, image_url, image_type, sort_order, is_primary, sync_status)
         VALUES (?1, ?2, ?3, 'main', 0, 1, 'synced')",
        params![image_id, spu_id, image_url],
    )
    .map_err(|e| format!("写入 product_images 失败: {}", e))?;

    tx.execute(
        "UPDATE products SET image_url = ?1, updated_at = datetime('now'), sync_status = 'synced' WHERE id = ?2",
        params![image_url, spu_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

/// 标记云商城为「演示数据」（仅后端记录，不影响 UI）
#[tauri::command]
pub fn mark_store_as_demo(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    // 检查 cloud_stores 表是否存在 theme_data 列，若不存在则跳过（保持向后兼容）
    let _ = conn.execute(
        "UPDATE cloud_stores SET theme_data = json_insert(COALESCE(theme_data, '{}'), '$.is_demo_data', 1) WHERE id = ?1",
        params![store_id],
    );
    Ok(())
}
