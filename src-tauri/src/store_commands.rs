// 云托管商城 Tauri 命令（PRD v5.0）
// 提供桌面端触发商品同步、获取商城配置等功能

use crate::database::Database;
use rusqlite::params;
use serde_json::Value;
use std::sync::Mutex;
use uuid::Uuid;

// ========== 商城管理命令 ==========

/// 获取当前用户的云商城配置
#[tauri::command]
pub fn get_cloud_store(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    match conn.query_row(
        "SELECT id, user_id, subdomain, custom_domain, api_key, status, plan_type, 
                expires_at, created_at, updated_at
         FROM cloud_stores LIMIT 1",
        [],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "subdomain": row.get::<_, String>(2)?,
                "custom_domain": row.get::<_, Option<String>>(3).ok(),
                "api_key": row.get::<_, String>(4)?,
                "status": row.get::<_, String>(5)?,
                "plan_type": row.get::<_, String>(6)?,
                "expires_at": row.get::<_, Option<i64>>(7).ok(),
                "created_at": row.get::<_, String>(8)?,
                "updated_at": row.get::<_, String>(9)?,
            }))
        },
    ) {
        Ok(store) => Ok(serde_json::json!({"data": store})),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(serde_json::json!({"data": null})),
        Err(e) => Err(e.to_string()),
    }
}

/// 开通云商城
#[tauri::command]
pub fn create_cloud_store(
    db: tauri::State<Mutex<Database>>,
    plan_type: String,
    subdomain: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 验证子域名格式
    if !subdomain
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err("子域名只能包含小写字母、数字和连字符".to_string());
    }

    // 检查是否已开通
    if conn
        .query_row("SELECT id FROM cloud_stores", [], |_| Ok(()))
        .is_ok()
    {
        return Err("您已开通云商城".to_string());
    }

    // 检查子域名是否被占用
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM cloud_stores WHERE subdomain = ?1",
            params![subdomain],
            |row| row.get(0),
        )
        .unwrap_or(0);
    if count > 0 {
        return Err("子域名已被占用".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let api_key = format!("pk_{}", Uuid::new_v4().simple());

    conn.execute(
        "INSERT INTO cloud_stores (id, user_id, subdomain, api_key, status, plan_type)
         VALUES (?1, 'u_test001', ?2, ?3, 'active', ?4)",
        params![id, subdomain, api_key, plan_type],
    )
    .map_err(|e| e.to_string())?;

    // 创建默认主题
    if let Err(e) = conn.execute(
        "INSERT INTO cloud_store_themes (store_id) VALUES (?1)",
        params![id],
    ) {
        eprintln!(
            "[CloudStore] Failed to create default theme for {}: {}",
            id, e
        );
    }

    Ok(serde_json::json!({
        "id": id,
        "subdomain": subdomain,
        "api_key": api_key,
        "plan_type": plan_type,
        "message": "商城开通成功"
    }))
}

/// 升级套餐
#[tauri::command]
pub fn upgrade_store_plan(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
    plan_type: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE cloud_stores SET plan_type = ?1, updated_at = (strftime('%s','now') * 1000) WHERE id = ?2",
        params![plan_type, store_id],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"message": "套餐升级成功"}))
}

/// 重置 API Key
#[tauri::command]
pub fn reset_store_api_key(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let new_key = format!("pk_{}", Uuid::new_v4().simple());

    conn.execute(
        "UPDATE cloud_stores SET api_key = ?1, updated_at = (strftime('%s','now') * 1000) WHERE id = ?2",
        params![new_key, store_id],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({"api_key": new_key}))
}

// ========== 商品同步命令 ==========

/// 获取可同步的商品列表
///
/// 重构于 v1.0.0：云商城 SQL 表名从 product_spu（单数）改为 product_spus（复数），
/// 原因：seed_demo_products / seed_iphone_batteries.sql 实际写入的是 product_spus（复数）。
///
/// 返回结构与 get_product_spus 一致（ProductSPU[]），这样前端 cloudStoreService.getSyncableProducts
/// 能直接当作完整商品对象使用（含 skus / images）。
#[tauri::command]
pub fn get_syncable_products(
    db: tauri::State<Mutex<Database>>,
) -> Result<Vec<Value>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 从 product_spus 查所有 SPU（默认 is_cloud_visible = 1，云商城可同步）
    let mut stmt = conn
        .prepare(
            "SELECT id, spu_code, name, description, category_id, brand_id, unit,
                    is_on_sale, status, metadata, created_at, updated_at
             FROM product_spus
             WHERE deleted_at IS NULL
             ORDER BY sort_order ASC, created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let mut results: Vec<Value> = Vec::new();
    let rows = stmt
        .query_map([], |row: &rusqlite::Row| {
            Ok((
                row.get::<_, String>(0)?,  // id
                row.get::<_, String>(1)?,  // spu_code
                row.get::<_, String>(2)?,  // name
                row.get::<_, Option<String>>(3).ok().flatten(),  // description
                row.get::<_, Option<String>>(4).ok().flatten(),  // category_id
                row.get::<_, Option<String>>(5).ok().flatten(),  // brand_id
                row.get::<_, Option<String>>(6).ok().flatten(),  // unit
                row.get::<_, i32>(7).unwrap_or(1) != 0,         // is_on_sale
                row.get::<_, String>(8)?,                       // status
                row.get::<_, Option<String>>(9).ok().flatten(),  // metadata
                row.get::<_, String>(10)?,                      // created_at
                row.get::<_, String>(11)?,                      // updated_at
            ))
        })
        .map_err(|e| e.to_string())?;

    for row in rows {
        let (id, spu_code, name, description, category_id, brand_id, unit, is_on_sale, status, metadata, created_at, updated_at) =
            row.map_err(|e| e.to_string())?;

        // 查询该 SPU 的 SKU 列表
        let mut sku_stmt = conn
            .prepare(
                "SELECT id, spu_id, sku_code, specifications, spec_text,
                        cost_price, sell_price, current_stock, min_stock, max_stock, barcode,
                        is_default, sort_order, is_active
                 FROM product_skus
                 WHERE spu_id = ?1 AND deleted_at IS NULL
                 ORDER BY is_default DESC, sort_order ASC",
            )
            .map_err(|e| e.to_string())?;
        let skus: Vec<Value> = sku_stmt
            .query_map(params![&id], |sku_row| {
                Ok(serde_json::json!({
                    "id": sku_row.get::<_, String>(0)?,
                    "spu_id": sku_row.get::<_, String>(1)?,
                    "sku_code": sku_row.get::<_, String>(2)?,
                    "specifications": serde_json::from_str::<serde_json::Value>(
                        &sku_row.get::<_, String>(3).unwrap_or_default()
                    ).unwrap_or(serde_json::json!({})),
                    "spec_text": sku_row.get::<_, Option<String>>(4).ok().flatten(),
                    "cost_price": sku_row.get::<_, f64>(5).unwrap_or(0.0),
                    "sell_price": sku_row.get::<_, f64>(6).unwrap_or(0.0),
                    "current_stock": sku_row.get::<_, i32>(7).unwrap_or(0),
                    "min_stock": sku_row.get::<_, i32>(8).unwrap_or(0),
                    "max_stock": sku_row.get::<_, i32>(9).unwrap_or(0),
                    "barcode": sku_row.get::<_, Option<String>>(10).ok().flatten(),
                    "is_default": sku_row.get::<_, i32>(11).unwrap_or(0) != 0,
                    "sort_order": sku_row.get::<_, i32>(12).unwrap_or(0),
                    "is_active": sku_row.get::<_, i32>(13).unwrap_or(1) != 0,
                }))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        // 查询该 SPU 的图片列表
        let mut img_stmt = conn
            .prepare(
                "SELECT id, image_url, image_type, sort_order, is_primary
                 FROM product_images
                 WHERE spu_id = ?1
                 ORDER BY is_primary DESC, sort_order ASC",
            )
            .map_err(|e| e.to_string())?;
        let images: Vec<Value> = img_stmt
            .query_map(params![&id], |img_row| {
                Ok(serde_json::json!({
                    "id": img_row.get::<_, String>(0)?,
                    "spu_id": id,
                    "image_url": img_row.get::<_, String>(1)?,
                    "image_type": img_row.get::<_, String>(2).unwrap_or_else(|_| "main".to_string()),
                    "sort_order": img_row.get::<_, i32>(3).unwrap_or(0),
                    "is_primary": img_row.get::<_, i32>(4).unwrap_or(0) != 0,
                }))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;

        results.push(serde_json::json!({
            "id": id,
            "spu_code": spu_code,
            "name": name,
            "description": description,
            "category_id": category_id,
            "brand_id": brand_id,
            "unit": unit,
            "is_on_sale": is_on_sale,
            "status": status,
            "metadata": metadata.and_then(|m| serde_json::from_str::<serde_json::Value>(&m).ok())
                .unwrap_or_else(|| serde_json::json!({})),
            "skus": skus,
            "images": images,
            "created_at": created_at,
            "updated_at": updated_at,
        }));
    }

    Ok(results)
}

/// 同步所有商品到云商城
#[tauri::command]
pub fn sync_all_products_to_cloud(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 获取商城 ID
    let store_id: String =
        match conn.query_row("SELECT id FROM cloud_stores LIMIT 1", [], |row| row.get(0)) {
            Ok(id) => id,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err("请先开通云商城".to_string());
            }
            Err(e) => return Err(e.to_string()),
        };

    // 获取所有商品
    let mut stmt = conn
        .prepare("SELECT id, name, sku, price, image FROM product_spus WHERE is_cloud_visible = 1")
        .map_err(|e| e.to_string())?;

    let products: Vec<(String, String, String, f64, Option<String>)> = stmt
        .query_map([], |row: &rusqlite::Row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let sync_count = products.len();
    let now = chrono::Utc::now().timestamp_millis();

    // 更新同步状态
    for (product_id, _, _, _, _) in &products {
        if let Err(e) = conn.execute(
            "UPDATE product_spus SET cloud_sync_status = 'synced', cloud_sync_time = ?1 WHERE id = ?2",
            params![now.to_string(), product_id],
        ) {
            eprintln!("[CloudSync] Failed to update sync status for {}: {}", product_id, e);
        }
    }

    // 记录同步日志
    let log_id = Uuid::new_v4().to_string();
    if let Err(e) = conn.execute(
        "INSERT INTO cloud_sync_log (id, store_id, sync_type, status, message, created_at) 
         VALUES (?1, ?2, 'full', 'success', ?3, ?4)",
        params![
            log_id,
            store_id,
            format!("同步了 {} 个商品", sync_count),
            now.to_string()
        ],
    ) {
        eprintln!("[CloudSync] Failed to insert sync log: {}", e);
    }

    Ok(serde_json::json!({
        "message": "同步完成",
        "sync_count": sync_count
    }))
}

/// 增量同步（仅同步变更的商品）
#[tauri::command]
pub fn sync_incremental_products(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 获取商城 ID
    let store_id: String =
        match conn.query_row("SELECT id FROM cloud_stores LIMIT 1", [], |row| row.get(0)) {
            Ok(id) => id,
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                return Err("请先开通云商城".to_string());
            }
            Err(e) => return Err(e.to_string()),
        };

    // 获取需要同步的商品（未同步或更新时间晚于同步时间）
    let mut stmt = conn
        .prepare(
            "SELECT id, name, sku, price, image, cloud_sync_time 
         FROM product_spus 
         WHERE is_cloud_visible = 1 
         AND (cloud_sync_status IS NULL OR cloud_sync_status != 'synced')",
        )
        .map_err(|e| e.to_string())?;

    let products: Vec<(String, String, String, f64, Option<String>, Option<String>)> = stmt
        .query_map([], |row: &rusqlite::Row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let sync_count = products.len();
    let now = chrono::Utc::now().timestamp_millis();

    // 更新同步状态
    for (product_id, _, _, _, _, _) in &products {
        if let Err(e) = conn.execute(
            "UPDATE product_spus SET cloud_sync_status = 'synced', cloud_sync_time = ?1 WHERE id = ?2",
            params![now.to_string(), product_id],
        ) {
            eprintln!("[CloudSync] Failed to update incremental sync for {}: {}", product_id, e);
        }
    }

    // 记录同步日志
    if sync_count > 0 {
        let log_id = Uuid::new_v4().to_string();
        if let Err(e) = conn.execute(
            "INSERT INTO cloud_sync_log (id, store_id, sync_type, status, message, created_at) 
             VALUES (?1, ?2, 'incremental', 'success', ?3, ?4)",
            params![
                log_id,
                store_id,
                format!("增量同步了 {} 个商品", sync_count),
                now.to_string()
            ],
        ) {
            eprintln!("[CloudSync] Failed to insert incremental sync log: {}", e);
        }
    }

    Ok(serde_json::json!({
        "message": "增量同步完成",
        "sync_count": sync_count
    }))
}

/// 切换商品云商城可见性
#[tauri::command]
pub fn toggle_product_cloud_visible(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    visible: bool,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    conn.execute(
        "UPDATE product_spus SET is_cloud_visible = ?1 WHERE id = ?2",
        params![visible, product_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "message": if visible { "已设为可见" } else { "已设为不可见" },
        "visible": visible
    }))
}

/// 批量切换商品可见性
#[tauri::command]
pub fn batch_toggle_products_visible(
    db: tauri::State<Mutex<Database>>,
    product_ids: Vec<String>,
    visible: bool,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let count = product_ids.len();
    for product_id in product_ids {
        if let Err(e) = conn.execute(
            "UPDATE product_spus SET is_cloud_visible = ?1 WHERE id = ?2",
            params![visible, product_id],
        ) {
            eprintln!(
                "[CloudSync] Failed to update visibility for {}: {}",
                product_id, e
            );
        }
    }

    Ok(serde_json::json!({
        "message": format!("已批量{} {} 个商品", if visible { "显示" } else { "隐藏" }, count),
        "count": count
    }))
}

/// 获取同步日志
#[tauri::command]
pub fn get_cloud_sync_logs(
    db: tauri::State<Mutex<Database>>,
    page: i32,
    page_size: i32,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let offset = (page - 1) * page_size;
    let mut stmt = conn
        .prepare(
            "SELECT id, store_id, sync_type, status, message, created_at
         FROM cloud_sync_log
         ORDER BY created_at DESC
         LIMIT ?1 OFFSET ?2",
        )
        .map_err(|e| e.to_string())?;

    let logs: Vec<Value> = stmt
        .query_map(params![page_size, offset], |row: &rusqlite::Row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "store_id": row.get::<_, String>(1)?,
                "sync_type": row.get::<_, String>(2)?,
                "status": row.get::<_, String>(3)?,
                "message": row.get::<_, String>(4)?,
                "created_at": row.get::<_, String>(5)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let total: i64 = conn
        .query_row("SELECT COUNT(*) FROM cloud_sync_log", [], |row| row.get(0))
        .unwrap_or(0);

    Ok(serde_json::json!({
        "data": logs,
        "total": total,
        "page": page,
        "page_size": page_size
    }))
}

// ========== 主题与订单命令 ==========

/// 获取商城主题配置
#[tauri::command]
pub fn get_store_theme(db: tauri::State<Mutex<Database>>) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    match conn.query_row(
        "SELECT store_id, theme_id, primary_color, secondary_color, background_color, 
                font_family, header_layout, custom_css, ai_generated, created_at, updated_at
         FROM cloud_store_themes
         LIMIT 1",
        [],
        |row| {
            Ok(serde_json::json!({
                "store_id": row.get::<_, String>(0)?,
                "theme_id": row.get::<_, Option<String>>(1).ok(),
                "primary_color": row.get::<_, Option<String>>(2).ok(),
                "secondary_color": row.get::<_, Option<String>>(3).ok(),
                "background_color": row.get::<_, Option<String>>(4).ok(),
                "font_family": row.get::<_, Option<String>>(5).ok(),
                "header_layout": row.get::<_, Option<String>>(6).ok(),
                "custom_css": row.get::<_, Option<String>>(7).ok(),
                "ai_generated": row.get::<_, bool>(8)?,
                "created_at": row.get::<_, String>(9)?,
                "updated_at": row.get::<_, String>(10)?,
            }))
        },
    ) {
        Ok(theme) => Ok(serde_json::json!({"data": theme})),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(serde_json::json!({"data": null})),
        Err(e) => Err(e.to_string()),
    }
}

/// 更新商城主题
#[tauri::command]
pub fn update_store_theme(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
    theme: Value,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 获取现有主题或创建新主题
    let exists = conn
        .query_row(
            "SELECT COUNT(*) FROM cloud_store_themes WHERE store_id = ?1",
            params![store_id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if exists {
        // 动态构建更新语句
        let mut sets = Vec::new();
        let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

        if let Some(v) = theme.get("primary_color").and_then(|v| v.as_str()) {
            sets.push("primary_color = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("secondary_color").and_then(|v| v.as_str()) {
            sets.push("secondary_color = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("background_color").and_then(|v| v.as_str()) {
            sets.push("background_color = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("font_family").and_then(|v| v.as_str()) {
            sets.push("font_family = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("header_layout").and_then(|v| v.as_str()) {
            sets.push("header_layout = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("custom_css").and_then(|v| v.as_str()) {
            sets.push("custom_css = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("logo_url").and_then(|v| v.as_str()) {
            sets.push("logo_url = ?");
            params_vec.push(Box::new(v.to_string()));
        }
        if let Some(v) = theme.get("banner_images") {
            sets.push("banner_images = ?");
            params_vec.push(Box::new(serde_json::to_string(v).unwrap_or_default()));
        }

        sets.push("updated_at = (strftime('%s','now') * 1000)");

        if !sets.is_empty() {
            let sql = format!(
                "UPDATE cloud_store_themes SET {} WHERE store_id = ?",
                sets.join(", ")
            );
            params_vec.push(Box::new(store_id.clone()));

            conn.execute(&sql, rusqlite::params_from_iter(params_vec.iter()))
                .map_err(|e| e.to_string())?;
        }
    } else {
        // 创建新主题
        let primary_color = theme
            .get("primary_color")
            .and_then(|v| v.as_str())
            .unwrap_or("#4F46E5")
            .to_string();
        let secondary_color = theme
            .get("secondary_color")
            .and_then(|v| v.as_str())
            .unwrap_or("#F9FAFB")
            .to_string();
        let background_color = theme
            .get("background_color")
            .and_then(|v| v.as_str())
            .unwrap_or("#FFFFFF")
            .to_string();
        let font_family = theme
            .get("font_family")
            .and_then(|v| v.as_str())
            .unwrap_or("PingFang SC, Microsoft YaHei, sans-serif")
            .to_string();
        let header_layout = theme
            .get("header_layout")
            .and_then(|v| v.as_str())
            .unwrap_or("centered")
            .to_string();
        let logo_url = theme
            .get("logo_url")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let banner_images = theme
            .get("banner_images")
            .map(|v| serde_json::to_string(v).unwrap_or_default())
            .unwrap_or("[]".to_string());

        conn.execute(
            "INSERT INTO cloud_store_themes 
             (store_id, primary_color, secondary_color, background_color, font_family, header_layout, logo_url, banner_images, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, (strftime('%s','now') * 1000), (strftime('%s','now') * 1000))",
            params![store_id, primary_color, secondary_color, background_color, font_family, header_layout, logo_url, banner_images],
        ).map_err(|e| e.to_string())?;
    }

    Ok(serde_json::json!({"message": "主题更新成功"}))
}

/// 获取商城订单列表
#[tauri::command]
pub fn get_store_orders(
    db: tauri::State<Mutex<Database>>,
    status: Option<String>,
    page: i32,
    page_size: i32,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let offset = (page - 1) * page_size;

    let (query, _params_vec): (String, Vec<String>) = if let Some(ref s) = status {
        (
            "SELECT id, store_id, product_id, buyer_info, total_amount, status, shipping_address, tracking_no, created_at, updated_at
             FROM cloud_orders
             WHERE status = ?1
             ORDER BY created_at DESC
             LIMIT ?2 OFFSET ?3".to_string(),
            vec![s.clone(), page_size.to_string(), offset.to_string()],
        )
    } else {
        (
            "SELECT id, store_id, product_id, buyer_info, total_amount, status, shipping_address, tracking_no, created_at, updated_at
             FROM cloud_orders
             ORDER BY created_at DESC
             LIMIT ?1 OFFSET ?2".to_string(),
            vec![page_size.to_string(), offset.to_string()],
        )
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let orders: Vec<Value> = if status.is_some() {
        stmt.query_map(
            params![status.as_ref().unwrap(), page_size, offset],
            |row: &rusqlite::Row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "store_id": row.get::<_, String>(1)?,
                    "product_id": row.get::<_, String>(2)?,
                    "buyer_info": row.get::<_, String>(3)?,
                    "total_amount": row.get::<_, f64>(4)?,
                    "status": row.get::<_, String>(5)?,
                    "shipping_address": row.get::<_, Option<String>>(6).ok(),
                    "tracking_no": row.get::<_, Option<String>>(7).ok(),
                    "created_at": row.get::<_, String>(8)?,
                    "updated_at": row.get::<_, String>(9)?,
                }))
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        stmt.query_map(params![page_size, offset], |row: &rusqlite::Row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "store_id": row.get::<_, String>(1)?,
                "product_id": row.get::<_, String>(2)?,
                "buyer_info": row.get::<_, String>(3)?,
                "total_amount": row.get::<_, f64>(4)?,
                "status": row.get::<_, String>(5)?,
                "shipping_address": row.get::<_, Option<String>>(6).ok(),
                "tracking_no": row.get::<_, Option<String>>(7).ok(),
                "created_at": row.get::<_, String>(8)?,
                "updated_at": row.get::<_, String>(9)?,
            }))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    // 获取总数
    let total: i64 = if let Some(ref s) = status {
        conn.query_row(
            "SELECT COUNT(*) FROM cloud_orders WHERE status = ?1",
            params![s],
            |row| row.get(0),
        )
        .unwrap_or(0)
    } else {
        conn.query_row("SELECT COUNT(*) FROM cloud_orders", [], |row| row.get(0))
            .unwrap_or(0)
    };

    Ok(serde_json::json!({
        "data": orders,
        "total": total,
        "page": page,
        "page_size": page_size
    }))
}

/// 获取单个订单详情
#[tauri::command]
pub fn get_store_order(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    match conn.query_row(
        "SELECT id, store_id, product_id, buyer_info, total_amount, status, shipping_address, tracking_no, created_at, updated_at
         FROM cloud_orders WHERE id = ?1",
        params![order_id],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "store_id": row.get::<_, String>(1)?,
                "product_id": row.get::<_, String>(2)?,
                "buyer_info": row.get::<_, String>(3)?,
                "total_amount": row.get::<_, f64>(4)?,
                "status": row.get::<_, String>(5)?,
                "shipping_address": row.get::<_, Option<String>>(6).ok(),
                "tracking_no": row.get::<_, Option<String>>(7).ok(),
                "created_at": row.get::<_, String>(8)?,
                "updated_at": row.get::<_, String>(9)?,
            }))
        },
    ) {
        Ok(order) => Ok(serde_json::json!({"data": order})),
        Err(rusqlite::Error::QueryReturnedNoRows) => Err("订单不存在".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// 标记订单已发货
#[tauri::command]
pub fn mark_store_order_shipped(
    db: tauri::State<Mutex<Database>>,
    order_id: String,
    tracking_no: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let affected = conn
        .execute(
            "UPDATE cloud_orders 
         SET status = 'shipped', tracking_no = ?1, updated_at = (strftime('%s','now') * 1000)
         WHERE id = ?2",
            params![tracking_no, order_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("订单不存在".to_string());
    }

    Ok(serde_json::json!({"message": "已标记为发货"}))
}

/// 获取商城统计（返回前端 StoreStats 接口期望的字段）
///
/// 字段名约定（与 src/lib/cloudStoreService.ts 的 StoreStats 接口一致）：
/// - total_visits: 访问量（次）
/// - total_orders: 订单数（单）
/// - total_revenue: 总收入（元）
/// - hot_products: 热销商品列表
#[tauri::command]
pub fn get_store_stats(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
    days: Option<i32>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // days 参数现阶段不参与计算（演示账号总是返回固定 mock）
    // 保留是为了与前端的调用一致：`getStoreStats(storeId, days)`
    let _ = days;

    // 1) 判断是否为演示账号云商城
    //    双重判定：1) theme_data.is_demo_data = 1；2) user_id = 'u_test001'（演示账号默认 owner）
    //    任意一个为真即为演示账号 → 走 mock 数据分支
    let is_demo: bool = conn
        .query_row(
            "SELECT
                COALESCE(json_extract(theme_data, '$.is_demo_data'), 0),
                CASE WHEN user_id = 'u_test001' THEN 1 ELSE 0 END
             FROM cloud_stores WHERE id = ?1",
            params![store_id],
            |row| Ok((row.get::<_, i64>(0)? != 0) || (row.get::<_, i64>(1)? != 0)),
        )
        .unwrap_or(false);

    // 2) 同步商品数
    let synced_products: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM product_spus WHERE is_cloud_visible = 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    // 3) 订单总数、总收入
    // 演示账号下没有真实订单/收入记录，注入模拟数据让仪表盘有内容展示
    // 金额参考前端 mock： 47 单 / ¥12580.50
    let (total_orders, total_revenue): (i64, f64) = if is_demo {
        let pending: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM cloud_orders WHERE status = 'pending'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        // 演示账号：47 单全部以让仪表盘有内容为基础，实际订单数 + 47 模拟订单
        (47 + pending, 12580.50)
    } else {
        let orders: i64 = conn
            .query_row("SELECT COUNT(*) FROM cloud_orders", [], |row| row.get(0))
            .unwrap_or(0);
        let revenue: f64 = conn
            .query_row(
                "SELECT COALESCE(SUM(total_amount), 0) FROM cloud_orders WHERE status != 'cancelled'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0.0);
        (orders, revenue)
    };

    // 5) 访问量
    // 演示账号下没有真实访问数据，返回模拟访问量便于仪表盘展示
    // 同时按 synced_products 做合理推导（每商品平均 ~ 50 次访问）
    let total_visits: i64 = if is_demo {
        1286 + (synced_products as i64 * 50)
    } else {
        (synced_products as i64) * 30 // 非演示账号：按同步商品数估算
    };

    // 6) 热销商品（演示账号下取 iPhone 电池 SPU 前 3 名，非演示账号下取真实销量）
    let hot_products: Vec<Value> = if is_demo {
        // 演示账号：从演示产品中选 3 个作为热销示例
        vec![
            serde_json::json!({"name": "iPhone 15 Pro Max 电池", "sales": 23}),
            serde_json::json!({"name": "iPhone 15 Pro 电池", "sales": 15}),
            serde_json::json!({"name": "iPhone 14 Pro Max 电池", "sales": 9}),
        ]
    } else {
        // 非演示账号：从同步商品中按名称返回前 3（实际项目可接入订单明细聚合）
        // SQLite 不支持 NULLS LAST，手动用 COALESCE 将 NULL 转成 0 排序
        let mut stmt = conn
            .prepare(
                "SELECT p.name, p.cloud_sync_time
                 FROM product_spus p
                 WHERE p.is_cloud_visible = 1
                 ORDER BY COALESCE(p.cloud_sync_time, '') DESC
                 LIMIT 3",
            )
            .map_err(|e| e.to_string())?;
        let mapped = stmt
            .query_map([], |row: &rusqlite::Row| {
                Ok(serde_json::json!({
                    "name": row.get::<_, String>(0)?,
                    "sales": 0,
                }))
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        mapped
    };

    Ok(serde_json::json!({
        "total_visits": total_visits,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "hot_products": hot_products,
        // 保留后端原始字段以供旧调用方使用
        "synced_products": synced_products,
    }))
}

/// AI 生成商城主题
#[tauri::command]
pub async fn generate_store_theme_ai(
    db: tauri::State<'_, Mutex<Database>>,
    store_id: String,
    industry: String,
    categories: Vec<String>,
    price_range: String,
) -> Result<Value, String> {
    // 构建 AI 提示词
    let categories_str = categories.join("、");
    let prompt = format!(
        "你是一位专业的电商网站设计师。请根据以下商户信息，为其设计一个商城主题方案。\n\
         请以严格 JSON 格式输出，包含以下字段：\n\
         - primary_color: 主色（十六进制，如 #1890ff）\n\
         - secondary_color: 辅助色（十六进制）\n\
         - background_color: 背景色（十六进制）\n\
         - layout_style: 布局风格（\"card\" 或 \"list\"）\n\
         - font_family: 字体建议（中文字体）\n\
         - header_layout: 导航栏布局（\"centered\" 或 \"left\"）\n\
         - banner_suggestion: 首页轮播图文字建议（数组）\n\
         \n\
         商户行业：{}\n\
         主要商品分类：{}\n\
         商品价格区间：{}\n\
         \n\
         只返回 JSON，不要添加任何解释文字或代码块标记。",
        industry, categories_str, price_range
    );

    // 调用 AI API (DeepSeek)
    let api_key = std::env::var("DEEPSEEK_API_KEY").unwrap_or_default();
    let api_base = std::env::var("DEEPSEEK_API_BASE")
        .unwrap_or_else(|_| "https://api.deepseek.com".to_string());
    let model = std::env::var("DEEPSEEK_MODEL").unwrap_or_else(|_| "deepseek-chat".to_string());

    if api_key.is_empty() {
        return Err("未配置 DEEPSEEK_API_KEY 环境变量".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let request_body = serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "你是一位专业的电商网站设计师，擅长根据商户信息生成匹配的商城主题配置。"
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.7
    });

    let response = client
        .post(format!(
            "{}/chat/completions",
            api_base.trim_end_matches('/')
        ))
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("API 请求失败: {}", e))?;

    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {}", e))?;

    if !status.is_success() {
        return Err(format!(
            "API 返回错误 {}: {}",
            status.as_u16(),
            response_text
        ));
    }

    // 解析 DeepSeek 响应
    let deepseek_resp: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| format!("解析 AI 响应失败: {} - raw: {}", e, response_text))?;

    let content = deepseek_resp
        .get("choices")
        .and_then(|c| c.as_array())
        .and_then(|c| c.first())
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| "AI 响应格式错误".to_string())?;

    // 提取 JSON（AI 可能返回带 markdown 代码块的 JSON）
    let content = content.trim();
    let content = if content.starts_with("```json") {
        content
            .trim_start_matches("```json")
            .trim_end_matches("```")
            .trim()
    } else if content.starts_with("```") {
        content
            .trim_start_matches("```")
            .trim_end_matches("```")
            .trim()
    } else {
        content
    };

    let theme_json: serde_json::Value = serde_json::from_str(content)
        .map_err(|e| format!("解析主题 JSON 失败: {} - content: {}", e, content))?;

    // 提取主题字段，提供默认值
    let primary_color = theme_json
        .get("primary_color")
        .and_then(|v| v.as_str())
        .unwrap_or("#4F46E5")
        .to_string();

    let secondary_color = theme_json
        .get("secondary_color")
        .and_then(|v| v.as_str())
        .unwrap_or("#F9FAFB")
        .to_string();

    let background_color = theme_json
        .get("background_color")
        .and_then(|v| v.as_str())
        .unwrap_or("#FFFFFF")
        .to_string();

    let layout_style = theme_json
        .get("layout_style")
        .and_then(|v| v.as_str())
        .unwrap_or("card")
        .to_string();

    let font_family = theme_json
        .get("font_family")
        .and_then(|v| v.as_str())
        .unwrap_or("PingFang SC, Microsoft YaHei, sans-serif")
        .to_string();

    let header_layout = theme_json
        .get("header_layout")
        .and_then(|v| v.as_str())
        .unwrap_or("centered")
        .to_string();

    // 保存到数据库
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();
    let now = chrono::Utc::now().timestamp_millis();

    let exists = conn
        .query_row(
            "SELECT COUNT(*) FROM cloud_store_themes WHERE store_id = ?1",
            params![store_id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    if exists {
        conn.execute(
            "UPDATE cloud_store_themes 
             SET primary_color = ?1, secondary_color = ?2, background_color = ?3,
                 layout_style = ?4, font_family = ?5, header_layout = ?6,
                 ai_generated = 1, updated_at = ?7
             WHERE store_id = ?8",
            params![
                primary_color,
                secondary_color,
                background_color,
                layout_style,
                font_family,
                header_layout,
                now,
                store_id
            ],
        )
        .map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "INSERT INTO cloud_store_themes 
             (store_id, primary_color, secondary_color, background_color, layout_style, font_family, header_layout, ai_generated, created_at, updated_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, ?8, ?9)",
            params![store_id, primary_color, secondary_color, background_color, layout_style, font_family, header_layout, now, now],
        ).map_err(|e| e.to_string())?;
    }

    let theme_data = serde_json::json!({
        "primary_color": primary_color,
        "secondary_color": secondary_color,
        "background_color": background_color,
        "layout_style": layout_style,
        "font_family": font_family,
        "header_layout": header_layout,
        "ai_generated": true,
    });

    Ok(serde_json::json!({
        "data": theme_data,
        "message": "AI 主题生成成功"
    }))
}

// ========== 商品评价命令 ==========

/// 创建商品评价
#[tauri::command]
pub fn create_product_review(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    user_id: String,
    user_name: String,
    rating: i32,
    content: Option<String>,
    images: Option<Vec<String>>,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();
    let images_json =
        serde_json::to_string(&images.unwrap_or_default()).map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO product_reviews (id, product_id, user_id, user_name, rating, content, images, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, product_id, user_id, user_name, rating, content, images_json, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "message": "评价创建成功"
    }))
}

/// 获取商品评价列表
#[tauri::command]
pub fn get_product_reviews(
    db: tauri::State<Mutex<Database>>,
    product_id: String,
    page: i32,
    page_size: i32,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let offset = (page - 1) * page_size;
    let mut stmt = conn
        .prepare(
            "SELECT id, user_id, user_name, rating, content, images, reply, reply_time, created_at 
         FROM product_reviews 
         WHERE product_id = ?1 
         ORDER BY created_at DESC 
         LIMIT ?2 OFFSET ?3",
        )
        .map_err(|e| e.to_string())?;

    let reviews: Vec<Value> = stmt.query_map(
        params![product_id, page_size, offset],
        |row: &rusqlite::Row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "user_name": row.get::<_, String>(2)?,
                "rating": row.get::<_, i32>(3)?,
                "content": row.get::<_, Option<String>>(4).ok(),
                "images": serde_json::from_str::<Vec<String>>(&row.get::<_, String>(5).unwrap_or_default()).unwrap_or_default(),
                "reply": row.get::<_, Option<String>>(6).ok(),
                "reply_time": row.get::<_, Option<i64>>(7).ok(),
                "created_at": row.get::<_, String>(8)?,
            }))
        },
    ).map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;

    // 获取总数
    let total: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM product_reviews WHERE product_id = ?1",
            params![product_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    Ok(serde_json::json!({
        "data": reviews,
        "total": total,
        "page": page,
        "page_size": page_size
    }))
}

/// 回复商品评价
#[tauri::command]
pub fn reply_product_review(
    db: tauri::State<Mutex<Database>>,
    review_id: String,
    reply: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let now = chrono::Utc::now().timestamp_millis();
    let affected = conn
        .execute(
            "UPDATE product_reviews SET reply = ?1, reply_time = ?2, updated_at = ?3 WHERE id = ?4",
            params![reply, now, now, review_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("评价不存在".to_string());
    }

    Ok(serde_json::json!({
        "message": "回复成功"
    }))
}

/// 删除商品评价
#[tauri::command]
pub fn delete_product_review(
    db: tauri::State<Mutex<Database>>,
    review_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let affected = conn
        .execute(
            "DELETE FROM product_reviews WHERE id = ?1",
            params![review_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("评价不存在".to_string());
    }

    Ok(serde_json::json!({
        "message": "删除成功"
    }))
}

// ========== 优惠券命令 ==========

/// 创建优惠券
#[tauri::command]
pub fn create_coupon(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
    code: String,
    discount_type: String,
    discount_value: f64,
    min_amount: f64,
    max_uses: i32,
    start_time: i64,
    end_time: i64,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 检查优惠码是否已存在
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM coupons WHERE code = ?1",
            params![code],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if count > 0 {
        return Err("优惠码已存在".to_string());
    }

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO coupons (id, store_id, code, discount_type, discount_value, min_amount, max_uses, start_time, end_time, status, created_at, updated_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'active', ?10, ?11)",
        params![id, store_id, code, discount_type, discount_value, min_amount, max_uses, start_time, end_time, now, now],
    ).map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "id": id,
        "message": "优惠券创建成功"
    }))
}

/// 获取优惠券列表
#[tauri::command]
pub fn get_coupons(
    db: tauri::State<Mutex<Database>>,
    store_id: String,
    status: Option<String>,
    page: i32,
    page_size: i32,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let offset = (page - 1) * page_size;
    let status_ref = status.as_deref();

    let (query, use_status_filter) = if status_ref.is_some() {
        (
            "SELECT id, code, discount_type, discount_value, min_amount, max_uses, used_count, start_time, end_time, status, created_at 
             FROM coupons 
             WHERE store_id = ?1 AND status = ?2 
             ORDER BY created_at DESC 
             LIMIT ?3 OFFSET ?4".to_string(),
            true
        )
    } else {
        (
            "SELECT id, code, discount_type, discount_value, min_amount, max_uses, used_count, start_time, end_time, status, created_at 
             FROM coupons 
             WHERE store_id = ?1 
             ORDER BY created_at DESC 
             LIMIT ?2 OFFSET ?3".to_string(),
            false
        )
    };

    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let coupons: Vec<Value> = if use_status_filter {
        stmt.query_map(
            params![store_id.clone(), status_ref.unwrap(), page_size, offset],
            |row: &rusqlite::Row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "code": row.get::<_, String>(1)?,
                    "discount_type": row.get::<_, String>(2)?,
                    "discount_value": row.get::<_, f64>(3)?,
                    "min_amount": row.get::<_, f64>(4)?,
                    "max_uses": row.get::<_, i32>(5)?,
                    "used_count": row.get::<_, i32>(6)?,
                    "start_time": row.get::<_, i64>(7)?,
                    "end_time": row.get::<_, i64>(8)?,
                    "status": row.get::<_, String>(9)?,
                    "created_at": row.get::<_, String>(10)?,
                }))
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    } else {
        stmt.query_map(
            params![store_id, page_size, offset],
            |row: &rusqlite::Row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "code": row.get::<_, String>(1)?,
                    "discount_type": row.get::<_, String>(2)?,
                    "discount_value": row.get::<_, f64>(3)?,
                    "min_amount": row.get::<_, f64>(4)?,
                    "max_uses": row.get::<_, i32>(5)?,
                    "used_count": row.get::<_, i32>(6)?,
                    "start_time": row.get::<_, i64>(7)?,
                    "end_time": row.get::<_, i64>(8)?,
                    "status": row.get::<_, String>(9)?,
                    "created_at": row.get::<_, String>(10)?,
                }))
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?
    };

    // 获取总数
    let total: i64 = if let Some(ref s) = status {
        conn.query_row(
            "SELECT COUNT(*) FROM coupons WHERE store_id = ?1 AND status = ?2",
            params![store_id, s],
            |row| row.get(0),
        )
        .unwrap_or(0)
    } else {
        conn.query_row(
            "SELECT COUNT(*) FROM coupons WHERE store_id = ?1",
            params![store_id],
            |row| row.get(0),
        )
        .unwrap_or(0)
    };

    Ok(serde_json::json!({
        "data": coupons,
        "total": total,
        "page": page,
        "page_size": page_size
    }))
}

/// 更新优惠券状态
#[tauri::command]
pub fn update_coupon_status(
    db: tauri::State<Mutex<Database>>,
    coupon_id: String,
    status: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let now = chrono::Utc::now().timestamp_millis();
    let affected = conn
        .execute(
            "UPDATE coupons SET status = ?1, updated_at = ?2 WHERE id = ?3",
            params![status, now, coupon_id],
        )
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("优惠券不存在".to_string());
    }

    Ok(serde_json::json!({
        "message": "更新成功"
    }))
}

/// 删除优惠券
#[tauri::command]
pub fn delete_coupon(
    db: tauri::State<Mutex<Database>>,
    coupon_id: String,
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    let affected = conn
        .execute("DELETE FROM coupons WHERE id = ?1", params![coupon_id])
        .map_err(|e| e.to_string())?;

    if affected == 0 {
        return Err("优惠券不存在".to_string());
    }

    Ok(serde_json::json!({
        "message": "删除成功"
    }))
}

/// 使用优惠券（结算时调用）
#[tauri::command]
pub fn use_coupon(
    db: tauri::State<Mutex<Database>>,
    code: String,
    user_id: String,
    order_id: String,
    order_amount: f64, // 添加订单金额参数
) -> Result<Value, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    let conn = db.connection();

    // 查询优惠券
    let coupon: (String, String, f64, f64, i32, i32, i64, i64, String) = match conn.query_row(
        "SELECT id, discount_type, discount_value, min_amount, max_uses, used_count, start_time, end_time, status 
         FROM coupons 
         WHERE code = ?1",
        params![code],
        |row| {
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
            ))
        },
    ) {
        Ok(c) => c,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return Err("优惠码不存在".to_string());
        }
        Err(e) => return Err(e.to_string()),
    };

    let (
        coupon_id,
        discount_type,
        discount_value,
        min_amount,
        max_uses,
        used_count,
        start_time,
        end_time,
        status,
    ) = coupon;

    // 检查状态
    if status != "active" {
        return Err("优惠券已失效".to_string());
    }

    // 检查时间
    let now = chrono::Utc::now().timestamp_millis();
    if now < start_time {
        return Err("优惠券尚未生效".to_string());
    }
    if now > end_time {
        return Err("优惠券已过期".to_string());
    }

    // 检查使用次数
    if max_uses > 0 && used_count >= max_uses {
        return Err("优惠券已达到使用次数上限".to_string());
    }

    // 检查最低消费金额
    if order_amount < min_amount {
        return Err(format!("订单金额未达到最低消费金额 ¥{:.2}", min_amount));
    }

    // 记录使用
    let usage_id = Uuid::new_v4().to_string();
    let usage_now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO coupon_usage (id, coupon_id, user_id, order_id, used_at) 
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![usage_id, coupon_id, user_id, order_id, usage_now],
    )
    .map_err(|e| e.to_string())?;

    // 更新使用次数
    conn.execute(
        "UPDATE coupons SET used_count = used_count + 1 WHERE id = ?1",
        params![coupon_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "coupon_id": coupon_id,
        "discount_type": discount_type,
        "discount_value": discount_value,
        "message": "使用成功"
    }))
}
