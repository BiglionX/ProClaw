// 产品管理 API 处理器
// 提供产品的 CRUD 操作 RESTful API

use super::AppState;
use crate::product_commands::get_product_by_id_inner;
use axum::{
    extract::{Json, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
};
use rusqlite::params;
use serde::{Deserialize, Serialize};

const PRODUCT_SELECT_COLS: &str = "id, sku, name, description, category_id, brand_id, unit, \
    cost_price, sell_price, min_stock, max_stock, current_stock, \
    image_url, barcode, is_active, created_at, updated_at";

/// 产品创建/更新请求
#[derive(Debug, Default, Deserialize)]
pub struct ProductRequest {
    pub sku: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: Option<String>,
    pub cost_price: Option<f64>,
    pub sell_price: Option<f64>,
    pub min_stock: Option<i32>,
    pub max_stock: Option<i32>,
    pub image_url: Option<String>,
    pub barcode: Option<String>,
}

/// 产品响应
#[derive(Debug, Serialize)]
pub struct ProductResponse {
    pub id: String,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub unit: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub current_stock: i32,
    pub min_stock: i32,
    pub max_stock: i32,
    pub image_url: Option<String>,
    pub barcode: Option<String>,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

fn map_product_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProductResponse> {
    Ok(ProductResponse {
        id: row.get("id")?,
        sku: row.get("sku")?,
        name: row.get("name")?,
        description: row.get("description")?,
        category_id: row.get("category_id")?,
        brand_id: row.get("brand_id")?,
        unit: row
            .get::<_, Option<String>>("unit")?
            .unwrap_or_else(|| "件".to_string()),
        cost_price: row.get::<_, Option<f64>>("cost_price")?.unwrap_or(0.0),
        sell_price: row.get::<_, Option<f64>>("sell_price")?.unwrap_or(0.0),
        min_stock: row.get::<_, Option<i32>>("min_stock")?.unwrap_or(0),
        max_stock: row.get::<_, Option<i32>>("max_stock")?.unwrap_or(0),
        current_stock: row.get::<_, Option<i32>>("current_stock")?.unwrap_or(0),
        image_url: row.get("image_url")?,
        barcode: row.get("barcode")?,
        is_active: row.get::<_, Option<bool>>("is_active")?.unwrap_or(true),
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

/// 分页查询参数
#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category_id: Option<String>,
    pub brand_id: Option<String>,
    pub search: Option<String>,
    pub is_active: Option<bool>,
}

/// 获取产品列表
pub async fn get_products(
    State(state): State<AppState>,
    Query(query): Query<ProductQuery>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let mut sql = format!(
        "SELECT {} FROM products WHERE deleted_at IS NULL",
        PRODUCT_SELECT_COLS
    );
    let mut params = Vec::new();

    if let Some(cat_id) = query.category_id {
        sql.push_str(" AND category_id = ?");
        params.push(cat_id);
    }

    if let Some(brand_id) = query.brand_id {
        sql.push_str(" AND brand_id = ?");
        params.push(brand_id);
    }

    if let Some(search) = query.search {
        sql.push_str(" AND (name LIKE ? OR sku LIKE ? OR barcode LIKE ?)");
        let search_pattern = format!("%{}%", search);
        params.push(search_pattern.clone());
        params.push(search_pattern.clone());
        params.push(search_pattern);
    }

    if let Some(is_active) = query.is_active {
        sql.push_str(" AND is_active = ?");
        // SQLite 存 0/1，不能绑 "true"/"false" 字符串
        params.push(if is_active {
            "1".to_string()
        } else {
            "0".to_string()
        });
    }

    // 真实总数（不含 LIMIT）
    let count_sql = sql.replacen(
        &format!("SELECT {} FROM products", PRODUCT_SELECT_COLS),
        "SELECT COUNT(*) FROM products",
        1,
    );
    let total: i64 = {
        let count_params: Vec<&String> = params.iter().collect();
        conn.query_row(
            &count_sql,
            rusqlite::params_from_iter(count_params.iter().copied()),
            |row| row.get(0),
        )
        .unwrap_or(0)
    };

    sql.push_str(" ORDER BY created_at DESC");

    let page = query.page.unwrap_or(1).max(1);
    let page_size = crate::database::clamp_page_size(query.page_size, 20);
    let offset = (page - 1) * page_size;
    let idx_limit = params.len() + 1;
    let idx_offset = params.len() + 2;
    params.push(page_size.to_string());
    params.push(offset.to_string());
    sql.push_str(&format!(" LIMIT ?{} OFFSET ?{}", idx_limit, idx_offset));

    let mut stmt = match conn.prepare(&sql) {
        Ok(stmt) => stmt,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    let product_iter =
        match stmt.query_map(rusqlite::params_from_iter(params.iter()), map_product_row) {
            Ok(iter) => iter,
            Err(e) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": e.to_string()})),
                )
            }
        };

    let mut products = Vec::new();
    for row in product_iter {
        match row {
            Ok(p) => products.push(p),
            Err(e) => {
                eprintln!("[products] row mapping failed: {}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(serde_json::json!({"error": format!("Failed to map product row: {}", e)})),
                );
            }
        }
    }

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "data": products,
            "total": total,
            "page": page,
            "page_size": page_size,
        })),
    )
}

/// 获取单个产品
pub async fn get_product(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let result = conn.query_row(
        &format!(
            "SELECT {} FROM products WHERE id = ?1 AND deleted_at IS NULL",
            PRODUCT_SELECT_COLS
        ),
        params![id],
        map_product_row,
    );

    match result {
        Ok(product) => (
            StatusCode::OK,
            Json(
                serde_json::to_value(product)
                    .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
            ),
        ),
        Err(rusqlite::Error::QueryReturnedNoRows) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Product not found"})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 创建产品
pub async fn create_product(
    State(state): State<AppState>,
    Json(payload): Json<ProductRequest>,
) -> impl IntoResponse {
    let name = match payload
        .name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        Some(n) => n.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "name is required"})),
            )
        }
    };
    let sku = match payload
        .sku
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        Some(s) => s.to_string(),
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({"error": "sku is required"})),
            )
        }
    };

    if payload.cost_price.map(|v| v < 0.0).unwrap_or(false)
        || payload.sell_price.map(|v| v < 0.0).unwrap_or(false)
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Price cannot be negative"})),
        );
    }

    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let sku_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE sku = ?1 AND deleted_at IS NULL)",
            params![sku],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if sku_exists {
        return (
            StatusCode::CONFLICT,
            Json(serde_json::json!({"error": "SKU already exists"})),
        );
    }

    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    match conn.execute(
        "INSERT INTO products (id, sku, name, description, category_id, brand_id, unit, cost_price, sell_price, min_stock, max_stock, image_url, barcode, is_active, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id,
            sku,
            name,
            payload.description,
            payload.category_id,
            payload.brand_id,
            payload.unit.clone().unwrap_or_else(|| "件".to_string()),
            payload.cost_price.unwrap_or(0.0),
            payload.sell_price.unwrap_or(0.0),
            payload.min_stock.unwrap_or(0),
            payload.max_stock.unwrap_or(0),
            payload.image_url,
            payload.barcode,
            true,
            now,
            now
        ],
    ) {
        Ok(_) => (),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    match get_product_by_id_inner(&conn, &id) {
        Some(p) => (
            StatusCode::CREATED,
            Json(serde_json::json!({
                "id": p.id,
                "sku": p.sku,
                "name": p.name,
                "description": p.description,
                "category_id": p.category_id,
                "brand_id": p.brand_id,
                "unit": p.unit,
                "cost_price": p.cost_price,
                "sell_price": p.sell_price,
                "current_stock": p.current_stock,
                "min_stock": p.min_stock,
                "max_stock": p.max_stock,
                "image_url": p.image_url,
                "barcode": p.barcode,
                "is_active": p.is_active,
                "created_at": p.created_at,
                "updated_at": p.updated_at,
            })),
        ),
        None => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "Product not found after create"})),
        ),
    }
}

/// 更新产品（部分更新，未传字段保留原值）
pub async fn update_product(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<ProductRequest>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let existing = match get_product_by_id(&conn, &id) {
        Ok(p) => p,
        Err(rusqlite::Error::QueryReturnedNoRows) => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({"error": "Product not found"})),
            )
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    if payload.cost_price.map(|v| v < 0.0).unwrap_or(false)
        || payload.sell_price.map(|v| v < 0.0).unwrap_or(false)
    {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Price cannot be negative"})),
        );
    }

    // PATCH：只写入请求里显式给出的非空字段，未传 / null 的列保持原值
    let mut sets: Vec<String> = Vec::new();
    let mut values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(name) = payload
        .name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        sets.push(format!("name = ?{}", values.len() + 1));
        values.push(Box::new(name.to_string()));
    }
    if let Some(description) = payload.description.clone() {
        sets.push(format!("description = ?{}", values.len() + 1));
        values.push(Box::new(description));
    }
    if let Some(category_id) = payload
        .category_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        sets.push(format!("category_id = ?{}", values.len() + 1));
        values.push(Box::new(category_id.to_string()));
    }
    if let Some(brand_id) = payload
        .brand_id
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        sets.push(format!("brand_id = ?{}", values.len() + 1));
        values.push(Box::new(brand_id.to_string()));
    }
    if let Some(unit) = payload
        .unit
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        sets.push(format!("unit = ?{}", values.len() + 1));
        values.push(Box::new(unit.to_string()));
    }
    if let Some(cost_price) = payload.cost_price {
        sets.push(format!("cost_price = ?{}", values.len() + 1));
        values.push(Box::new(cost_price));
    }
    if let Some(sell_price) = payload.sell_price {
        sets.push(format!("sell_price = ?{}", values.len() + 1));
        values.push(Box::new(sell_price));
    }
    if let Some(min_stock) = payload.min_stock {
        sets.push(format!("min_stock = ?{}", values.len() + 1));
        values.push(Box::new(min_stock));
    }
    if let Some(max_stock) = payload.max_stock {
        sets.push(format!("max_stock = ?{}", values.len() + 1));
        values.push(Box::new(max_stock));
    }
    if let Some(image_url) = payload.image_url.clone() {
        sets.push(format!("image_url = ?{}", values.len() + 1));
        values.push(Box::new(image_url));
    }
    if let Some(barcode) = payload.barcode.clone() {
        sets.push(format!("barcode = ?{}", values.len() + 1));
        values.push(Box::new(barcode));
    }

    if sets.is_empty() {
        return (
            StatusCode::OK,
            Json(
                serde_json::to_value(&existing)
                    .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
            ),
        );
    }

    let now = chrono::Utc::now().to_rfc3339();
    sets.push(format!("updated_at = ?{}", values.len() + 1));
    values.push(Box::new(now));
    let id_placeholder = values.len() + 1;
    values.push(Box::new(id.clone()));
    let sql = format!(
        "UPDATE products SET {} WHERE id = ?{} AND deleted_at IS NULL",
        sets.join(", "),
        id_placeholder
    );
    let refs: Vec<&dyn rusqlite::types::ToSql> = values.iter().map(|v| v.as_ref()).collect();

    match conn.execute(&sql, refs.as_slice()) {
        Ok(_) => (),
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
        }
    };

    match get_product_by_id(&conn, &id) {
        Ok(p) => (
            StatusCode::OK,
            Json(
                serde_json::to_value(p)
                    .unwrap_or(serde_json::json!({"error": "Serialization failed"})),
            ),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 删除产品（软删除）
pub async fn delete_product(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let db = match state.db.lock() {
        Ok(db) => db,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Database lock error"})),
            )
        }
    };
    let conn = db.connection();

    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM products WHERE id = ?1 AND deleted_at IS NULL)",
            params![id],
            |row| row.get(0),
        )
        .unwrap_or(false);

    if !exists {
        return (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "Product not found"})),
        );
    }

    let now = chrono::Utc::now().to_rfc3339();

    match conn.execute(
        "UPDATE products SET is_active = 0, deleted_at = ?2, updated_at = ?2 WHERE id = ?1",
        params![id, now],
    ) {
        Ok(_) => (
            StatusCode::NO_CONTENT,
            Json(serde_json::json!({"success": true})),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": e.to_string()})),
        ),
    }
}

/// 辅助函数：根据ID获取产品
fn get_product_by_id(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<ProductResponse, rusqlite::Error> {
    conn.query_row(
        &format!(
            "SELECT {} FROM products WHERE id = ?1 AND deleted_at IS NULL",
            PRODUCT_SELECT_COLS
        ),
        params![id],
        map_product_row,
    )
}

#[cfg(test)]
mod tests {
    use super::super::AppState;
    use super::*;
    use crate::database::Database;
    use crate::services::cloud_backup_service::CloudBackupService;
    use crate::utils::crypto::Aes256GcmCipher;
    use axum::body::to_bytes;
    use axum::extract::{Json, Path, State};
    use axum::http::StatusCode;
    use axum::response::IntoResponse;
    use rusqlite::params;
    use std::sync::Arc;

    fn test_state() -> AppState {
        let db = Database::new_in_memory().expect("memory db");
        db.connection()
            .execute_batch(
                "CREATE TABLE products (
                    id TEXT PRIMARY KEY,
                    sku TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    category_id TEXT,
                    brand_id TEXT,
                    unit TEXT NOT NULL DEFAULT '件',
                    cost_price REAL NOT NULL DEFAULT 0,
                    sell_price REAL DEFAULT 0,
                    min_stock INTEGER DEFAULT 0,
                    max_stock INTEGER DEFAULT 0,
                    current_stock INTEGER DEFAULT 0,
                    image_url TEXT,
                    barcode TEXT,
                    is_active INTEGER DEFAULT 1,
                    metadata TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    sync_status TEXT DEFAULT 'pending',
                    last_synced_at TEXT,
                    deleted_at TEXT
                );",
            )
            .expect("products schema");
        let cipher = Arc::new(Aes256GcmCipher::new(&[0u8; 32]).expect("cipher"));
        let ws_manager = Arc::new(super::super::websocket::WebSocketManager::new());
        let cloud_backup = Arc::new(CloudBackupService::new(
            Database::new_in_memory().expect("backup db"),
            &[0u8; 32],
        ));
        AppState {
            db: Arc::new(std::sync::Mutex::new(db)),
            cipher,
            ws_manager,
            cloud_backup,
            jwt_secret: Arc::new(vec![0u8; 32]),
        }
    }

    async fn json_body(response: axum::response::Response) -> serde_json::Value {
        let bytes = to_bytes(response.into_body(), 64 * 1024)
            .await
            .expect("body");
        serde_json::from_slice(&bytes).expect("json")
    }

    /// P0-07：只提交 name 的更新不得清空 unit / cost_price，且返回 200
    #[tokio::test]
    async fn put_name_only_keeps_unit_and_cost_price() {
        let state = test_state();
        let created = create_product(
            State(state.clone()),
            Json(ProductRequest {
                sku: Some("SKU-P007".into()),
                name: Some("完整商品".into()),
                unit: Some("箱".into()),
                cost_price: Some(12.5),
                sell_price: Some(20.0),
                description: Some("保持不变".into()),
                min_stock: Some(3),
                ..ProductRequest::default()
            }),
        )
        .await
        .into_response();
        let created_status = created.status();
        let created_json = json_body(created).await;
        assert_eq!(
            created_status,
            StatusCode::CREATED,
            "create failed: {created_json}"
        );
        let id = created_json["id"].as_str().expect("id").to_string();

        let updated = update_product(
            State(state.clone()),
            Path(id.clone()),
            Json(ProductRequest {
                name: Some("只改名称".into()),
                ..ProductRequest::default()
            }),
        )
        .await
        .into_response();
        assert_eq!(updated.status(), StatusCode::OK, "部分更新必须返回 200");
        let json = json_body(updated).await;
        assert_eq!(json["name"], "只改名称");
        assert_eq!(json["unit"], "箱");
        assert!((json["cost_price"].as_f64().unwrap() - 12.5).abs() < 1e-9);
        assert!((json["sell_price"].as_f64().unwrap() - 20.0).abs() < 1e-9);
        assert_eq!(json["description"], "保持不变");

        let db = state.db.lock().expect("lock");
        let (unit, cost): (String, f64) = db
            .connection()
            .query_row(
                "SELECT unit, cost_price FROM products WHERE id = ?1",
                params![id],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("row");
        assert_eq!(unit, "箱");
        assert!((cost - 12.5).abs() < 1e-9);
        assert!(unit.trim().len() > 0);
    }
}
