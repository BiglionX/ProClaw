# Rust 后端 SPU/SKU 命令实现指南

## 📋 概述

本文档提供在 `src-tauri/src/commands.rs` 和 `database.rs` 中实现SPU/SKU相关Tauri命令的参考代码。

---

## 🔧 需要添加的命令

### 1. SPU管理命令

#### create_product_spu
```rust
#[tauri::command]
pub fn create_product_spu(
    db: tauri::State<Mutex<Database>>,
    spu: serde_json::Value,
    skus: Vec<serde_json::Value>,
    images: Vec<String>,
) -> Result<ProductSPU, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    // 开始事务
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    // 1. 创建SPU
    let spu_id = Uuid::new_v4().to_string();
    tx.execute(
        "INSERT INTO product_spu (id, spu_code, name, subtitle, description, 
         category_id, brand_id, unit, weight, length, width, height,
         seo_title, seo_description, seo_keywords, is_on_sale, is_featured, 
         sort_order, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 
                 ?14, ?15, ?16, ?17, ?18, ?19)",
        params![
            spu_id,
            spu["spu_code"].as_str().ok_or("spu_code required")?,
            spu["name"].as_str().ok_or("name required")?,
            spu.get("subtitle").and_then(|v| v.as_str()),
            spu.get("description").and_then(|v| v.as_str()),
            spu.get("category_id").and_then(|v| v.as_str()),
            spu.get("brand_id").and_then(|v| v.as_str()),
            spu.get("unit").and_then(|v| v.as_str()).unwrap_or("件"),
            spu.get("weight").and_then(|v| v.as_f64()),
            spu.get("length").and_then(|v| v.as_f64()),
            spu.get("width").and_then(|v| v.as_f64()),
            spu.get("height").and_then(|v| v.as_f64()),
            spu.get("seo_title").and_then(|v| v.as_str()),
            spu.get("seo_description").and_then(|v| v.as_str()),
            spu.get("seo_keywords").and_then(|v| v.as_str()),
            spu.get("is_on_sale").and_then(|v| v.as_bool()).unwrap_or(true),
            spu.get("is_featured").and_then(|v| v.as_bool()).unwrap_or(false),
            spu.get("sort_order").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            "draft"
        ],
    ).map_err(|e| e.to_string())?;
    
    // 2. 批量创建SKU
    for sku_data in &skus {
        let sku_id = Uuid::new_v4().to_string();
        let specs_json = serde_json::to_string(&sku_data["specifications"])
            .unwrap_or_else(|_| "{}".to_string());
        
        tx.execute(
            "INSERT INTO product_sku (id, spu_id, sku_code, specifications, 
             spec_text, cost_price, sell_price, market_price, current_stock,
             min_stock, max_stock, barcode, is_default, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                sku_id,
                spu_id,
                sku_data["sku_code"].as_str().ok_or("sku_code required")?,
                specs_json,
                sku_data["spec_text"].as_str().ok_or("spec_text required")?,
                sku_data["cost_price"].as_f64().unwrap_or(0.0),
                sku_data["sell_price"].as_f64().unwrap_or(0.0),
                sku_data.get("market_price").and_then(|v| v.as_f64()),
                sku_data.get("current_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                sku_data.get("min_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
                sku_data.get("max_stock").and_then(|v| v.as_i64()).unwrap_or(999999) as i32,
                sku_data.get("barcode").and_then(|v| v.as_str()),
                sku_data.get("is_default").and_then(|v| v.as_bool()).unwrap_or(false),
                "active"
            ],
        ).map_err(|e| e.to_string())?;
    }
    
    // 3. 批量保存图片
    for (idx, image_url) in images.iter().enumerate() {
        let image_id = Uuid::new_v4().to_string();
        let image_type = if idx == 0 { "main" } else { "gallery" };
        
        tx.execute(
            "INSERT INTO product_images (id, spu_id, image_url, image_type, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![image_id, spu_id, image_url, image_type, idx as i32],
        ).map_err(|e| e.to_string())?;
    }
    
    // 提交事务
    tx.commit().map_err(|e| e.to_string())?;
    
    // 返回完整的SPU信息
    get_product_spu_by_id_inner(conn, &spu_id).ok_or_else(|| "Failed to retrieve created SPU".to_string())
}
```

#### get_product_spus
```rust
#[tauri::command]
pub fn get_product_spus(
    db: tauri::State<Mutex<Database>>,
    options: Option<serde_json::Value>,
) -> Result<Vec<ProductSPU>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    let mut query = "SELECT * FROM product_spu WHERE deleted_at IS NULL".to_string();
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![];
    
    // 添加筛选条件
    if let Some(opts) = &options {
        if let Some(category_id) = opts.get("category_id").and_then(|v| v.as_str()) {
            query.push_str(" AND category_id = ?");
            params_vec.push(category_id);
        }
        if let Some(brand_id) = opts.get("brand_id").and_then(|v| v.as_str()) {
            query.push_str(" AND brand_id = ?");
            params_vec.push(brand_id);
        }
        if let Some(status) = opts.get("status").and_then(|v| v.as_str()) {
            query.push_str(" AND status = ?");
            params_vec.push(status);
        }
        if let Some(search) = opts.get("search").and_then(|v| v.as_str()) {
            query.push_str(" AND (name LIKE ? OR spu_code LIKE ?)");
            let search_pattern = format!("%{}%", search);
            params_vec.push(&search_pattern);
            params_vec.push(&search_pattern);
        }
    }
    
    query.push_str(" ORDER BY created_at DESC");
    
    // 添加分页
    if let Some(opts) = &options {
        let limit = opts.get("limit").and_then(|v| v.as_i64()).unwrap_or(50);
        let offset = opts.get("offset").and_then(|v| v.as_i64()).unwrap_or(0);
        query.push_str(" LIMIT ? OFFSET ?");
        params_vec.push(&limit);
        params_vec.push(&offset);
    }
    
    // 执行查询并组装结果
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    let spus = stmt.query_map(rusqlite::params_from_iter(params_vec.iter()), |row| {
        // 解析SPU数据
        Ok(ProductSPU { /* ... */ })
    }).map_err(|e| e.to_string())?;
    
    // 为每个SPU加载SKU和图片
    let mut result = vec![];
    for spu in spus {
        let mut spu_data = spu.map_err(|e| e.to_string())?;
        spu_data.skus = get_skus_by_spu_id(conn, &spu_data.id)?;
        spu_data.images = get_images_by_spu_id(conn, &spu_data.id)?;
        result.push(spu_data);
    }
    
    Ok(result)
}
```

#### get_product_spu_by_id
```rust
#[tauri::command]
pub fn get_product_spu_by_id(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<ProductSPU, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    get_product_spu_by_id_inner(conn, &id)
        .ok_or_else(|| "SPU not found".to_string())
}

fn get_product_spu_by_id_inner(conn: &Connection, id: &str) -> Option<ProductSPU> {
    let mut stmt = conn.prepare(
        "SELECT * FROM product_spu WHERE id = ?1 AND deleted_at IS NULL"
    ).ok()?;
    
    let mut rows = stmt.query(params![id]).ok()?;
    
    if let Some(row) = rows.next().ok()? {
        let mut spu = ProductSPU {
            id: row.get(0).ok()?,
            spu_code: row.get(1).ok()?,
            name: row.get(2).ok()?,
            // ... 其他字段
        };
        
        // 加载关联数据
        spu.skus = get_skus_by_spu_id(conn, id).ok();
        spu.images = get_images_by_spu_id(conn, id).ok();
        spu.attributes = get_spu_attributes(conn, id).ok();
        
        Some(spu)
    } else {
        None
    }
}
```

#### update_product_spu
```rust
#[tauri::command]
pub fn update_product_spu(
    db: tauri::State<Mutex<Database>>,
    id: String,
    updates: serde_json::Value,
) -> Result<ProductSPU, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    // 构建动态UPDATE语句
    let mut set_clauses = vec![];
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![];
    
    if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
        set_clauses.push("name = ?");
        params_vec.push(name);
    }
    // ... 处理其他可更新字段
    
    if set_clauses.is_empty() {
        return Err("No fields to update".to_string());
    }
    
    params_vec.push(&id);
    let query = format!(
        "UPDATE product_spu SET {} WHERE id = ?",
        set_clauses.join(", ")
    );
    
    conn.execute(&query, rusqlite::params_from_iter(params_vec.iter()))
        .map_err(|e| e.to_string())?;
    
    get_product_spu_by_id_inner(conn, &id)
        .ok_or_else(|| "SPU not found".to_string())
}
```

#### delete_product_spu
```rust
#[tauri::command]
pub fn delete_product_spu(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    // 软删除
    conn.execute(
        "UPDATE product_spu SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 2. SKU管理命令

#### create_product_sku
```rust
#[tauri::command]
pub fn create_product_sku(
    db: tauri::State<Mutex<Database>>,
    spu_id: String,
    sku: serde_json::Value,
) -> Result<ProductSKU, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    let id = Uuid::new_v4().to_string();
    let specs_json = serde_json::to_string(&sku["specifications"]).unwrap_or_else(|_| "{}".to_string());
    
    conn.execute(
        "INSERT INTO product_sku (id, spu_id, sku_code, specifications, spec_text,
         cost_price, sell_price, market_price, current_stock, min_stock, max_stock,
         barcode, is_default, status)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id,
            spu_id,
            sku["sku_code"].as_str().ok_or("sku_code required")?,
            specs_json,
            sku["spec_text"].as_str().ok_or("spec_text required")?,
            sku["cost_price"].as_f64().unwrap_or(0.0),
            sku["sell_price"].as_f64().unwrap_or(0.0),
            sku.get("market_price").and_then(|v| v.as_f64()),
            sku.get("current_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            sku.get("min_stock").and_then(|v| v.as_i64()).unwrap_or(0) as i32,
            sku.get("max_stock").and_then(|v| v.as_i64()).unwrap_or(999999) as i32,
            sku.get("barcode").and_then(|v| v.as_str()),
            sku.get("is_default").and_then(|v| v.as_bool()).unwrap_or(false),
            "active"
        ],
    ).map_err(|e| e.to_string())?;
    
    get_sku_by_id(conn, &id).ok_or_else(|| "Failed to retrieve created SKU".to_string())
}
```

#### update_product_sku
```rust
#[tauri::command]
pub fn update_product_sku(
    db: tauri::State<Mutex<Database>>,
    id: String,
    updates: serde_json::Value,
) -> Result<ProductSKU, String> {
    // 类似 update_product_spu 的实现
    todo!()
}
```

#### delete_product_sku
```rust
#[tauri::command]
pub fn delete_product_sku(
    db: tauri::State<Mutex<Database>>,
    id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    conn.execute(
        "UPDATE product_sku SET status = 'inactive' WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

### 3. 图片管理命令

#### upload_product_images
```rust
#[tauri::command]
pub fn upload_product_images(
    db: tauri::State<Mutex<Database>>,
    spu_id: String,
    image_urls: Vec<String>,
) -> Result<Vec<ProductImage>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    // 获取当前最大sort_order
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) FROM product_images WHERE spu_id = ?1",
        params![spu_id],
        |row| row.get(0)
    ).unwrap_or(-1);
    
    let mut images = vec![];
    for (idx, url) in image_urls.iter().enumerate() {
        let id = Uuid::new_v4().to_string();
        let image_type = if idx == 0 && max_order < 0 { "main" } else { "gallery" };
        let sort_order = max_order + 1 + idx as i32;
        
        conn.execute(
            "INSERT INTO product_images (id, spu_id, image_url, image_type, sort_order)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, spu_id, url, image_type, sort_order],
        ).map_err(|e| e.to_string())?;
        
        images.push(ProductImage {
            id,
            spu_id: spu_id.clone(),
            image_url: url.clone(),
            image_type,
            sort_order,
            alt_text: None,
        });
    }
    
    Ok(images)
}
```

#### delete_product_image
```rust
#[tauri::command]
pub fn delete_product_image(
    db: tauri::State<Mutex<Database>>,
    image_id: String,
) -> Result<(), String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    
    conn.execute(
        "DELETE FROM product_images WHERE id = ?1",
        params![image_id],
    ).map_err(|e| e.to_string())?;
    
    Ok(())
}
```

---

## 📦 数据类型定义

在 `commands.rs` 顶部添加:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSPU {
    pub id: String,
    pub spu_code: String,
    pub name: String,
    pub subtitle: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: String,
    pub weight: Option<f64>,
    pub length: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub seo_title: Option<String>,
    pub seo_description: Option<String>,
    pub seo_keywords: Option<String>,
    pub is_on_sale: bool,
    pub is_featured: bool,
    pub sort_order: i32,
    pub status: String,
    pub images: Option<Vec<ProductImage>>,
    pub skus: Option<Vec<ProductSKU>>,
    pub attributes: Option<Vec<SPUAttributeValue>>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductSKU {
    pub id: String,
    pub spu_id: String,
    pub sku_code: String,
    pub specifications: serde_json::Value,
    pub spec_text: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub market_price: Option<f64>,
    pub current_stock: i32,
    pub min_stock: i32,
    pub max_stock: i32,
    pub barcode: Option<String>,
    pub is_default: bool,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductImage {
    pub id: String,
    pub spu_id: String,
    pub image_url: String,
    pub image_type: String,
    pub sort_order: i32,
    pub alt_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductAttribute {
    pub id: String,
    pub name: String,
    pub r#type: String,
    pub options: Option<Vec<String>>,
    pub is_required: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SPUAttributeValue {
    pub id: String,
    pub spu_id: String,
    pub attribute_id: String,
    pub value_text: Option<String>,
    pub value_number: Option<f64>,
    pub value_boolean: Option<bool>,
    pub attribute: Option<ProductAttribute>,
}
```

---

## 🔌 注册命令

在 `main.rs` 的 `.invoke_handler()` 中添加:

```rust
.invoke_handler(tauri::generate_handler![
    // ... 现有命令
    commands::create_product_spu,
    commands::get_product_spus,
    commands::get_product_spu_by_id,
    commands::update_product_spu,
    commands::delete_product_spu,
    commands::create_product_sku,
    commands::update_product_sku,
    commands::delete_product_sku,
    commands::upload_product_images,
    commands::delete_product_image,
])
```

---

## ⚠️ 注意事项

1. **事务处理**: SPU、SKU、图片的创建必须在同一事务中完成
2. **错误处理**: 所有数据库操作都需要适当的错误处理
3. **参数验证**: 对输入参数进行充分验证
4. **性能优化**: 使用索引和优化查询
5. **JSON序列化**: specifications字段使用JSONB存储

---

**文档版本**: 1.0.0  
**创建日期**: 2026-04-15  
**状态**: 待实现
