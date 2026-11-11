// 云托管商城 API 处理器 (PRD v5.0)
// 提供商城配置、商品同步、订单回调等 HTTP API

use crate::api::AppState;
use axum::{
    extract::{Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use hmac::{Hmac, Mac};
use rusqlite::params;
use serde::Deserialize;
use sha2::Sha256;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

/// `cloud_stores` / `cloud_store_themes` / `cloud_sync_log` / `cloud_orders` 的时间列是毫秒 INTEGER。
/// 读成 i64 再转 ISO-8601，避免按 TEXT 取值失败。
pub(crate) fn epoch_ms_to_iso(ms: Option<i64>) -> serde_json::Value {
    match ms {
        Some(ms) => {
            let iso = chrono::TimeZone::timestamp_millis_opt(&chrono::Utc, ms)
                .single()
                .map(|dt| dt.to_rfc3339_opts(chrono::SecondsFormat::Millis, true))
                .unwrap_or_else(|| ms.to_string());
            serde_json::Value::String(iso)
        }
        None => serde_json::Value::Null,
    }
}

fn sqlite_table_exists(conn: &rusqlite::Connection, table: &str) -> bool {
    conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
        params![table],
        |row| row.get::<_, i64>(0),
    )
    .unwrap_or(0)
        > 0
}

fn sqlite_column_exists(conn: &rusqlite::Connection, table: &str, column: &str) -> bool {
    if !table.chars().all(|c| c.is_ascii_alphanumeric() || c == '_') {
        return false;
    }
    let sql = format!("SELECT 1 FROM pragma_table_info('{table}') WHERE name = ?1 LIMIT 1");
    conn.query_row(&sql, params![column], |_| Ok(())).is_ok()
}

/// 列表/详情共用列序：id, name, sku, price, image, description, category, stock, is_cloud_visible
fn map_cloud_product_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<serde_json::Value> {
    let is_cloud_visible = row.get::<_, Option<i64>>(8)?.unwrap_or(0) != 0;
    Ok(serde_json::json!({
        "id": row.get::<_, String>(0)?,
        "name": row.get::<_, String>(1)?,
        "sku": row.get::<_, Option<String>>(2)?.unwrap_or_default(),
        "price": row.get::<_, f64>(3).unwrap_or(0.0),
        "image": row.get::<_, Option<String>>(4).unwrap_or(None),
        "description": row.get::<_, Option<String>>(5).unwrap_or(None),
        "category": row.get::<_, Option<String>>(6).unwrap_or(None),
        "stock": row.get::<_, i64>(7).unwrap_or(0),
        "is_cloud_visible": is_cloud_visible,
    }))
}

fn collect_cloud_products<P: rusqlite::Params>(
    conn: &rusqlite::Connection,
    sql: &str,
    params: P,
) -> rusqlite::Result<Vec<serde_json::Value>> {
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query_map(params, map_cloud_product_row)?;
    Ok(rows.filter_map(|row| row.ok()).collect())
}

/// `status = 'on_sale'` 是 schema 里的在售值；`'active'` 保留兼容旧数据。
const SPU_LISTABLE_WHERE: &str = "spu.deleted_at IS NULL AND COALESCE(spu.is_cloud_visible, CASE WHEN spu.is_on_sale = 1 OR spu.status IN ('active','on_sale') THEN 1 ELSE 0 END) = 1";

fn spu_catalog_sql(has_images: bool, by_id: bool) -> String {
    let image = if has_images {
        "(SELECT pi.image_url FROM product_images pi WHERE pi.spu_id = spu.id ORDER BY pi.is_primary DESC, pi.sort_order ASC LIMIT 1)"
    } else {
        "NULL"
    };
    let id_clause = if by_id { " AND spu.id = ?1" } else { "" };
    let tail = if by_id {
        String::new()
    } else {
        " ORDER BY spu.created_at DESC LIMIT ?1 OFFSET ?2".to_string()
    };
    format!(
        "SELECT spu.id, spu.name, spu.spu_code,
                CAST(COALESCE(MIN(sku.sell_price), 0) AS REAL),
                {image},
                spu.description,
                spu.category_id,
                CAST(COALESCE(SUM(sku.current_stock), 0) AS INTEGER),
                CASE WHEN spu.is_on_sale = 1 THEN 1 ELSE 0 END
         FROM product_spus spu
         LEFT JOIN product_skus sku
           ON sku.spu_id = spu.id AND sku.deleted_at IS NULL
         WHERE {SPU_LISTABLE_WHERE}{id_clause}
         GROUP BY spu.id{tail}"
    )
}

const SPU_COUNT_SQL: &str = "SELECT COUNT(*) FROM product_spus spu WHERE spu.deleted_at IS NULL AND COALESCE(spu.is_cloud_visible, CASE WHEN spu.is_on_sale = 1 OR spu.status IN ('active','on_sale') THEN 1 ELSE 0 END) = 1";

const PRODUCTS_LIST_SQL: &str = "SELECT id, name, sku,
        CAST(COALESCE(sell_price, 0) AS REAL),
        image_url, description, category_id,
        CAST(COALESCE(current_stock, 0) AS INTEGER),
        CASE WHEN is_cloud_visible = 1 THEN 1 ELSE 0 END
     FROM products
     WHERE is_cloud_visible = 1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT ?1 OFFSET ?2";

const PRODUCTS_COUNT_SQL: &str =
    "SELECT COUNT(*) FROM products WHERE is_cloud_visible = 1 AND deleted_at IS NULL";

const PRODUCTS_ONE_SQL: &str = "SELECT id, name, sku,
        CAST(COALESCE(sell_price, 0) AS REAL),
        image_url, description, category_id,
        CAST(COALESCE(current_stock, 0) AS INTEGER),
        CASE WHEN is_cloud_visible = 1 THEN 1 ELSE 0 END
     FROM products
     WHERE id = ?1 AND is_cloud_visible = 1 AND deleted_at IS NULL";

/// 验证 Webhook HMAC-SHA256 签名
/// 签名格式: X-ProClaw-Signature: t=<unix_timestamp>,v1=<hex_hmac>
/// HMAC 计算: HMAC-SHA256(timestamp + "." + json_body, api_key)
fn verify_webhook_signature(payload_json: &str, signature_header: &str, api_key: &str) -> bool {
    // 解析签名头: "t=1234567890,v1=abcdef..."
    let parts: Vec<&str> = signature_header.split(',').collect();
    let mut timestamp = None;
    let mut sig = None;

    for part in parts {
        let part = part.trim();
        if let Some(t) = part.strip_prefix("t=") {
            timestamp = Some(t.to_string());
        } else if let Some(s) = part.strip_prefix("v1=") {
            sig = Some(s.to_string());
        }
    }

    let (timestamp, expected_sig) = match (timestamp, sig) {
        (Some(t), Some(s)) => (t, s),
        _ => {
            eprintln!("[Store] Webhook signature header malformed: missing t= or v1=");
            return false;
        }
    };

    // 可选：检查时间戳漂移 (允许 ±5 分钟)
    if let Ok(ts) = timestamp.parse::<i64>() {
        let now = chrono::Utc::now().timestamp();
        if (now - ts).abs() > 300 {
            eprintln!("[Store] Webhook timestamp expired: ts={}, now={}", ts, now);
            return false;
        }
    }

    // HMAC-SHA256(timestamp.body, api_key)
    let mut mac = match HmacSha256::new_from_slice(api_key.as_bytes()) {
        Ok(m) => m,
        Err(_) => return false,
    };
    mac.update(format!("{}.{}", timestamp, payload_json).as_bytes());
    let computed = hex::encode(mac.finalize().into_bytes());

    // 恒定时间比较防时序攻击
    let computed_bytes = computed.as_bytes();
    let expected_bytes = expected_sig.as_bytes();
    if computed_bytes.len() != expected_bytes.len() {
        return false;
    }
    computed_bytes
        .iter()
        .zip(expected_bytes.iter())
        .fold(0, |acc, (a, b)| acc | (a ^ b))
        == 0
}

// ========== 请求结构体 ==========

#[derive(Debug, Deserialize)]
pub struct CreateStoreRequest {
    pub subdomain: String,
    pub plan_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateStoreRequest {
    pub custom_domain: Option<String>,
    pub status: Option<String>,
    pub plan_type: Option<String>,
    pub expires_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct StoreQuery {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

// ========== API Handlers ==========

/// 获取商城（简化版，暂不认证）
pub async fn get_cloud_store(State(state): State<AppState>) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let result = conn.query_row(
        "SELECT id, user_id, subdomain, custom_domain, api_key, status, plan_type, expires_at, created_at, updated_at 
         FROM cloud_stores LIMIT 1",
        [],
        |row| {
            Ok(serde_json::json!({
                "id": row.get::<_, String>(0)?,
                "user_id": row.get::<_, String>(1)?,
                "subdomain": row.get::<_, String>(2)?,
                "custom_domain": row.get::<_, Option<String>>(3)?,
                "api_key": row.get::<_, String>(4)?,
                "status": row.get::<_, String>(5)?,
                "plan_type": row.get::<_, String>(6)?,
                "expires_at": row.get::<_, Option<i64>>(7)?,
                "created_at": epoch_ms_to_iso(row.get::<_, Option<i64>>(8)?),
                "updated_at": epoch_ms_to_iso(row.get::<_, Option<i64>>(9)?),
            }))
        },
    );

    match result {
        Ok(store) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"data": store})),
        ),
        Err(rusqlite::Error::QueryReturnedNoRows) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"data": null})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 开通云商城（简化版，暂不认证）
pub async fn create_cloud_store(
    State(state): State<AppState>,
    Json(payload): Json<CreateStoreRequest>,
) -> impl IntoResponse {
    // 验证子域名格式
    if !payload
        .subdomain
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({"error": "子域名只能包含小写字母、数字和连字符"})),
        );
    }

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    // 检查是否已开通
    if conn
        .query_row("SELECT id FROM cloud_stores LIMIT 1", [], |_| Ok(()))
        .is_ok()
    {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({"error": "您已开通云商城"})),
        );
    }

    // 检查子域名是否被占用
    if conn
        .query_row(
            "SELECT id FROM cloud_stores WHERE subdomain = ?1",
            params![payload.subdomain],
            |_| Ok(()),
        )
        .is_ok()
    {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({"error": "子域名已被占用"})),
        );
    }

    let id = Uuid::new_v4().to_string();
    let api_key = format!("pk_{}", Uuid::new_v4().simple());
    let plan_type = payload.plan_type.unwrap_or_else(|| "free".to_string());

    match conn.execute(
        "INSERT INTO cloud_stores (id, user_id, subdomain, api_key, status, plan_type) VALUES (?1, 'u_test001', ?2, ?3, 'active', ?4)",
        params![id, payload.subdomain, api_key, plan_type],
    ) {
        Ok(_) => {
            // 创建默认主题
            if let Err(e) = conn.execute(
                "INSERT INTO cloud_store_themes (store_id) VALUES (?1)",
                params![id],
            ) {
                eprintln!("[Store] Failed to create default theme for {}: {}", id, e);
            }
            (StatusCode::OK, axum::Json(serde_json::json!({
                "data": {"id": id, "subdomain": payload.subdomain, "api_key": api_key, "plan_type": plan_type}
            })))
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))),
    }
}

/// 更新商城配置
pub async fn update_cloud_store(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateStoreRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let mut sets = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref v) = payload.custom_domain {
        sets.push("custom_domain = ?");
        params_vec.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.status {
        sets.push("status = ?");
        params_vec.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.plan_type {
        sets.push("plan_type = ?");
        params_vec.push(Box::new(v.clone()));
    }
    if let Some(ref v) = payload.expires_at {
        sets.push("expires_at = ?");
        params_vec.push(Box::new(*v));
    }

    if sets.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({"error": "No fields to update"})),
        );
    }

    sets.push("updated_at = (strftime('%s','now') * 1000)");
    params_vec.push(Box::new(id.clone()));

    let sql = format!("UPDATE cloud_stores SET {} WHERE id = ?", sets.join(", "));
    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();

    match conn.execute(&sql, params_refs.as_slice()) {
        Ok(_) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"message": "更新成功"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 重置 API Key
pub async fn reset_store_api_key(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();
    let new_key = format!("pk_{}", Uuid::new_v4().simple());

    match conn.execute("UPDATE cloud_stores SET api_key = ?1, updated_at = (strftime('%s','now') * 1000) WHERE id = ?2", params![new_key, id]) {
        Ok(0) => (
            StatusCode::NOT_FOUND,
            axum::Json(serde_json::json!({"error": "Store not found"})),
        ),
        Ok(_) => {
            // 完整 HMAC 密钥只写入数据库，响应里只给末 4 位指纹，避免进访问日志。
            let hint = if new_key.len() >= 4 {
                format!("****{}", &new_key[new_key.len() - 4..])
            } else {
                "****".to_string()
            };
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({
                    "data": { "reset": true, "api_key_hint": hint }
                })),
            )
        }
        Err(e) => {
            eprintln!("[Store] reset api key failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "Failed to reset API key"})),
            )
        }
    }
}

/// 获取商城主题
pub async fn get_store_theme(
    State(state): State<AppState>,
    Path(store_id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    match conn.query_row(
        "SELECT store_id, primary_color, secondary_color, layout_style, font_family, logo_url, banner_images, theme_data, updated_at 
         FROM cloud_store_themes WHERE store_id = ?1",
        params![store_id],
        |row| {
            Ok(serde_json::json!({
                "store_id": row.get::<_, String>(0)?,
                "primary_color": row.get::<_, String>(1)?,
                "secondary_color": row.get::<_, String>(2)?,
                "layout_style": row.get::<_, String>(3)?,
                "font_family": row.get::<_, String>(4)?,
                "logo_url": row.get::<_, Option<String>>(5)?,
                "banner_images": serde_json::from_str::<Vec<String>>(&row.get::<_, String>(6)?).unwrap_or_default(),
                "theme_data": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(7)?).unwrap_or(serde_json::json!({})),
                "updated_at": epoch_ms_to_iso(row.get::<_, Option<i64>>(8)?),
            }))
        },
    ) {
        Ok(theme) => (StatusCode::OK, axum::Json(serde_json::json!({"data": theme}))),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(serde_json::json!({"error": e.to_string()}))),
    }
}

/// 同步日志列表
pub async fn get_cloud_sync_logs(
    State(state): State<AppState>,
    Query(_query): Query<StoreQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let sql = "SELECT id, store_id, sync_type, status, message, items_synced, created_at 
               FROM cloud_sync_log ORDER BY created_at DESC LIMIT 50"
        .to_string();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let rows = stmt.query_map([], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "store_id": row.get::<_, String>(1)?,
            "sync_type": row.get::<_, String>(2)?,
            "status": row.get::<_, String>(3)?,
            "message": row.get::<_, Option<String>>(4)?,
            "items_synced": row.get::<_, i64>(5)?,
            "created_at": epoch_ms_to_iso(row.get::<_, Option<i64>>(6)?),
        }))
    });

    match rows {
        Ok(r) => {
            let logs: Vec<_> = r.filter_map(|x| x.ok()).collect();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({"data": logs})),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 获取商城订单列表
pub async fn get_store_orders(
    State(state): State<AppState>,
    Path(store_id): Path<String>,
    Query(query): Query<StoreQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let mut sql = "SELECT id, store_id, order_no, customer_name, customer_phone, total_amount, status, payment_method, items, callback_status, created_at 
                   FROM cloud_orders WHERE store_id = ?1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    params_vec.push(Box::new(store_id));

    if let Some(ref status) = query.status {
        sql.push_str(" AND status = ?");
        params_vec.push(Box::new(status.clone()));
    }
    sql.push_str(" ORDER BY created_at DESC LIMIT 200");

    let params_refs: Vec<&dyn rusqlite::types::ToSql> =
        params_vec.iter().map(|p| p.as_ref()).collect();

    let mut stmt = match conn.prepare(&sql) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let rows = stmt.query_map(params_refs.as_slice(), |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "store_id": row.get::<_, String>(1)?,
            "order_no": row.get::<_, String>(2)?,
            "customer_name": row.get::<_, Option<String>>(3)?,
            "customer_phone": row.get::<_, Option<String>>(4)?,
            "total_amount": row.get::<_, f64>(5)?,
            "status": row.get::<_, String>(6)?,
            "payment_method": row.get::<_, Option<String>>(7)?,
            "items": serde_json::from_str::<serde_json::Value>(&row.get::<_, String>(8)?).unwrap_or(serde_json::json!([])),
            "callback_status": row.get::<_, String>(9)?,
            "created_at": epoch_ms_to_iso(row.get::<_, Option<i64>>(10)?),
        }))
    });

    match rows {
        Ok(r) => {
            let orders: Vec<_> = r.filter_map(|x| x.ok()).collect();
            (
                StatusCode::OK,
                axum::Json(serde_json::json!({"data": orders})),
            )
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 订单回调接收（云端 → 桌面端）
/// 安全要求：必须验证 X-ProClaw-Signature HMAC 头，防止伪造订单
pub async fn order_callback(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let store_id = match payload.get("store_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({"error": "missing store_id"})),
            )
        }
    };

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    // 获取 API Key 用于验证
    let api_key: String = match conn.query_row(
        "SELECT api_key FROM cloud_stores WHERE id = ?1",
        params![store_id],
        |row| row.get(0),
    ) {
        Ok(k) => k,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({"error": "Invalid store"})),
            )
        }
    };

    // 验证 HMAC 签名（防伪造订单回调）
    let signature_header = headers
        .get("x-proclaw-signature")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if signature_header.is_empty() {
        return (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "error": "Missing X-ProClaw-Signature header"
            })),
        );
    }

    // 将 payload 序列化为确定性 JSON 用于 HMAC 验证
    let payload_json = serde_json::to_string(&payload).unwrap_or_default();

    if !verify_webhook_signature(&payload_json, signature_header, &api_key) {
        eprintln!(
            "[Store] HMAC signature verification FAILED for store {}",
            store_id
        );
        return (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "error": "Invalid HMAC signature"
            })),
        );
    }

    // 处理订单
    let order_no = payload
        .get("order_no")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let status = payload
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("pending");

    let result = conn.execute(
        "INSERT OR REPLACE INTO cloud_orders (id, store_id, order_no, customer_name, total_amount, status, payment_method, items, callback_status, created_at) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'success', (strftime('%s','now') * 1000))",
        params![
            payload.get("id").and_then(|v| v.as_str()).unwrap_or(""),
            store_id,
            order_no,
            payload.get("customer_name").and_then(|v| v.as_str()),
            payload.get("total_amount").and_then(|v| v.as_f64()).unwrap_or(0.0),
            status,
            payload.get("payment_method").and_then(|v| v.as_str()),
            payload.get("items").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string()),
        ],
    );

    match result {
        Ok(_) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"success": true})),
        ),
        Err(e) => {
            eprintln!("[Store] order callback insert failed: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "Failed to store order"})),
            )
        }
    }
}

/// 更新商城主题
pub async fn update_store_theme(
    State(state): State<AppState>,
    Path(store_id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    // 解析主题配置
    let primary_color = payload
        .get("primary_color")
        .and_then(|v| v.as_str())
        .unwrap_or("#4F46E5");
    let secondary_color = payload.get("secondary_color").and_then(|v| v.as_str());
    let background_color = payload.get("background_color").and_then(|v| v.as_str());
    let font_family = payload.get("font_family").and_then(|v| v.as_str());
    let header_layout = payload.get("header_layout").and_then(|v| v.as_str());
    let custom_css = payload.get("custom_css").and_then(|v| v.as_str());

    // 检查是否存在主题记录
    let exists = conn
        .query_row(
            "SELECT COUNT(*) FROM cloud_store_themes WHERE store_id = ?1",
            params![store_id],
            |row| row.get::<_, i64>(0),
        )
        .unwrap_or(0)
        > 0;

    let result = if exists {
        conn.execute(
            "UPDATE cloud_store_themes 
             SET primary_color = ?1, secondary_color = ?2, background_color = ?3,
                 font_family = ?4, header_layout = ?5, custom_css = ?6,
                 updated_at = (strftime('%s','now') * 1000)
             WHERE store_id = ?7",
            params![
                primary_color,
                secondary_color,
                background_color,
                font_family,
                header_layout,
                custom_css,
                store_id
            ],
        )
    } else {
        conn.execute(
            "INSERT INTO cloud_store_themes 
             (store_id, primary_color, secondary_color, background_color, font_family, header_layout, custom_css) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![store_id, primary_color, secondary_color, background_color, font_family, header_layout, custom_css],
        )
    };

    match result {
        Ok(_) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"message": "主题更新成功"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

// ========== 云商城商品查询 API ==========

fn cloud_product_page(
    products: Vec<serde_json::Value>,
    total: i64,
    page: i64,
    page_size: i64,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({
            "data": products,
            "total": total,
            "page": page,
            "page_size": page_size
        })),
    )
}

fn cloud_product_found(product: serde_json::Value) -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::OK,
        axum::Json(serde_json::json!({"data": product})),
    )
}

fn cloud_product_missing() -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::NOT_FOUND,
        axum::Json(serde_json::json!({"error": "商品不存在或已下架"})),
    )
}

fn cloud_product_db_error(
    err: impl std::fmt::Display,
) -> (StatusCode, axum::Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        axum::Json(serde_json::json!({"error": err.to_string()})),
    )
}

/// 获取云商城商品列表。
/// 主路径：`product_spus` JOIN `product_skus`（最低价、库存合计），在售条件为
/// `is_on_sale = 1 OR status IN ('active', 'on_sale')`。
/// 若 SPU 表不可用或没有可售商品，且 `products.is_cloud_visible` 存在，则回退到简单商品表。
pub async fn get_cloud_products(
    State(state): State<AppState>,
    Query(query): Query<StoreQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let page = query.page.unwrap_or(1).max(1);
    let page_size = crate::database::clamp_page_size(query.page_size, 20);
    let offset = (page - 1) * page_size;
    let products_fallback = sqlite_column_exists(conn, "products", "is_cloud_visible");

    if sqlite_table_exists(conn, "product_spus") {
        let sql = spu_catalog_sql(sqlite_table_exists(conn, "product_images"), false);
        match collect_cloud_products(conn, &sql, params![page_size, offset]) {
            Ok(products) => match conn.query_row(SPU_COUNT_SQL, [], |row| row.get(0)) {
                Ok(total) if total > 0 || !products_fallback => {
                    return cloud_product_page(products, total, page, page_size);
                }
                Ok(_) => {}
                Err(e) if !products_fallback => return cloud_product_db_error(e),
                Err(e) => {
                    eprintln!("[Store] product_spus count failed, trying products fallback: {e}");
                }
            },
            Err(e) if !products_fallback => return cloud_product_db_error(e),
            Err(e) => {
                eprintln!("[Store] product_spus list failed, trying products fallback: {e}");
            }
        }
    }

    if products_fallback {
        return match collect_cloud_products(conn, PRODUCTS_LIST_SQL, params![page_size, offset]) {
            Ok(products) => {
                let total = conn
                    .query_row(PRODUCTS_COUNT_SQL, [], |row| row.get(0))
                    .unwrap_or(0);
                cloud_product_page(products, total, page, page_size)
            }
            Err(e) => cloud_product_db_error(e),
        };
    }

    cloud_product_db_error("商品表不可用：product_spus 不存在，且 products 没有 is_cloud_visible")
}

/// 获取云商城单个商品详情。查找顺序与列表相同：先 SPU，再 `products.is_cloud_visible`。
pub async fn get_cloud_product(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();
    let products_fallback = sqlite_column_exists(conn, "products", "is_cloud_visible");

    if sqlite_table_exists(conn, "product_spus") {
        let sql = spu_catalog_sql(sqlite_table_exists(conn, "product_images"), true);
        match conn.query_row(&sql, params![id], map_cloud_product_row) {
            Ok(product) => return cloud_product_found(product),
            Err(rusqlite::Error::QueryReturnedNoRows) if !products_fallback => {
                return cloud_product_missing();
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => {}
            Err(e) if !products_fallback => return cloud_product_db_error(e),
            Err(e) => {
                eprintln!("[Store] product_spus detail failed, trying products fallback: {e}");
            }
        }
    }

    if products_fallback {
        return match conn.query_row(PRODUCTS_ONE_SQL, params![id], map_cloud_product_row) {
            Ok(product) => cloud_product_found(product),
            Err(rusqlite::Error::QueryReturnedNoRows) => cloud_product_missing(),
            Err(e) => cloud_product_db_error(e),
        };
    }

    cloud_product_missing()
}

// ========== 订单状态更新 API ==========

/// 更新订单状态（用于模拟支付成功）
pub async fn update_order_status(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({"error": "DB lock"})),
            )
        }
    };
    let conn = db.connection();

    let status = payload
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("paid");

    let result = conn.execute(
        "UPDATE cloud_orders SET status = ?1, updated_at = (strftime('%s','now') * 1000) WHERE id = ?2",
        params![status, id],
    );

    match result {
        Ok(count) if count > 0 => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"message": "订单状态已更新", "status": status})),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            axum::Json(serde_json::json!({"error": "订单不存在"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}
